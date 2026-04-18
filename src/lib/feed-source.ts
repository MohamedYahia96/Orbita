type FeedInput = {
  type?: string | null;
  platform?: string | null;
  url?: string | null;
  rssUrl?: string | null;
  favicon?: string | null;
};

type FeedNormalization = {
  type: string;
  platform: string | null;
  rssUrl: string | null;
  favicon: string | null;
  error?: string;
};

function parseUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function detectTypeFromUrl(url: URL) {
  const hostname = url.hostname.toLowerCase();

  if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
    return { type: "youtube", platform: "youtube" };
  }
  if (hostname.includes("github.com")) {
    return { type: "github", platform: "github" };
  }
  if (hostname.includes("facebook.com") || hostname.includes("fb.watch")) {
    return { type: null, platform: "facebook" };
  }
  if (hostname.includes("whatsapp.com") || hostname.includes("wa.me")) {
    return { type: null, platform: "whatsapp" };
  }
  if (hostname.includes("telegram.org") || hostname.includes("t.me")) {
    return { type: null, platform: "telegram" };
  }
  if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
    return { type: null, platform: "twitter" };
  }

  return { type: null, platform: null };
}

function deriveYoutubeRssFromUrl(url: URL) {
  const path = url.pathname.replace(/\/+$/, "");
  const segments = path.split("/").filter(Boolean);

  if (path === "/feeds/videos.xml") {
    const channelId = url.searchParams.get("channel_id");
    const user = url.searchParams.get("user");

    if (channelId) {
      return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
    }

    if (user) {
      return `https://www.youtube.com/feeds/videos.xml?user=${encodeURIComponent(user)}`;
    }

    return null;
  }

  if (segments[0] === "channel" && segments[1]) {
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(segments[1])}`;
  }

  if (segments[0] === "user" && segments[1]) {
    return `https://www.youtube.com/feeds/videos.xml?user=${encodeURIComponent(segments[1])}`;
  }

  return null;
}

function deriveGithubAtomFromUrl(url: URL) {
  if (url.pathname.endsWith(".atom") || url.pathname.endsWith(".rss")) {
    return url.toString();
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/, "");
  if (!owner || !repo) return null;

  return `https://github.com/${owner}/${repo}/releases.atom`;
}

export function normalizeFeedInput(input: FeedInput): FeedNormalization {
  const wasTypeProvided = typeof input.type === "string" && input.type.trim().length > 0;
  const rawUrl = typeof input.url === "string" ? input.url.trim() : "";
  const rawRssUrl = typeof input.rssUrl === "string" ? input.rssUrl.trim() : "";

  let type = (input.type || "custom_link").trim() || "custom_link";
  let platform = input.platform ?? null;
  let favicon = input.favicon ?? null;
  let rssUrl: string | null = rawRssUrl || null;

  const parsedUrl = rawUrl ? parseUrl(rawUrl) : null;
  if (rawUrl && !parsedUrl) {
    return { type, platform, favicon, rssUrl, error: "Feed URL is not a valid URL." };
  }

  if (rawRssUrl && !parseUrl(rawRssUrl)) {
    return { type, platform, favicon, rssUrl, error: "RSS URL is not a valid URL." };
  }

  if (parsedUrl && (!wasTypeProvided || type === "custom_link")) {
    const detected = detectTypeFromUrl(parsedUrl);
    if (detected.type) {
      type = detected.type;
    }
    if (!platform && detected.platform) {
      platform = detected.platform;
    }
  }

  if (type === "youtube") {
    platform = "youtube";
  } else if (type === "github") {
    platform = "github";
  }

  if (parsedUrl && !favicon) {
    favicon = `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=128`;
  }

  if (type === "rss" && !rssUrl && parsedUrl) {
    rssUrl = parsedUrl.toString();
  }

  if (type === "youtube" && !rssUrl) {
    if (!parsedUrl) {
      return { type, platform, favicon, rssUrl, error: "YouTube feeds require a valid URL or explicit rssUrl." };
    }

    rssUrl = deriveYoutubeRssFromUrl(parsedUrl);
    if (!rssUrl) {
      return {
        type,
        platform,
        favicon,
        rssUrl,
        error: "Could not derive YouTube RSS automatically. Use a channel/user URL or provide rssUrl explicitly.",
      };
    }
  }

  if (type === "github" && !rssUrl) {
    if (!parsedUrl) {
      return { type, platform, favicon, rssUrl, error: "GitHub feeds require a repository URL or explicit rssUrl." };
    }

    rssUrl = deriveGithubAtomFromUrl(parsedUrl);
    if (!rssUrl) {
      return {
        type,
        platform,
        favicon,
        rssUrl,
        error: "Could not derive GitHub Atom URL. Use a repository URL or provide rssUrl explicitly.",
      };
    }
  }

  if ((type === "rss" || type === "youtube" || type === "github") && !rssUrl) {
    return { type, platform, favicon, rssUrl, error: "This feed type requires a valid rssUrl." };
  }

  return { type, platform, favicon, rssUrl };
}
