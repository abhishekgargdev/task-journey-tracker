"use client";

import React from "react";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Ban,
  UserX,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type StageInsight, formatDisplayDate } from "@/lib/story-monitoring";

export type MonitorFilter = "delayed" | "due_soon" | "upcoming" | "blocked" | "unassigned" | null;

interface StoryMonitoringCardsProps {
  delayed: StageInsight[];
  dueSoon: StageInsight[];
  upcoming: StageInsight[];
  blocked: StageInsight[];
  unassigned: StageInsight[];
  activeFilter: MonitorFilter;
  onFilterChange: (filter: MonitorFilter) => void;
  onHighlightStage: (stageId: string) => void;
}

export default function StoryMonitoringCards({
  delayed,
  dueSoon,
  upcoming,
  blocked,
  unassigned,
  activeFilter,
  onFilterChange,
  onHighlightStage,
}: StoryMonitoringCardsProps) {
  const cards = [
    {
      id: "delayed" as const,
      title: "Delayed",
      icon: AlertTriangle,
      items: delayed,
      emptyText: "No Delays — all active stages are on schedule.",
      emptyIcon: CheckCircle2,
      accent: "border-rose-200 bg-rose-500/5 hover:border-rose-300",
      activeAccent: "ring-2 ring-rose-400 border-rose-400",
      titleColor: "text-rose-700",
      renderItem: (i: StageInsight) => (
        <>
          <p className="font-semibold text-xs truncate">{i.stageName}</p>
          <p className="text-[10px] text-rose-600">
            {i.daysOverdue ? `${i.daysOverdue} day${i.daysOverdue === 1 ? "" : "s"} overdue` : "Overdue"}
          </p>
        </>
      ),
    },
    {
      id: "due_soon" as const,
      title: "Due Soon",
      icon: CalendarClock,
      items: dueSoon,
      emptyText: "Nothing due within the next 2 days.",
      emptyIcon: CheckCircle2,
      accent: "border-amber-200 bg-amber-500/5 hover:border-amber-300",
      activeAccent: "ring-2 ring-amber-400 border-amber-400",
      titleColor: "text-amber-700",
      renderItem: (i: StageInsight) => (
        <>
          <p className="font-semibold text-xs truncate">{i.stageName}</p>
          <p className="text-[10px] text-muted-foreground">
            Due: {formatDisplayDate(i.stage.plannedEndDate)}
          </p>
        </>
      ),
    },
    {
      id: "upcoming" as const,
      title: "Upcoming",
      icon: CalendarDays,
      items: upcoming,
      emptyText: "No stages starting soon.",
      emptyIcon: CheckCircle2,
      accent: "border-blue-200 bg-blue-500/5 hover:border-blue-300",
      activeAccent: "ring-2 ring-blue-400 border-blue-400",
      titleColor: "text-blue-700",
      renderItem: (i: StageInsight) => (
        <>
          <p className="font-semibold text-xs truncate">{i.stageName}</p>
          <p className="text-[10px] text-muted-foreground">
            Starts: {formatDisplayDate(i.stage.plannedStartDate)}
          </p>
        </>
      ),
    },
    {
      id: "blocked" as const,
      title: "Blocked",
      icon: Ban,
      items: blocked,
      emptyText: "No Blockers",
      emptyIcon: CheckCircle2,
      accent: "border-orange-200 bg-orange-500/5 hover:border-orange-300",
      activeAccent: "ring-2 ring-orange-400 border-orange-400",
      titleColor: "text-orange-700",
      renderItem: (i: StageInsight) => (
        <>
          <p className="font-semibold text-xs truncate">{i.stageName}</p>
          <p className="text-[10px] text-muted-foreground">Status: Blocked</p>
        </>
      ),
    },
    {
      id: "unassigned" as const,
      title: "Unassigned",
      icon: UserX,
      items: unassigned,
      emptyText: "All active stages have developers.",
      emptyIcon: CheckCircle2,
      accent: "border-violet-200 bg-violet-500/5 hover:border-violet-300",
      activeAccent: "ring-2 ring-violet-400 border-violet-400",
      titleColor: "text-violet-700",
      renderItem: (i: StageInsight) => (
        <p className="font-semibold text-xs truncate">{i.stageName}</p>
      ),
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        const EmptyIcon = card.emptyIcon;
        const isActive = activeFilter === card.id;
        const hasItems = card.items.length > 0;

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => {
              onFilterChange(isActive ? null : card.id);
              if (card.items[0]) onHighlightStage(card.items[0].stage._id);
            }}
            className={cn(
              "rounded-xl border p-4 text-left transition-all cursor-pointer shadow-sm",
              card.accent,
              isActive && card.activeAccent
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", card.titleColor)}>
                {card.title}
              </span>
              <Icon className={cn("h-4 w-4", card.titleColor)} />
            </div>

            {hasItems ? (
              <>
                <p className="text-2xl font-bold text-foreground mb-2">
                  {card.items.length}
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    stage{card.items.length === 1 ? "" : "s"}
                  </span>
                </p>
                <div className="space-y-2 max-h-[88px] overflow-y-auto">
                  {card.items.slice(0, 4).map((item) => (
                    <div
                      key={item.stage._id}
                      className="rounded-md bg-background/60 px-2 py-1.5 border border-border/40"
                      onClick={(e) => {
                        e.stopPropagation();
                        onHighlightStage(item.stage._id);
                      }}
                    >
                      {card.renderItem(item)}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-start gap-2 text-emerald-700">
                <EmptyIcon className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-snug">{card.emptyText}</p>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
