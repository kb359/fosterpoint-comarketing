import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { summarizeTranscript } from "@/lib/ai/transcript";
import { analyzeWriting } from "@/lib/ai/writing";
import { generateDraft } from "@/lib/ai/draft";
import { scrapeLinkedInPosts } from "@/lib/phantombuster";
import { findLinkedInUrl } from "@/lib/ai/search";
import { sendSlackMessage } from "@/lib/slack";

// Fetch full transcript from Fireflies GraphQL API
async function fetchFirefliesTranscript(meetingId: string): Promise<{
  rawTranscript: string;
  participants: string[];
} | null> {
  const apiKey = process.env.FIREFLIES_API_KEY;
  if (!apiKey) return null;

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

  try {
    const res = await fetch("https://api.fireflies.ai/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query, variables: { transcriptId: meetingId } }),
    });

    const data = await res.json();
    const transcript = data?.data?.transcript;
    if (!transcript) return null;

    const rawTranscript = (transcript.sentences ?? [])
      .map((s: { speaker_name: string; text: string }) => `${s.speaker_name}: ${s.text}`)
      .join("\n");

    return {
      rawTranscript,
      participants: transcript.participants ?? [],
    };
  } catch (err) {
    console.error("Fireflies GraphQL fetch error:", err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    const meetingId =
      payload.meetingId ||
      payload.meeting_id ||
      payload.data?.meetingId ||
      payload.transcriptId;

    const participantEmails: string[] =
      payload.participants?.map((p: { email?: string }) => p.email).filter(Boolean) ||
      payload.data?.participants?.map((p: { email?: string }) => p.email).filter(Boolean) ||
      [];

    if (!meetingId) {
      return Response.json({ error: "Missing meeting ID" }, { status: 400 });
    }

    // Find matching project by participant email
    let matchedProject = null;
    for (const email of participantEmails) {
      const project = await prisma.project.findFirst({
        where: { contactEmail: email },
        orderBy: { createdAt: "desc" },
      });
      if (project) {
        matchedProject = project;
        break;
      }
    }

    if (!matchedProject) {
      return Response.json({ message: "No matching project found" }, { status: 200 });
    }

    // Acknowledge immediately, run pipeline in background
    runPostCallPipeline(matchedProject.id, meetingId).catch((err) =>
      console.error(`Post-call pipeline failed for project ${matchedProject!.id}:`, err)
    );

    return Response.json({ success: true, projectId: matchedProject.id }, { status: 200 });
  } catch (error) {
    console.error("Fireflies webhook error:", error);
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function runPostCallPipeline(projectId: string, meetingId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { research: true },
  });
  if (!project) return;

  try {
    // 1. Fetch transcript from Fireflies API
    const transcriptData = await fetchFirefliesTranscript(meetingId);
    if (!transcriptData || !transcriptData.rawTranscript) {
      console.error(`No transcript found for meeting ${meetingId}`);
      return;
    }

    // 2. Summarize transcript + identify poster
    const { summary, identifiedPoster } = await summarizeTranscript(
      transcriptData.rawTranscript,
      project.companyName,
      project.contactName
    );

    await prisma.transcript.deleteMany({ where: { projectId } });
    await prisma.transcript.create({
      data: {
        projectId,
        firefliesMeetingId: meetingId,
        rawTranscript: transcriptData.rawTranscript,
        callSummary: summary,
        identifiedPoster,
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: {
        stage: "call_complete",
        posterName: identifiedPoster,
      },
    });

    await prisma.activityLog.create({
      data: {
        projectId,
        action: "transcript_imported",
        details: `Transcript imported from Fireflies (${meetingId}). Poster: ${identifiedPoster}`,
      },
    });

    // 3. Find the poster's LinkedIn URL
    // Use manually set URL first, otherwise auto-search by name + company
    let posterLinkedinUrl = project.posterLinkedinUrl ?? project.contactLinkedinUrl ?? null;

    if (!posterLinkedinUrl) {
      console.log(`No LinkedIn URL set for ${identifiedPoster}, searching...`);
      posterLinkedinUrl = await findLinkedInUrl(identifiedPoster, project.companyName);

      if (posterLinkedinUrl) {
        // Save the discovered URL to the project
        await prisma.project.update({
          where: { id: projectId },
          data: { posterLinkedinUrl },
        });
        await prisma.activityLog.create({
          data: {
            projectId,
            action: "linkedin_url_found",
            details: `Auto-discovered LinkedIn URL for ${identifiedPoster}: ${posterLinkedinUrl}`,
          },
        });
        console.log(`Found LinkedIn URL for ${identifiedPoster}: ${posterLinkedinUrl}`);
      } else {
        console.warn(`Could not find LinkedIn URL for ${identifiedPoster} at ${project.companyName}`);
      }
    }

    // 4. Scrape LinkedIn posts
    let writingSamples: string[] = [];

    if (posterLinkedinUrl) {
      const posts = await scrapeLinkedInPosts(posterLinkedinUrl);
      if (posts.length > 0) {
        const postTexts = posts.map((p) => p.text).filter(Boolean);
        writingSamples = postTexts;

        await prisma.writingSample.deleteMany({ where: { projectId } });
        await prisma.writingSample.createMany({
          data: postTexts.map((text) => ({
            projectId,
            sourceType: "linkedin_post" as const,
            content: text,
            belongsTo: identifiedPoster,
          })),
        });

        await prisma.activityLog.create({
          data: {
            projectId,
            action: "linkedin_posts_scraped",
            details: `${posts.length} LinkedIn posts scraped for ${identifiedPoster}`,
          },
        });
      }
    }

    // If we have no LinkedIn posts, use transcript as voice reference
    // (clearly label this so the draft knows it's imperfect)
    if (writingSamples.length === 0) {
      writingSamples = [transcriptData.rawTranscript];
      await prisma.activityLog.create({
        data: {
          projectId,
          action: "writing_voice_fallback",
          details: `No LinkedIn posts found for ${identifiedPoster}. Using transcript voice as fallback.`,
        },
      });
    }

    // 5. Writing analysis
    const writingAnalysis = await analyzeWriting(writingSamples, identifiedPoster);

    await prisma.writingAnalysis.deleteMany({ where: { projectId } });
    await prisma.writingAnalysis.create({
      data: {
        projectId,
        subjectName: identifiedPoster,
        analysis: writingAnalysis,
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { stage: "writing_analyzed" },
    });

    // 6. Generate draft with 3 hook options
    const companyBrief =
      project.research.find((r) => r.type === "company_brief")?.content ?? "";
    const personBrief =
      project.research.find((r) => r.type === "person_brief")?.content ?? "";

    const { content, hookOptions, quoteOptions } = await generateDraft({
      companyBrief,
      personBrief,
      callSummary: summary,
      writingAnalysis,
      posterName: identifiedPoster,
      posterTitle: project.contactTitle ?? "",
      companyName: project.companyName,
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

    await prisma.project.update({
      where: { id: projectId },
      data: { stage: "draft_ready" },
    });

    await prisma.activityLog.create({
      data: {
        projectId,
        action: "post_call_pipeline_complete",
        details: `Draft ready for ${project.companyName}. Poster: ${identifiedPoster}. LinkedIn scraped: ${writingSamples !== [transcriptData.rawTranscript]}`,
      },
    });

    // 7. Slack notification
    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const linkedInNote = posterLinkedinUrl
      ? `LinkedIn scraped (${writingSamples.length > 0 ? writingSamples.length : 0} posts)`
      : "No LinkedIn found — draft based on transcript voice";

    await sendSlackMessage(
      `Draft ready: ${project.companyName}`,
      [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `Draft Ready: ${project.companyName}`,
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Poster:* ${identifiedPoster}\n*Contact:* ${project.contactName}\n*Voice:* ${linkedInNote}\n\n3 hook options generated. Ready for review.`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Review Draft" },
              url: `${appUrl}/projects/${projectId}`,
            },
          ],
        },
      ]
    ).catch((err) => console.error("Slack draft-ready notification error:", err));

    console.log(`Post-call pipeline complete for project ${projectId}`);
  } catch (error) {
    console.error(`Post-call pipeline failed for ${projectId}:`, error);
    await prisma.activityLog.create({
      data: {
        projectId,
        action: "post_call_pipeline_failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}
