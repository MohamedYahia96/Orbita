"use client";

import { EmptyState, Button } from "@/components/ui";
import { BellRing } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <EmptyState 
        icon={<BellRing size={48} />}
        title="Zero Notifications"
        description="You're all caught up! No active warnings or urgent feed matters."
        action={<Button variant="ghost">Notification Settings</Button>}
      />
    </div>
  );
}
