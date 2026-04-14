"use client";

import { Card } from "@/components/ui";

export default function SettingsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: "800px" }}>
      <h2 className="text-xl font-semibold">Settings</h2>
      
      <Card title="Profile Settings" padding="lg">
        <p className="text-secondary mb-4">Manage your profile, themes, and personal data.</p>
        <div style={{ height: "40px", width: "100%", background: "var(--color-bg-hover)", borderRadius: "var(--radius-sm)" }}></div>
      </Card>
      
      <Card title="Integrations" padding="lg">
        <p className="text-secondary mb-4">Manage connected sources and API keys.</p>
        <div style={{ height: "40px", width: "100%", background: "var(--color-bg-hover)", borderRadius: "var(--radius-sm)" }}></div>
      </Card>
    </div>
  );
}
