import { Badge } from "@/components/ui/badge";
import { getStageColorConfig } from "@/lib/stage-colors";
import { cn } from "@/lib/utils";

interface StageBadgeProps {
  name: string;
  colorTag?: string;
  showDot?: boolean;
  showTag?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export default function StageBadge({
  name,
  colorTag,
  showDot = true,
  showTag = false,
  className,
  size = "md",
}: StageBadgeProps) {
  const colors = getStageColorConfig(colorTag);

  return (
    <Badge
      className={cn(
        "border-none capitalize font-semibold bg-accent/80 hover:bg-accent/80 flex items-center gap-1.5 w-fit",
        size === "sm" && "text-[10px] py-0 px-2",
        className
      )}
    >
      {showDot && (
        <span className={cn("rounded-full shrink-0", colors.dot, size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5")} />
      )}
      {name}
      {showTag && (
        <span className={cn("text-[9px] uppercase font-bold opacity-60", colors.text)}>
          {colors.name}
        </span>
      )}
    </Badge>
  );
}
