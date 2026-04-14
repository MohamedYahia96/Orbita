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

export async function GET(req: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    const whereClause: any = { userId };
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

    if (!title) {
      return NextResponse.json(
        { error: "Feed title is required" },
        { status: 400 }
      );
    }

    let finalType = type || "custom_link";
    let finalPlatform = platform || null;
    let finalFavicon = favicon;

    if (url && (finalType === "custom_link" || !finalPlatform)) {
      try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname.toLowerCase();
        
        if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
          finalType = "youtube";
          finalPlatform = "youtube";
        } else if (hostname.includes('github.com')) {
          finalType = "github";
          finalPlatform = "github";
        } else if (hostname.includes('facebook.com') || hostname.includes('fb.watch')) {
          finalPlatform = "facebook";
        } else if (hostname.includes('whatsapp.com') || hostname.includes('wa.me')) {
          finalPlatform = "whatsapp";
        } else if (hostname.includes('telegram.org') || hostname.includes('t.me')) {
          finalPlatform = "telegram";
        } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
          finalPlatform = "twitter";
        }
        
        if (!finalFavicon) {
          finalFavicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
        }
      } catch (e) {
        // Invalid URL, leave type as is
      }
    }

    const feed = await prisma.feed.create({
      data: {
        title,
        url,
        favicon: finalFavicon,
        description,
        type: finalType,
        platform: finalPlatform,
        integrationLevel: integrationLevel || "link",
        rssUrl,
        workspaceId,
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
