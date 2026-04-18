import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/current-user";

type UpdatePreferencesBody = {
  locale?: string;
  theme?: string;
};

const SUPPORTED_LOCALES = new Set(["en", "ar"]);
const SUPPORTED_THEMES = new Set(["light", "dark", "system"]);

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();

    return NextResponse.json({
      locale: user.locale,
      theme: user.theme,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch user preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getOrCreateDemoUser();
    const body = (await req.json()) as UpdatePreferencesBody;

    const nextLocale = typeof body.locale === "string" ? body.locale.trim().toLowerCase() : undefined;
    const nextTheme = typeof body.theme === "string" ? body.theme.trim().toLowerCase() : undefined;

    if (nextLocale && !SUPPORTED_LOCALES.has(nextLocale)) {
      return NextResponse.json({ error: "Unsupported locale" }, { status: 400 });
    }

    if (nextTheme && !SUPPORTED_THEMES.has(nextTheme)) {
      return NextResponse.json({ error: "Unsupported theme" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        locale: nextLocale || undefined,
        theme: nextTheme || undefined,
      },
      select: {
        locale: true,
        theme: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update user preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
