import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateResearch } from "@/lib/ai/research";

export async function POST(
  _request: NextRequest,
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

    const result = await generateResearch({
      companyName: project.companyName,
      companyWebsite: project.companyWebsite,
      contactName: project.contactName,
      contactEmail: project.contactEmail,
      contactTitle: project.contactTitle,
      contactLinkedinUrl: project.contactLinkedinUrl,
    });

    const researchRecords = await prisma.$transaction([
      prisma.research.create({
        data: {
          projectId: id,
          type: "company_brief",
          content: result.companyBrief,
        },
      }),
      prisma.research.create({
        data: {
          projectId: id,
          type: "person_brief",
          content: result.personBrief,
        },
      }),
      prisma.research.create({
        data: {
          projectId: id,
          type: "call_questions",
          content: result.callQuestions,
        },
      }),
    ]);

    if (project.stage === "booked") {
      await prisma.project.update({
        where: { id },
        data: { stage: "researched" },
      });

      await prisma.activityLog.create({
        data: {
          projectId: id,
          action: "stage_changed",
          details: "Stage changed from booked to researched",
        },
      });
    }

    return Response.json(researchRecords, { status: 201 });
  } catch (error) {
    console.error("Failed to generate research:", error);
    return Response.json({ error: "Failed to generate research" }, { status: 500 });
  }
}
