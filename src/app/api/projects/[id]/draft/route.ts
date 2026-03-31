import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateDraft } from "@/lib/ai/draft";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        research: true,
        transcripts: { orderBy: { createdAt: "desc" }, take: 1 },
        writingAnalyses: { orderBy: { createdAt: "desc" }, take: 1 },
        postDrafts: { orderBy: { version: "desc" }, take: 1 },
      },
    });

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const companyBrief = project.research.find((r) => r.type === "company_brief");
    const personBrief = project.research.find((r) => r.type === "person_brief");
    const transcript = project.transcripts[0];
    const writingAnalysis = project.writingAnalyses[0];

    if (!companyBrief || !personBrief) {
      return Response.json({ error: "Research not found. Run research first." }, { status: 400 });
    }
    if (!transcript?.callSummary) {
      return Response.json({ error: "Transcript summary not found. Import transcript first." }, { status: 400 });
    }
    if (!writingAnalysis) {
      return Response.json({ error: "Writing analysis not found. Run analysis first." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { guidance } = body as { guidance?: string };

    const result = await generateDraft({
      companyBrief: companyBrief.content,
      personBrief: personBrief.content,
      callSummary: transcript.callSummary,
      writingAnalysis: writingAnalysis.analysis,
      posterName: project.posterName || project.contactName,
      posterTitle: project.contactTitle || "",
      companyName: project.companyName,
      guidance,
    });

    const nextVersion = project.postDrafts.length > 0 ? project.postDrafts[0].version + 1 : 1;

    const draft = await prisma.postDraft.create({
      data: {
        projectId: id,
        version: nextVersion,
        content: result.content,
        quoteOptions: result.quoteOptions,
        status: "draft",
      },
    });

    await prisma.project.update({
      where: { id },
      data: { stage: "draft_ready" },
    });

    await prisma.activityLog.create({
      data: {
        projectId: id,
        action: "draft_generated",
        details: `Draft v${nextVersion} generated${guidance ? " with guidance" : ""}`,
      },
    });

    return Response.json(draft, { status: 201 });
  } catch (error) {
    console.error("Failed to generate draft:", error);
    return Response.json({ error: "Failed to generate draft" }, { status: 500 });
  }
}
