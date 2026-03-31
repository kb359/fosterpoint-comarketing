import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateResearch } from "@/lib/ai/research";
import { analyzeWriting } from "@/lib/ai/writing";
import { generateDraft } from "@/lib/ai/draft";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        research: true,
        transcripts: true,
        writingSamples: true,
        writingAnalyses: true,
        postDrafts: true,
      },
    });

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const actions: string[] = [];

    // Step 1: If booked and no research, generate research
    if (project.stage === "booked" && project.research.length === 0) {
      const research = await generateResearch({
        companyName: project.companyName,
        companyWebsite: project.companyWebsite,
        contactName: project.contactName,
        contactEmail: project.contactEmail,
        contactTitle: project.contactTitle,
        contactLinkedinUrl: project.contactLinkedinUrl,
      });

      await prisma.research.createMany({
        data: [
          {
            projectId: id,
            type: "company_brief",
            content: research.companyBrief,
          },
          {
            projectId: id,
            type: "person_brief",
            content: research.personBrief,
          },
          {
            projectId: id,
            type: "call_questions",
            content: research.callQuestions,
          },
        ],
      });

      await prisma.project.update({
        where: { id },
        data: { stage: "researched" },
      });

      await prisma.activityLog.create({
        data: {
          projectId: id,
          action: "auto_research_generated",
          details: "Research generated via auto-pipeline",
        },
      });

      actions.push("research_generated");
    }

    // Step 2: If call_complete and no writing analysis, analyze writing
    if (
      project.stage === "call_complete" &&
      project.writingAnalyses.length === 0
    ) {
      if (project.writingSamples.length === 0) {
        actions.push(
          "writing_analysis_skipped: no writing samples available. Add samples manually or scrape from LinkedIn/blog."
        );
      } else {
        const posterName = project.posterName ?? project.contactName;
        const posterSamples = project.writingSamples
          .filter((s) => s.belongsTo === posterName)
          .map((s) => s.content);

        if (posterSamples.length === 0) {
          actions.push(
            `writing_analysis_skipped: no samples found for poster "${posterName}"`
          );
        } else {
          const analysis = await analyzeWriting(posterSamples, posterName);

          await prisma.writingAnalysis.create({
            data: {
              projectId: id,
              subjectName: posterName,
              analysis,
            },
          });

          await prisma.project.update({
            where: { id },
            data: { stage: "writing_analyzed" },
          });

          await prisma.activityLog.create({
            data: {
              projectId: id,
              action: "auto_writing_analyzed",
              details: `Writing analysis generated for ${posterName} via auto-pipeline`,
            },
          });

          actions.push("writing_analyzed");
        }
      }
    }

    // Step 3: If writing_analyzed and no draft, generate draft
    if (project.stage === "writing_analyzed" && project.postDrafts.length === 0) {
      const companyBrief =
        project.research.find((r) => r.type === "company_brief")?.content ?? "";
      const personBrief =
        project.research.find((r) => r.type === "person_brief")?.content ?? "";
      const callSummary = project.transcripts[0]?.callSummary ?? "";
      const writingAnalysis = project.writingAnalyses[0]?.analysis ?? "";
      const posterName = project.posterName ?? project.contactName;

      if (!callSummary) {
        actions.push("draft_skipped: no call summary available");
      } else if (!writingAnalysis) {
        actions.push("draft_skipped: no writing analysis available");
      } else {
        const draft = await generateDraft({
          companyBrief,
          personBrief,
          callSummary,
          writingAnalysis,
          posterName,
          posterTitle: project.contactTitle ?? "",
          companyName: project.companyName,
        });

        await prisma.postDraft.create({
          data: {
            projectId: id,
            version: 1,
            content: draft.content,
            quoteOptions: draft.quoteOptions,
          },
        });

        await prisma.project.update({
          where: { id },
          data: { stage: "draft_ready" },
        });

        await prisma.activityLog.create({
          data: {
            projectId: id,
            action: "auto_draft_generated",
            details: "Draft generated via auto-pipeline",
          },
        });

        actions.push("draft_generated");
      }
    }

    if (actions.length === 0) {
      actions.push(
        `no_action: project is at stage "${project.stage}" with no applicable auto-pipeline step`
      );
    }

    return Response.json({ success: true, projectId: id, actions });
  } catch (error) {
    console.error("Auto-pipeline error:", error);
    return Response.json(
      {
        error: "Auto-pipeline failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
