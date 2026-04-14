"use client";

import { useState, useEffect } from "react";
import { EmptyState, Button, Card, Input, Modal, useToast } from "@/components/ui";
import { Rss, Plus, Edit2, Trash2, Loader2, Link as LinkIcon, Video, Code, Pin } from "lucide-react";

type Feed = {
  id: string;
  title: string;
  url: string | null;
  type: string;
  platform: string | null;
  favicon: string | null;
  workspaceId: string | null;
  isPinned: boolean;
};

type Workspace = {
  id: string;
  name: string;
};

const PLATFORMS = [
  { id: "custom_link", label: "Custom Link", icon: <LinkIcon size={16} /> },
  { id: "rss", label: "RSS Feed", icon: <Rss size={16} /> },
  { id: "youtube", label: "YouTube", icon: <Video size={16} /> },
  { id: "github", label: "GitHub", icon: <Code size={16} /> },
];

export function FeedManager() {
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
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
      toast("Failed to load data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (feed?: Feed) => {
    if (feed) {
      setEditingFeed(feed);
      setTitle(feed.title);
      setUrl(feed.url || "");
      setType(feed.type);
      setWorkspaceId(feed.workspaceId || "");
    } else {
      setEditingFeed(null);
      setTitle("");
      setUrl("");
      setType("custom_link");
      setWorkspaceId("");
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTitle("");
    setUrl("");
    setType("custom_link");
    setWorkspaceId("");
    setEditingFeed(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const isEdit = !!editingFeed;
      const apiUrl = isEdit ? `/api/feeds/${editingFeed.id}` : "/api/feeds";
      const method = isEdit ? "PATCH" : "POST";

      const payload: any = { 
        title, 
        type,
        workspaceId: workspaceId || null,
        url: url || null,
        platform: type !== "rss" && type !== "custom_link" ? type : null
      };

      const res = await fetch(apiUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save feed");

      toast(`Feed ${isEdit ? "updated" : "added"} successfully`, "success");
      handleCloseModal();
      fetchData();
    } catch (error) {
      console.error(error);
      toast("Failed to save feed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feed?")) return;

    try {
      const res = await fetch(`/api/feeds/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete feed");
      
      toast("Feed deleted", "success");
      fetchData();
    } catch (error) {
      console.error(error);
      toast("Failed to delete feed", "error");
    }
  };

  const togglePin = async (feed: Feed) => {
    try {
      const res = await fetch(`/api/feeds/${feed.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !feed.isPinned }),
      });
      if (!res.ok) throw new Error("Failed to update pin status");
      fetchData();
    } catch(err) {
      toast("Failed to update pin status", "error");
    }
  }

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
          <h1 className="text-2xl font-bold">My Feeds</h1>
          <p className="text-sm opacity-70">Manage your connected sources and links</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
          <Plus size={16} /> Add Feed
        </Button>
      </div>

      {feeds.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState 
            icon={<Rss size={48} />}
            title="No Feeds"
            description="Connect a content provider, save a quick link, or add an RSS feed."
            action={<Button onClick={() => handleOpenModal()}>Add New Feed</Button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {feeds.map((feed) => (
            <Card key={feed.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[var(--colors-bg-alt)] border border-[var(--colors-border)] overflow-hidden shrink-0">
                    {feed.favicon ? (
                      <img src={feed.favicon} alt={feed.title} className="w-6 h-6 object-contain" />
                    ) : (
                      PLATFORMS.find(p => p.id === feed.type)?.icon || <LinkIcon size={20} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-base truncate">{feed.title}</h3>
                    <p className="text-xs opacity-70 truncate max-w-full">
                      {feed.url ? new URL(feed.url).hostname : (feed.type === 'rss' && feed.url ? feed.url : "No URL")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <button 
                    onClick={() => togglePin(feed)}
                    className={`p-1 border-none bg-transparent hover:bg-[var(--colors-bg-alt)] rounded transition-colors cursor-pointer ${feed.isPinned ? "text-[#f59e0b] opacity-100" : "opacity-40 hover:opacity-100"}`}
                    title={feed.isPinned ? "Unpin" : "Pin to sidebar"}
                  >
                    <Pin size={16} fill={feed.isPinned ? "currentColor" : "none"} />
                  </button>
                  <button 
                    onClick={() => handleOpenModal(feed)}
                    className="p-1 border-none bg-transparent hover:bg-[var(--colors-bg-alt)] rounded transition-colors opacity-40 hover:opacity-100 cursor-pointer"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(feed.id)}
                    className="p-1 border-none bg-transparent hover:bg-[var(--colors-danger)] hover:text-white rounded transition-colors opacity-40 hover:opacity-100 cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              {feed.workspaceId && workspaces.find(w => w.id === feed.workspaceId) && (
                <div className="mt-2 inline-flex">
                  <span className="text-xs px-2 py-1 bg-[var(--colors-bg-alt)] rounded-md opacity-80 border border-[var(--colors-border)]">
                    {workspaces.find(w => w.id === feed.workspaceId)?.name}
                  </span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={isModalOpen} onClose={handleCloseModal} title={editingFeed ? "Edit Feed" : "Add New Feed"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 dark">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setType(p.id)}
                  className={`flex items-center gap-2 p-2 rounded-md border text-sm transition-colors cursor-pointer
                    ${type === p.id 
                      ? "border-accent bg-accent/10 text-accent font-medium" 
                      : "border-[var(--colors-border)] bg-transparent hover:bg-[var(--colors-bg-alt)]"
                    }`}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Title <span className="text-red-500">*</span></label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="e.g. Next.js Blog"
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">URL (Optional)</label>
            <Input 
              value={url} 
              onChange={(e) => setUrl(e.target.value)} 
              placeholder="https://..."
              type="url"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Workspace</label>
            <select 
              className="w-full h-10 px-3 bg-transparent border border-[var(--colors-border)] rounded-lg text-[var(--colors-text)] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
            >
              <option value="" className="bg-[var(--colors-bg)] text-[var(--colors-text)]">Unassigned</option>
              {workspaces.map(w => (
                <option key={w.id} value={w.id} className="bg-[var(--colors-bg)] text-[var(--colors-text)]">{w.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" type="button" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Feed"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
