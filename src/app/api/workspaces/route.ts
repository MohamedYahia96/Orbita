import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Dummy auth for Phase 2 until auth is implemented in Phase 5
async function getUserId() {
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "demo@orbita.local",
        name: "Demo User",
      },
    });
  }
  return user.id;
}

export async function GET() {
  try {
    const userId = await getUserId();
    const workspaces = await prisma.workspace.findMany({
      where: { userId },
      orderBy: { order: "asc" },
      include: {
        feeds: true,
      },
    });
    return NextResponse.json(workspaces);
  } catch (error) {
    console.error("Failed to fetch workspaces:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspaces" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    const body = await req.json();
    const { name, icon, color, order } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Workspace name is required" },
        { status: 400 }
      );
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        icon,
        color,
        order: order || 0,
        userId,
      },
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    console.error("Failed to create workspace:", error);
    return NextResponse.json(
      { error: "Failed to create workspace" },
      { status: 500 }
    );
  }
}
