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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getOrCreateDemoUser();
    const { id } = await params;
    const body = (await req.json()) as AlertRuleBody;

    const existing = await prisma.alertRule.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Alert rule not found" }, { status: 404 });
    }

    const name = body.name !== undefined ? normalizeText(body.name) : existing.name;
    if (!name) {
      return NextResponse.json({ error: "Rule name is required" }, { status: 400 });
    }

    const keyword = body.keyword !== undefined ? normalizeText(body.keyword) : existing.keyword;
    const sender = body.sender !== undefined ? normalizeText(body.sender) : existing.sender;
    const feedId = body.feedId !== undefined ? normalizeText(body.feedId) : existing.feedId;
    const actionTagId = body.actionTagId !== undefined ? normalizeText(body.actionTagId) : existing.actionTagId;
    const actionPush = body.actionPush !== undefined ? body.actionPush : existing.actionPush;
    const actionBookmark = body.actionBookmark !== undefined ? body.actionBookmark : existing.actionBookmark;

    if (!validateConditions(keyword, sender, feedId)) {
      return NextResponse.json(
        { error: "At least one condition is required (keyword, sender, or feed)." },
        { status: 400 }
      );
    }

    if (!actionPush && !actionBookmark && !actionTagId) {
      return NextResponse.json(
        { error: "At least one action is required (push, bookmark, or tag)." },
        { status: 400 }
      );
    }

    if (feedId) {
      const feed = await prisma.feed.findFirst({
        where: { id: feedId, userId: user.id },
        select: { id: true },
      });
      if (!feed) {
        return NextResponse.json({ error: "Selected feed is invalid." }, { status: 400 });
      }
    }

    if (actionTagId) {
      const tag = await prisma.tag.findFirst({
        where: { id: actionTagId, userId: user.id },
        select: { id: true },
      });
      if (!tag) {
        return NextResponse.json({ error: "Selected tag is invalid." }, { status: 400 });
      }
    }

    const updated = await prisma.alertRule.update({
      where: { id: existing.id },
      data: {
        name,
        enabled: body.enabled !== undefined ? Boolean(body.enabled) : existing.enabled,
        keyword,
        sender,
        feedId,
        actionPush,
        actionBookmark,
        actionTagId,
      },
      include: {
        feed: {
          select: { id: true, title: true },
        },
        actionTag: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update alert rule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getOrCreateDemoUser();
    const { id } = await params;

    const result = await prisma.alertRule.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Alert rule not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete alert rule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
