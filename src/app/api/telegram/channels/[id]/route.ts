import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/current-user";
import {
  TELEGRAM_DEFAULT_FAVICON,
  resolveTelegramChannel,
  normalizeTelegramChannelUsername,
} from "@/services/fetchers/telegram";

type UpdateTelegramChannelBody = {
  title?: string;
  workspaceId?: string | null;
  botToken?: string;
  channelUsername?: string;
  isPinned?: boolean;
};

export const runtime = "nodejs";

async function getUserId() {
  const user = await getOrCreateDemoUser();
  return user.id;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    const body = (await req.json()) as UpdateTelegramChannelBody;

    const existingFeed = await prisma.feed.findFirst({
      where: {
        id,
        userId,
        type: "telegram",
      },
      include: {
        telegramBot: true,
      },
    });

    if (!existingFeed || !existingFeed.telegramBot) {
      return NextResponse.json({ error: "Telegram feed not found" }, { status: 404 });
    }

    const existingTelegramBot = existingFeed.telegramBot;

    const nextTitle =
      body.title !== undefined ? (typeof body.title === "string" ? body.title.trim() : "") : existingFeed.title;

    if (!nextTitle) {
      return NextResponse.json({ error: "Feed title is required" }, { status: 400 });
    }

    const nextWorkspaceId = body.workspaceId !== undefined ? body.workspaceId || null : existingFeed.workspaceId;
    const nextChannelUsername =
      body.channelUsername !== undefined
        ? normalizeTelegramChannelUsername(body.channelUsername)
        : existingTelegramBot.channelUsername;

    if (!nextChannelUsername) {
      return NextResponse.json({ error: "Telegram channel username is required" }, { status: 400 });
    }

    const nextBotToken =
      body.botToken !== undefined
        ? (typeof body.botToken === "string" && body.botToken.trim()
            ? body.botToken.trim()
            : existingTelegramBot.botToken)
        : existingTelegramBot.botToken;

    let resolvedChannel = {
      channelUsername: existingTelegramBot.channelUsername,
      chatId: existingTelegramBot.chatId,
      chatTitle: existingTelegramBot.chatTitle,
      chatType: existingTelegramBot.chatType,
      channelUrl: existingFeed.url || `https://t.me/${existingTelegramBot.channelUsername}`,
    };

    const shouldResolveChannel =
      nextChannelUsername !== existingTelegramBot.channelUsername ||
      nextBotToken !== existingTelegramBot.botToken;

    if (shouldResolveChannel) {
      try {
        resolvedChannel = await resolveTelegramChannel({
          botToken: nextBotToken,
          channelUsername: nextChannelUsername,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to validate Telegram channel";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    const duplicate = await prisma.telegramBot.findFirst({
      where: {
        channelUsername: resolvedChannel.channelUsername,
        feed: {
          id: { not: id },
          userId,
          workspaceId: nextWorkspaceId,
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

    const updatedFeed = await prisma.$transaction(async (tx) => {
      const feed = await tx.feed.update({
        where: { id: existingFeed.id },
        data: {
          title: nextTitle,
          workspaceId: nextWorkspaceId,
          url: resolvedChannel.channelUrl,
          favicon: existingFeed.favicon || TELEGRAM_DEFAULT_FAVICON,
          description: resolvedChannel.chatTitle,
          platform: "telegram",
          type: "telegram",
          integrationLevel: "full",
          isPinned: typeof body.isPinned === "boolean" ? body.isPinned : existingFeed.isPinned,
        },
      });

      await tx.telegramBot.update({
        where: {
          id: existingTelegramBot.id,
        },
        data: {
          botToken: nextBotToken,
          channelUsername: resolvedChannel.channelUsername,
          chatId: resolvedChannel.chatId,
          chatTitle: resolvedChannel.chatTitle,
          chatType: resolvedChannel.chatType,
        },
      });

      return feed;
    });

    return NextResponse.json(updatedFeed);
  } catch (error) {
    console.error("Failed to update telegram channel:", error);
    return NextResponse.json(
      { error: "Failed to update telegram channel" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId();

    const result = await prisma.feed.deleteMany({
      where: {
        id,
        userId,
        type: "telegram",
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Telegram feed not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete telegram channel:", error);
    return NextResponse.json(
      { error: "Failed to delete telegram channel" },
      { status: 500 }
    );
  }
}
