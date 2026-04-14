import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // Next.js 15 requires params to be Promise
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, icon, color, order } = body;

    const workspace = await prisma.workspace.update({
      where: { id },
      data: { name, icon, color, order },
    });

    return NextResponse.json(workspace);
  } catch (error) {
    console.error("Failed to update workspace:", error);
    return NextResponse.json(
      { error: "Failed to update workspace" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // Next.js 15 requires params to be Promise
) {
  try {
    const { id } = await params;
    await prisma.workspace.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete workspace:", error);
    return NextResponse.json(
      { error: "Failed to delete workspace" },
      { status: 500 }
    );
  }
}
