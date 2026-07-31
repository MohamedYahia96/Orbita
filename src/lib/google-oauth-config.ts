import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type GoogleOAuthAppConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  updatedAt: string;
};

type GoogleOAuthConfigSource = "env" | "file" | "none";

const CONFIG_FILE_PATH = join(process.cwd(), ".data", "google-oauth.json");

function hasRealValue(value: string | undefined | null) {
  if (!value) return false;
  const normalized = value.trim();
  if (!normalized) return false;

  const lower = normalized.toLowerCase();
  if (lower === "<replace_me>" || lower.includes("replace_me") || lower.startsWith("your_")) {
    return false;
  }

  return true;
}

function normalizeConfig(config: {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}): GoogleOAuthAppConfig | null {
  const clientId = config.clientId?.trim();
  const clientSecret = config.clientSecret?.trim();
  const redirectUri = config.redirectUri?.trim();

  if (!hasRealValue(clientId) || !hasRealValue(clientSecret) || !hasRealValue(redirectUri)) {
    return null;
  }

  return {
    clientId: clientId as string,
    clientSecret: clientSecret as string,
    redirectUri: redirectUri as string,
    updatedAt: new Date().toISOString(),
  };
}

function readFileConfig(): GoogleOAuthAppConfig | null {
  if (!existsSync(CONFIG_FILE_PATH)) {
    return null;
  }

  try {
    const raw = readFileSync(CONFIG_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<GoogleOAuthAppConfig>;

    const normalized = normalizeConfig({
      clientId: parsed.clientId,
      clientSecret: parsed.clientSecret,
      redirectUri: parsed.redirectUri,
    });

    if (!normalized) {
      return null;
    }

    return {
      ...normalized,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : normalized.updatedAt,
    };
  } catch {
    return null;
  }
}

export function getGoogleOAuthConfigForRuntime(): {
  source: GoogleOAuthConfigSource;
  config: GoogleOAuthAppConfig | null;
} {
  const envConfig = normalizeConfig({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  });

  if (envConfig) {
    return {
      source: "env",
      config: envConfig,
    };
  }

  const fileConfig = readFileConfig();
  if (fileConfig) {
    return {
      source: "file",
      config: fileConfig,
    };
  }

  return {
    source: "none",
    config: null,
  };
}

export function saveGoogleOAuthFileConfig(input: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}) {
  const normalized = normalizeConfig(input);
  if (!normalized) {
    throw new Error("Invalid Google OAuth configuration values.");
  }

  mkdirSync(dirname(CONFIG_FILE_PATH), { recursive: true });
  writeFileSync(CONFIG_FILE_PATH, JSON.stringify(normalized, null, 2), "utf8");

  return normalized;
}

export function getGoogleOAuthConfigFilePath() {
  return CONFIG_FILE_PATH;
}
