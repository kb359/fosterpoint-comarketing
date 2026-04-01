import * as dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "@prisma/client";
import { analyzeWriting } from "../src/lib/ai/writing";
import { generateDraft } from "../src/lib/ai/draft";
import { scrapeLinkedInPosts } from "../src/lib/phantombuster";

const prisma = new PrismaClient();
function log(msg: string) { console.log(`[${new Date().toISOString()}] ${msg}`); }

async function main() {
  const projectId = "4b9a202c-116a-4151-a35f-61132a6c7512";
  const posterName = "Ingemar Rask";
  const linkedInUrl = "https://linkedin.com/in/ingemarrask";

  await prisma.project.update({ where: { id: projectId }, data: { posterName, posterLinkedinUrl: linkedInUrl } });

  log("Scraping Ingemar Rask LinkedIn...");
  const posts = await scrapeLinkedInPosts(linkedInUrl);
  log(`Got ${posts.length} posts`);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { research: true, transcripts: { take: 1, orderBy: { createdAt: "desc" } } },
  });

  let writingSamples = posts.map(p => p.text).filter(Boolean);
  if (writingSamples.length > 0) {
    await prisma.writingSample.deleteMany({ where: { projectId } });
    await prisma.writingSample.createMany({
      data: writingSamples.map(text => ({ projectId, sourceType: "linkedin_post" as const, content: text, belongsTo: posterName })),
    });
  } else {
    log("No posts — using transcript fallback");
    writingSamples = [project!.transcripts[0].rawTranscript];
  }

  log("Analyzing writing style...");
  const writingAnalysis = await analyzeWriting(writingSamples, posterName);
  await prisma.writingAnalysis.deleteMany({ where: { projectId } });
  await prisma.writingAnalysis.create({ data: { projectId, subjectName: posterName, analysis: writingAnalysis } });

  log("Generating draft with 3 hook options...");
  const companyBrief = project!.research.find(r => r.type === "company_brief")?.content ?? "";
  const personBrief = project!.research.find(r => r.type === "person_brief")?.content ?? "";

  const { content, hookOptions, quoteOptions } = await generateDraft({
    companyBrief, personBrief,
    callSummary: project!.transcripts[0].callSummary!,
    writingAnalysis, posterName, posterTitle: "Co-founder", companyName: "Bardo",
  });

  await prisma.postDraft.deleteMany({ where: { projectId } });
  await prisma.postDraft.create({
    data: { projectId, version: 1, content, hookOptions: hookOptions as object[], quoteOptions: quoteOptions as object[], status: "draft" },
  });
  await prisma.project.update({ where: { id: projectId }, data: { stage: "draft_ready" } });

  log(`Done! Poster: ${posterName} | Hooks: ${hookOptions.length} | Voice: ${writingSamples.length > 1 ? posts.length + " LinkedIn posts" : "transcript fallback"}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
