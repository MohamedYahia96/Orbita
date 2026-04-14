import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, url, favicon, description, type, platform, integrationLevel, workspaceId, isPinned, rssUrl } = body;

    let finalType = type;
    let finalPlatform = platform;
    let finalFavicon = favicon;

    if (url && type !== "rss") {
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
        // Invalid URL, ignore
      }
    }

    const feed = await prisma.feed.update({
      where: { id },
      data: { 
        title, 
        url, 
        favicon: finalFavicon !== undefined ? finalFavicon : undefined, 
        description, 
        type: finalType !== undefined ? finalType : undefined, 
        platform: finalPlatform !== undefined ? finalPlatform : undefined, 
        integrationLevel, 
        workspaceId, 
        isPinned,
        rssUrl
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
