import prisma from "@/lib/prisma";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

type GoogleOAuthTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GmailMessageRef = {
  id: string;
  threadId: string;
};

type GmailListMessagesResponse = {
  messages?: GmailMessageRef[];
};

type GmailHeader = {
  name?: string;
  value?: string;
};

type GmailMessageResponse = {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: {
    headers?: GmailHeader[];
  };
};

export type GmailFetchedItem = {
  title: string;
  link: string;
  content: string;
  image: string | null;
  guid: string;
  pubDate: string;
  mediaType: "article";
  extraData: Record<string, unknown>;
};

export type GmailFetchResult = {
  email: string | null;
  items: GmailFetchedItem[];
};

type FetchGmailItemsOptions = {
  userId: string;
  labelIds?: string[];
  query?: string | null;
  maxResults?: number;
};

type GoogleOAuthStatePayload = {
  userId: string;
  ts: number;
  nonce: string;
};

const GOOGLE_OAUTH_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_BASE_URL = "https://gmail.googleapis.com/gmail/v1/users/me";
const GOOGLE_OAUTH_SCOPE = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

export const GMAIL_DEFAULT_FAVICON =
  "https://www.google.com/s2/favicons?domain=mail.google.com&sz=128";

function getGoogleOAuthEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Missing Google OAuth environment variables. Expected GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI."
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

function computeExpiryDate(expiresIn?: number) {
  if (!expiresIn || expiresIn <= 0) return null;
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);
  return expiresAt;
}

function signOAuthStatePayload(payloadEncoded: string) {
  const { clientSecret } = getGoogleOAuthEnv();
  return createHmac("sha256", clientSecret).update(payloadEncoded).digest("base64url");
}

function secureEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function serializeOAuthState(payload: GoogleOAuthStatePayload) {
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signOAuthStatePayload(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

function parseOAuthState(state: string): GoogleOAuthStatePayload {
  const parts = state.split(".");
  if (parts.length !== 2) {
    throw new Error("Invalid OAuth state format.");
  }

  const [payloadEncoded, signature] = parts;
  const expectedSignature = signOAuthStatePayload(payloadEncoded);

  if (!secureEquals(expectedSignature, signature)) {
    throw new Error("Invalid OAuth state signature.");
  }

  let payload: GoogleOAuthStatePayload;
  try {
    payload = JSON.parse(Buffer.from(payloadEncoded, "base64url").toString("utf8")) as GoogleOAuthStatePayload;
  } catch {
    throw new Error("Invalid OAuth state payload.");
  }

  if (
    !payload ||
    typeof payload.userId !== "string" ||
    !payload.userId.trim() ||
    typeof payload.ts !== "number" ||
    !Number.isFinite(payload.ts) ||
    typeof payload.nonce !== "string" ||
    !payload.nonce
  ) {
    throw new Error("Invalid OAuth state payload.");
  }

  const ageMs = Date.now() - payload.ts;
  if (ageMs < 0 || ageMs > OAUTH_STATE_MAX_AGE_MS) {
    throw new Error("OAuth state expired. Please retry.");
  }

  return payload;
}

async function parseGoogleOAuthResponse(response: Response) {
  const payload = (await response.json()) as GoogleOAuthTokenResponse;

  if (!response.ok || !payload.access_token) {
    const errorMessage = payload.error_description || payload.error || "Google OAuth token exchange failed.";
    throw new Error(errorMessage);
  }

  return payload;
}

function buildOAuthState(userId: string) {
  const statePayload = {
    userId,
    ts: Date.now(),
    nonce: randomBytes(12).toString("hex"),
  };

  return serializeOAuthState(statePayload);
}

export function decodeAndValidateGoogleOAuthState(state: string) {
  return parseOAuthState(state);
}

export function buildGoogleAuthUrl(userId: string) {
  const { clientId, redirectUri } = getGoogleOAuthEnv();

  const authUrl = new URL(GOOGLE_OAUTH_AUTHORIZE_URL);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GOOGLE_OAUTH_SCOPE);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", buildOAuthState(userId));

  return authUrl.toString();
}

async function exchangeCodeForGoogleTokens(code: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthEnv();

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  return parseGoogleOAuthResponse(response);
}

async function refreshGoogleAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getGoogleOAuthEnv();

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  return parseGoogleOAuthResponse(response);
}

async function callGmailApi<T>(accessToken: string, url: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const fallbackError = `Gmail API request failed with status ${response.status}`;
    let errorMessage = fallbackError;

    try {
      const payload = (await response.json()) as {
        error?: {
          message?: string;
        };
      };
      errorMessage = payload.error?.message || fallbackError;
    } catch {
      errorMessage = fallbackError;
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

function findGmailHeader(headers: GmailHeader[] | undefined, target: string) {
  if (!headers || headers.length === 0) return "";
  const match = headers.find((header) => (header.name || "").toLowerCase() === target.toLowerCase());
  return match?.value || "";
}

export async function fetchGoogleProfileEmail(accessToken: string) {
  const profileUrl = `${GMAIL_API_BASE_URL}/profile`;
  const profile = await callGmailApi<{ emailAddress?: string }>(accessToken, profileUrl);
  return profile.emailAddress || null;
}

export async function completeGoogleOAuthForUser(userId: string, code: string) {
  const existingToken = await prisma.googleToken.findUnique({
    where: { userId },
  });

  const exchangedToken = await exchangeCodeForGoogleTokens(code);
  const refreshToken = exchangedToken.refresh_token || existingToken?.refreshToken || null;
  const accessToken = exchangedToken.access_token;
  if (!accessToken) {
    throw new Error("Google OAuth response did not include an access token.");
  }
  const expiresAt = computeExpiryDate(exchangedToken.expires_in);
  const email = await fetchGoogleProfileEmail(accessToken);

  await prisma.googleToken.upsert({
    where: {
      userId,
    },
    update: {
      accessToken,
      refreshToken,
      scope: exchangedToken.scope || existingToken?.scope || null,
      tokenType: exchangedToken.token_type || existingToken?.tokenType || null,
      expiresAt,
      email,
    },
    create: {
      userId,
      accessToken,
      refreshToken,
      scope: exchangedToken.scope || null,
      tokenType: exchangedToken.token_type || null,
      expiresAt,
      email,
    },
  });

  return {
    email,
  };
}

export async function ensureGoogleAccessToken(userId: string) {
  const token = await prisma.googleToken.findUnique({
    where: { userId },
  });

  if (!token) {
    throw new Error("Google account is not connected.");
  }

  const now = Date.now();
  const hasValidAccessToken =
    token.accessToken && token.expiresAt && token.expiresAt.getTime() > now + 60 * 1000;

  if (hasValidAccessToken) {
    return {
      accessToken: token.accessToken,
      email: token.email,
    };
  }

  if (!token.refreshToken) {
    throw new Error("Google token expired and no refresh token is available. Reconnect Gmail.");
  }

  const refreshed = await refreshGoogleAccessToken(token.refreshToken);
  const nextAccessToken = refreshed.access_token;
  if (!nextAccessToken) {
    throw new Error("Google token refresh did not return an access token.");
  }
  const nextExpiresAt = computeExpiryDate(refreshed.expires_in);

  const updatedToken = await prisma.googleToken.update({
    where: {
      id: token.id,
    },
    data: {
      accessToken: nextAccessToken,
      scope: refreshed.scope || token.scope,
      tokenType: refreshed.token_type || token.tokenType,
      expiresAt: nextExpiresAt,
    },
  });

  return {
    accessToken: updatedToken.accessToken,
    email: updatedToken.email,
  };
}

function normalizeLabelIds(labelIds: string[] | undefined) {
  if (!labelIds || labelIds.length === 0) {
    return ["INBOX"];
  }

  return labelIds
    .map((label) => label.trim())
    .filter((label) => label.length > 0)
    .slice(0, 10);
}

export async function fetchGmailFeedItems({
  userId,
  labelIds,
  query,
  maxResults = 25,
}: FetchGmailItemsOptions): Promise<GmailFetchResult> {
  const { accessToken, email } = await ensureGoogleAccessToken(userId);
  const normalizedLabelIds = normalizeLabelIds(labelIds);
  const boundedMaxResults = Math.min(Math.max(Math.floor(maxResults), 1), 50);

  const listUrl = new URL(`${GMAIL_API_BASE_URL}/messages`);
  listUrl.searchParams.set("maxResults", String(boundedMaxResults));
  for (const labelId of normalizedLabelIds) {
    listUrl.searchParams.append("labelIds", labelId);
  }

  if (query && query.trim()) {
    listUrl.searchParams.set("q", query.trim());
  }

  const listResponse = await callGmailApi<GmailListMessagesResponse>(accessToken, listUrl.toString());
  const messages = listResponse.messages || [];

  if (messages.length === 0) {
    return {
      email,
      items: [],
    };
  }

  const detailedMessages = await Promise.all(
    messages.map(async (messageRef) => {
      const detailUrl = new URL(`${GMAIL_API_BASE_URL}/messages/${messageRef.id}`);
      detailUrl.searchParams.set("format", "metadata");
      detailUrl.searchParams.append("metadataHeaders", "Subject");
      detailUrl.searchParams.append("metadataHeaders", "From");
      detailUrl.searchParams.append("metadataHeaders", "Date");

      return callGmailApi<GmailMessageResponse>(accessToken, detailUrl.toString());
    })
  );

  const items: GmailFetchedItem[] = detailedMessages.map((message) => {
    const headers = message.payload?.headers || [];
    const from = findGmailHeader(headers, "From");
    const subject = findGmailHeader(headers, "Subject");
    const dateHeader = findGmailHeader(headers, "Date");
    const publishedAt = message.internalDate
      ? new Date(Number.parseInt(message.internalDate, 10)).toISOString()
      : new Date().toISOString();

    return {
      title: subject || `Email from ${from || "Unknown sender"}`,
      link: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
      content: message.snippet || "",
      image: null,
      guid: message.id,
      pubDate: publishedAt,
      mediaType: "article",
      extraData: {
        messageId: message.id,
        threadId: message.threadId,
        from,
        date: dateHeader,
        labelIds: message.labelIds || [],
      },
    };
  });

  return {
    email,
    items,
  };
}
