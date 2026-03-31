import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { author, content, highlightedText } = body;

    if (!author || !content) {
      return Response.json({ error: "Author and content required" }, { status: 400 });
    }

    // Find project by share token
    const project = await prisma.project.findUnique({
      where: { shareToken: token },
      include: {
        postDrafts: { orderBy: { version: "desc" }, take: 1 },
      },
    });

    if (!project || project.postDrafts.length === 0) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const draft = project.postDrafts[0];

    const comment = await prisma.draftComment.create({
      data: {
        draftId: draft.id,
        author,
        content,
        highlightedText: highlightedText || null,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        projectId: project.id,
        action: "Customer left a comment",
        details: `${author}: "${content.slice(0, 100)}"`,
      },
    });

    return Response.json(comment, { status: 201 });
  } catch (error) {
    console.error("Failed to create comment:", error);
    return Response.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
