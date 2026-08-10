import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StoryStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "on_hold"
  | "completed";

const STATUS_CONFIG: Record<
  StoryStatus,
  { label: string; className: string; pulse?: boolean }
> = {
  not_started: {
    label: "Not Started",
    className: "bg-status-not-started/10 text-status-not-started",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-status-in-progress/10 text-status-in-progress",
  },
  blocked: {
    label: "Blocked",
    className: "bg-status-blocked/10 text-status-blocked",
    pulse: true,
  },
  on_hold: {
    label: "On Hold",
    className: "bg-status-on-hold/10 text-status-on-hold",
  },
  completed: {
    label: "Completed",
    className: "bg-status-completed/10 text-status-completed",
  },
};

interface StatusBadgeProps {
  status: StoryStatus | string;
  className?: string;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, className, size = "md" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as StoryStatus] ?? STATUS_CONFIG.not_started;

  return (
    <Badge
      className={cn(
        "border-none font-semibold",
        size === "sm" && "text-[10px] py-0",
        config.pulse && "animate-pulse",
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
