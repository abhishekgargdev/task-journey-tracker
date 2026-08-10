import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 min-w-0" role="status" aria-label="Loading page">
      <Card className="h-20 sm:h-24 animate-pulse bg-muted/20 border-border" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, idx) => (
          <Card key={idx} className="h-20 sm:h-24 animate-pulse bg-muted/20 border-border" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, idx) => (
          <Card key={idx} className="h-32 animate-pulse bg-muted/20 border-border" />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
