import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/current-user";

type AlertRuleBody = {
  name?: string;
  enabled?: boolean;
  keyword?: string | null;
  sender?: string | null;
  feedId?: string | null;
  actionPush?: boolean;
  actionBookmark?: boolean;
  actionTagId?: string | null;
};

export const runtime = "nodejs";

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function validateConditions(keyword: string | null, sender: string | null, feedId: string | null) {
  return Boolean(keyword || sender || feedId);
}

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();

    const rules = await prisma.alertRule.findMany({
      where: { userId: user.id },
      orderBy: [{ enabled: "desc" }, { createdAt: "desc" }],
      include: {
        feed: {
          select: {
            id: true,
            title: true,
          },
        },
        actionTag: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json(rules);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch alert rules";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getOrCreateDemoUser();
    const body = (await req.json()) as AlertRuleBody;

    const name = normalizeText(body.name);
    if (!name) {
      return NextResponse.json({ error: "Rule name is required" }, { status: 400 });
    }

    const keyword = normalizeText(body.keyword);
    const sender = normalizeText(body.sender);
    const feedId = normalizeText(body.feedId);
    const actionTagId = normalizeText(body.actionTagId);

    if (!validateConditions(keyword, sender, feedId)) {
      return NextResponse.json(
        { error: "At least one condition is required (keyword, sender, or feed)." },
        { status: 400 }
      );
    }

    if (!body.actionPush && !body.actionBookmark && !actionTagId) {
      return NextResponse.json(
        { error: "At least one action is required (push, bookmark, or tag)." },
        { status: 400 }
      );
    }

    if (feedId) {
      const feed = await prisma.feed.findFirst({
        where: {
          id: feedId,
          userId: user.id,
        },
        select: { id: true },
      });

      if (!feed) {
        return NextResponse.json({ error: "Selected feed is invalid." }, { status: 400 });
      }
    }

    if (actionTagId) {
      const tag = await prisma.tag.findFirst({
        where: {
          id: actionTagId,
          userId: user.id,
        },
        select: { id: true },
      });

      if (!tag) {
        return NextResponse.json({ error: "Selected tag is invalid." }, { status: 400 });
      }
    }

    const rule = await prisma.alertRule.create({
      data: {
        userId: user.id,
        name,
        enabled: body.enabled !== false,
        keyword,
        sender,
        feedId,
        actionPush: body.actionPush !== false,
        actionBookmark: Boolean(body.actionBookmark),
        actionTagId,
      },
      include: {
        feed: {
          select: {
            id: true,
            title: true,
          },
        },
        actionTag: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create alert rule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
