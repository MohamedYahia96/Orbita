"use client";

import { useState, useEffect, useCallback } from "react";
import { EmptyState, Button, Input, Modal, useToast } from "@/components/ui";
import { Tag as TagIcon, Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

type Tag = {
  id: string;
  name: string;
  color: string;
};

export function TagManager() {
  const t = useTranslations("Tags");
  const tCommon = useTranslations("Common");
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  
  // Form State
  const [name, setName] = useState("");
  const [color, setColor] = useState("#8b5cf6"); // default purple
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/tags");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTags(data);
    } catch (error) {
      console.error(error);
      toast(tCommon("error"), "error");
    } finally {
      setIsLoading(false);
    }
  }, [toast, tCommon]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

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

      toast(isEdit ? t("successUpdate") : t("successCreate"), "success");
      handleCloseModal();
      fetchTags();
    } catch (error) {
      console.error(error);
      toast(tCommon("error"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;

    try {
      const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete tag");
      
      toast(t("successDelete"), "success");
      fetchTags();
    } catch (error) {
      console.error(error);
      toast(tCommon("error"), "error");
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
    <div className="flex flex-col gap-6 p-6 h-full max-w-5xl mx-auto border border-(--colors-border) rounded-2xl bg-(--colors-bg-alt)/30 backdrop-blur-sm shadow-xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">{t("title")}</h2>
          <p className="text-sm opacity-70">{t("subtitle")}</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-3 py-1.5 h-auto text-sm" size="sm">
          <Plus size={16} /> {t("newBtn")}
        </Button>
      </div>

      {tags.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <EmptyState 
            icon={<TagIcon size={40} />}
            title={t("noTags")}
            description={t("noTagsDesc")}
            action={<Button onClick={() => handleOpenModal()}>{t("createFirst")}</Button>}
          />
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {tags.map((tag) => (
            <div 
              key={tag.id} 
              className="flex items-center gap-2 group px-3 py-1.5 rounded-full border border-(--colors-border) bg-(--colors-bg) shadow-sm hover:border-accent transition-colors"
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

      <Modal open={isModalOpen} onClose={handleCloseModal} title={editingTag ? t("editTag") : t("createTag")}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 dark">
          <div>
            <label className="block text-sm font-medium mb-1">{t("name")}</label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. important, to-read, frontend..."
              autoFocus
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("color")}</label>
            <div className="flex items-center gap-2 mt-2">
              {['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'].map(c => (
                <button
                  key={c}
                  type="button"
                  className={`w-6 h-6 rounded-full border border-(--colors-border) cursor-pointer transition-transform ${color === c ? 'scale-125 shadow-md ring-2 ring-white/20 ring-offset-1 ring-offset-black' : 'scale-100 opacity-60 hover:opacity-100'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" type="button" onClick={handleCloseModal}>{t("cancel")}</Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("save")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
