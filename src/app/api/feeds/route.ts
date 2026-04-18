import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizeFeedInput, resolveYoutubeHandleRssUrl } from "@/lib/feed-source";
import { getOrCreateDemoUser } from "@/lib/current-user";

async function getUserId() {
  const user = await getOrCreateDemoUser();
  return user.id;
}

export async function GET(req: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    const whereClause: { userId: string; workspaceId?: string } = { userId };
    if (workspaceId) {
      whereClause.workspaceId = workspaceId;
    }

    const feeds = await prisma.feed.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(feeds);
  } catch (error) {
    console.error("Failed to fetch feeds:", error);
    return NextResponse.json(
      { error: "Failed to fetch feeds" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    const body = await req.json();
    const { title, url, favicon, description, type, platform, integrationLevel, workspaceId, rssUrl } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Feed title is required" },
        { status: 400 }
      );
    }

    const normalizedUrl = typeof url === "string" && url.trim() ? url.trim() : null;
    const normalizedDescription = typeof description === "string" && description.trim() ? description.trim() : null;
    let normalizedRssUrl = typeof rssUrl === "string" && rssUrl.trim() ? rssUrl.trim() : null;

    if (!normalizedRssUrl && normalizedUrl) {
      const resolvedYoutubeRssUrl = await resolveYoutubeHandleRssUrl(normalizedUrl);
      if (resolvedYoutubeRssUrl) {
        normalizedRssUrl = resolvedYoutubeRssUrl;
      }
    }

    const normalization = normalizeFeedInput({
      type,
      platform,
      url: normalizedUrl,
      rssUrl: normalizedRssUrl,
      favicon,
    });

    if (normalization.error) {
      return NextResponse.json({ error: normalization.error }, { status: 400 });
    }

    const duplicateKeys = [
      ...(normalizedUrl ? [{ url: normalizedUrl }] : []),
      ...(normalization.rssUrl ? [{ rssUrl: normalization.rssUrl }] : []),
    ];

    if (duplicateKeys.length > 0) {
      const existingFeed = await prisma.feed.findFirst({
        where: {
          userId,
          workspaceId: workspaceId || null,
          type: normalization.type,
          OR: duplicateKeys,
        },
      });

      if (existingFeed) {
        return NextResponse.json(
          {
            error: "This source already exists in the selected workspace.",
            existingFeedId: existingFeed.id,
          },
          { status: 409 }
        );
      }
    }

    const feed = await prisma.feed.create({
      data: {
        title: title.trim(),
        url: normalizedUrl,
        favicon: normalization.favicon,
        description: normalizedDescription,
        type: normalization.type,
        platform: normalization.platform,
        integrationLevel: integrationLevel || "link",
        rssUrl: normalization.rssUrl,
        workspaceId: workspaceId || null,
        userId,
      },
    });

    return NextResponse.json(feed, { status: 201 });
  } catch (error) {
    console.error("Failed to create feed:", error);
    return NextResponse.json(
      { error: "Failed to create feed" },
      { status: 500 }
    );
  }
}
