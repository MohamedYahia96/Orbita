import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/current-user";
import {
  GOOGLE_GMAIL_READONLY_SCOPE,
  hasGoogleScope,
  listGmailLabelsForUser,
} from "@/services/fetchers/gmail";

export const runtime = "nodejs";

export async function GET() {
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

    if (!hasGoogleScope(token.scope, GOOGLE_GMAIL_READONLY_SCOPE)) {
      return NextResponse.json(
        {
          code: "GOOGLE_SCOPE_MISSING",
          error: "Google account needs Gmail permission. Reconnect Google to continue.",
        },
        { status: 400 }
      );
    }

    const labels = await listGmailLabelsForUser(user.id);

    return NextResponse.json({ labels });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch Gmail labels";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
