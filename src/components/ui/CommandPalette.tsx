"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, Input } from "./";
import { Search, Folder, Rss, Settings, Home, Bell, Bookmark, Tag as TagIcon } from "lucide-react";

type Command = {
  id: string;
  name: string;
  icon: React.ReactNode;
  action: () => void;
};

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const commands: Command[] = [
    { id: "home", name: "Go to Home", icon: <Home size={18} />, action: () => router.push("/overview") },
    { id: "workspaces", name: "Manage Workspaces", icon: <Folder size={18} />, action: () => router.push("/workspaces") },
    { id: "feeds", name: "Manage Feeds", icon: <Rss size={18} />, action: () => router.push("/feeds") },
    { id: "reading-list", name: "Reading List", icon: <Bookmark size={18} />, action: () => router.push("/reading-list") },
    { id: "tags", name: "Smart Tags", icon: <TagIcon size={18} />, action: () => router.push("/tags") },
    { id: "notifications", name: "Notifications", icon: <Bell size={18} />, action: () => router.push("/notifications") },
    { id: "settings", name: "Settings", icon: <Settings size={18} />, action: () => router.push("/settings") },
  ];

  const filteredCommands = commands.filter((command) =>
    command.name.toLowerCase().includes(query.toLowerCase())
  );

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
    <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Command Palette">
      <div className="flex flex-col gap-2 p-2">
        <div className="flex items-center gap-2 px-3 pb-2 border-b border-[var(--colors-border)] mb-2">
          <Search size={18} className="opacity-50" />
          <input
            autoFocus
            className="w-full bg-transparent border-none outline-none text-[var(--colors-text)] placeholder:opacity-50 text-base"
            placeholder="Search commands... (Ctrl+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => handleSelect(cmd)}
                className="flex items-center gap-3 px-3 py-3 w-full text-left hover:bg-[var(--colors-bg-alt)] rounded-lg transition-colors border-none bg-transparent cursor-pointer text-[var(--colors-text)]"
              >
                <div className="opacity-70">{cmd.icon}</div>
                <span className="font-medium text-sm">{cmd.name}</span>
              </button>
            ))
          ) : (
            <div className="text-center py-6 opacity-50 text-sm">
              No commands found.
            </div>
          )}
        </div>
        
        <div className="mt-2 pt-2 border-t border-[var(--colors-border)] text-xs opacity-50 text-center flex flex-wrap justify-center gap-4">
          <span><kbd className="bg-[var(--colors-bg-alt)] px-1 rounded">f</kbd> Feeds</span>
          <span><kbd className="bg-[var(--colors-bg-alt)] px-1 rounded">w</kbd> Workspaces</span>
          <span><kbd className="bg-[var(--colors-bg-alt)] px-1 rounded">r</kbd> Read List</span>
          <span><kbd className="bg-[var(--colors-bg-alt)] px-1 rounded">t</kbd> Tags</span>
          <span><kbd className="bg-[var(--colors-bg-alt)] px-1 rounded">h</kbd> Home</span>
          <span><kbd className="bg-[var(--colors-bg-alt)] px-1 rounded">s</kbd> Settings</span>
        </div>
      </div>
    </Modal>
  );
}
