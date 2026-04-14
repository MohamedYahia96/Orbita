"use client";

import { EmptyState, Button } from "@/components/ui";
import { AlertCircle } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-6)" }}>
      <EmptyState 
        icon={<AlertCircle size={64} className="text-error" />}
        title="Something went wrong!"
        description={error.message || "An unexpected error occurred while rendering this interface."}
        action={<Button variant="danger" onClick={() => reset()}>Try again</Button>}
      />
    </div>
  );
}
