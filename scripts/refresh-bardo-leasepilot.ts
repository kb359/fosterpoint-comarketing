/**
 * Refresh script for Bardo and LeasePilot
 * - Fetches real Fireflies transcripts
 * - Auto-discovers poster LinkedIn URLs
 * - Scrapes 50 LinkedIn posts via PhantomBuster
 * - Runs writing analysis + generates fresh drafts with 3 hook options
 *
 * Run: npx ts-node --skip-project scripts/refresh-bardo-leasepilot.ts
 */

import * as dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { summarizeTranscript } from "../src/lib/ai/transcript";
import { analyzeWriting } from "../src/lib/ai/writing";
import { generateDraft } from "../src/lib/ai/draft";
import { generateResearch } from "../src/lib/ai/research";
import { findLinkedInUrl } from "../src/lib/ai/search";
import { scrapeLinkedInPosts } from "../src/lib/phantombuster";

const prisma = new PrismaClient();

function log(msg: string) {
  console.log(`\n[${new Date().toISOString()}] ${msg}`);
}

async function fetchFirefliesTranscript(meetingId: string): Promise<{
  rawTranscript: string;
  participants: string[];
} | null> {
  const apiKey = process.env.FIREFLIES_API_KEY;
  if (!apiKey) {
    console.warn("No FIREFLIES_API_KEY set — skipping transcript fetch");
    return null;
  }

  const query = `
    query Transcript($transcriptId: String!) {
      transcript(id: $transcriptId) {
        id
        title
        participants
        sentences {
          speaker_name
          text
        }
      }
    }
  `;

  const res = await fetch("https://api.fireflies.ai/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables: { transcriptId: meetingId } }),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await res.json() as any;
  const transcript = data?.data?.transcript;
  if (!transcript) {
    console.error("Fireflies response:", JSON.stringify(data));
    return null;
  }

  const rawTranscript = (transcript.sentences ?? [])
    .map((s: { speaker_name: string; text: string }) => `${s.speaker_name}: ${s.text}`)
    .join("\n");

  return {
    rawTranscript,
    participants: transcript.participants ?? [],
  };
}

async function runRefreshPipeline(opts: {
  projectId: string;
  companyName: string;
  contactName: string;
  contactEmail: string | null;
  contactTitle: string | null;
  companyWebsite: string | null;
  firefliesMeetingId: string;
  knownPosterName?: string; // optional override — will be auto-detected from transcript otherwise
}) {
  log(`=== Starting refresh for ${opts.companyName} (${opts.projectId}) ===`);

  const project = await prisma.project.findUnique({
    where: { id: opts.projectId },
    include: { research: true },
  });
  if (!project) throw new Error(`Project ${opts.projectId} not found`);

  // ─── 1. Fetch transcript from Fireflies ────────────────────────────────────
  log(`${opts.companyName}: Fetching transcript ${opts.firefliesMeetingId}...`);
  const transcriptData = await fetchFirefliesTranscript(opts.firefliesMeetingId);

  if (!transcriptData || !transcriptData.rawTranscript) {
    throw new Error(`Could not fetch transcript ${opts.firefliesMeetingId}`);
  }
  log(`${opts.companyName}: Got transcript (${transcriptData.rawTranscript.length} chars)`);

  // ─── 2. Summarize + identify poster ───────────────────────────────────────
  log(`${opts.companyName}: Summarizing transcript...`);
  const { summary, identifiedPoster } = await summarizeTranscript(
    transcriptData.rawTranscript,
    opts.companyName,
    opts.contactName
  );
  const posterName = opts.knownPosterName ?? identifiedPoster;
  log(`${opts.companyName}: Poster identified: ${posterName}`);

  await prisma.transcript.deleteMany({ where: { projectId: opts.projectId } });
  await prisma.transcript.create({
    data: {
      projectId: opts.projectId,
      firefliesMeetingId: opts.firefliesMeetingId,
      rawTranscript: transcriptData.rawTranscript,
      callSummary: summary,
      identifiedPoster: posterName,
    },
  });

  await prisma.project.update({
    where: { id: opts.projectId },
    data: { stage: "call_complete", posterName },
  });

  await prisma.activityLog.create({
    data: {
      projectId: opts.projectId,
      action: "transcript_imported",
      details: `Transcript imported from Fireflies (${opts.firefliesMeetingId}). Poster: ${posterName}`,
    },
  });

  // ─── 3. Generate research (if missing) ────────────────────────────────────
  const hasResearch = project.research.some((r) => r.type === "company_brief");
  let companyBrief = project.research.find((r) => r.type === "company_brief")?.content ?? "";
  let personBrief = project.research.find((r) => r.type === "person_brief")?.content ?? "";

  if (!hasResearch) {
    log(`${opts.companyName}: No research found — generating...`);
    const research = await generateResearch({
      companyName: opts.companyName,
      companyWebsite: opts.companyWebsite,
      contactName: opts.contactName,
      contactEmail: opts.contactEmail,
      contactTitle: opts.contactTitle,
      contactLinkedinUrl: null,
    });

    await prisma.research.deleteMany({ where: { projectId: opts.projectId } });
    await prisma.research.createMany({
      data: [
        { projectId: opts.projectId, type: "company_brief", content: research.companyBrief },
        { projectId: opts.projectId, type: "person_brief", content: research.personBrief },
        { projectId: opts.projectId, type: "call_questions", content: research.callQuestions },
      ],
    });

    companyBrief = research.companyBrief;
    personBrief = research.personBrief;
    log(`${opts.companyName}: Research saved.`);
  } else {
    log(`${opts.companyName}: Research already exists — using existing.`);
  }

  // ─── 4. Find poster LinkedIn URL ──────────────────────────────────────────
  let posterLinkedinUrl: string | null = project.posterLinkedinUrl ?? project.contactLinkedinUrl ?? null;

  if (!posterLinkedinUrl) {
    log(`${opts.companyName}: Searching for LinkedIn URL for "${posterName}"...`);
    posterLinkedinUrl = await findLinkedInUrl(posterName, opts.companyName);

    if (posterLinkedinUrl) {
      log(`${opts.companyName}: Found LinkedIn URL: ${posterLinkedinUrl}`);
      await prisma.project.update({
        where: { id: opts.projectId },
        data: { posterLinkedinUrl },
      });
      await prisma.activityLog.create({
        data: {
          projectId: opts.projectId,
          action: "linkedin_url_found",
          details: `Auto-discovered LinkedIn URL for ${posterName}: ${posterLinkedinUrl}`,
        },
      });
    } else {
      log(`${opts.companyName}: WARNING — could not find LinkedIn URL for ${posterName}. Will use transcript as voice.`);
    }
  } else {
    log(`${opts.companyName}: Using existing LinkedIn URL: ${posterLinkedinUrl}`);
  }

  // ─── 5. Scrape LinkedIn posts ──────────────────────────────────────────────
  let writingSamples: string[] = [];

  if (posterLinkedinUrl) {
    log(`${opts.companyName}: Scraping LinkedIn posts for ${posterName}...`);
    const posts = await scrapeLinkedInPosts(posterLinkedinUrl);
    log(`${opts.companyName}: Got ${posts.length} LinkedIn posts`);

    if (posts.length > 0) {
      writingSamples = posts.map((p) => p.text).filter(Boolean);

      await prisma.writingSample.deleteMany({ where: { projectId: opts.projectId } });
      await prisma.writingSample.createMany({
        data: writingSamples.map((text) => ({
          projectId: opts.projectId,
          sourceType: "linkedin_post" as const,
          content: text,
          belongsTo: posterName,
        })),
      });

      await prisma.activityLog.create({
        data: {
          projectId: opts.projectId,
          action: "linkedin_posts_scraped",
          details: `${posts.length} LinkedIn posts scraped for ${posterName}`,
        },
      });
    }
  }

  // Fall back to transcript voice if no posts found
  if (writingSamples.length === 0) {
    log(`${opts.companyName}: No LinkedIn posts found — using transcript as voice fallback`);
    writingSamples = [transcriptData.rawTranscript];
    await prisma.activityLog.create({
      data: {
        projectId: opts.projectId,
        action: "writing_voice_fallback",
        details: `No LinkedIn posts found for ${posterName}. Using transcript voice as fallback.`,
      },
    });
  }

  // ─── 6. Writing analysis ──────────────────────────────────────────────────
  log(`${opts.companyName}: Analyzing writing style (${writingSamples.length} samples)...`);
  const writingAnalysis = await analyzeWriting(writingSamples, posterName);

  await prisma.writingAnalysis.deleteMany({ where: { projectId: opts.projectId } });
  await prisma.writingAnalysis.create({
    data: {
      projectId: opts.projectId,
      subjectName: posterName,
      analysis: writingAnalysis,
    },
  });

  await prisma.project.update({
    where: { id: opts.projectId },
    data: { stage: "writing_analyzed" },
  });
  log(`${opts.companyName}: Writing analysis saved.`);

  // ─── 7. Generate draft with 3 hook options ────────────────────────────────
  log(`${opts.companyName}: Generating draft with 3 hook options...`);
  const { content, hookOptions, quoteOptions } = await generateDraft({
    companyBrief,
    personBrief,
    callSummary: summary,
    writingAnalysis,
    posterName,
    posterTitle: opts.contactTitle ?? "",
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

  await prisma.project.update({
    where: { id: opts.projectId },
    data: { stage: "draft_ready" },
  });

  await prisma.activityLog.create({
    data: {
      projectId: opts.projectId,
      action: "refresh_pipeline_complete",
      details: `Refresh complete. Poster: ${posterName}. LinkedIn scraped: ${writingSamples[0] !== transcriptData.rawTranscript}. Hook options: ${hookOptions.length}`,
    },
  });

  log(`${opts.companyName}: DONE — draft ready with ${hookOptions.length} hook options ✓`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log("=== Refresh pipeline: Bardo + LeasePilot ===");

  // Bardo
  await runRefreshPipeline({
    projectId: "4b9a202c-116a-4151-a35f-61132a6c7512",
    companyName: "Bardo",
    contactName: "Kasper Purunen",
    contactEmail: "kasper@bardo.se",
    contactTitle: "Engineer / Head of Security",
    companyWebsite: "https://bardo.se",
    firefliesMeetingId: "01KMTYSEVENGG5TER65Z1K39MR",
    // Poster is one of the founders — let AI identify from transcript
    // If transcript says Oscar or Ingemar, we'll pick one. Override here if needed.
  });

  // LeasePilot
  await runRefreshPipeline({
    projectId: "49b6e7e9-dc1c-4a46-b649-8e9e1a61b356",
    companyName: "LeasePilot",
    contactName: "Lior Kedmi",
    contactEmail: "lkedmi@leasepilot.co",
    contactTitle: null,
    companyWebsite: "https://leasepilot.co",
    firefliesMeetingId: "01KMP5PEYEM9V0QVE582P8GZ30",
  });

  log("\n=== All done ===");
}

main()
  .catch((e) => {
    console.error("Refresh pipeline failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
