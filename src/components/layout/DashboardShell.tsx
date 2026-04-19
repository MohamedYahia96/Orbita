"use client";

import { useState } from "react";
import { Sidebar, Header, MainContent } from "@/components/layout";
import { CommandPalette } from "@/components/ui";

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Header />
        <MainContent>{children}</MainContent>
      </div>
      <CommandPalette />
    </div>
  );
}