import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSlackBriefing } from "@/lib/slack";

export async function POST(request: NextRequest) {
  try {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

    const projects = await prisma.project.findMany({
      where: {
        stage: "researched",
        callDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      include: {
        research: true,
      },
    });

    if (projects.length === 0) {
      return Response.json({
        success: true,
        message: "No briefings to send today",
        sent: 0,
      });
    }

    const results: Array<{ projectId: string; companyName: string; status: string }> = [];

    for (const project of projects) {
      try {
        await sendSlackBriefing({
          companyName: project.companyName,
          companyDescription: project.companyDescription,
          contactName: project.contactName,
          contactTitle: project.contactTitle,
          contactBio: project.contactBio,
          callDate: project.callDate,
          research: project.research.map((r) => ({
            type: r.type,
            content: r.content,
          })),
        });

        await prisma.activityLog.create({
          data: {
            projectId: project.id,
            action: "briefing_sent",
            details: "Slack briefing sent for today's call",
          },
        });

        results.push({
          projectId: project.id,
          companyName: project.companyName,
          status: "sent",
        });
      } catch (error) {
        console.error(
          `Failed to send briefing for ${project.companyName}:`,
          error
        );
        results.push({
          projectId: project.id,
          companyName: project.companyName,
          status: `error: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }

    return Response.json({
      success: true,
      sent: results.filter((r) => r.status === "sent").length,
      total: projects.length,
      results,
    });
  } catch (error) {
    console.error("Briefings API error:", error);
    return Response.json(
      { error: "Failed to process briefings" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const now = new Date();
    const upcoming = await prisma.project.findMany({
      where: {
        stage: "researched",
        callDate: {
          gte: now,
        },
      },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        callDate: true,
        stage: true,
        research: {
          select: {
            type: true,
          },
        },
      },
      orderBy: {
        callDate: "asc",
      },
      take: 20,
    });

    return Response.json({
      upcoming: upcoming.map((p) => ({
        id: p.id,
        companyName: p.companyName,
        contactName: p.contactName,
        callDate: p.callDate,
        stage: p.stage,
        researchTypes: p.research.map((r) => r.type),
      })),
    });
  } catch (error) {
    console.error("Briefings GET error:", error);
    return Response.json(
      { error: "Failed to fetch upcoming calls" },
      { status: 500 }
    );
  }
}
