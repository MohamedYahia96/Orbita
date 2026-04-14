"use client";

import { useState, useEffect } from "react";
import { EmptyState, Button, Card, Input, Modal, useToast } from "@/components/ui";
import { Bookmark, Plus, Edit2, Trash2, Loader2, ExternalLink, Tag as TagIcon, CheckCircle } from "lucide-react";

type Tag = { id: string; name: string; color: string };

type ReadingListItem = {
  id: string;
  title: string;
  url: string | null;
  note: string | null;
  isRead: boolean;
  tags: { tag: Tag }[];
};

export function ReadingListManager() {
  const [items, setItems] = useState<ReadingListItem[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReadingListItem | null>(null);
  
  // Form State
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [itemsRes, tagsRes] = await Promise.all([
        fetch("/api/reading-list"),
        fetch("/api/tags")
      ]);
      if (!itemsRes.ok || !tagsRes.ok) throw new Error("Failed to fetch data");
      
      const itemsData = await itemsRes.json();
      const tagsData = await tagsRes.json();
      
      setItems(itemsData);
      setAvailableTags(tagsData);
    } catch (error) {
      console.error(error);
      toast("Failed to load reading list", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (item?: ReadingListItem) => {
    if (item) {
      setEditingItem(item);
      setTitle(item.title);
      setUrl(item.url || "");
      setNote(item.note || "");
      setSelectedTagIds(item.tags.map(t => t.tag.id));
    } else {
      setEditingItem(null);
      setTitle("");
      setUrl("");
      setNote("");
      setSelectedTagIds([]);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const isEdit = !!editingItem;
      const apiUrl = isEdit ? `/api/reading-list/${editingItem.id}` : "/api/reading-list";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(apiUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          url: url || null, 
          note: note || null, 
          tagIds: selectedTagIds 
        }),
      });

      if (!res.ok) throw new Error("Failed to save item");

      toast(`Saved to Reading List`, "success");
      handleCloseModal();
      fetchData();
    } catch (error) {
      console.error(error);
      toast("Failed to save item", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const toggleReadStatus = async (item: ReadingListItem) => {
    try {
      await fetch(`/api/reading-list/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: !item.isRead }),
      });
      fetchData();
    } catch (err) {
      toast("Failed to update status", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this from your reading list?")) return;
    try {
      await fetch(`/api/reading-list/${id}`, { method: "DELETE" });
      toast("Removed from reading list", "success");
      fetchData();
    } catch (error) {
      toast("Failed to delete item", "error");
    }
  };

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
          <h1 className="text-2xl font-bold">Reading List</h1>
          <p className="text-sm opacity-70">Saved articles, videos, and links for later</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
          <Plus size={16} /> Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState 
            icon={<Bookmark size={48} />}
            title="Read Later"
            description="Your reading list is empty. Add an article or link to read later."
            action={<Button onClick={() => handleOpenModal()}>Add to Reading List</Button>}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <Card key={item.id} className={`p-4 flex flex-col gap-3 transition-opacity ${item.isRead ? "opacity-60 hover:opacity-100" : "opacity-100"}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <button 
                    onClick={() => toggleReadStatus(item)}
                    className={`mt-1 border-none bg-transparent cursor-pointer transition-colors ${item.isRead ? "text-green-500" : "text-[var(--colors-text)] opacity-30 hover:opacity-100"}`}
                    title={item.isRead ? "Mark as unread" : "Mark as read"}
                  >
                    <CheckCircle size={20} />
                  </button>
                  <div className="flex flex-col gap-1">
                    <h3 className={`font-semibold text-lg ${item.isRead ? "line-through text-opacity-70" : ""}`}>
                      {item.url ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent hover:underline flex items-center gap-1 w-fit">
                          {item.title} <ExternalLink size={12} className="opacity-50" />
                        </a>
                      ) : (
                        item.title
                      )}
                    </h3>
                    {item.note && <p className="text-sm opacity-80 mt-1">{item.note}</p>}
                    
                    {item.tags.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {item.tags.map(t => (
                          <span key={t.tag.id} className="text-xs px-2 py-0.5 rounded-full border opacity-90 flex items-center gap-1" style={{ borderColor: t.tag.color, color: t.tag.color, backgroundColor: `${t.tag.color}15` }}>
                            {t.tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center shrink-0">
                  <button onClick={() => handleOpenModal(item)} className="p-2 border-none bg-transparent hover:bg-[var(--colors-bg-alt)] rounded-lg opacity-50 hover:opacity-100 cursor-pointer">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 border-none bg-transparent hover:bg-red-500 hover:text-white rounded-lg opacity-50 hover:opacity-100 cursor-pointer">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={isModalOpen} onClose={handleCloseModal} title={editingItem ? "Edit Item" : "Add to Reading List"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 dark">
          <div>
            <label className="block text-sm font-medium mb-1">Title <span className="text-red-500">*</span></label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Article title..."
              autoFocus
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">URL</label>
            <Input 
              value={url} 
              onChange={(e) => setUrl(e.target.value)} 
              placeholder="https://..."
              type="url"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Note (Optional)</label>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full min-h-[80px] p-2 bg-transparent border border-[var(--colors-border)] rounded-lg text-[var(--colors-text)] outline-none focus:border-accent"
              placeholder="Why are you saving this?"
            />
          </div>
          
          {availableTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-1"><TagIcon size={14}/> Tags</label>
              <div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto">
                {availableTags.map(tag => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      type="button"
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-[var(--colors-text)] opacity-100' 
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                      style={{ 
                        backgroundColor: isSelected ? tag.color : `${tag.color}30`,
                        color: isSelected ? '#fff' : tag.color,
                      }}
                    >
                      {tag.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[var(--colors-border)]">
            <Button variant="ghost" type="button" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
