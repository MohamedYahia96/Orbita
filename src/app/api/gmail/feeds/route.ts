import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/current-user";
import { GMAIL_DEFAULT_FAVICON, ensureGoogleAccessToken } from "@/services/fetchers/gmail";

type CreateGmailFeedBody = {
  title?: string;
  workspaceId?: string | null;
  labelId?: string;
  query?: string | null;
};

type GmailFeedMetadata = {
  labelIds: string[];
  query: string | null;
};

export const runtime = "nodejs";

function normalizeLabelId(labelId: string | undefined) {
  const normalized = (labelId || "INBOX").trim();
  return normalized || "INBOX";
}

function buildMetadata(labelId?: string, query?: string | null): GmailFeedMetadata {
  return {
    labelIds: [normalizeLabelId(labelId)],
    query: query && query.trim() ? query.trim() : null,
  };
}

function stringifyMetadata(metadata: GmailFeedMetadata) {
  return JSON.stringify(metadata);
}

async function getUserId() {
  const user = await getOrCreateDemoUser();
  return user.id;
}

export async function GET() {
  try {
    const userId = await getUserId();
    const gmailFeeds = await prisma.feed.findMany({
      where: {
        userId,
        type: "gmail",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(gmailFeeds);
  } catch (error) {
    console.error("Failed to fetch gmail feeds:", error);
    return NextResponse.json({ error: "Failed to fetch gmail feeds" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    const body = (await req.json()) as CreateGmailFeedBody;

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "Feed title is required" }, { status: 400 });
    }

    const token = await prisma.googleToken.findUnique({
      where: {
        userId,
      },
      select: {
        email: true,
      },
    });

    if (!token) {
      return NextResponse.json(
        { error: "Gmail is not connected yet. Connect your Google account first." },
        { status: 400 }
      );
    }

    try {
      await ensureGoogleAccessToken(userId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to validate Google access token";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const metadata = buildMetadata(body.labelId, body.query);
    const metadataString = stringifyMetadata(metadata);
    const workspaceId = body.workspaceId || null;

    const duplicateFeed = await prisma.feed.findFirst({
      where: {
        userId,
        workspaceId,
        type: "gmail",
        metadata: metadataString,
      },
      select: {
        id: true,
      },
    });

    if (duplicateFeed) {
      return NextResponse.json(
        { error: "This Gmail source already exists in the selected workspace." },
        { status: 409 }
      );
    }

    const feed = await prisma.feed.create({
      data: {
        title,
        url: "https://mail.google.com/mail/u/0/#inbox",
        favicon: GMAIL_DEFAULT_FAVICON,
        description: token.email ? `Gmail inbox (${token.email})` : "Gmail inbox",
        type: "gmail",
        platform: "gmail",
        integrationLevel: "full",
        workspaceId,
        userId,
        metadata: metadataString,
      },
    });

    return NextResponse.json(feed, { status: 201 });
  } catch (error) {
    console.error("Failed to create gmail feed:", error);
    return NextResponse.json({ error: "Failed to create gmail feed" }, { status: 500 });
  }
}
