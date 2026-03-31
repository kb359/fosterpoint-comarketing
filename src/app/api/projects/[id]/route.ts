import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
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
        transcripts: true,
        writingSamples: true,
        writingAnalyses: true,
        postDrafts: { orderBy: { version: "desc" } },
        activityLogs: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    return Response.json(project);
  } catch (error) {
    console.error("Failed to get project:", error);
    return Response.json({ error: "Failed to get project" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await request.json();

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const project = await prisma.project.update({
      where: { id },
      data: body,
    });

    if (body.stage && body.stage !== existing.stage) {
      await prisma.activityLog.create({
        data: {
          projectId: id,
          action: "stage_changed",
          details: `Stage changed from ${existing.stage} to ${body.stage}`,
        },
      });
    }

    return Response.json(project);
  } catch (error) {
    console.error("Failed to update project:", error);
    return Response.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    await prisma.project.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete project:", error);
    return Response.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
