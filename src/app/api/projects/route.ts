import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            research: true,
            transcripts: true,
            writingSamples: true,
            writingAnalyses: true,
            postDrafts: true,
            activityLogs: true,
          },
        },
      },
    });

    return Response.json(projects);
  } catch (error) {
    console.error("Failed to list projects:", error);
    return Response.json({ error: "Failed to list projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { companyName, contactName, ...optional } = body;

    if (!companyName || !contactName) {
      return Response.json(
        { error: "companyName and contactName are required" },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        companyName,
        contactName,
        ...optional,
      },
    });

    return Response.json(project, { status: 201 });
  } catch (error) {
    console.error("Failed to create project:", error);
    return Response.json({ error: "Failed to create project" }, { status: 500 });
  }
}
