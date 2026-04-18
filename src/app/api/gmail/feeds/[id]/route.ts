import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/current-user";

type UpdateGmailFeedBody = {
  title?: string;
  workspaceId?: string | null;
  labelId?: string;
  query?: string | null;
  isPinned?: boolean;
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

function parseMetadata(metadata: string | null): GmailFeedMetadata {
  if (!metadata) {
    return { labelIds: ["INBOX"], query: null };
  }

  try {
    const parsed = JSON.parse(metadata) as {
      labelIds?: unknown;
      query?: unknown;
    };

    const labelIds = Array.isArray(parsed.labelIds)
      ? parsed.labelIds
          .filter((label): label is string => typeof label === "string")
          .map((label) => label.trim())
          .filter((label) => label.length > 0)
      : [];

    return {
      labelIds: labelIds.length > 0 ? [labelIds[0]] : ["INBOX"],
      query: typeof parsed.query === "string" && parsed.query.trim() ? parsed.query.trim() : null,
    };
  } catch {
    return { labelIds: ["INBOX"], query: null };
  }
}

function stringifyMetadata(metadata: GmailFeedMetadata) {
  return JSON.stringify(metadata);
}

async function getUserId() {
  const user = await getOrCreateDemoUser();
  return user.id;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    const body = (await req.json()) as UpdateGmailFeedBody;

    const existingFeed = await prisma.feed.findFirst({
      where: {
        id,
        userId,
        type: "gmail",
      },
    });

    if (!existingFeed) {
      return NextResponse.json({ error: "Gmail feed not found" }, { status: 404 });
    }

    const currentMetadata = parseMetadata(existingFeed.metadata);

    const nextTitle =
      body.title !== undefined ? (typeof body.title === "string" ? body.title.trim() : "") : existingFeed.title;

    if (!nextTitle) {
      return NextResponse.json({ error: "Feed title is required" }, { status: 400 });
    }

    const nextLabelId =
      body.labelId !== undefined
        ? normalizeLabelId(body.labelId)
        : currentMetadata.labelIds[0] || "INBOX";

    const nextQuery =
      body.query !== undefined
        ? typeof body.query === "string" && body.query.trim()
          ? body.query.trim()
          : null
        : currentMetadata.query;

    const nextWorkspaceId = body.workspaceId !== undefined ? body.workspaceId || null : existingFeed.workspaceId;
    const nextMetadata = stringifyMetadata({ labelIds: [nextLabelId], query: nextQuery });

    const duplicateFeed = await prisma.feed.findFirst({
      where: {
        id: { not: id },
        userId,
        workspaceId: nextWorkspaceId,
        type: "gmail",
        metadata: nextMetadata,
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

    const feed = await prisma.feed.update({
      where: {
        id,
      },
      data: {
        title: nextTitle,
        workspaceId: nextWorkspaceId,
        metadata: nextMetadata,
        isPinned: typeof body.isPinned === "boolean" ? body.isPinned : existingFeed.isPinned,
      },
    });

    return NextResponse.json(feed);
  } catch (error) {
    console.error("Failed to update gmail feed:", error);
    return NextResponse.json({ error: "Failed to update gmail feed" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId();

    const result = await prisma.feed.deleteMany({
      where: {
        id,
        userId,
        type: "gmail",
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Gmail feed not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete gmail feed:", error);
    return NextResponse.json({ error: "Failed to delete gmail feed" }, { status: 500 });
  }
}
