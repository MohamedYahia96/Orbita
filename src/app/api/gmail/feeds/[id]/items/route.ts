import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/current-user";

async function getUserId() {
  const user = await getOrCreateDemoUser();
  return user.id;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    const { searchParams } = new URL(req.url);
    const limitParam = Number.parseInt(searchParams.get("limit") || "20", 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 20;

    const gmailFeed = await prisma.feed.findFirst({
      where: {
        id,
        userId,
        type: "gmail",
      },
      select: {
        id: true,
      },
    });

    if (!gmailFeed) {
      return NextResponse.json({ error: "Gmail feed not found" }, { status: 404 });
    }

    const items = await prisma.feedItem.findMany({
      where: {
        feedId: id,
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Failed to fetch gmail items:", error);
    return NextResponse.json({ error: "Failed to fetch gmail items" }, { status: 500 });
  }
}
