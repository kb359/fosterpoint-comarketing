import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateResearch } from "@/lib/ai/research";
import { generateGiftIdeas } from "@/lib/ai/gifts";
import { sendSlackBriefing } from "@/lib/slack";

export async function POST(request: NextRequest) {
  try {
    const webhookSecret =
      request.headers.get("x-cal-secret-key") ||
      request.headers.get("calcom-webhook-secret");
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
    const companyWebsite =
      payload.payload?.responses?.website?.value ||
      payload.payload?.responses?.companyWebsite?.value ||
      null;
    const contactLinkedinUrl =
      payload.payload?.responses?.linkedin?.value ||
      payload.payload?.responses?.linkedinUrl?.value ||
      null;

    if (!bookerName && !companyName) {
      return Response.json({ error: "Missing required booking data" }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        companyName: companyName || "Unknown Company",
        companyWebsite: companyWebsite,
        contactName: bookerName || "Unknown Contact",
        contactEmail: bookerEmail || null,
        contactLinkedinUrl: contactLinkedinUrl,
        callDate: payload.payload?.startTime
          ? new Date(payload.payload.startTime)
          : null,
      },
    });

    // Fire-and-forget: research + gift ideas + Slack
    runBookingPipeline(project.id).catch((err) =>
      console.error(`Booking pipeline failed for project ${project.id}:`, err)
    );

    return Response.json({ success: true, projectId: project.id }, { status: 200 });
  } catch (error) {
    console.error("Cal.com webhook error:", error);
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function runBookingPipeline(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return;

  try {
    // 1. Generate research
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
        { projectId, type: "company_brief", content: research.companyBrief },
        { projectId, type: "person_brief", content: research.personBrief },
        { projectId, type: "call_questions", content: research.callQuestions },
      ],
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { stage: "researched" },
    });

    // 2. Generate gift ideas (parallel with Slack)
    const [giftIdeas] = await Promise.all([
      generateGiftIdeas({
        companyName: project.companyName,
        companyBrief: research.companyBrief,
        personBrief: research.personBrief,
        contactName: project.contactName,
        contactTitle: project.contactTitle,
      }).catch(() => []),

      // 3. Send Slack briefing
      sendSlackBriefing({
        companyName: project.companyName,
        companyDescription: project.companyDescription,
        contactName: project.contactName,
        contactTitle: project.contactTitle,
        contactBio: project.contactBio,
        callDate: project.callDate,
        research: [
          { type: "company_brief", content: research.companyBrief },
          { type: "person_brief", content: research.personBrief },
          { type: "call_questions", content: research.callQuestions },
        ],
      }).catch((err) => console.error("Slack briefing error:", err)),
    ]);

    if (giftIdeas.length > 0) {
      await prisma.project.update({
        where: { id: projectId },
        data: { giftIdeas: giftIdeas as object[] },
      });
    }

    await prisma.activityLog.create({
      data: {
        projectId,
        action: "booking_pipeline_complete",
        details: `Research + gift ideas generated. Slack briefing sent.`,
      },
    });

    console.log(`Booking pipeline complete for project ${projectId}`);
  } catch (error) {
    console.error(`Booking pipeline failed for ${projectId}:`, error);
    await prisma.activityLog.create({
      data: {
        projectId,
        action: "booking_pipeline_failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

