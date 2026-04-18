"use client";

import { useState, useEffect, useCallback } from "react";
import { EmptyState, Button, Card, Input, Modal, useToast } from "@/components/ui";
import { LayoutGrid, Plus, Edit2, Trash2, Loader2, Folder } from "lucide-react";
import { useTranslations } from "next-intl";

type Workspace = {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  _count?: { feeds: number };
};

export function WorkspaceManager() {
  const t = useTranslations("Workspaces");
  const tCommon = useTranslations("Common");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  
  // Form State
  const [name, setName] = useState("");
  const [color, setColor] = useState("#1d546c");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchWorkspaces = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/workspaces");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setWorkspaces(data);
    } catch (error) {
      console.error(error);
      toast(tCommon("error"), "error");
    } finally {
      setIsLoading(false);
    }
  }, [toast, tCommon]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleOpenModal = (workspace?: Workspace) => {
    if (workspace) {
      setEditingWorkspace(workspace);
      setName(workspace.name);
      setColor(workspace.color || "#1d546c");
    } else {
      setEditingWorkspace(null);
      setName("");
      setColor("#1d546c");
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setName("");
    setColor("#1d546c");
    setEditingWorkspace(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const isEdit = !!editingWorkspace;
      const url = isEdit ? `/api/workspaces/${editingWorkspace.id}` : "/api/workspaces";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });

      if (!res.ok) throw new Error("Failed to save workspace");

      toast(isEdit ? t("successUpdate") : t("successCreate"), "success");
      handleCloseModal();
      fetchWorkspaces();
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
      const res = await fetch(`/api/workspaces/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete workspace");
      
      toast(t("successDelete"), "success");
      fetchWorkspaces();
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
    <div className="flex flex-col gap-6 p-6 h-full max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm opacity-70">{t("subtitle")}</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
          <Plus size={16} /> {t("newBtn")}
        </Button>
      </div>

      {workspaces.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState 
            icon={<LayoutGrid size={48} />}
            title={t("noWorkspaces")}
            description={t("noWorkspacesDesc")}
            action={<Button onClick={() => handleOpenModal()}>{t("createFirst")}</Button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws) => (
            <Card key={ws.id} className="p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-[#f4f4f4] shadow-sm"
                    style={{ backgroundColor: ws.color || "#1d546c" }}
                  >
                    <Folder size={18} />
                  </div>
                  <h3 className="font-semibold text-lg">{ws.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleOpenModal(ws)}
                    className="p-2 border-none bg-transparent hover:bg-(--color-bg-hover) rounded-lg transition-colors opacity-70 hover:opacity-100 cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(ws.id)}
                    className="p-2 border-none bg-transparent hover:bg-(--color-error) hover:text-[#f4f4f4] rounded-lg transition-colors opacity-70 hover:opacity-100 cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal is a wrapper around your content, check ui implementation */}
      <Modal open={isModalOpen} onClose={handleCloseModal} title={editingWorkspace ? t("editWorkspace") : t("createWorkspace")}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 dark">
          <div>
            <label className="block text-sm font-medium mb-1">{t("name")}</label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Engineering, Personal, Finance..."
              autoFocus
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("color")}</label>
            <div className="flex items-center gap-2">
              {['#0c2b4e', '#1a3d64', '#1d546c', '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'].map(c => (
                <button
                  key={c}
                  type="button"
                  className={`w-8 h-8 rounded-full border-none cursor-pointer transition-transform ${color === c ? 'scale-110 shadow-lg' : 'scale-100 opacity-70'}`}
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
