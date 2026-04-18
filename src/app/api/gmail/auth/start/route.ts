import { NextResponse } from "next/server";
import { getOrCreateDemoUser } from "@/lib/current-user";
import { buildGoogleAuthUrl } from "@/services/fetchers/gmail";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    const authUrl = buildGoogleAuthUrl(user.id);

    return NextResponse.json({ authUrl });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to build Google auth URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
