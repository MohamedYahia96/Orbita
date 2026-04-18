import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/current-user";
import {
  DRIVE_DEFAULT_FAVICON,
  resolveDriveFolderForUser,
} from "@/services/fetchers/drive";
import { GOOGLE_DRIVE_READONLY_SCOPE, hasGoogleScope } from "@/services/fetchers/gmail";

type CreateDriveFeedBody = {
  title?: string;
  workspaceId?: string | null;
  folderId?: string;
};

type DriveFeedMetadata = {
  folderId: string;
};

export const runtime = "nodejs";

function normalizeFolderId(folderId: string | undefined) {
  const normalized = (folderId || "root").trim();
  return normalized || "root";
}

function buildMetadata(folderId: string | undefined): DriveFeedMetadata {
  return {
    folderId: normalizeFolderId(folderId),
  };
}

function stringifyMetadata(metadata: DriveFeedMetadata) {
  return JSON.stringify(metadata);
}

async function getUserId() {
  const user = await getOrCreateDemoUser();
  return user.id;
}

export async function GET() {
  try {
    const userId = await getUserId();
    const driveFeeds = await prisma.feed.findMany({
      where: {
        userId,
        type: "drive",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(driveFeeds);
  } catch (error) {
    console.error("Failed to fetch drive feeds:", error);
    return NextResponse.json({ error: "Failed to fetch drive feeds" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    const body = (await req.json()) as CreateDriveFeedBody;

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
        scope: true,
      },
    });

    if (!token) {
      return NextResponse.json(
        { error: "Google account is not connected yet. Connect your Google account first." },
        { status: 400 }
      );
    }

    if (!hasGoogleScope(token.scope, GOOGLE_DRIVE_READONLY_SCOPE)) {
      return NextResponse.json(
        { error: "Google account needs Drive permission. Reconnect Google to continue." },
        { status: 400 }
      );
    }

    const folderId = typeof body.folderId === "string" ? body.folderId.trim() : "";
    if (!folderId) {
      return NextResponse.json({ error: "Drive folder ID is required" }, { status: 400 });
    }

    let resolvedFolder;
    try {
      resolvedFolder = await resolveDriveFolderForUser({ userId, folderId });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to validate Drive folder";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const metadata = buildMetadata(resolvedFolder.folderId);
    const metadataString = stringifyMetadata(metadata);
    const workspaceId = body.workspaceId || null;

    const duplicateFeed = await prisma.feed.findFirst({
      where: {
        userId,
        workspaceId,
        type: "drive",
        metadata: metadataString,
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

    const description = resolvedFolder.folderName
      ? `Google Drive folder (${resolvedFolder.folderName})`
      : token.email
        ? `Google Drive (${token.email})`
        : "Google Drive folder";

    const feed = await prisma.feed.create({
      data: {
        title,
        url: resolvedFolder.folderUrl,
        favicon: DRIVE_DEFAULT_FAVICON,
        description,
        type: "drive",
        platform: "drive",
        integrationLevel: "full",
        workspaceId,
        userId,
        metadata: metadataString,
      },
    });

    return NextResponse.json(feed, { status: 201 });
  } catch (error) {
    console.error("Failed to create drive feed:", error);
    return NextResponse.json({ error: "Failed to create drive feed" }, { status: 500 });
  }
}
