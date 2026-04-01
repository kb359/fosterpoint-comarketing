/**
 * Fix Bardo: re-identify poster from transcript (should be Oscar or Ingemar, not Kasper)
 * Run: ANTHROPIC_API_KEY=... npx ts-node --skip-project --compiler-options '{"module":"commonjs","esModuleInterop":true}' scripts/fix-bardo-poster.ts
 */

import * as dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { summarizeTranscript } from "../src/lib/ai/transcript";
import { analyzeWriting } from "../src/lib/ai/writing";
import { generateDraft } from "../src/lib/ai/draft";
import { findLinkedInUrl } from "../src/lib/ai/search";
import { scrapeLinkedInPosts } from "../src/lib/phantombuster";

const prisma = new PrismaClient();

function log(msg: string) { console.log(`[${new Date().toISOString()}] ${msg}`); }

async function main() {
  const projectId = "4b9a202c-116a-4151-a35f-61132a6c7512";

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { research: true },
  });
  if (!project) throw new Error("Bardo project not found");

  const transcript = await prisma.transcript.findFirst({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
  if (!transcript) throw new Error("No transcript for Bardo");

  log("Re-identifying poster (Kasper said Oscar or Ingemar will post)...");
  const { summary, identifiedPoster } = await summarizeTranscript(
    transcript.rawTranscript,
    "Bardo",
    "Kasper Purunen"
  );
  log(`Identified poster: ${identifiedPoster}`);

  await prisma.transcript.update({
    where: { id: transcript.id },
    data: { identifiedPoster, callSummary: summary },
  });
  await prisma.project.update({
    where: { id: projectId },
    data: { posterName: identifiedPoster, posterLinkedinUrl: null },
  });

  // Find LinkedIn
  log(`Searching LinkedIn for "${identifiedPoster}" at Bardo...`);
  const linkedInUrl = await findLinkedInUrl(identifiedPoster, "Bardo");
  log(`LinkedIn URL: ${linkedInUrl ?? "not found"}`);

  if (linkedInUrl) {
    await prisma.project.update({ where: { id: projectId }, data: { posterLinkedinUrl: linkedInUrl } });
  }

  // Scrape posts
  let writingSamples: string[] = [];
  if (linkedInUrl) {
    log("Scraping LinkedIn posts...");
    const posts = await scrapeLinkedInPosts(linkedInUrl);
    log(`Got ${posts.length} posts`);
    if (posts.length > 0) {
      writingSamples = posts.map((p) => p.text).filter(Boolean);
      await prisma.writingSample.deleteMany({ where: { projectId } });
      await prisma.writingSample.createMany({
        data: writingSamples.map((text) => ({
          projectId,
          sourceType: "linkedin_post" as const,
          content: text,
          belongsTo: identifiedPoster,
        })),
      });
    }
  }

  if (writingSamples.length === 0) {
    log("No LinkedIn posts — using transcript voice fallback");
    writingSamples = [transcript.rawTranscript];
  }

  log("Analyzing writing style...");
  const writingAnalysis = await analyzeWriting(writingSamples, identifiedPoster);
  await prisma.writingAnalysis.deleteMany({ where: { projectId } });
  await prisma.writingAnalysis.create({
    data: { projectId, subjectName: identifiedPoster, analysis: writingAnalysis },
  });

  log("Generating draft with 3 hook options...");
  const companyBrief = project.research.find((r) => r.type === "company_brief")?.content ?? "";
  const personBrief = project.research.find((r) => r.type === "person_brief")?.content ?? "";

  const { content, hookOptions, quoteOptions } = await generateDraft({
    companyBrief,
    personBrief,
    callSummary: summary,
    writingAnalysis,
    posterName: identifiedPoster,
    posterTitle: "Co-founder",
    companyName: "Bardo",
  });

  await prisma.postDraft.deleteMany({ where: { projectId } });
  await prisma.postDraft.create({
    data: {
      projectId,
      version: 1,
      content,
      hookOptions: hookOptions as object[],
      quoteOptions: quoteOptions as object[],
      status: "draft",
    },
  });

  await prisma.project.update({ where: { id: projectId }, data: { stage: "draft_ready" } });

  log(`Done! Poster: ${identifiedPoster} | Hooks: ${hookOptions.length} | Voice: ${writingSamples.length > 1 || writingSamples[0] !== transcript.rawTranscript ? "LinkedIn posts" : "transcript fallback"}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
