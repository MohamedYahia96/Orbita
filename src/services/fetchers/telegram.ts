type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

type TelegramChat = {
  id: number | string;
  title?: string;
  type?: string;
  username?: string;
};

type TelegramChannelPost = {
  message_id: number;
  date: number;
  text?: string;
  caption?: string;
  chat: TelegramChat;
  photo?: Array<{ file_id: string }>;
  video?: unknown;
};

type TelegramUpdate = {
  update_id: number;
  channel_post?: TelegramChannelPost;
};

export type ResolvedTelegramChannel = {
  channelUsername: string;
  chatId: string;
  chatTitle: string | null;
  chatType: string | null;
  channelUrl: string;
};

export type TelegramFetchedItem = {
  title: string;
  link: string;
  content: string;
  image: string | null;
  guid: string;
  pubDate: string;
  mediaType: "article" | "video" | "image";
  extraData: Record<string, unknown>;
};

export type TelegramFetchResult = {
  channelUsername: string;
  chatId: string;
  chatTitle: string | null;
  chatType: string | null;
  lastUpdateId: number | null;
  items: TelegramFetchedItem[];
};

type FetchTelegramChannelUpdatesOptions = {
  botToken: string;
  channelUsername: string;
  lastUpdateId?: number | null;
  limit?: number;
};

const TELEGRAM_API_BASE_URL = "https://api.telegram.org";
export const TELEGRAM_DEFAULT_FAVICON =
  "https://www.google.com/s2/favicons?domain=telegram.org&sz=128";

export function normalizeTelegramChannelUsername(channelUsername: string) {
  return channelUsername.trim().replace(/^@+/, "").toLowerCase();
}

export function buildTelegramChannelUrl(channelUsername: string) {
  return `https://t.me/${normalizeTelegramChannelUsername(channelUsername)}`;
}

export function buildTelegramMessageUrl(channelUsername: string, messageId: number) {
  return `${buildTelegramChannelUrl(channelUsername)}/${messageId}`;
}

async function callTelegramApi<T>(
  botToken: string,
  method: string,
  params?: Record<string, string>
) {
  if (!botToken || !botToken.trim()) {
    throw new Error("Telegram bot token is required.");
  }

  const url = new URL(`${TELEGRAM_API_BASE_URL}/bot${botToken.trim()}/${method}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Telegram API ${method} failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as TelegramApiResponse<T>;
  if (!payload.ok || payload.result === undefined) {
    throw new Error(payload.description || `Telegram API ${method} failed.`);
  }

  return payload.result;
}

export async function resolveTelegramChannel({
  botToken,
  channelUsername,
}: {
  botToken: string;
  channelUsername: string;
}): Promise<ResolvedTelegramChannel> {
  const normalizedUsername = normalizeTelegramChannelUsername(channelUsername);
  if (!normalizedUsername) {
    throw new Error("Telegram channel username is required.");
  }

  const chat = await callTelegramApi<TelegramChat>(botToken, "getChat", {
    chat_id: `@${normalizedUsername}`,
  });

  const resolvedUsername = normalizeTelegramChannelUsername(chat.username || normalizedUsername);

  return {
    channelUsername: resolvedUsername,
    chatId: String(chat.id),
    chatTitle: chat.title || null,
    chatType: chat.type || null,
    channelUrl: buildTelegramChannelUrl(resolvedUsername),
  };
}

export async function fetchTelegramChannelUpdates({
  botToken,
  channelUsername,
  lastUpdateId,
  limit = 50,
}: FetchTelegramChannelUpdatesOptions): Promise<TelegramFetchResult> {
  const resolvedChannel = await resolveTelegramChannel({ botToken, channelUsername });

  const boundedLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
  const params: Record<string, string> = {
    limit: String(boundedLimit),
    allowed_updates: JSON.stringify(["channel_post"]),
  };

  if (typeof lastUpdateId === "number") {
    params.offset = String(lastUpdateId + 1);
  }

  const updates = await callTelegramApi<TelegramUpdate[]>(botToken, "getUpdates", params);

  const sortedUpdates = [...updates].sort((a, b) => a.update_id - b.update_id);
  let highestUpdateId = typeof lastUpdateId === "number" ? lastUpdateId : null;
  const items: TelegramFetchedItem[] = [];

  for (const update of sortedUpdates) {
    if (highestUpdateId === null || update.update_id > highestUpdateId) {
      highestUpdateId = update.update_id;
    }

    const post = update.channel_post;
    if (!post) continue;

    if (String(post.chat.id) !== resolvedChannel.chatId) {
      continue;
    }

    const messageId = post.message_id;
    const textContent = (post.text || post.caption || "").trim();
    const titleLine = textContent.split("\n")[0] || "";
    const title = titleLine.slice(0, 120) || `Message #${messageId}`;
    const mediaType = post.video ? "video" : post.photo ? "image" : "article";

    items.push({
      title,
      link: buildTelegramMessageUrl(resolvedChannel.channelUsername, messageId),
      content: textContent,
      image: null,
      guid: `${resolvedChannel.chatId}:${messageId}`,
      pubDate: new Date(post.date * 1000).toISOString(),
      mediaType,
      extraData: {
        updateId: update.update_id,
        messageId,
        chatId: resolvedChannel.chatId,
      },
    });
  }

  return {
    channelUsername: resolvedChannel.channelUsername,
    chatId: resolvedChannel.chatId,
    chatTitle: resolvedChannel.chatTitle,
    chatType: resolvedChannel.chatType,
    lastUpdateId: highestUpdateId,
    items,
  };
}
