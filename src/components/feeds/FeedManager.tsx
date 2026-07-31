"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { EmptyState, Button, Card, Input, Modal, useToast } from "@/components/ui";
import { Rss, Plus, Edit2, Trash2, Loader2, Link as LinkIcon, Video, Code, Pin, RefreshCw, Send, Mail, Folder, Globe } from "lucide-react";
import { useTranslations } from "next-intl";

type Feed = {
  id: string;
  title: string;
  url: string | null;
  type: string;
  platform: string | null;
  favicon: string | null;
  metadata: string | null;
  workspaceId: string | null;
  isPinned: boolean;
};

type Workspace = {
  id: string;
  name: string;
};

type FeedPayload = {
  title: string;
  type: string;
  workspaceId: string | null;
  url: string | null;
  platform: string | null;
};

type GmailLabelOption = {
  id: string;
  name: string;
  type: "system" | "user" | null;
};

type DriveFolderOption = {
  id: string;
  name: string;
  url: string;
};

type GoogleOAuthConfigStatus = {
  configured: boolean;
  source: "env" | "file" | "none";
};

const PLATFORMS = [
  { id: "custom_link", labelKey: "platformCustomLink", icon: <LinkIcon size={16} /> },
  { id: "rss", labelKey: "platformRss", icon: <Rss size={16} /> },
  { id: "youtube", labelKey: "platformYoutube", icon: <Video size={16} /> },
  { id: "github", labelKey: "platformGithub", icon: <Code size={16} /> },
  { id: "facebook", labelKey: "platformFacebook", icon: <Globe size={16} /> },
  { id: "telegram", labelKey: "platformTelegram", icon: <Send size={16} /> },
  { id: "gmail", labelKey: "platformGmail", icon: <Mail size={16} /> },
  { id: "drive", labelKey: "platformDrive", icon: <Folder size={16} /> },
];

export function FeedManager() {
  const t = useTranslations("Feeds");
  const tCommon = useTranslations("Common");
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);
  
  // Form State
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("custom_link");
  const [workspaceId, setWorkspaceId] = useState("");
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChannelUsername, setTelegramChannelUsername] = useState("");
  const [gmailLabelId, setGmailLabelId] = useState("INBOX");
  const [gmailQuery, setGmailQuery] = useState("");
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [isCheckingGmailStatus, setIsCheckingGmailStatus] = useState(false);
  const [gmailLabels, setGmailLabels] = useState<GmailLabelOption[]>([]);
  const [gmailLabelSearch, setGmailLabelSearch] = useState("");
  const [isLoadingGmailLabels, setIsLoadingGmailLabels] = useState(false);
  const [gmailLabelsError, setGmailLabelsError] = useState<string | null>(null);
  const [useAdvancedGmailLabelInput, setUseAdvancedGmailLabelInput] = useState(false);
  const [driveFolderId, setDriveFolderId] = useState("root");
  const [driveConnected, setDriveConnected] = useState<boolean | null>(null);
  const [driveEmail, setDriveEmail] = useState<string | null>(null);
  const [isCheckingDriveStatus, setIsCheckingDriveStatus] = useState(false);
  const [driveFolders, setDriveFolders] = useState<DriveFolderOption[]>([]);
  const [driveFolderSearch, setDriveFolderSearch] = useState("");
  const [isLoadingDriveFolders, setIsLoadingDriveFolders] = useState(false);
  const [driveFoldersError, setDriveFoldersError] = useState<string | null>(null);
  const [useAdvancedDriveFolderInput, setUseAdvancedDriveFolderInput] = useState(false);
  const [googleOAuthConfigured, setGoogleOAuthConfigured] = useState<boolean | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const submitInFlightRef = useRef(false);
  const { toast } = useToast();

  const isTelegramType = type === "telegram";
  const isGmailType = type === "gmail";
  const isDriveType = type === "drive";
  const isFacebookType = type === "facebook";

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const mapIntegrationApiError = useCallback((data: unknown, fallback: string) => {
    const payload = data as { code?: unknown; error?: unknown } | null;
    const code = typeof payload?.code === "string" ? payload.code : null;
    const error = typeof payload?.error === "string" ? payload.error : null;

    if (code === "GOOGLE_OAUTH_NOT_CONFIGURED") {
      return t("googleOAuthNotConfigured");
    }

    if (code === "GOOGLE_NOT_CONNECTED") {
      return t("googleConnectFirst");
    }

    if (code === "GOOGLE_SCOPE_MISSING") {
      return t("googleReconnectForScope");
    }

    return error || fallback;
  }, [t]);

  const fetchGoogleOAuthConfigStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/google/oauth-config", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as GoogleOAuthConfigStatus | null;

      if (!res.ok || !data || typeof data.configured !== "boolean") {
        setGoogleOAuthConfigured(false);
        return;
      }

      setGoogleOAuthConfigured(data.configured);
    } catch {
      setGoogleOAuthConfigured(false);
    }
  }, []);

  const extractTelegramUsername = (rawUrl: string | null) => {
    if (!rawUrl) return "";

    try {
      const parsed = new URL(rawUrl);
      if (!parsed.hostname.toLowerCase().includes("t.me")) return "";
      const segment = parsed.pathname.split("/").filter(Boolean)[0] || "";
      return segment.replace(/^@+/, "");
    } catch {
      return "";
    }
  };

  const parseGmailMetadata = (metadata: string | null) => {
    if (!metadata) {
      return {
        labelId: "INBOX",
        query: "",
      };
    }

    try {
      const parsed = JSON.parse(metadata) as {
        labelIds?: unknown;
        query?: unknown;
      };

      const labelIds = Array.isArray(parsed.labelIds)
        ? parsed.labelIds.filter((label): label is string => typeof label === "string")
        : [];

      return {
        labelId: labelIds[0] || "INBOX",
        query: typeof parsed.query === "string" ? parsed.query : "",
      };
    } catch {
      return {
        labelId: "INBOX",
        query: "",
      };
    }
  };

  const parseDriveMetadata = (metadata: string | null) => {
    if (!metadata) {
      return {
        folderId: "root",
      };
    }

    try {
      const parsed = JSON.parse(metadata) as {
        folderId?: unknown;
      };

      return {
        folderId: typeof parsed.folderId === "string" && parsed.folderId.trim() ? parsed.folderId.trim() : "root",
      };
    } catch {
      return {
        folderId: "root",
      };
    }
  };

  const fetchGmailStatus = useCallback(async () => {
    setIsCheckingGmailStatus(true);

    try {
      const res = await fetch("/api/gmail/status", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch Gmail status");
      }

      setGmailConnected(Boolean(data?.connected));
      setGmailEmail(typeof data?.email === "string" ? data.email : null);
    } catch {
      setGmailConnected(false);
      setGmailEmail(null);
    } finally {
      setIsCheckingGmailStatus(false);
    }
  }, []);

  const handleConnectGmail = async () => {
    if (googleOAuthConfigured === false) {
      toast(t("googleOAuthNotConfigured"), "error");
      return;
    }

    try {
      const res = await fetch("/api/gmail/auth/start", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.authUrl) {
        if (data?.code === "GOOGLE_OAUTH_NOT_CONFIGURED") {
          throw new Error(t("googleOAuthNotConfigured"));
        }

        throw new Error(data?.error || t("gmailAuthFailed"));
      }

      window.open(data.authUrl as string, "_blank", "noopener,noreferrer");
      toast(t("gmailAuthOpened"), "success");
    } catch (error: unknown) {
      toast(getErrorMessage(error, t("gmailAuthFailed")), "error");
    }
  };

  const loadGmailLabels = useCallback(async () => {
    setIsLoadingGmailLabels(true);
    setGmailLabelsError(null);

    try {
      const res = await fetch("/api/gmail/labels", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(mapIntegrationApiError(data, t("gmailLabelsLoadFailed")));
      }

      const labels = Array.isArray(data?.labels)
        ? (data.labels as Array<{ id?: unknown; name?: unknown; type?: unknown }>)
            .filter(
              (label): label is { id: string; name: string; type?: "system" | "user" | null } =>
                typeof label.id === "string" && typeof label.name === "string"
            )
            .map((label) => ({
              id: label.id,
              name: label.name,
              type: label.type === "system" || label.type === "user" ? label.type : null,
            }))
        : [];

      setGmailLabels(labels);

      if (labels.length > 0 && !labels.some((label) => label.id === gmailLabelId)) {
        setGmailLabelId(labels[0].id);
      }
    } catch (error: unknown) {
      setGmailLabelsError(getErrorMessage(error, t("gmailLabelsLoadFailed")));
      setGmailLabels([]);
    } finally {
      setIsLoadingGmailLabels(false);
    }
  }, [gmailLabelId, mapIntegrationApiError, t]);

  const fetchDriveStatus = useCallback(async () => {
    setIsCheckingDriveStatus(true);

    try {
      const res = await fetch("/api/drive/status", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch Drive status");
      }

      setDriveConnected(Boolean(data?.connected));
      setDriveEmail(typeof data?.email === "string" ? data.email : null);
    } catch {
      setDriveConnected(false);
      setDriveEmail(null);
    } finally {
      setIsCheckingDriveStatus(false);
    }
  }, []);

  const handleConnectDrive = async () => {
    if (googleOAuthConfigured === false) {
      toast(t("googleOAuthNotConfigured"), "error");
      return;
    }

    try {
      const res = await fetch("/api/drive/auth/start", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.authUrl) {
        if (data?.code === "GOOGLE_OAUTH_NOT_CONFIGURED") {
          throw new Error(t("googleOAuthNotConfigured"));
        }

        throw new Error(data?.error || t("driveAuthFailed"));
      }

      window.open(data.authUrl as string, "_blank", "noopener,noreferrer");
      toast(t("driveAuthOpened"), "success");
    } catch (error: unknown) {
      toast(getErrorMessage(error, t("driveAuthFailed")), "error");
    }
  };

  const loadDriveFolders = useCallback(async () => {
    setIsLoadingDriveFolders(true);
    setDriveFoldersError(null);

    try {
      const res = await fetch("/api/drive/folders", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(mapIntegrationApiError(data, t("driveFoldersLoadFailed")));
      }

      const folders = Array.isArray(data?.folders)
        ? (data.folders as Array<{ id?: unknown; name?: unknown; url?: unknown }>)
            .filter(
              (folder): folder is { id: string; name: string; url: string } =>
                typeof folder.id === "string" && typeof folder.name === "string" && typeof folder.url === "string"
            )
            .map((folder) => ({
              id: folder.id,
              name: folder.name,
              url: folder.url,
            }))
        : [];

      setDriveFolders(folders);

      if (folders.length > 0 && !folders.some((folder) => folder.id === driveFolderId)) {
        setDriveFolderId(folders[0].id);
      }
    } catch (error: unknown) {
      setDriveFoldersError(getErrorMessage(error, t("driveFoldersLoadFailed")));
      setDriveFolders([]);
    } finally {
      setIsLoadingDriveFolders(false);
    }
  }, [driveFolderId, mapIntegrationApiError, t]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [feedsRes, wsRes] = await Promise.all([
        fetch("/api/feeds"),
        fetch("/api/workspaces")
      ]);
      if (!feedsRes.ok || !wsRes.ok) throw new Error("Failed to fetch data");
      
      const feedsData = await feedsRes.json();
      const wsData = await wsRes.json();
      
      setFeeds(feedsData);
      setWorkspaces(wsData);
    } catch (error) {
      console.error(error);
      toast(tCommon("error"), "error");
    } finally {
      setIsLoading(false);
    }
  }, [toast, tCommon]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    fetchGoogleOAuthConfigStatus();

    if (isGmailType) {
      fetchGmailStatus();
    }

    if (isDriveType) {
      fetchDriveStatus();
    }
  }, [fetchDriveStatus, fetchGmailStatus, fetchGoogleOAuthConfigStatus, isDriveType, isGmailType, isModalOpen]);

  useEffect(() => {
    if (!isModalOpen || !isGmailType || !gmailConnected || useAdvancedGmailLabelInput) {
      return;
    }

    loadGmailLabels();
  }, [gmailConnected, isGmailType, isModalOpen, loadGmailLabels, useAdvancedGmailLabelInput]);

  useEffect(() => {
    if (!isModalOpen || !isDriveType || !driveConnected || useAdvancedDriveFolderInput) {
      return;
    }

    loadDriveFolders();
  }, [driveConnected, isDriveType, isModalOpen, loadDriveFolders, useAdvancedDriveFolderInput]);

  const handleOpenModal = (feed?: Feed) => {
    if (feed) {
      setEditingFeed(feed);
      setTitle(feed.title);
      setUrl(feed.url || "");
      setType(feed.type);
      setWorkspaceId(feed.workspaceId || "");
      setTelegramBotToken("");
      setTelegramChannelUsername(feed.type === "telegram" ? extractTelegramUsername(feed.url) : "");
      const gmailMetadata = parseGmailMetadata(feed.type === "gmail" ? feed.metadata : null);
      const driveMetadata = parseDriveMetadata(feed.type === "drive" ? feed.metadata : null);
      setGmailLabelId(gmailMetadata.labelId);
      setGmailQuery(gmailMetadata.query);
      setDriveFolderId(driveMetadata.folderId);
      setUseAdvancedGmailLabelInput(false);
      setUseAdvancedDriveFolderInput(false);
      setGmailLabelSearch("");
      setDriveFolderSearch("");
      setGmailLabelsError(null);
      setDriveFoldersError(null);
    } else {
      setEditingFeed(null);
      setTitle("");
      setUrl("");
      setType("custom_link");
      setWorkspaceId("");
      setTelegramBotToken("");
      setTelegramChannelUsername("");
      setGmailLabelId("INBOX");
      setGmailQuery("");
      setDriveFolderId("root");
      setUseAdvancedGmailLabelInput(false);
      setUseAdvancedDriveFolderInput(false);
      setGmailLabelSearch("");
      setDriveFolderSearch("");
      setGmailLabelsError(null);
      setDriveFoldersError(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTitle("");
    setUrl("");
    setType("custom_link");
    setWorkspaceId("");
    setTelegramBotToken("");
    setTelegramChannelUsername("");
    setGmailLabelId("INBOX");
    setGmailQuery("");
    setGmailConnected(null);
    setGmailEmail(null);
    setGmailLabels([]);
    setGmailLabelSearch("");
    setGmailLabelsError(null);
    setUseAdvancedGmailLabelInput(false);
    setDriveFolderId("root");
    setDriveConnected(null);
    setDriveEmail(null);
    setDriveFolders([]);
    setDriveFolderSearch("");
    setDriveFoldersError(null);
    setUseAdvancedDriveFolderInput(false);
    setEditingFeed(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitInFlightRef.current) return;

    submitInFlightRef.current = true;
    setIsSubmitting(true);
    try {
      const isEdit = !!editingFeed;
      const isTelegramFeed = type === "telegram";
      const isGmailFeed = type === "gmail";
      const isDriveFeed = type === "drive";
      const apiUrl = isTelegramFeed
        ? isEdit
          ? `/api/telegram/channels/${editingFeed.id}`
          : "/api/telegram/channels"
        : isGmailFeed
          ? isEdit
            ? `/api/gmail/feeds/${editingFeed.id}`
            : "/api/gmail/feeds"
          : isDriveFeed
            ? isEdit
              ? `/api/drive/feeds/${editingFeed.id}`
              : "/api/drive/feeds"
          : isEdit
            ? `/api/feeds/${editingFeed.id}`
            : "/api/feeds";
      const method = isEdit ? "PATCH" : "POST";

      if (isTelegramFeed && !telegramChannelUsername.trim()) {
        throw new Error(t("telegramUsernameRequired"));
      }

      if (isTelegramFeed && !isEdit && !telegramBotToken.trim()) {
        throw new Error(t("telegramTokenRequired"));
      }

      if (isGmailFeed && !isEdit && !gmailConnected) {
        throw new Error(t("gmailConnectRequired"));
      }

      if (isDriveFeed && !isEdit && !driveConnected) {
        throw new Error(t("driveConnectRequired"));
      }

      if (isDriveFeed && !driveFolderId.trim()) {
        throw new Error(t("driveFolderRequired"));
      }

      if (isFacebookType && !url.trim()) {
        throw new Error(t("facebookUrlRequired"));
      }

      const payload: FeedPayload | Record<string, unknown> = isTelegramFeed
        ? {
            title: title.trim(),
            workspaceId: workspaceId || null,
            channelUsername: telegramChannelUsername.trim(),
            ...(telegramBotToken.trim() ? { botToken: telegramBotToken.trim() } : {}),
          }
        : isGmailFeed
          ? {
              title: title.trim(),
              workspaceId: workspaceId || null,
              labelId: gmailLabelId.trim() || "INBOX",
              query: gmailQuery.trim() || null,
            }
        : isDriveFeed
          ? {
              title: title.trim(),
              workspaceId: workspaceId || null,
              folderId: driveFolderId.trim(),
            }
        : {
            title,
            type,
            workspaceId: workspaceId || null,
            url: url || null,
            platform: type !== "rss" && type !== "custom_link" ? type : null,
          };

      const res = await fetch(apiUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) throw new Error(data?.error || "Failed to save feed");

      toast(isEdit ? t("successUpdate") : t("successAdd"), "success");
      handleCloseModal();
      fetchData();
    } catch (error: unknown) {
      console.error(error);
      toast(getErrorMessage(error, tCommon("error")), "error");
    } finally {
      setIsSubmitting(false);
      submitInFlightRef.current = false;
    }
  };

  const handleDelete = async (feed: Feed) => {
    if (!confirm(t("confirmDelete"))) return;

    try {
      const endpoint =
        feed.type === "telegram"
          ? `/api/telegram/channels/${feed.id}`
          : feed.type === "gmail"
            ? `/api/gmail/feeds/${feed.id}`
            : feed.type === "drive"
              ? `/api/drive/feeds/${feed.id}`
          : `/api/feeds/${feed.id}`;

      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete feed");
      
      toast(t("successDelete"), "success");
      fetchData();
    } catch (error) {
      console.error(error);
      toast(tCommon("error"), "error");
    }
  };

  const togglePin = async (feed: Feed) => {
    try {
      const endpoint =
        feed.type === "telegram"
          ? `/api/telegram/channels/${feed.id}`
          : feed.type === "gmail"
            ? `/api/gmail/feeds/${feed.id}`
            : feed.type === "drive"
              ? `/api/drive/feeds/${feed.id}`
          : `/api/feeds/${feed.id}`;

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !feed.isPinned }),
      });
      if (!res.ok) throw new Error("Failed to update pin status");
      fetchData();
    } catch {
      toast(tCommon("error"), "error");
    }
  }

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/feeds/sync", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Sync failed");
      toast(t("successSync"), "success");
      fetchData();
    } catch (error: unknown) {
      toast(getErrorMessage(error, t("failSync")), "error");
    } finally {
      setIsSyncing(false);
    }
  }

  const getFeedHost = (feed: Feed) => {
    if (!feed.url) return t("unassigned");
    try {
      return new URL(feed.url).hostname;
    } catch {
      return feed.url;
    }
  };

  const selectedGmailLabel = gmailLabels.find((label) => label.id === gmailLabelId) || null;
  const selectedDriveFolder = driveFolders.find((folder) => folder.id === driveFolderId) || null;
  const normalizedGmailLabelSearch = gmailLabelSearch.trim().toLowerCase();
  const visibleGmailLabels = normalizedGmailLabelSearch
    ? gmailLabels.filter(
        (label) =>
          label.id.toLowerCase().includes(normalizedGmailLabelSearch) ||
          label.name.toLowerCase().includes(normalizedGmailLabelSearch)
      )
    : gmailLabels;
  const normalizedDriveFolderSearch = driveFolderSearch.trim().toLowerCase();
  const visibleDriveFolders = normalizedDriveFolderSearch
    ? driveFolders.filter(
        (folder) =>
          folder.id.toLowerCase().includes(normalizedDriveFolderSearch) ||
          folder.name.toLowerCase().includes(normalizedDriveFolderSearch)
      )
    : driveFolders;

  const isEditingFeed = Boolean(editingFeed);
  const isTelegramTokenRequired = isTelegramType && !isEditingFeed;
  const isGmailConnectionRequired = isGmailType && !isEditingFeed;
  const isDriveConnectionRequired = isDriveType && !isEditingFeed;
  const isGmailLabelRequired = isGmailType && !useAdvancedGmailLabelInput && !selectedGmailLabel;
  const isDriveFolderRequired = isDriveType && !driveFolderId.trim();
  const isDriveFolderPickerRequired = isDriveType && !useAdvancedDriveFolderInput && !selectedDriveFolder;
  const isFacebookUrlRequired = isFacebookType && !url.trim();
  const isSubmitDisabled =
    isSubmitting ||
    !title.trim() ||
    (isTelegramType && !telegramChannelUsername.trim()) ||
    (isTelegramTokenRequired && !telegramBotToken.trim()) ||
    (isGmailConnectionRequired && !gmailConnected) ||
    isGmailLabelRequired ||
    (isDriveConnectionRequired && !driveConnected) ||
    (useAdvancedDriveFolderInput ? isDriveFolderRequired : isDriveFolderPickerRequired) ||
    isFacebookUrlRequired;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 h-full max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm opacity-70">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSyncAll} variant="secondary" disabled={isSyncing} className="flex items-center gap-2 text-sm bg-(--color-bg-tertiary) border-(--color-border) border">
            <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} /> {isSyncing ? t("syncing") : t("syncBtn")}
          </Button>
          <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
            <Plus size={16} /> {t("addBtn")}
          </Button>
        </div>
      </div>

      {feeds.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState 
            icon={<Rss size={48} />}
            title={t("noFeeds")}
            description={t("noFeedsDesc")}
            action={<Button onClick={() => handleOpenModal()}>{t("addFirst")}</Button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {feeds.map((feed) => (
            <Card key={feed.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-(--color-bg-tertiary) border border-(--color-border) overflow-hidden shrink-0">
                    {feed.favicon ? (
                      <Image src={feed.favicon} alt={feed.title} width={24} height={24} className="w-6 h-6 object-contain" unoptimized />
                    ) : (
                      PLATFORMS.find(p => p.id === feed.type)?.icon || <LinkIcon size={20} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-base truncate">{feed.title}</h3>
                    <p className="text-xs opacity-70 truncate max-w-full">
                      {getFeedHost(feed)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <button 
                    onClick={() => togglePin(feed)}
                    className={`p-1 border-none bg-transparent hover:bg-(--color-bg-hover) rounded transition-colors cursor-pointer ${feed.isPinned ? "text-(--color-warning) opacity-100" : "opacity-40 hover:opacity-100"}`}
                    title={feed.isPinned ? t("unpinAction") : t("pinAction")}
                  >
                    <Pin size={16} fill={feed.isPinned ? "currentColor" : "none"} />
                  </button>
                  <button 
                    onClick={() => handleOpenModal(feed)}
                    className="p-1 border-none bg-transparent hover:bg-(--color-bg-hover) rounded transition-colors opacity-40 hover:opacity-100 cursor-pointer"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(feed)}
                    className="p-1 border-none bg-transparent hover:bg-(--color-error) hover:text-[#f4f4f4] rounded transition-colors opacity-40 hover:opacity-100 cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              {feed.workspaceId && workspaces.find(w => w.id === feed.workspaceId) && (
                <div className="mt-2 inline-flex">
                  <span className="text-xs px-2 py-1 bg-(--color-bg-tertiary) rounded-md opacity-80 border border-(--color-border)">
                    {workspaces.find(w => w.id === feed.workspaceId)?.name}
                  </span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={isModalOpen} onClose={handleCloseModal} title={editingFeed ? t("editFeed") : t("addNew")}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 dark">
          <div>
            <label className="block text-sm font-medium mb-1">{t("type")}</label>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map((p) => {
                const isTypeLocked = isEditingFeed && editingFeed?.type !== p.id;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setType(p.id)}
                    disabled={isTypeLocked}
                    className={`flex items-center gap-2 p-2 rounded-md border text-sm transition-colors
                      ${isTypeLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                      ${type === p.id
                        ? "border-accent bg-accent/10 text-accent font-medium"
                        : "border-(--color-border) bg-transparent hover:bg-(--color-bg-hover)"
                      }`}
                  >
                    {p.icon} {t(p.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">{t("feedTitle")} <span className="text-red-500">*</span></label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder={t("feedTitlePlaceholder")}
              className="w-full"
            />
          </div>

          {isTelegramType ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("telegramChannelUsername")} <span className="text-red-500">*</span>
                </label>
                <Input
                  value={telegramChannelUsername}
                  onChange={(e) => setTelegramChannelUsername(e.target.value.replace(/^@+/, ""))}
                  placeholder={t("telegramUsernamePlaceholder")}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("telegramBotToken")}
                  {isTelegramTokenRequired ? <span className="text-red-500"> *</span> : null}
                </label>
                <Input
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  placeholder={t("telegramTokenPlaceholder")}
                  type="password"
                  className="w-full"
                />
                {!isTelegramTokenRequired ? (
                  <p className="text-xs opacity-70 mt-1">{t("telegramTokenOptionalOnEdit")}</p>
                ) : null}
              </div>
            </>
          ) : isGmailType ? (
            <>
              <div className="rounded-lg border border-(--colors-border) bg-(--colors-bg-alt) px-3 py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {isCheckingGmailStatus
                      ? t("gmailStatusChecking")
                      : gmailConnected
                        ? t("gmailConnected")
                        : t("gmailDisconnected")}
                  </p>
                  {gmailEmail ? (
                    <p className="text-xs opacity-70 truncate">{gmailEmail}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={fetchGmailStatus} disabled={isCheckingGmailStatus}>
                    {t("gmailRefreshConnection")}
                  </Button>
                  <Button type="button" onClick={handleConnectGmail} disabled={googleOAuthConfigured === false}>
                    {t("gmailConnect")}
                  </Button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <label className="block text-sm font-medium">
                    {t("gmailLabelId")} <span className="text-red-500">*</span>
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => setUseAdvancedGmailLabelInput((current) => !current)}
                  >
                    {useAdvancedGmailLabelInput ? t("gmailUseDynamicPicker") : t("gmailUseManualId")}
                  </Button>
                </div>

                {useAdvancedGmailLabelInput ? (
                  <Input
                    value={gmailLabelId}
                    onChange={(e) => setGmailLabelId(e.target.value.toUpperCase())}
                    placeholder={t("gmailLabelPlaceholder")}
                    className="w-full"
                  />
                ) : (
                  <div className="rounded-lg border border-(--color-border) bg-(--color-bg-tertiary) p-2 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={gmailLabelSearch}
                        onChange={(e) => setGmailLabelSearch(e.target.value)}
                        placeholder={t("gmailLabelsSearchPlaceholder")}
                        className="w-full"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={loadGmailLabels}
                        disabled={isLoadingGmailLabels}
                      >
                        {t("gmailLabelsRefresh")}
                      </Button>
                    </div>

                    <select
                      className="w-full h-10 px-3 bg-transparent border border-(--color-border) rounded-lg text-(--color-text-primary) focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      value={gmailLabelId}
                      onChange={(e) => setGmailLabelId(e.target.value)}
                    >
                      {visibleGmailLabels.map((label) => (
                        <option key={label.id} value={label.id} className="bg-(--color-bg-primary) text-(--color-text-primary)">
                          {label.name} ({label.id})
                        </option>
                      ))}
                    </select>

                    {isLoadingGmailLabels ? (
                      <p className="text-xs opacity-70">{t("gmailLabelsLoading")}</p>
                    ) : null}
                    {!isLoadingGmailLabels && gmailLabelsError ? (
                      <p className="text-xs text-red-400">{gmailLabelsError}</p>
                    ) : null}
                    {!isLoadingGmailLabels && !gmailLabelsError && visibleGmailLabels.length === 0 ? (
                      <p className="text-xs opacity-70">{t("gmailLabelsEmpty")}</p>
                    ) : null}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t("gmailQuery")}</label>
                <Input
                  value={gmailQuery}
                  onChange={(e) => setGmailQuery(e.target.value)}
                  placeholder={t("gmailQueryPlaceholder")}
                  className="w-full"
                />
              </div>
            </>
          ) : isDriveType ? (
            <>
              <div className="rounded-lg border border-(--colors-border) bg-(--colors-bg-alt) px-3 py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {isCheckingDriveStatus
                      ? t("driveStatusChecking")
                      : driveConnected
                        ? t("driveConnected")
                        : t("driveDisconnected")}
                  </p>
                  {driveEmail ? (
                    <p className="text-xs opacity-70 truncate">{driveEmail}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={fetchDriveStatus} disabled={isCheckingDriveStatus}>
                    {t("driveRefreshConnection")}
                  </Button>
                  <Button type="button" onClick={handleConnectDrive} disabled={googleOAuthConfigured === false}>
                    {t("driveConnect")}
                  </Button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <label className="block text-sm font-medium">
                    {t("driveFolderId")} <span className="text-red-500">*</span>
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => setUseAdvancedDriveFolderInput((current) => !current)}
                  >
                    {useAdvancedDriveFolderInput ? t("driveUseDynamicPicker") : t("driveUseManualId")}
                  </Button>
                </div>

                {useAdvancedDriveFolderInput ? (
                  <Input
                    value={driveFolderId}
                    onChange={(e) => setDriveFolderId(e.target.value)}
                    placeholder={t("driveFolderPlaceholder")}
                    className="w-full"
                  />
                ) : (
                  <div className="rounded-lg border border-(--color-border) bg-(--color-bg-tertiary) p-2 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={driveFolderSearch}
                        onChange={(e) => setDriveFolderSearch(e.target.value)}
                        placeholder={t("driveFoldersSearchPlaceholder")}
                        className="w-full"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={loadDriveFolders}
                        disabled={isLoadingDriveFolders}
                      >
                        {t("driveFoldersRefresh")}
                      </Button>
                    </div>

                    <select
                      className="w-full h-10 px-3 bg-transparent border border-(--color-border) rounded-lg text-(--color-text-primary) focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      value={driveFolderId}
                      onChange={(e) => setDriveFolderId(e.target.value)}
                    >
                      {visibleDriveFolders.map((folder) => (
                        <option key={folder.id} value={folder.id} className="bg-(--color-bg-primary) text-(--color-text-primary)">
                          {folder.name} ({folder.id})
                        </option>
                      ))}
                    </select>

                    {selectedDriveFolder ? (
                      <p className="text-xs opacity-70 truncate">{selectedDriveFolder.url}</p>
                    ) : null}
                    {isLoadingDriveFolders ? (
                      <p className="text-xs opacity-70">{t("driveFoldersLoading")}</p>
                    ) : null}
                    {!isLoadingDriveFolders && driveFoldersError ? (
                      <p className="text-xs text-red-400">{driveFoldersError}</p>
                    ) : null}
                    {!isLoadingDriveFolders && !driveFoldersError && visibleDriveFolders.length === 0 ? (
                      <p className="text-xs opacity-70">{t("driveFoldersEmpty")}</p>
                    ) : null}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">
                {isFacebookType ? t("facebookPageUrl") : t("url")}
                {isFacebookType ? <span className="text-red-500"> *</span> : null}
              </label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={isFacebookType ? t("facebookUrlPlaceholder") : t("urlPlaceholder")}
                type="url"
                className="w-full"
              />
            </div>
          )}
 
          <div>
            <label className="block text-sm font-medium mb-1">{t("workspace")}</label>
            <select 
              className="w-full h-10 px-3 bg-transparent border border-(--color-border) rounded-lg text-(--color-text-primary) focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
            >
              <option value="" className="bg-(--color-bg-primary) text-(--color-text-primary)">{t("unassigned")}</option>
              {workspaces.map(w => (
                <option key={w.id} value={w.id} className="bg-(--color-bg-primary) text-(--color-text-primary)">{w.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" type="button" onClick={handleCloseModal}>{t("cancel")}</Button>
            <Button type="submit" disabled={isSubmitDisabled}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("save")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
