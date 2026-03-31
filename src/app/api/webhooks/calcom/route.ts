import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateResearch } from "@/lib/ai/research";

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = request.headers.get("x-cal-secret-key") || request.headers.get("calcom-webhook-secret");
    const expectedSecret = process.env.CALCOM_WEBHOOK_SECRET;

    if (!expectedSecret || webhookSecret !== expectedSecret) {
      return Response.json({ error: "Invalid webhook secret" }, { status: 401 });
    }

    const payload = await request.json();

    const bookerName =
      payload.payload?.responses?.name?.value ||
      payload.payload?.attendees?.[0]?.name ||
      "";
    const bookerEmail =
      payload.payload?.responses?.email?.value ||
      payload.payload?.attendees?.[0]?.email ||
      "";
    const companyName =
      payload.payload?.responses?.company?.value ||
      payload.payload?.responses?.companyName?.value ||
      "";

    if (!bookerName && !companyName) {
      return Response.json({ error: "Missing required booking data" }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        companyName: companyName || "Unknown Company",
        contactName: bookerName || "Unknown Contact",
        contactEmail: bookerEmail || null,
        callDate: payload.payload?.startTime ? new Date(payload.payload.startTime) : null,
      },
    });

    // Immediately trigger research generation in the background.
    // We don't await this in the webhook response to avoid timeouts,
    // but we do fire-and-forget so research is ready for the briefing.
    generateResearchInBackground(project.id, {
      companyName: project.companyName,
      companyWebsite: project.companyWebsite,
      contactName: project.contactName,
      contactEmail: project.contactEmail,
      contactTitle: project.contactTitle,
      contactLinkedinUrl: project.contactLinkedinUrl,
    }).catch((err) =>
      console.error(`Background research generation failed for project ${project.id}:`, err)
    );

    return Response.json({ success: true, projectId: project.id }, { status: 200 });
  } catch (error) {
    console.error("Cal.com webhook error:", error);
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function generateResearchInBackground(
  projectId: string,
  projectData: {
    companyName: string;
    companyWebsite: string | null;
    contactName: string;
    contactEmail: string | null;
    contactTitle: string | null;
    contactLinkedinUrl: string | null;
  }
) {
  try {
    const research = await generateResearch(projectData);

    await prisma.research.createMany({
      data: [
        {
          projectId,
          type: "company_brief",
          content: research.companyBrief,
        },
        {
          projectId,
          type: "person_brief",
          content: research.personBrief,
        },
        {
          projectId,
          type: "call_questions",
          content: research.callQuestions,
        },
      ],
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { stage: "researched" },
    });

    await prisma.activityLog.create({
      data: {
        projectId,
        action: "auto_research_generated",
        details: "Research auto-generated after Cal.com booking",
      },
    });

    console.log(`Research generated for project ${projectId}`);
  } catch (error) {
    console.error(`Research generation failed for project ${projectId}:`, error);

    await prisma.activityLog.create({
      data: {
        projectId,
        action: "auto_research_failed",
        details: `Research generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
    });
  }
}
