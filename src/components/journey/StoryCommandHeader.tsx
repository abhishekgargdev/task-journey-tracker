"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Layers,
  User as UserIcon,
  Edit,
  Trash2,
  Loader2,
  FileText,
  Activity,
  Target,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";
import {
  type MonitorStory,
  type StoryInsights,
  healthColor,
  healthLabel,
  formatDisplayDate,
  parseDescriptionSections,
} from "@/lib/story-monitoring";
import { formatDateForInput, serializeDateInput } from "@/lib/date-utils";
import { toast } from "@/components/ui/toast";

interface StoryCommandHeaderProps {
  story: MonitorStory;
  insights: StoryInsights;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}

export default function StoryCommandHeader({
  story,
  insights,
  onEdit,
  onDelete,
  onRefresh,
}: StoryCommandHeaderProps) {
  const [savingActual, setSavingActual] = useState(false);
  const [actualStart, setActualStart] = useState(formatDateForInput(story.actualStartDate));
  const [actualEnd, setActualEnd] = useState(formatDateForInput(story.actualEndDate));

  React.useEffect(() => {
    setActualStart(formatDateForInput(story.actualStartDate));
    setActualEnd(formatDateForInput(story.actualEndDate));
  }, [story.actualStartDate, story.actualEndDate]);

  const saveActualTimeline = async () => {
    try {
      setSavingActual(true);
      const res = await fetch(`/api/stories/${story._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualStartDate: serializeDateInput(actualStart),
          actualEndDate: serializeDateInput(actualEnd),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save actual timeline.");
      }
      toast.add({ title: "Timeline updated", description: "Actual dates saved.", type: "success" });
      onRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Save failed.";
      toast.add({ title: "Error", description: message, type: "error" });
    } finally {
      setSavingActual(false);
    }
  };

  const scopeSections = parseDescriptionSections(story.description);

  return (
    <Card className="border-border bg-card shadow-md overflow-hidden">
      <CardHeader className="pb-4 border-b border-border bg-gradient-to-r from-muted/30 to-transparent">
        <div className="flex flex-col gap-4">
          <Link
            href="/stories"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline w-fit"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Stories workspace
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="space-y-2 min-w-0 flex-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Story Journey
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-primary/10 text-primary text-sm font-mono font-bold border border-primary/20 px-2.5">
                  #{story.storyNumber}
                </Badge>
                <h1 className="text-lg sm:text-xl font-bold text-foreground leading-tight">
                  {story.taskName}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={story.status as any} />
                <Badge
                  variant="outline"
                  className={cn("text-[10px] font-bold border", healthColor(insights.storyHealth))}
                >
                  <Activity className="h-3 w-3 mr-1 inline" />
                  {healthLabel(insights.storyHealth)}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Button onClick={onEdit} variant="outline" size="sm" className="cursor-pointer text-xs">
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                Edit Story
              </Button>
              <Button
                onClick={onDelete}
                variant="outline"
                size="sm"
                className="cursor-pointer text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-5 space-y-5">
        {/* Key metrics row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricBox label="Current Stage" icon={<Target className="h-4 w-4 text-primary" />}>
            <p className="font-semibold text-sm text-foreground">{insights.currentStageName}</p>
            {insights.currentStageInsight && (
              <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                {insights.currentStageInsight.stage.status.replace(/_/g, " ")}
              </p>
            )}
          </MetricBox>

          <MetricBox label="Current Developer" icon={<UserIcon className="h-4 w-4 text-primary" />}>
            <p className="font-semibold text-sm text-foreground">
              {insights.currentDeveloper?.name || "Unassigned"}
            </p>
            {insights.currentDeveloper?.email && (
              <p className="text-[10px] text-muted-foreground truncate">{insights.currentDeveloper.email}</p>
            )}
          </MetricBox>

          <MetricBox label="Pipeline" icon={<Layers className="h-4 w-4 text-primary" />}>
            <p className="font-semibold text-sm">{insights.counts.total} stages</p>
            <p className="text-[10px] text-muted-foreground">
              {insights.counts.completed} completed · {insights.progressPct}%
            </p>
          </MetricBox>

          <MetricBox label="Sprint" icon={<ExternalLink className="h-4 w-4 text-primary" />}>
            {story.hasSprint && story.sprintUrl ? (
              <a
                href={story.sprintUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                Open Sprint
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-200">
                Backlog — No Sprint
              </Badge>
            )}
          </MetricBox>
        </div>

        {/* Current stage timing */}
        {insights.currentStageInsight && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 grid gap-2 sm:grid-cols-3 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Stage Planned End</span>
              <p className="font-semibold mt-0.5">
                {formatDisplayDate(insights.currentStageInsight.stage.plannedEndDate)}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Stage Status</span>
              <p className="font-semibold mt-0.5 capitalize">
                {insights.currentStageInsight.stage.status.replace(/_/g, " ")}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Timeline</span>
              <p className="font-semibold mt-0.5">
                {insights.currentStageInsight.daysOverdue
                  ? `${insights.currentStageInsight.daysOverdue} day${insights.currentStageInsight.daysOverdue === 1 ? "" : "s"} overdue`
                  : insights.currentStageInsight.daysRemaining !== null
                    ? `${insights.currentStageInsight.daysRemaining} day${insights.currentStageInsight.daysRemaining === 1 ? "" : "s"} remaining`
                    : "—"}
              </p>
            </div>
          </div>
        )}

        {/* Assigned members */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned Members</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {(story.assignedUsers || []).length === 0 ? (
              <span className="text-xs text-muted-foreground italic">No members assigned</span>
            ) : (
              story.assignedUsers!.map((u) => (
                <span
                  key={u._id || u.name}
                  className="bg-secondary/80 text-secondary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                >
                  <UserIcon className="h-2.5 w-2.5" />
                  {u.name}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Timelines */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-4 bg-muted/5 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Planned Timeline
            </span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Planned Start</span>
                <p className="font-semibold mt-0.5">{formatDisplayDate(story.plannedStartDate)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Planned End</span>
                <p className="font-semibold mt-0.5">{formatDisplayDate(story.plannedEndDate)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border p-4 bg-muted/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Actual Timeline
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[10px] cursor-pointer"
                onClick={saveActualTimeline}
                disabled={savingActual}
              >
                {savingActual ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Actual Start</Label>
                <Input
                  type="date"
                  value={actualStart}
                  onChange={(e) => setActualStart(e.target.value)}
                  className="h-8 text-xs bg-card"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Actual End</Label>
                <Input
                  type="date"
                  value={actualEnd}
                  onChange={(e) => setActualEnd(e.target.value)}
                  className="h-8 text-xs bg-card"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Detailed scope */}
        {story.description && (
          <div className="pt-2 border-t border-border/60 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Detailed Scope
            </span>
            <div className="grid gap-3 sm:grid-cols-2">
              {scopeSections.map((section) => (
                <div key={section.label} className="rounded-lg border border-border/50 bg-muted/5 p-3">
                  <p className="text-[10px] font-bold uppercase text-primary/80 mb-1">{section.label}</p>
                  <p className="text-xs text-foreground/85 leading-relaxed whitespace-pre-wrap">{section.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricBox({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-1 shadow-sm">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}
