import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const project = await prisma.project.findUnique({
      where: { shareToken: token },
      include: {
        postDrafts: {
          orderBy: { version: "desc" },
          take: 1,
          include: { comments: { orderBy: { createdAt: "asc" } } },
        },
      },
    });

    if (!project) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const latestDraft = project.postDrafts[0];
    if (!latestDraft) {
      return Response.json({ error: "No draft available" }, { status: 404 });
    }

    return Response.json({
      companyName: project.companyName,
      posterName: project.posterName || project.contactName,
      content: latestDraft.content,
      quoteOptions: latestDraft.quoteOptions,
      selectedQuoteId: latestDraft.selectedQuoteId,
      customerEditedContent: latestDraft.customerEditedContent,
      status: latestDraft.status,
      draftId: latestDraft.id,
      comments: latestDraft.comments,
    });
  } catch (error) {
    console.error("Failed to get shared draft:", error);
    return Response.json({ error: "Failed to get shared draft" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const project = await prisma.project.findUnique({
      where: { shareToken: token },
      include: {
        postDrafts: { orderBy: { version: "desc" }, take: 1 },
      },
    });

    if (!project) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const latestDraft = project.postDrafts[0];
    if (!latestDraft) {
      return Response.json({ error: "No draft available" }, { status: 404 });
    }

    const body = await request.json();
    const { content, selectedQuoteId, saveOnly } = body as {
      content?: string;
      selectedQuoteId?: string;
      saveOnly?: boolean;
    };

    const updateData: Record<string, unknown> = {};
    if (content !== undefined) updateData.customerEditedContent = content;
    if (selectedQuoteId !== undefined) updateData.selectedQuoteId = selectedQuoteId;

    if (saveOnly) {
      // Just save edits without approving
      updateData.status = "customer_editing";
      await prisma.postDraft.update({
        where: { id: latestDraft.id },
        data: updateData,
      });
      return Response.json({ success: true, saved: true });
    }

    // Full approval
    updateData.status = "approved";
    await prisma.postDraft.update({
      where: { id: latestDraft.id },
      data: updateData,
    });

    await prisma.project.update({
      where: { id: project.id },
      data: { stage: "approved" },
    });

    await prisma.activityLog.create({
      data: {
        projectId: project.id,
        action: "customer_approved",
        details: "Customer approved the draft via share link",
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to submit customer edits:", error);
    return Response.json({ error: "Failed to submit customer edits" }, { status: 500 });
  }
}
