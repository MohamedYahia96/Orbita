"use client";

import { Card, EmptyState, Button } from "@/components/ui";
import { CopyPlus } from "lucide-react";

export default function OverviewPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--space-4)" }}>
        <Card padding="md" variant="glass">
          <h3 className="text-secondary text-sm">Active Feeds</h3>
          <p className="text-3xl font-bold mt-2">12</p>
        </Card>
        <Card padding="md" variant="glass">
          <h3 className="text-secondary text-sm">Unread Notifications</h3>
          <p className="text-3xl font-bold mt-2 text-accent">3</p>
        </Card>
        <Card padding="md" variant="glass">
          <h3 className="text-secondary text-sm">Workspaces</h3>
          <p className="text-3xl font-bold mt-2">4</p>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-6)" }}>
        {/* Main Feed Activity Placeholder */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <Card padding="none" variant="interactive" style={{ padding: "var(--space-4)" }}>
             <EmptyState 
                icon={<CopyPlus size={48} />}
                title="No recent activity"
                description="Your feeds are currently quiet. Try adding more sources to keep your dashboard active."
                action={<Button>Add Feed Source</Button>}
             />
          </Card>
        </section>

        {/* Sidebar / Quick Actions */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <Card padding="md" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
             <Button fullWidth variant="secondary">Create Workspace</Button>
             <Button fullWidth variant="ghost">Manage Sources</Button>
          </Card>
        </section>
      </div>
    </div>
  );
}
