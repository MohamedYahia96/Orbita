import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/current-user";
import {
  GOOGLE_DRIVE_READONLY_SCOPE,
  hasGoogleScope,
} from "@/services/fetchers/gmail";
import { listDriveFoldersForUser } from "@/services/fetchers/drive";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = await getOrCreateDemoUser();
    const token = await prisma.googleToken.findUnique({
      where: {
        userId: user.id,
      },
      select: {
        scope: true,
      },
    });

    if (!token) {
      return NextResponse.json(
        {
          code: "GOOGLE_NOT_CONNECTED",
          error: "Google account is not connected yet. Connect your Google account first.",
        },
        { status: 400 }
      );
    }

    if (!hasGoogleScope(token.scope, GOOGLE_DRIVE_READONLY_SCOPE)) {
      return NextResponse.json(
        {
          code: "GOOGLE_SCOPE_MISSING",
          error: "Google account needs Drive permission. Reconnect Google to continue.",
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const folders = await listDriveFoldersForUser({
      userId: user.id,
      searchQuery: query,
    });

    return NextResponse.json({ folders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch Drive folders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
