import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/current-user";
import {
  DRIVE_DEFAULT_FAVICON,
  resolveDriveFolderForUser,
} from "@/services/fetchers/drive";
import { GOOGLE_DRIVE_READONLY_SCOPE, hasGoogleScope } from "@/services/fetchers/gmail";

type UpdateDriveFeedBody = {
  title?: string;
  workspaceId?: string | null;
  folderId?: string;
  isPinned?: boolean;
};

type DriveFeedMetadata = {
  folderId: string;
};

export const runtime = "nodejs";

function normalizeFolderId(folderId: string | undefined) {
  const normalized = (folderId || "root").trim();
  return normalized || "root";
}

function parseMetadata(metadata: string | null): DriveFeedMetadata {
  if (!metadata) {
    return { folderId: "root" };
  }

  try {
    const parsed = JSON.parse(metadata) as {
      folderId?: unknown;
    };

    return {
      folderId: typeof parsed.folderId === "string" && parsed.folderId.trim()
        ? parsed.folderId.trim()
        : "root",
    };
  } catch {
    return { folderId: "root" };
  }
}

function stringifyMetadata(metadata: DriveFeedMetadata) {
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
    const body = (await req.json()) as UpdateDriveFeedBody;

    const existingFeed = await prisma.feed.findFirst({
      where: {
        id,
        userId,
        type: "drive",
      },
    });

    if (!existingFeed) {
      return NextResponse.json({ error: "Drive feed not found" }, { status: 404 });
    }

    const currentMetadata = parseMetadata(existingFeed.metadata);

    const nextTitle =
      body.title !== undefined ? (typeof body.title === "string" ? body.title.trim() : "") : existingFeed.title;

    if (!nextTitle) {
      return NextResponse.json({ error: "Feed title is required" }, { status: 400 });
    }

    const nextWorkspaceId = body.workspaceId !== undefined ? body.workspaceId || null : existingFeed.workspaceId;
    const nextFolderId =
      body.folderId !== undefined ? normalizeFolderId(body.folderId) : currentMetadata.folderId;

    if (!nextFolderId) {
      return NextResponse.json({ error: "Drive folder ID is required" }, { status: 400 });
    }

    let resolvedFolder:
      | {
          folderId: string;
          folderName: string | null;
          folderUrl: string;
          email: string | null;
        }
      | null = null;

    if (body.folderId !== undefined) {
      const token = await prisma.googleToken.findUnique({
        where: {
          userId,
        },
        select: {
          scope: true,
        },
      });

      if (!token || !hasGoogleScope(token.scope, GOOGLE_DRIVE_READONLY_SCOPE)) {
        return NextResponse.json(
          { error: "Google account needs Drive permission. Reconnect Google to continue." },
          { status: 400 }
        );
      }

      try {
        resolvedFolder = await resolveDriveFolderForUser({ userId, folderId: nextFolderId });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to validate Drive folder";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    const metadataFolderId = resolvedFolder?.folderId || nextFolderId;
    const nextMetadata = stringifyMetadata({ folderId: metadataFolderId });

    const duplicateFeed = await prisma.feed.findFirst({
      where: {
        id: { not: id },
        userId,
        workspaceId: nextWorkspaceId,
        type: "drive",
        metadata: nextMetadata,
      },
      select: {
        id: true,
      },
    });

    if (duplicateFeed) {
      return NextResponse.json(
        { error: "This Google Drive folder already exists in the selected workspace." },
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
        favicon: existingFeed.favicon || DRIVE_DEFAULT_FAVICON,
        url: resolvedFolder ? resolvedFolder.folderUrl : existingFeed.url,
        description: resolvedFolder
          ? resolvedFolder.folderName
            ? `Google Drive folder (${resolvedFolder.folderName})`
            : existingFeed.description
          : existingFeed.description,
        isPinned: typeof body.isPinned === "boolean" ? body.isPinned : existingFeed.isPinned,
      },
    });

    return NextResponse.json(feed);
  } catch (error) {
    console.error("Failed to update drive feed:", error);
    return NextResponse.json({ error: "Failed to update drive feed" }, { status: 500 });
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
        type: "drive",
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Drive feed not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete drive feed:", error);
    return NextResponse.json({ error: "Failed to delete drive feed" }, { status: 500 });
  }
}
