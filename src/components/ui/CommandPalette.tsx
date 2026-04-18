"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Modal } from "./";
import { Search, Folder, Rss, Settings, Home, Bell, Bookmark, Tag as TagIcon, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

type Command = {
  id: string;
  name: string;
  icon: React.ReactNode;
  action: () => void;
  isDBResult?: boolean;
};

type SearchResultItem = {
  id: string;
  title: string;
  url: string | null;
  feed?: {
    favicon?: string | null;
  } | null;
};

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  const t = useTranslations("Commands");
  const tSidebar = useTranslations("Sidebar");

  const commands: Command[] = [
    { id: "home", name: t("shortcuts.home"), icon: <Home size={18} />, action: () => router.push("/overview") },
    { id: "workspaces", name: t("shortcuts.workspaces"), icon: <Folder size={18} />, action: () => router.push("/workspaces") },
    { id: "feeds", name: t("shortcuts.feeds"), icon: <Rss size={18} />, action: () => router.push("/feeds") },
    { id: "reading-list", name: t("shortcuts.readingList"), icon: <Bookmark size={18} />, action: () => router.push("/reading-list") },
    { id: "tags", name: t("shortcuts.tags"), icon: <TagIcon size={18} />, action: () => router.push("/tags") },
    { id: "notifications", name: t("shortcuts.notifications"), icon: <Bell size={18} />, action: () => router.push("/notifications") },
    { id: "settings", name: t("shortcuts.settings"), icon: <Settings size={18} />, action: () => router.push("/settings") },
  ];

  const staticCommands = commands.filter((command) =>
    command.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    
    const handler = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) {
          setResults(data.items || []);
        }
      } catch {
        console.error("Search failed");
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      // Simple keyboard shortcuts if modal is closed
      if (!isOpen && !e.ctrlKey && !e.metaKey && e.target instanceof HTMLElement && e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
        if (e.key === "h") router.push("/overview");
        if (e.key === "w") router.push("/workspaces");
        if (e.key === "f") router.push("/feeds");
        if (e.key === "r") router.push("/reading-list");
        if (e.key === "t") router.push("/tags");
        if (e.key === "s") router.push("/settings");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, router]);

  const handleSelect = (command: Command) => {
    command.action();
    setIsOpen(false);
    setQuery("");
  };

  return (
    <Modal open={isOpen} onClose={() => setIsOpen(false)} title={t("title")}>
      <div className="flex flex-col gap-2 p-2">
        <div className="flex items-center gap-2 px-3 pb-2 border-b border-(--colors-border) mb-2">
          <Search size={18} className="opacity-50" />
          <input
            autoFocus
            className="w-full bg-transparent border-none outline-none text-(--colors-text) placeholder:opacity-50 text-base"
            placeholder={t("placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col gap-1 max-h-75 overflow-y-auto">
          {staticCommands.length > 0 && (
            <div className="mb-2">
              <div className="text-xs opacity-50 px-3 pb-1 font-semibold uppercase">{t("navigation")}</div>
              {staticCommands.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  className="flex items-center gap-3 px-3 py-2 w-full text-left hover:bg-(--colors-bg-alt) rounded-lg transition-colors border-none bg-transparent cursor-pointer text-(--colors-text)"
                >
                  <div className="opacity-70">{cmd.icon}</div>
                  <span className="font-medium text-sm">{cmd.name}</span>
                </button>
              ))}
            </div>
          )}

          {isSearching && <div className="text-center py-2 opacity-50 text-xs">{t("searching")}</div>}

          {results.length > 0 && !isSearching && (
            <div>
               <div className="text-xs opacity-50 px-3 pb-1 pt-2 border-t border-(--colors-border) font-semibold uppercase">{t("content")}</div>
               {results.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                        setIsOpen(false);
                        window.open(item.url || '', '_blank');
                    }}
                    className="flex items-center gap-3 px-3 py-2 w-full text-left hover:bg-(--colors-bg-alt) rounded-lg transition-colors border-none bg-transparent cursor-pointer text-(--colors-text)"
                  >
                    <div className="opacity-70 w-5 h-5 flex items-center justify-center shrink-0">
                       {item.feed?.favicon ? <Image src={item.feed.favicon} className="w-4 h-4 rounded" alt="Feed icon" width={16} height={16} unoptimized /> : <ExternalLink size={14} />}
                    </div>
                    <span className="font-medium text-sm truncate">{item.title}</span>
                  </button>
               ))}
            </div>
          )}

          {staticCommands.length === 0 && results.length === 0 && !isSearching && (
            <div className="text-center py-6 opacity-50 text-sm">
              {t("noResults")}
            </div>
          )}
        </div>
        
        <div className="mt-2 pt-2 border-t border-(--colors-border) text-xs opacity-50 text-center flex flex-wrap justify-center gap-4">
          <span><kbd className="bg-(--colors-bg-alt) px-1 rounded">f</kbd> {tSidebar("feeds")}</span>
          <span><kbd className="bg-(--colors-bg-alt) px-1 rounded">w</kbd> {tSidebar("workspaces")}</span>
          <span><kbd className="bg-(--colors-bg-alt) px-1 rounded">r</kbd> {tSidebar("readingList")}</span>
          <span><kbd className="bg-(--colors-bg-alt) px-1 rounded">t</kbd> {tSidebar("tags")}</span>
          <span><kbd className="bg-(--colors-bg-alt) px-1 rounded">h</kbd> {tSidebar("overview")}</span>
          <span><kbd className="bg-(--colors-bg-alt) px-1 rounded">s</kbd> {tSidebar("settings")}</span>
        </div>
      </div>
    </Modal>
  );
}
