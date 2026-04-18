"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { BellRing, CheckCircle2, Compass, LayoutGrid, Loader2, Rss } from "lucide-react";
import { Button, Input, Modal, useToast } from "@/components/ui";

type WizardStep = 1 | 2 | 3 | 4 | 5;
type ThemeOption = "light" | "dark" | "system";
type LocaleOption = "en" | "ar";
type FeedTypeOption = "rss" | "custom_link" | "youtube" | "github" | "facebook";

type WorkspaceDto = {
  id: string;
  name: string;
};

type FeedDto = {
  id: string;
};

const ONBOARDING_DONE_KEY = "orbita:onboarding:done:v1";
const APPLICATION_SERVER_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlB64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function OnboardingWizard() {
  const t = useTranslations("Overview");
  const locale = useLocale();
  const router = useRouter();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);

  const [selectedLocale, setSelectedLocale] = useState<LocaleOption>(locale === "ar" ? "ar" : "en");
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>("dark");

  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [hasExistingWorkspace, setHasExistingWorkspace] = useState(false);

  const [feedType, setFeedType] = useState<FeedTypeOption>("rss");
  const [feedTitle, setFeedTitle] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [hasExistingFeed, setHasExistingFeed] = useState(false);

  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null);

  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const done = window.localStorage.getItem(ONBOARDING_DONE_KEY) === "1";
    setIsOpen(!done);
  }, []);

  useEffect(() => {
    const nextTheme = theme === "light" || theme === "dark" || theme === "system"
      ? theme
      : resolvedTheme === "light"
        ? "light"
        : "dark";

    setSelectedTheme(nextTheme);
  }, [theme, resolvedTheme]);

  const loadExistingData = useCallback(async () => {
    try {
      const [workspaceRes, feedsRes] = await Promise.all([
        fetch("/api/workspaces", { cache: "no-store" }),
        fetch("/api/feeds", { cache: "no-store" }),
      ]);

      const workspaceData = workspaceRes.ok
        ? ((await workspaceRes.json()) as WorkspaceDto[])
        : [];
      const feedData = feedsRes.ok
        ? ((await feedsRes.json()) as FeedDto[])
        : [];

      if (Array.isArray(workspaceData) && workspaceData.length > 0) {
        setHasExistingWorkspace(true);
        setWorkspaceId(workspaceData[0]?.id || null);
      } else {
        setHasExistingWorkspace(false);
      }

      if (Array.isArray(feedData) && feedData.length > 0) {
        setHasExistingFeed(true);
      } else {
        setHasExistingFeed(false);
      }
    } catch {
      // Keep wizard functional even if pre-check fails.
      setHasExistingWorkspace(false);
      setHasExistingFeed(false);
    }
  }, []);

  const detectPushState = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushSupported(false);
      setPushEnabled(false);
      return;
    }

    setPushSupported(true);

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.getSubscription();
      setPushEnabled(Boolean(subscription));
    } catch {
      setPushEnabled(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    loadExistingData();
    detectPushState();
  }, [detectPushState, isOpen, loadExistingData]);

  const persistPreferences = useCallback(async () => {
    try {
      await fetch("/api/users/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locale: selectedLocale,
          theme: selectedTheme,
        }),
      });
    } catch {
      // Ignore persistence failures and continue onboarding.
    }
  }, [selectedLocale, selectedTheme]);

  const markOnboardingDone = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ONBOARDING_DONE_KEY, "1");
    }
  }, []);

  const resetWizard = useCallback(() => {
    setStep(1);
    setWorkspaceName("");
    setFeedTitle("");
    setFeedUrl("");
    setFeedType("rss");
    setPushStatusMessage(null);
    setIsBusy(false);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleStart = () => {
    resetWizard();
    setIsOpen(true);
  };

  const handleContinueStepOne = async () => {
    setIsBusy(true);
    try {
      setTheme(selectedTheme);
      await persistPreferences();
      setStep(2);
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) {
      toast(t("onboardingRequired"), "error");
      return;
    }

    setIsBusy(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: workspaceName.trim(),
          color: "#1d546c",
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) {
        throw new Error(data?.error || "Failed to create workspace");
      }

      setWorkspaceId(data.id as string);
      setHasExistingWorkspace(true);
      toast(t("onboardingWorkspaceCreated"), "success");
      setStep(3);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("onboardingWorkspaceCreateFailed");
      toast(message, "error");
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateFeed = async () => {
    if (!feedTitle.trim() || !feedUrl.trim()) {
      toast(t("onboardingRequired"), "error");
      return;
    }

    setIsBusy(true);
    try {
      const res = await fetch("/api/feeds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: feedTitle.trim(),
          type: feedType,
          url: feedUrl.trim(),
          workspaceId,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok && res.status !== 409) {
        throw new Error(data?.error || "Failed to add source");
      }

      setHasExistingFeed(true);
      toast(t("onboardingFeedCreated"), "success");
      setStep(4);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("onboardingFeedCreateFailed");
      toast(message, "error");
    } finally {
      setIsBusy(false);
    }
  };

  const handleEnablePush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushSupported(false);
      setPushStatusMessage(t("onboardingNotificationsUnsupported"));
      return;
    }

    if (!APPLICATION_SERVER_KEY) {
      setPushStatusMessage(t("onboardingNotificationsNotConfigured"));
      return;
    }

    setIsBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatusMessage(t("onboardingNotificationsPermissionDenied"));
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(APPLICATION_SERVER_KEY),
      });

      const response = await fetch("/api/notifications/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Push subscription failed");
      }

      setPushEnabled(true);
      setPushStatusMessage(t("onboardingNotificationsEnabled"));
      toast(t("onboardingNotificationsEnabled"), "success");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("onboardingNotificationsEnableFailed");
      setPushStatusMessage(message);
      toast(message, "error");
    } finally {
      setIsBusy(false);
    }
  };

  const handleFinish = async () => {
    setIsBusy(true);
    try {
      await persistPreferences();
      markOnboardingDone();
      setIsOpen(false);
      toast(t("onboardingDone"), "success");

      if (selectedLocale !== locale) {
        router.replace("/overview", { locale: selectedLocale });
      }
    } finally {
      setIsBusy(false);
    }
  };

  const stepLabel = useMemo(
    () => t("onboardingStepLabel", { current: step, total: 5 }),
    [step, t]
  );

  return (
    <>
      <Button fullWidth variant="ghost" onClick={handleStart}>
        {t("onboardingStart")}
      </Button>

      <Modal
        open={isOpen}
        onClose={handleClose}
        title={t("onboardingTitle")}
        description={t("onboardingDescription")}
        size="lg"
        closeOnOverlay={false}
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs opacity-70">{stepLabel}</p>

          {step === 1 ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-(--color-border) bg-(--color-bg-tertiary) p-4">
                <h3 className="font-semibold mb-2">{t("onboardingLanguageThemeTitle")}</h3>
                <p className="text-sm opacity-70 mb-4">{t("onboardingLanguageThemeDesc")}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t("onboardingLanguage")}</label>
                    <select
                      className="w-full h-10 px-3 bg-transparent border border-(--color-border) rounded-lg"
                      value={selectedLocale}
                      onChange={(event) =>
                        setSelectedLocale((event.target.value === "ar" ? "ar" : "en") as LocaleOption)
                      }
                    >
                      <option value="en">English</option>
                      <option value="ar">العربية</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">{t("onboardingTheme")}</label>
                    <select
                      className="w-full h-10 px-3 bg-transparent border border-(--color-border) rounded-lg"
                      value={selectedTheme}
                      onChange={(event) =>
                        setSelectedTheme(
                          (event.target.value === "light" || event.target.value === "system"
                            ? event.target.value
                            : "dark") as ThemeOption
                        )
                      }
                    >
                      <option value="dark">{t("onboardingThemeDark")}</option>
                      <option value="light">{t("onboardingThemeLight")}</option>
                      <option value="system">{t("onboardingThemeSystem")}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleContinueStepOne} disabled={isBusy}>
                  {isBusy ? <Loader2 size={16} className="animate-spin" /> : t("onboardingNext")}
                </Button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-(--color-border) bg-(--color-bg-tertiary) p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <LayoutGrid size={16} className="text-accent" />
                  {t("onboardingWorkspaceTitle")}
                </h3>
                <p className="text-sm opacity-70 mb-4">{t("onboardingWorkspaceDesc")}</p>

                <label className="block text-sm font-medium mb-1">{t("onboardingWorkspaceName")}</label>
                <Input
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  placeholder={t("onboardingWorkspacePlaceholder")}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button variant="ghost" onClick={() => setStep(1)} disabled={isBusy}>
                  {t("onboardingBack")}
                </Button>
                <div className="flex items-center gap-2">
                  {hasExistingWorkspace ? (
                    <Button
                      variant="secondary"
                      onClick={() => setStep(3)}
                      disabled={isBusy}
                    >
                      {t("onboardingUseExistingWorkspace")}
                    </Button>
                  ) : null}
                  <Button onClick={handleCreateWorkspace} disabled={isBusy}>
                    {isBusy ? <Loader2 size={16} className="animate-spin" /> : t("onboardingCreateWorkspace")}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-(--color-border) bg-(--color-bg-tertiary) p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Rss size={16} className="text-accent" />
                  {t("onboardingFeedTitle")}
                </h3>
                <p className="text-sm opacity-70 mb-4">{t("onboardingFeedDesc")}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t("onboardingFeedType")}</label>
                    <select
                      className="w-full h-10 px-3 bg-transparent border border-(--color-border) rounded-lg"
                      value={feedType}
                      onChange={(event) => setFeedType(event.target.value as FeedTypeOption)}
                    >
                      <option value="rss">RSS</option>
                      <option value="custom_link">Custom Link</option>
                      <option value="youtube">YouTube</option>
                      <option value="github">GitHub</option>
                      <option value="facebook">Facebook RSS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">{t("onboardingFeedName")}</label>
                    <Input
                      value={feedTitle}
                      onChange={(event) => setFeedTitle(event.target.value)}
                      placeholder={t("onboardingFeedNamePlaceholder")}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-sm font-medium mb-1">{t("onboardingFeedUrl")}</label>
                  <Input
                    value={feedUrl}
                    onChange={(event) => setFeedUrl(event.target.value)}
                    placeholder={t("onboardingFeedUrlPlaceholder")}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button variant="ghost" onClick={() => setStep(2)} disabled={isBusy}>
                  {t("onboardingBack")}
                </Button>
                <div className="flex items-center gap-2">
                  {hasExistingFeed ? (
                    <Button variant="secondary" onClick={() => setStep(4)} disabled={isBusy}>
                      {t("onboardingUseExistingFeed")}
                    </Button>
                  ) : null}
                  <Button onClick={handleCreateFeed} disabled={isBusy}>
                    {isBusy ? <Loader2 size={16} className="animate-spin" /> : t("onboardingCreateFeed")}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-(--color-border) bg-(--color-bg-tertiary) p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <BellRing size={16} className="text-accent" />
                  {t("onboardingEnableNotificationsTitle")}
                </h3>
                <p className="text-sm opacity-70 mb-4">{t("onboardingEnableNotificationsDesc")}</p>

                {!pushSupported ? (
                  <p className="text-sm opacity-80">{t("onboardingNotificationsUnsupported")}</p>
                ) : null}

                {pushStatusMessage ? <p className="text-sm opacity-80">{pushStatusMessage}</p> : null}

                {pushEnabled ? (
                  <p className="text-sm text-accent flex items-center gap-2">
                    <CheckCircle2 size={14} />
                    {t("onboardingNotificationsEnabled")}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button variant="ghost" onClick={() => setStep(3)} disabled={isBusy}>
                  {t("onboardingBack")}
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => setStep(5)} disabled={isBusy}>
                    {t("onboardingSkip")}
                  </Button>
                  <Button onClick={handleEnablePush} disabled={isBusy || pushEnabled}>
                    {isBusy ? <Loader2 size={16} className="animate-spin" /> : t("onboardingEnableNotifications")}
                  </Button>
                  <Button onClick={() => setStep(5)} disabled={isBusy}>
                    {t("onboardingNext")}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-(--color-border) bg-(--color-bg-tertiary) p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Compass size={16} className="text-accent" />
                  {t("onboardingTourTitle")}
                </h3>
                <p className="text-sm opacity-70 mb-4">{t("onboardingTourDesc")}</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Button variant="secondary" onClick={() => router.push("/workspaces")}>
                    {t("onboardingTourWorkspaces")}
                  </Button>
                  <Button variant="secondary" onClick={() => router.push("/feeds")}>
                    {t("onboardingTourFeeds")}
                  </Button>
                  <Button variant="secondary" onClick={() => router.push("/notifications")}>
                    {t("onboardingTourNotifications")}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button variant="ghost" onClick={() => setStep(4)} disabled={isBusy}>
                  {t("onboardingBack")}
                </Button>
                <Button onClick={handleFinish} disabled={isBusy}>
                  {isBusy ? <Loader2 size={16} className="animate-spin" /> : t("onboardingFinish")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
