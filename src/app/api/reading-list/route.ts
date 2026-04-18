import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

// Ensure the default reading list feed exists
async function getReadingListFeed(userId: string) {
  let feed = await prisma.feed.findFirst({
    where: { 
      userId, 
      type: "read_later_system" 
    }
  });

  if (!feed) {
    feed = await prisma.feed.create({
      data: {
        title: "Reading List",
        type: "read_later_system",
        integrationLevel: "link",
        userId
      }
    });
  }
  
  return feed;
}

export async function GET() {
  try {
    const userId = await getUserId();
    const feedItems = await prisma.feedItem.findMany({
      where: { 
        feed: { userId },
        isSavedForLater: true 
      },
      include: {
        tags: {
          include: { tag: true }
        },
        feed: {
          select: { title: true, favicon: true, type: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(feedItems);
  } catch (error) {
    console.error("Failed to fetch reading list:", error);
    return NextResponse.json(
      { error: "Failed to fetch reading list" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    const body = await req.json();
    const { title, url, note, tagIds } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const normalizedTagIds = Array.isArray(tagIds)
      ? tagIds.filter((tagId: unknown): tagId is string => typeof tagId === "string" && tagId.trim().length > 0)
      : [];

    let validTagIds: string[] = [];
    if (normalizedTagIds.length > 0) {
      const userTags = await prisma.tag.findMany({
        where: {
          userId,
          id: { in: normalizedTagIds },
        },
        select: { id: true },
      });

      validTagIds = userTags.map((tag) => tag.id);

      if (validTagIds.length !== normalizedTagIds.length) {
        return NextResponse.json(
          { error: "One or more tagIds are invalid for this user" },
          { status: 400 }
        );
      }
    }

    const feed = await getReadingListFeed(userId);

    const feedItem = await prisma.feedItem.create({
      data: {
        title,
        url,
        note,
        isSavedForLater: true,
        feedId: feed.id,
        // associate tags if provided
        tags: validTagIds.length > 0 ? {
          create: validTagIds.map((tagId: string) => ({
            tag: { connect: { id: tagId } }
          }))
        } : undefined
      },
      include: {
        tags: { include: { tag: true } }
      }
    });

    return NextResponse.json(feedItem, { status: 201 });
  } catch (error) {
    console.error("Failed to add to reading list:", error);
    return NextResponse.json(
      { error: "Failed to add to reading list" },
      { status: 500 }
    );
  }
}
