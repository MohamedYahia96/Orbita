import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/current-user";
import { GOOGLE_DRIVE_READONLY_SCOPE, hasGoogleScope } from "@/services/fetchers/gmail";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    const token = await prisma.googleToken.findUnique({
      where: {
        userId: user.id,
      },
      select: {
        email: true,
        scope: true,
        expiresAt: true,
      },
    });

    if (!token) {
      return NextResponse.json({
        connected: false,
        email: null,
        requiresReconnect: false,
      });
    }

    const connected = hasGoogleScope(token.scope, GOOGLE_DRIVE_READONLY_SCOPE);

    return NextResponse.json({
      connected,
      email: token.email,
      expiresAt: token.expiresAt,
      requiresReconnect: !connected,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch Drive connection status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
