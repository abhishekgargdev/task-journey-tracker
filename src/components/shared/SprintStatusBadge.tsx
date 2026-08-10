import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SprintStatus = "active" | "hold" | "completed";

interface SprintStatusBadgeProps {
  status: SprintStatus;
  className?: string;
}

export default function SprintStatusBadge({ status, className }: SprintStatusBadgeProps) {
  if (status === "active") {
    return (
      <Badge
        className={cn(
          "bg-emerald-500/10 text-emerald-600 border-none text-[10px] uppercase font-bold",
          className
        )}
      >
        Active
      </Badge>
    );
  }
  if (status === "hold") {
    return (
      <Badge
        className={cn(
          "bg-amber-500/10 text-amber-600 border-none text-[10px] uppercase font-bold",
          className
        )}
      >
        On Hold
      </Badge>
    );
  }
  return (
    <Badge
      className={cn(
        "bg-status-completed/10 text-status-completed border-none text-[10px] uppercase font-bold",
        className
      )}
    >
      Completed
    </Badge>
  );
}
