"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import {
  ArrowLeft,
  Calendar,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  Search,
  Clock,
  User,
  BookOpen,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { aggregateStageBreakdown, type StoryItem, type StoryStage } from "@/lib/story-helpers";
import StoryCard from "@/components/stories/StoryCard";
import EmptyState from "@/components/shared/EmptyState";
import SprintStatusBadge from "@/components/shared/SprintStatusBadge";
import StaggerGrid from "@/components/shared/StaggerGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";

interface HoldHistoryEntry {
  reason: string;
  heldAt: string;
  resumedAt?: string;
  heldBy?: { _id: string; name: string; email?: string };
}

interface SprintDetail {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "active" | "hold" | "completed";
  holdHistory: HoldHistoryEntry[];
}

interface SprintDetailClientProps {
  sprint: SprintDetail;
  stories: StoryItem[];
  storyStages: StoryStage[];
}

export default function SprintDetailClient({
  sprint: initialSprint,
  stories,
  storyStages,
}: SprintDetailClientProps) {
  const router = useRouter();
  const [sprint, setSprint] = useState(initialSprint);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [holdOpen, setHoldOpen] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [holdLoading, setHoldLoading] = useState(false);

  const barChartData = aggregateStageBreakdown(stories);

  const filteredStories = stories.filter((story) => {
    const matchesSearch = story.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || story.overallStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const refreshSprint = async () => {
    const res = await fetch(`/api/sprints/${sprint._id}`);
    if (res.ok) {
      const data = await res.json();
      setSprint(data);
    }
    router.refresh();
  };

  const handleHoldToggle = async () => {
    if (sprint.status === "hold") {
      try {
        setHoldLoading(true);
        const res = await fetch(`/api/sprints/${sprint._id}/resume`, { method: "POST" });
        if (!res.ok) throw new Error("Failed to resume sprint.");
        toast.add({
          title: "Sprint resumed",
          description: `Sprint "${sprint.name}" is now active.`,
          type: "success",
        });
        await refreshSprint();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred.";
        toast.add({ title: "Resume failed", description: message, type: "error" });
      } finally {
        setHoldLoading(false);
      }
    } else {
      setHoldReason("");
      setHoldOpen(true);
    }
  };

  const submitHold = async () => {
    try {
      setHoldLoading(true);
      const res = await fetch(`/api/sprints/${sprint._id}/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: holdReason }),
      });

      if (!res.ok) throw new Error("Failed to hold sprint.");

      toast.add({
        title: "Sprint placed on hold",
        description: "Target sprint is now suspended.",
        type: "warning",
      });

      setHoldOpen(false);
      await refreshSprint();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.add({ title: "Hold failed", description: message, type: "error" });
    } finally {
      setHoldLoading(false);
    }
  };

  const canToggleHold = sprint.status === "active" || sprint.status === "hold";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/sprints" />}
          className="self-start -ml-2 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Sprints
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold tracking-tight text-foreground font-sans">
                {sprint.name}
              </h2>
              <SprintStatusBadge status={sprint.status} />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {new Date(sprint.startDate).toLocaleDateString(undefined, { dateStyle: "medium" })}
              {" – "}
              {new Date(sprint.endDate).toLocaleDateString(undefined, { dateStyle: "medium" })}
            </p>
            <p className="text-xs text-muted-foreground">
              {stories.length} {stories.length === 1 ? "story" : "stories"} linked to this sprint
            </p>
          </div>

          {canToggleHold && (
            <Button
              variant={sprint.status === "hold" ? "default" : "outline"}
              size="sm"
              onClick={handleHoldToggle}
              disabled={holdLoading}
              className="self-start cursor-pointer"
            >
              {sprint.status === "hold" ? (
                <>
                  <PlayCircle className="h-4 w-4 mr-1.5" />
                  Resume Sprint
                </>
              ) : (
                <>
                  <PauseCircle className="h-4 w-4 mr-1.5" />
                  Place on Hold
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-sm border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-bold tracking-tight">
              Stories by Current Stage
            </CardTitle>
            <CardDescription className="text-xs">
              Active stories grouped by their current pipeline stage in this sprint.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[200px] pl-0">
            {barChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs italic">
                No active stories in this sprint.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <XAxis type="number" allowDecimals={false} stroke="#888888" fontSize={10} />
                  <YAxis dataKey="name" type="category" stroke="#888888" fontSize={10} width={110} />
                  <Tooltip
                    contentStyle={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12}>
                    {barChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill="#3b82f6" opacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-bold tracking-tight flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-amber-500" />
              Hold History
            </CardTitle>
            <CardDescription className="text-xs">
              Timeline of sprint hold and resume events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sprint.holdHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-6">
                No hold events recorded for this sprint.
              </p>
            ) : (
              <div className="space-y-0">
                {(() => {
                  const historyItems = [...sprint.holdHistory].reverse();
                  return historyItems.map((entry, idx) => {
                    const isOngoing =
                      !entry.resumedAt && sprint.status === "hold" && idx === 0;
                    return (
                      <div
                        key={`${entry.heldAt}-${idx}`}
                        className={cn(
                          "relative pl-5 pb-5 border-l-2 border-amber-200 dark:border-amber-800/50",
                          idx === historyItems.length - 1 && "pb-0"
                        )}
                      >
                      <div
                        className={cn(
                          "absolute -left-[7px] top-0.5 h-3 w-3 rounded-full border-2 border-background",
                          isOngoing ? "bg-amber-500 animate-pulse" : "bg-amber-400"
                        )}
                      />
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-foreground leading-snug">
                          {entry.reason}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Held {formatDate(entry.heldAt)}
                        </p>
                        {entry.resumedAt ? (
                          <p className="text-[10px] text-emerald-600 font-medium">
                            Resumed {formatDate(entry.resumedAt)}
                          </p>
                        ) : isOngoing ? (
                          <Badge className="bg-amber-500/10 text-amber-600 border-none text-[9px] font-bold">
                            Currently on hold
                          </Badge>
                        ) : null}
                        {entry.heldBy?.name && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {entry.heldBy.name}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                  });
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-base font-bold font-sans text-foreground">Sprint Stories</h3>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <div className="relative w-full sm:w-[220px]">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search stories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 bg-card h-8 text-xs w-full"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-8 w-full sm:w-[150px] rounded-md border border-input bg-card px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {filteredStories.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={stories.length === 0 ? "No stories in this sprint" : "No stories match filters"}
            description={
              stories.length === 0
                ? "Attach user stories to this sprint from a task detail page to start tracking their journey."
                : "Try adjusting your search or status filter to find stories in this sprint."
            }
            action={
              stories.length === 0 ? (
                <Button variant="outline" size="sm" render={<Link href="/tasks" />} className="cursor-pointer">
                  Browse Tasks
                </Button>
              ) : undefined
            }
          />
        ) : (
          <StaggerGrid className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStories.map((story) => (
              <StoryCard key={story._id} story={story} storyStages={storyStages} />
            ))}
          </StaggerGrid>
        )}
      </div>

      <Dialog open={holdOpen} onOpenChange={setHoldOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Place Sprint On Hold
            </DialogTitle>
            <DialogDescription>
              Provide an explanation of why this entire sprint planning backlog has been suspended.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Label htmlFor="detail-sprint-hold-reason">Hold Reason</Label>
            <Input
              id="detail-sprint-hold-reason"
              placeholder="e.g. Blocked by Environment Outage"
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              className="bg-card"
            />
          </div>
          <DialogFooter className="pt-2" showCloseButton={true}>
            <Button variant="outline" onClick={() => setHoldOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submitHold}
              disabled={holdReason.trim().length < 2 || holdLoading}
              className="cursor-pointer"
            >
              {holdLoading ? "Holding..." : "Block Sprint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
