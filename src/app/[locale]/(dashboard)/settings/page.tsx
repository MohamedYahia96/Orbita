"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui";
import { useTranslations } from "next-intl";

type FeedOption = {
  id: string;
  title: string;
};

type TagOption = {
  id: string;
  name: string;
};

type AlertRule = {
  id: string;
  name: string;
  enabled: boolean;
  keyword: string | null;
  sender: string | null;
  feedId: string | null;
  actionPush: boolean;
  actionBookmark: boolean;
  actionTagId: string | null;
  feed?: {
    id: string;
    title: string;
  } | null;
  actionTag?: {
    id: string;
    name: string;
  } | null;
};

type RuleFormState = {
  name: string;
  keyword: string;
  sender: string;
  feedId: string;
  actionPush: boolean;
  actionBookmark: boolean;
  actionTagId: string;
  enabled: boolean;
};

const DEFAULT_RULE_FORM: RuleFormState = {
  name: "",
  keyword: "",
  sender: "",
  feedId: "",
  actionPush: true,
  actionBookmark: false,
  actionTagId: "",
  enabled: true,
};

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const [feeds, setFeeds] = useState<FeedOption[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [form, setForm] = useState<RuleFormState>(DEFAULT_RULE_FORM);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [feedsRes, tagsRes, rulesRes] = await Promise.all([
        fetch("/api/feeds", { cache: "no-store" }),
        fetch("/api/tags", { cache: "no-store" }),
        fetch("/api/alert-rules", { cache: "no-store" }),
      ]);

      const feedsPayload = (await feedsRes.json().catch(() => [])) as FeedOption[];
      const tagsPayload = (await tagsRes.json().catch(() => [])) as TagOption[];
      const rulesPayload = (await rulesRes.json().catch(() => [])) as AlertRule[];

      setFeeds(Array.isArray(feedsPayload) ? feedsPayload : []);
      setTags(Array.isArray(tagsPayload) ? tagsPayload : []);
      setRules(Array.isArray(rulesPayload) ? rulesPayload : []);
    } catch {
      setError(t("rulesLoadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const canSubmit = useMemo(() => {
    const hasCondition = Boolean(form.keyword.trim() || form.sender.trim() || form.feedId);
    const hasAction = Boolean(form.actionPush || form.actionBookmark || form.actionTagId);
    return Boolean(form.name.trim() && hasCondition && hasAction);
  }, [form]);

  const resetForm = () => {
    setForm(DEFAULT_RULE_FORM);
    setEditingRuleId(null);
  };

  const submitRule = async () => {
    if (!canSubmit) {
      setError(t("rulesValidation"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      name: form.name,
      keyword: form.keyword || null,
      sender: form.sender || null,
      feedId: form.feedId || null,
      actionPush: form.actionPush,
      actionBookmark: form.actionBookmark,
      actionTagId: form.actionTagId || null,
      enabled: form.enabled,
    };

    try {
      const endpoint = editingRuleId ? `/api/alert-rules/${editingRuleId}` : "/api/alert-rules";
      const method = editingRuleId ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error || t("rulesSaveFailed"));
      }

      await loadData();
      resetForm();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("rulesSaveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const editRule = (rule: AlertRule) => {
    setEditingRuleId(rule.id);
    setForm({
      name: rule.name,
      keyword: rule.keyword || "",
      sender: rule.sender || "",
      feedId: rule.feedId || "",
      actionPush: rule.actionPush,
      actionBookmark: rule.actionBookmark,
      actionTagId: rule.actionTagId || "",
      enabled: rule.enabled,
    });
  };

  const removeRule = async (id: string) => {
    try {
      const res = await fetch(`/api/alert-rules/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(t("rulesDeleteFailed"));
      }

      await loadData();
      if (editingRuleId === id) {
        resetForm();
      }
    } catch {
      setError(t("rulesDeleteFailed"));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: "800px" }}>
      <h2 className="text-xl font-semibold">{t("title")}</h2>
      
      <Card title={t("profileTitle")} padding="lg">
        <p className="text-secondary mb-4">{t("profileDesc")}</p>
        <div style={{ height: "40px", width: "100%", background: "var(--color-bg-hover)", borderRadius: "var(--radius-sm)" }}></div>
      </Card>
      
      <Card title={t("integrationsTitle")} padding="lg">
        <p className="text-secondary mb-4">{t("integrationsDesc")}</p>
        <div style={{ height: "40px", width: "100%", background: "var(--color-bg-hover)", borderRadius: "var(--radius-sm)" }}></div>
      </Card>

      <Card title={t("rulesTitle")} padding="lg">
        <p className="text-secondary mb-4">{t("rulesDesc")}</p>

        {error ? <p className="text-sm text-danger mb-3">{error}</p> : null}

        <div style={{ display: "grid", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          <input
            className="h-10 rounded-md border border-(--color-border) bg-transparent px-3"
            placeholder={t("rulesName")}
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-2)" }}>
            <input
              className="h-10 rounded-md border border-(--color-border) bg-transparent px-3"
              placeholder={t("rulesKeyword")}
              value={form.keyword}
              onChange={(event) => setForm((current) => ({ ...current, keyword: event.target.value }))}
            />

            <input
              className="h-10 rounded-md border border-(--color-border) bg-transparent px-3"
              placeholder={t("rulesSender")}
              value={form.sender}
              onChange={(event) => setForm((current) => ({ ...current, sender: event.target.value }))}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-2)" }}>
            <select
              className="h-10 rounded-md border border-(--color-border) bg-transparent px-3"
              value={form.feedId}
              onChange={(event) => setForm((current) => ({ ...current, feedId: event.target.value }))}
            >
              <option value="">{t("rulesAllFeeds")}</option>
              {feeds.map((feed) => (
                <option key={feed.id} value={feed.id}>
                  {feed.title}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-(--color-border) bg-transparent px-3"
              value={form.actionTagId}
              onChange={(event) => setForm((current) => ({ ...current, actionTagId: event.target.value }))}
            >
              <option value="">{t("rulesNoTag")}</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.actionPush}
                onChange={(event) => setForm((current) => ({ ...current, actionPush: event.target.checked }))}
              />
              {t("rulesActionPush")}
            </label>

            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.actionBookmark}
                onChange={(event) => setForm((current) => ({ ...current, actionBookmark: event.target.checked }))}
              />
              {t("rulesActionBookmark")}
            </label>

            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))}
              />
              {t("rulesEnabled")}
            </label>
          </div>

          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <button
              type="button"
              className="h-9 rounded-md bg-(--color-accent) px-4 text-sm font-medium text-white border-none cursor-pointer"
              disabled={isSubmitting || !canSubmit}
              onClick={() => void submitRule()}
            >
              {editingRuleId ? t("rulesUpdate") : t("rulesCreate")}
            </button>

            {editingRuleId ? (
              <button
                type="button"
                className="h-9 rounded-md border border-(--color-border) bg-transparent px-4 text-sm cursor-pointer"
                onClick={resetForm}
              >
                {t("rulesCancel")}
              </button>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-secondary">{t("rulesLoading")}</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-secondary">{t("rulesEmpty")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {rules.map((rule) => (
              <div key={rule.id} className="rounded-md border border-(--color-border) p-3">
                <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-2)", flexWrap: "wrap" }}>
                  <div>
                    <p className="font-medium">{rule.name}</p>
                    <p className="text-xs text-secondary mt-1">
                      {rule.feed?.title || t("rulesAllFeeds")} • {rule.enabled ? t("rulesEnabled") : t("rulesDisabled")}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    <button
                      type="button"
                      className="h-8 rounded-md border border-(--color-border) bg-transparent px-3 text-xs cursor-pointer"
                      onClick={() => editRule(rule)}
                    >
                      {t("rulesEdit")}
                    </button>
                    <button
                      type="button"
                      className="h-8 rounded-md border border-(--color-danger) bg-transparent px-3 text-xs text-danger cursor-pointer"
                      onClick={() => void removeRule(rule.id)}
                    >
                      {t("rulesDelete")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
