import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/current-user";
import {
  TELEGRAM_DEFAULT_FAVICON,
  resolveTelegramChannel,
  normalizeTelegramChannelUsername,
} from "@/services/fetchers/telegram";

type CreateTelegramChannelBody = {
  title?: string;
  workspaceId?: string | null;
  botToken?: string;
  channelUsername?: string;
};

export const runtime = "nodejs";

async function getUserId() {
  const user = await getOrCreateDemoUser();
  return user.id;
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    const body = (await req.json()) as CreateTelegramChannelBody;

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const botToken = typeof body.botToken === "string" ? body.botToken.trim() : "";
    const channelUsername =
      typeof body.channelUsername === "string"
        ? normalizeTelegramChannelUsername(body.channelUsername)
        : "";

    if (!title) {
      return NextResponse.json({ error: "Feed title is required" }, { status: 400 });
    }

    if (!botToken) {
      return NextResponse.json({ error: "Telegram bot token is required" }, { status: 400 });
    }

    if (!channelUsername) {
      return NextResponse.json({ error: "Telegram channel username is required" }, { status: 400 });
    }

    const workspaceId = body.workspaceId || null;

    const duplicate = await prisma.telegramBot.findFirst({
      where: {
        channelUsername,
        feed: {
          userId,
          workspaceId,
        },
      },
      select: {
        feedId: true,
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "This Telegram channel already exists in the selected workspace." },
        { status: 409 }
      );
    }

    let resolvedChannel;
    try {
      resolvedChannel = await resolveTelegramChannel({
        botToken,
        channelUsername,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to validate Telegram channel";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const feed = await prisma.$transaction(async (tx) => {
      const createdFeed = await tx.feed.create({
        data: {
          title,
          url: resolvedChannel.channelUrl,
          favicon: TELEGRAM_DEFAULT_FAVICON,
          description: resolvedChannel.chatTitle,
          type: "telegram",
          platform: "telegram",
          integrationLevel: "full",
          workspaceId,
          userId,
        },
      });

      await tx.telegramBot.create({
        data: {
          botToken,
          channelUsername: resolvedChannel.channelUsername,
          chatId: resolvedChannel.chatId,
          chatTitle: resolvedChannel.chatTitle,
          chatType: resolvedChannel.chatType,
          feedId: createdFeed.id,
        },
      });

      return createdFeed;
    });

    return NextResponse.json(feed, { status: 201 });
  } catch (error) {
    console.error("Failed to create telegram channel:", error);
    return NextResponse.json(
      { error: "Failed to create telegram channel" },
      { status: 500 }
    );
  }
}
