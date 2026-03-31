import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { summarizeTranscript } from "@/lib/ai/transcript";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    const meetingId = payload.meetingId || payload.meeting_id || payload.data?.meetingId;
    const participantEmails: string[] =
      payload.participants?.map((p: { email?: string }) => p.email).filter(Boolean) ||
      payload.data?.participants?.map((p: { email?: string }) => p.email).filter(Boolean) ||
      [];

    if (!meetingId) {
      return Response.json({ error: "Missing meeting ID" }, { status: 400 });
    }

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

    const rawTranscript = payload.transcript || payload.data?.transcript || "";

    if (rawTranscript) {
      const { summary, identifiedPoster } = await summarizeTranscript(
        rawTranscript,
        matchedProject.companyName,
        matchedProject.contactName
      );

      await prisma.transcript.create({
        data: {
          projectId: matchedProject.id,
          firefliesMeetingId: String(meetingId),
          rawTranscript,
          callSummary: summary,
          identifiedPoster,
        },
      });

      await prisma.project.update({
        where: { id: matchedProject.id },
        data: { stage: "call_complete" },
      });

      await prisma.activityLog.create({
        data: {
          projectId: matchedProject.id,
          action: "transcript_imported",
          details: `Transcript auto-imported from Fireflies (meeting: ${meetingId})`,
        },
      });
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Fireflies webhook error:", error);
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
