import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/current-user";

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
        expiresAt: true,
      },
    });

    if (!token) {
      return NextResponse.json({
        connected: false,
        email: null,
      });
    }

    return NextResponse.json({
      connected: true,
      email: token.email,
      expiresAt: token.expiresAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch Gmail connection status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
