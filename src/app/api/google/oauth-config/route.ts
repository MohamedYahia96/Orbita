import { NextResponse } from "next/server";
import {
  getGoogleOAuthConfigForRuntime,
  saveGoogleOAuthFileConfig,
} from "@/lib/google-oauth-config";

type UpdateGoogleOAuthConfigBody = {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
};

export const runtime = "nodejs";

function maskValue(value: string) {
  if (value.length <= 8) {
    return "*".repeat(value.length);
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export async function GET() {
  try {
    const { source, config } = getGoogleOAuthConfigForRuntime();

    return NextResponse.json({
      configured: Boolean(config),
      source,
      redirectUri: config?.redirectUri || null,
      clientIdMasked: config?.clientId ? maskValue(config.clientId) : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch Google OAuth configuration";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as UpdateGoogleOAuthConfigBody;
    const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
    const clientSecret = typeof body.clientSecret === "string" ? body.clientSecret.trim() : "";
    const redirectUri = typeof body.redirectUri === "string" ? body.redirectUri.trim() : "";

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        { error: "clientId, clientSecret, and redirectUri are required." },
        { status: 400 }
      );
    }

    let parsedRedirect: URL;
    try {
      parsedRedirect = new URL(redirectUri);
    } catch {
      return NextResponse.json({ error: "redirectUri must be a valid URL." }, { status: 400 });
    }

    if (parsedRedirect.protocol !== "http:" && parsedRedirect.protocol !== "https:") {
      return NextResponse.json({ error: "redirectUri must use http or https." }, { status: 400 });
    }

    const saved = saveGoogleOAuthFileConfig({
      clientId,
      clientSecret,
      redirectUri,
    });

    return NextResponse.json({
      configured: true,
      source: "file",
      redirectUri: saved.redirectUri,
      clientIdMasked: maskValue(saved.clientId),
      updatedAt: saved.updatedAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save Google OAuth configuration";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
