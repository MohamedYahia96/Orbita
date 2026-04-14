"use client";

import { useState, useEffect } from "react";
import { EmptyState, Button, Card, Input, Modal, useToast, Badge } from "@/components/ui";
import { Tag as TagIcon, Plus, Edit2, Trash2, Loader2 } from "lucide-react";

type Tag = {
  id: string;
  name: string;
  color: string;
};

export function TagManager() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  
  // Form State
  const [name, setName] = useState("");
  const [color, setColor] = useState("#8b5cf6"); // default purple
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/tags");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTags(data);
    } catch (error) {
      console.error(error);
      toast("Failed to load tags", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (tag?: Tag) => {
    if (tag) {
      setEditingTag(tag);
      setName(tag.name);
      setColor(tag.color);
    } else {
      setEditingTag(null);
      setName("");
      setColor("#8b5cf6");
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setName("");
    setColor("#8b5cf6");
    setEditingTag(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const isEdit = !!editingTag;
      const url = isEdit ? `/api/tags/${editingTag.id}` : "/api/tags";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });

      if (!res.ok) throw new Error("Failed to save tag");

      toast(`Tag ${isEdit ? "updated" : "created"} successfully`, "success");
      handleCloseModal();
      fetchTags();
    } catch (error) {
      console.error(error);
      toast("Failed to save tag", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tag?")) return;

    try {
      const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete tag");
      
      toast("Tag deleted", "success");
      fetchTags();
    } catch (error) {
      console.error(error);
      toast("Failed to delete tag", "error");
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
    <div className="flex flex-col gap-6 p-6 h-full max-w-5xl mx-auto border border-[var(--colors-border)] rounded-2xl bg-[var(--colors-bg-alt)]/30 backdrop-blur-sm shadow-xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Smart Tags</h2>
          <p className="text-sm opacity-70">Organize your saved items and feeds</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-3 py-1.5 h-auto text-sm" size="sm">
          <Plus size={16} /> New Tag
        </Button>
      </div>

      {tags.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <EmptyState 
            icon={<TagIcon size={40} />}
            title="No Tags Yet"
            description="Create tags to quickly categorize and filter your reading list."
            action={<Button onClick={() => handleOpenModal()}>Create Tag</Button>}
          />
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {tags.map((tag) => (
            <div 
              key={tag.id} 
              className="flex items-center gap-2 group px-3 py-1.5 rounded-full border border-[var(--colors-border)] bg-[var(--colors-bg)] shadow-sm hover:border-accent transition-colors"
            >
              <div 
                className="w-3 h-3 rounded-full shrink-0" 
                style={{ backgroundColor: tag.color }} 
              />
              <span className="font-medium text-sm">{tag.name}</span>
              <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleOpenModal(tag)}
                  className="p-1 border-none bg-transparent hover:text-accent rounded cursor-pointer"
                >
                  <Edit2 size={12} />
                </button>
                <button 
                  onClick={() => handleDelete(tag.id)}
                  className="p-1 border-none bg-transparent hover:text-red-500 rounded cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={isModalOpen} onClose={handleCloseModal} title={editingTag ? "Edit Tag" : "Create Tag"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 dark">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. important, to-read, frontend..."
              autoFocus
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Color</label>
            <div className="flex items-center gap-2 mt-2">
              {['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'].map(c => (
                <button
                  key={c}
                  type="button"
                  className={`w-6 h-6 rounded-full border border-[var(--colors-border)] cursor-pointer transition-transform ${color === c ? 'scale-125 shadow-md ring-2 ring-white/20 ring-offset-1 ring-offset-black' : 'scale-100 opacity-60 hover:opacity-100'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" type="button" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
