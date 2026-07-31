import { NextResponse } from "next/server";
import { getOrCreateDemoUser } from "@/lib/current-user";
import { buildGoogleAuthUrl, GOOGLE_OAUTH_MISSING_ENV_ERROR } from "@/services/fetchers/gmail";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    const authUrl = buildGoogleAuthUrl(user.id);

    return NextResponse.json({ authUrl });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to build Google auth URL";

    if (message === GOOGLE_OAUTH_MISSING_ENV_ERROR) {
      return NextResponse.json(
        {
          code: "GOOGLE_OAUTH_NOT_CONFIGURED",
          error: message,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
