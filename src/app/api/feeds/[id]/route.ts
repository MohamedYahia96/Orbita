import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizeFeedInput } from "@/lib/feed-source";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, url, favicon, description, type, platform, integrationLevel, workspaceId, isPinned, rssUrl } = body;

    const existingFeed = await prisma.feed.findUnique({ where: { id } });
    if (!existingFeed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    const nextUrl =
      url !== undefined ? (typeof url === "string" && url.trim() ? url.trim() : null) : existingFeed.url;
    const nextRssUrl =
      rssUrl !== undefined
        ? (typeof rssUrl === "string" && rssUrl.trim() ? rssUrl.trim() : null)
        : existingFeed.rssUrl;
    const nextFavicon =
      favicon !== undefined ? (typeof favicon === "string" && favicon.trim() ? favicon.trim() : null) : existingFeed.favicon;

    const normalization = normalizeFeedInput({
      type: type !== undefined ? type : existingFeed.type,
      platform: platform !== undefined ? platform : existingFeed.platform,
      url: nextUrl,
      rssUrl: nextRssUrl,
      favicon: nextFavicon,
    });

    if (normalization.error) {
      return NextResponse.json({ error: normalization.error }, { status: 400 });
    }

    const feed = await prisma.feed.update({
      where: { id },
      data: { 
        title: title !== undefined ? title : undefined,
        url: url !== undefined ? nextUrl : undefined,
        favicon: normalization.favicon,
        description: description !== undefined ? description : undefined,
        type: normalization.type,
        platform: normalization.platform,
        integrationLevel,
        workspaceId: workspaceId !== undefined ? workspaceId || null : undefined,
        isPinned,
        rssUrl: normalization.rssUrl,
      },
    });

    return NextResponse.json(feed);
  } catch (error) {
    console.error("Failed to update feed:", error);
    return NextResponse.json(
      { error: "Failed to update feed" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.feed.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete feed:", error);
    return NextResponse.json(
      { error: "Failed to delete feed" },
      { status: 500 }
    );
  }
}
