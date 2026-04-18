import { NextResponse } from "next/server";
import { getOrCreateDemoUser } from "@/lib/current-user";
import {
  completeGoogleOAuthForUser,
  decodeAndValidateGoogleOAuthState,
} from "@/services/fetchers/gmail";

export const runtime = "nodejs";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlResponse({
  title,
  message,
  shouldClose,
}: {
  title: string;
  message: string;
  shouldClose: boolean;
}) {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);

  return new NextResponse(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 0; background: #0b1220; color: #e5e7eb; }
      .wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      .card { max-width: 640px; width: 100%; background: #111827; border: 1px solid #374151; border-radius: 12px; padding: 20px; }
      h1 { margin: 0 0 10px; font-size: 20px; }
      p { margin: 0; line-height: 1.6; color: #d1d5db; }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="card">
        <h1>${safeTitle}</h1>
        <p>${safeMessage}</p>
      </section>
    </main>
    ${shouldClose ? "<script>setTimeout(() => window.close(), 1200);</script>" : ""}
  </body>
</html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    }
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return htmlResponse({
      title: "Google connection failed",
      message: `Google OAuth returned an error: ${oauthError}. You can close this window and try again.`,
      shouldClose: false,
    });
  }

  if (!code) {
    return htmlResponse({
      title: "Missing authorization code",
      message: "No authorization code was provided by Google. You can close this window and retry.",
      shouldClose: false,
    });
  }

  if (!state) {
    return htmlResponse({
      title: "Missing OAuth state",
      message: "Missing OAuth state. Please restart Gmail connection from the dashboard.",
      shouldClose: false,
    });
  }

  try {
    const parsedState = decodeAndValidateGoogleOAuthState(state);
    const user = await getOrCreateDemoUser();

    if (parsedState.userId !== user.id) {
      throw new Error("OAuth state user mismatch. Please retry Gmail connection.");
    }

    const result = await completeGoogleOAuthForUser(user.id, code);

    return htmlResponse({
      title: "Google account connected",
      message: result.email
        ? `Google account ${result.email} is now connected. You can close this window.`
        : "Google account connected successfully. You can close this window.",
      shouldClose: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected OAuth callback failure.";

    return htmlResponse({
      title: "Google connection failed",
      message,
      shouldClose: false,
    });
  }
}
