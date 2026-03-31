import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { analyzeWriting } from "@/lib/ai/writing";

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

    const body = await request.json().catch(() => ({}));
    const { samples } = body as {
      samples?: Array<{
        content: string;
        sourceUrl?: string;
        sourceType: string;
        belongsTo: string;
      }>;
    };

    if (samples && samples.length > 0) {
      await prisma.writingSample.createMany({
        data: samples.map((s) => ({
          projectId: id,
          content: s.content,
          sourceUrl: s.sourceUrl || null,
          sourceType: s.sourceType as any,
          belongsTo: s.belongsTo,
        })),
      });
    }

    const allSamples = await prisma.writingSample.findMany({
      where: { projectId: id },
    });

    if (allSamples.length === 0) {
      return Response.json(
        { error: "No writing samples found. Provide samples to analyze." },
        { status: 400 }
      );
    }

    const subjectName = allSamples[0].belongsTo;
    const sampleContents = allSamples.map((s) => s.content);

    const analysis = await analyzeWriting(sampleContents, subjectName);

    const writingAnalysis = await prisma.writingAnalysis.create({
      data: {
        projectId: id,
        subjectName,
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
        action: "stage_changed",
        details: `Stage changed from ${project.stage} to writing_analyzed`,
      },
    });

    return Response.json(writingAnalysis, { status: 201 });
  } catch (error) {
    console.error("Failed to analyze writing:", error);
    return Response.json({ error: "Failed to analyze writing" }, { status: 500 });
  }
}
