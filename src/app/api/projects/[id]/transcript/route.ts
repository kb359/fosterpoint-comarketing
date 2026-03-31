import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { summarizeTranscript } from "@/lib/ai/transcript";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();
    const { firefliesMeetingId, rawTranscript } = body;

    if (!rawTranscript) {
      return Response.json({ error: "rawTranscript is required" }, { status: 400 });
    }

    const { summary, identifiedPoster } = await summarizeTranscript(
      rawTranscript,
      project.companyName,
      project.contactName
    );

    const transcript = await prisma.transcript.create({
      data: {
        projectId: id,
        firefliesMeetingId: firefliesMeetingId || null,
        rawTranscript,
        callSummary: summary,
        identifiedPoster: identifiedPoster,
      },
    });

    await prisma.project.update({
      where: { id },
      data: { stage: "call_complete" },
    });

    await prisma.activityLog.create({
      data: {
        projectId: id,
        action: "stage_changed",
        details: `Stage changed from ${project.stage} to call_complete`,
      },
    });

    return Response.json(transcript, { status: 201 });
  } catch (error) {
    console.error("Failed to import transcript:", error);
    return Response.json({ error: "Failed to import transcript" }, { status: 500 });
  }
}
