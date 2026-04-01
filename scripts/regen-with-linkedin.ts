/**
 * Re-run writing analysis + draft generation using real LinkedIn posts.
 * Uses existing transcripts already in DB.
 * Run: ANTHROPIC_API_KEY=... PHANTOMBUSTER_API_KEY=... npx ts-node --skip-project --compiler-options '{"module":"commonjs","esModuleInterop":true}' scripts/regen-with-linkedin.ts
 */
import * as dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { analyzeWriting } from "../src/lib/ai/writing";
import { generateDraft } from "../src/lib/ai/draft";
import { findLinkedInUrl } from "../src/lib/ai/search";
import { scrapeLinkedInPosts } from "../src/lib/phantombuster";

const prisma = new PrismaClient();
function log(msg: string) { console.log(`[${new Date().toISOString()}] ${msg}`); }

async function regenProject(opts: {
  projectId: string;
  companyName: string;
  posterName: string;
  posterTitle: string;
  linkedInUrl?: string; // provide if known
}) {
  log(`=== ${opts.companyName} ===`);

  const project = await prisma.project.findUnique({
    where: { id: opts.projectId },
    include: { research: true },
  });
  if (!project) throw new Error(`Project ${opts.projectId} not found`);

  const transcript = await prisma.transcript.findFirst({
    where: { projectId: opts.projectId },
    orderBy: { createdAt: "desc" },
  });
  if (!transcript?.callSummary) throw new Error(`No transcript/summary for ${opts.companyName}`);

  // Find LinkedIn URL
  let linkedInUrl = opts.linkedInUrl ?? project.posterLinkedinUrl ?? null;
  if (!linkedInUrl) {
    log(`Searching LinkedIn for ${opts.posterName}...`);
    linkedInUrl = await findLinkedInUrl(opts.posterName, opts.companyName);
    if (linkedInUrl) {
      log(`Found: ${linkedInUrl}`);
      await prisma.project.update({ where: { id: opts.projectId }, data: { posterLinkedinUrl: linkedInUrl, posterName: opts.posterName } });
    } else {
      log(`Not found — using transcript fallback`);
    }
  } else {
    log(`Using LinkedIn URL: ${linkedInUrl}`);
    // Ensure posterName is updated too
    await prisma.project.update({ where: { id: opts.projectId }, data: { posterName: opts.posterName } });
  }

  // Scrape posts
  let writingSamples: string[] = [];
  if (linkedInUrl) {
    log(`Scraping LinkedIn posts...`);
    const posts = await scrapeLinkedInPosts(linkedInUrl);
    log(`Got ${posts.length} posts`);
    if (posts.length > 0) {
      writingSamples = posts.map(p => p.text).filter(Boolean);
      await prisma.writingSample.deleteMany({ where: { projectId: opts.projectId } });
      await prisma.writingSample.createMany({
        data: writingSamples.map(text => ({
          projectId: opts.projectId,
          sourceType: "linkedin_post" as const,
          content: text,
          belongsTo: opts.posterName,
        })),
      });
    }
  }

  if (writingSamples.length === 0) {
    log(`No posts — using transcript voice`);
    writingSamples = [transcript.rawTranscript];
  }

  // Writing analysis
  log(`Analyzing writing style (${writingSamples.length} samples)...`);
  const writingAnalysis = await analyzeWriting(writingSamples, opts.posterName);
  await prisma.writingAnalysis.deleteMany({ where: { projectId: opts.projectId } });
  await prisma.writingAnalysis.create({
    data: { projectId: opts.projectId, subjectName: opts.posterName, analysis: writingAnalysis },
  });

  // Generate draft
  log(`Generating draft with 3 hook options...`);
  const companyBrief = project.research.find(r => r.type === "company_brief")?.content ?? "";
  const personBrief = project.research.find(r => r.type === "person_brief")?.content ?? "";

  const { content, hookOptions, quoteOptions } = await generateDraft({
    companyBrief, personBrief,
    callSummary: transcript.callSummary,
    writingAnalysis,
    posterName: opts.posterName,
    posterTitle: opts.posterTitle,
    companyName: opts.companyName,
  });

  await prisma.postDraft.deleteMany({ where: { projectId: opts.projectId } });
  await prisma.postDraft.create({
    data: {
      projectId: opts.projectId,
      version: 1,
      content,
      hookOptions: hookOptions as object[],
      quoteOptions: quoteOptions as object[],
      status: "draft",
    },
  });

  await prisma.project.update({ where: { id: opts.projectId }, data: { stage: "draft_ready" } });
  log(`Done! ${hookOptions.length} hooks | voice: ${writingSamples.length > 1 ? `${writingSamples.length} LinkedIn posts` : "transcript fallback"}`);
}

async function main() {
  // LeasePilot — Lior Kedmi, LinkedIn already found
  await regenProject({
    projectId: "49b6e7e9-dc1c-4a46-b649-8e9e1a61b356",
    companyName: "LeasePilot",
    posterName: "Lior Kedmi",
    posterTitle: "Co-founder & CEO",
    linkedInUrl: "https://www.linkedin.com/in/lior-kedmi",
  });

  // Bardo — Oscar (co-founder), let web search find his full name + LinkedIn
  await regenProject({
    projectId: "4b9a202c-116a-4151-a35f-61132a6c7512",
    companyName: "Bardo",
    posterName: "Oscar",
    posterTitle: "Co-founder",
  });

  log("All done.");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
