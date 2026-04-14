import { EmptyState, Button } from "@/components/ui";
import Link from "next/link";
import { Ghost } from "lucide-react";

export default function NotFound() {
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-6)" }}>
      <EmptyState 
        icon={<Ghost size={64} className="text-secondary" />}
        title="404 - Page Not Found"
        description="The dashboard section you are looking for has been removed, had its name changed, or is temporarily unavailable."
        action={
          <Link href="/overview">
            <Button>Return to Overview</Button>
          </Link>
        }
      />
    </div>
  );
}
