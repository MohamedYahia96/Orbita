"use client";

import { useState, useEffect } from "react";
import { EmptyState, Button, Card, Input, Modal, useToast } from "@/components/ui";
import { LayoutGrid, Plus, Edit2, Trash2, Loader2, Folder } from "lucide-react";

type Workspace = {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  _count?: { feeds: number };
};

export function WorkspaceManager() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  
  // Form State
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/workspaces");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setWorkspaces(data);
    } catch (error) {
      console.error(error);
      toast("Failed to load workspaces", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (workspace?: Workspace) => {
    if (workspace) {
      setEditingWorkspace(workspace);
      setName(workspace.name);
      setColor(workspace.color || "#3b82f6");
    } else {
      setEditingWorkspace(null);
      setName("");
      setColor("#3b82f6");
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setName("");
    setColor("#3b82f6");
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

      toast(`Workspace ${isEdit ? "updated" : "created"} successfully`, "success");
      handleCloseModal();
      fetchWorkspaces();
    } catch (error) {
      console.error(error);
      toast("Failed to save workspace", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this workspace?")) return;

    try {
      const res = await fetch(`/api/workspaces/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete workspace");
      
      toast("Workspace deleted", "success");
      fetchWorkspaces();
    } catch (error) {
      console.error(error);
      toast("Failed to delete workspace", "error");
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
          <h1 className="text-2xl font-bold">My Workspaces</h1>
          <p className="text-sm opacity-70">Manage your logical groupings of content</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
          <Plus size={16} /> New Workspace
        </Button>
      </div>

      {workspaces.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState 
            icon={<LayoutGrid size={48} />}
            title="No Workspaces"
            description="Create a workspace to start organizing your feeds."
            action={<Button onClick={() => handleOpenModal()}>Create New Workspace</Button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws) => (
            <Card key={ws.id} className="p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: ws.color || "#3b82f6" }}
                  >
                    <Folder size={18} />
                  </div>
                  <h3 className="font-semibold text-lg">{ws.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleOpenModal(ws)}
                    className="p-2 border-none bg-transparent hover:bg-[var(--colors-bg-alt)] rounded-lg transition-colors opacity-70 hover:opacity-100 cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(ws.id)}
                    className="p-2 border-none bg-transparent hover:bg-[var(--colors-danger)] hover:text-white rounded-lg transition-colors opacity-70 hover:opacity-100 cursor-pointer"
                    title="Delete"
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
      <Modal open={isModalOpen} onClose={handleCloseModal} title={editingWorkspace ? "Edit Workspace" : "Create Workspace"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 dark">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Engineering, Personal, Finance..."
              autoFocus
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Color</label>
            <div className="flex items-center gap-2">
              {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'].map(c => (
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
