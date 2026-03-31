import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(
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
        postDrafts: { orderBy: { version: "desc" }, take: 1 },
      },
    });

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const latestDraft = project.postDrafts[0];
    if (!latestDraft) {
      return Response.json({ error: "No draft found. Generate a draft first." }, { status: 400 });
    }

    await prisma.postDraft.update({
      where: { id: latestDraft.id },
      data: { status: "shared" },
    });

    await prisma.project.update({
      where: { id },
      data: { stage: "in_review" },
    });

    await prisma.activityLog.create({
      data: {
        projectId: id,
        action: "draft_shared",
        details: `Draft v${latestDraft.version} shared for review`,
      },
    });

    const shareUrl = `/share/${project.shareToken}`;

    return Response.json({ shareUrl, shareToken: project.shareToken });
  } catch (error) {
    console.error("Failed to generate share link:", error);
    return Response.json({ error: "Failed to generate share link" }, { status: 500 });
  }
}
