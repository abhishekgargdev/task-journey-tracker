"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Layers,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  ArrowRight,
  GitBranch,
  GitPullRequest,
} from "lucide-react";

import { cn } from "@/lib/utils";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getStageColorConfig } from "@/lib/stage-colors";
import type { StoryWithStages } from "@/lib/story-queries";
import {
  buildStorySummary,
  computeDashboardMetrics,
  computeDeveloperWorkloads,
  computeStageCatalogProgress,
  type StorySummary,
} from "@/lib/story-monitoring";

interface DbUser {
  _id: string;
  name: string;
  email: string;
  status: string;
}

interface DashboardClientProps {
  stories: StoryWithStages[];
  developers: DbUser[];
  userName: string;
}

export default function DashboardClient({
  stories,
  developers,
  userName,
}: DashboardClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDeveloper, setFilterDeveloper] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Refetch server data when navigating back to dashboard
  useEffect(() => {
    router.refresh();
  }, [router]);

  const summaries = useMemo(
    () => stories.map((story) => buildStorySummary(story, story.childStages)),
    [stories]
  );

  const metrics = useMemo(() => computeDashboardMetrics(summaries), [summaries]);
  const stageProgressList = useMemo(() => computeStageCatalogProgress(summaries), [summaries]);
  const developerWorkloads = useMemo(
    () => computeDeveloperWorkloads(summaries, developers),
    [summaries, developers]
  );

  const summaryByStoryId = useMemo(() => {
    const map = new Map<string, StorySummary>();
    summaries.forEach((s) => map.set(s.story._id, s));
    return map;
  }, [summaries]);

  const filteredStories = stories.filter((story) => {
    const summary = summaryByStoryId.get(story._id);
    if (!summary) return false;

    const matchesSearch =
      story.storyNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.taskName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === "all" || story.status === filterStatus;

    let matchesDeveloper = true;
    if (filterDeveloper !== "all") {
      const isParentAssignee = story.assignedUsers.some((u) => u._id === filterDeveloper);
      const isCurrentDev = summary.currentDeveloper?._id === filterDeveloper;
      const isStageAssignee = summary.stageInsights.some(
        (i) => i.stage.developBy?._id === filterDeveloper
      );
      matchesDeveloper = isParentAssignee || isCurrentDev || isStageAssignee;
    }

    return matchesSearch && matchesStatus && matchesDeveloper;
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-xl border border-primary/10 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent p-6 shadow-sm">
        <h2 className="text-xl font-bold text-foreground sm:text-2xl font-sans">
          Welcome back, {userName}!
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Track active parent development items, calculate deadline compliance, and oversee developer stage assignments.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Stories"
          value={metrics.totalStories}
          subtitle="Total Parent Stories"
          icon={<Layers className="h-4 w-4 text-primary" />}
          valueClassName="text-foreground"
        />
        <MetricCard
          title="In Progress"
          value={metrics.inProgress}
          subtitle="Currently developing"
          icon={<Clock className="h-4 w-4 text-blue-500" />}
          valueClassName="text-blue-600"
        />
        <MetricCard
          title="Blocked"
          value={metrics.blocked}
          subtitle="Awaiting resolution"
          icon={<AlertTriangle className="h-4 w-4 text-rose-500 animate-bounce" />}
          valueClassName="text-rose-600"
        />
        <MetricCard
          title="Delayed"
          value={metrics.delayed}
          subtitle="Stories with overdue stages"
          icon={<AlertTriangle className="h-4 w-4 text-amber-500 animate-pulse" />}
          valueClassName="text-amber-600"
        />
        <MetricCard
          title="Completed"
          value={metrics.completed}
          subtitle="Stories successfully closed"
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          valueClassName="text-emerald-600"
        />
      </div>

      {/* Date Tracking Section */}
      <div className="grid gap-4 md:grid-cols-4">
        <DateCard title="Due Today" value={metrics.dueToday} />
        <DateCard title="Due This Week" value={metrics.dueThisWeek} />
        <DateCard title="Overdue Stories" value={metrics.overdueStories} accent="rose" />
        <DateCard title="Upcoming Work" value={metrics.upcoming} />
      </div>

      {/* Middle Grid: Stage Tracking & Developer Workloads */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Stage-wise Progress</CardTitle>
            <CardDescription className="text-xs">
              Completion across top-level pipeline stages (same data as Story Details).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stageProgressList.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-6">No stages active in any story</p>
            ) : (
              stageProgressList.map((stat) => {
                const colors = getStageColorConfig(stat.colorTag);
                return (
                  <div key={stat.stageId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className={cn("h-2.5 w-2.5 rounded-full", colors.dot)} />
                        {stat.name}
                      </span>
                      <span>{stat.percentage}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full transition-all duration-500", colors.bg)}
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Developer Workload Directory</CardTitle>
            <CardDescription className="text-xs">
              Workloads from top-level child stage assignments.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse" aria-label="Developer workloads">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2.5 px-4">Developer</th>
                    <th className="py-2.5 px-4 text-center">Assigned Stories</th>
                    <th className="py-2.5 px-4 text-center">Stages Active</th>
                    <th className="py-2.5 px-4 text-center">Completed</th>
                    <th className="py-2.5 px-4 text-center text-rose-600">Overdue Stages</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {developerWorkloads.map((wl) => (
                    <tr key={wl.developerId} className="hover:bg-accent/20 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-foreground flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[9px] font-bold">
                          {wl.developer.split(" ").map((n) => n[0]).join("")}
                        </div>
                        {wl.developer}
                      </td>
                      <td className="py-2.5 px-4 text-center text-foreground font-semibold">{wl.assignedStories}</td>
                      <td className="py-2.5 px-4 text-center text-blue-600 font-semibold">{wl.inProgress}</td>
                      <td className="py-2.5 px-4 text-center text-emerald-600 font-semibold">{wl.completed}</td>
                      <td
                        className={cn(
                          "py-2.5 px-4 text-center font-bold",
                          wl.overdue > 0 ? "text-rose-600 bg-rose-50/10" : "text-muted-foreground/60"
                        )}
                      >
                        {wl.overdue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stories Progress Board */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Stories Pipeline Board</h3>
            <p className="text-xs text-muted-foreground">
              Same current stage, developer, and progress as each Story Details page.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <div className="relative w-full sm:w-[220px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by story name or number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8.5 bg-card h-8.5 text-xs w-full"
              />
            </div>

            <select
              value={filterDeveloper}
              onChange={(e) => setFilterDeveloper(e.target.value)}
              className="flex h-8.5 w-full sm:w-[150px] rounded-md border border-input bg-card px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All Developers</option>
              {developers.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex h-8.5 w-full sm:w-[130px] rounded-md border border-input bg-card px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
              <option value="delayed">Delayed</option>
            </select>
          </div>
        </div>

        {filteredStories.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No matching stories found"
            description="Adjust filters to retrieve active developmental items."
          />
        ) : (
          <Card className="border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse" aria-label="Stories progress dashboard board">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3.5 px-4 w-[120px]">Story Number</th>
                    <th className="py-3.5 px-4">Story Title</th>
                    <th className="py-3.5 px-4">Active Stage</th>
                    <th className="py-3.5 px-4">Stage Developer</th>
                    <th className="py-3.5 px-4">Git Branch & PR</th>
                    <th className="py-3.5 px-4 text-center w-[150px]">Stage Progress</th>
                    <th className="py-3.5 px-4 text-right w-[100px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStories.map((story) => {
                    const summary = summaryByStoryId.get(story._id)!;
                    const progressPct = summary.progressPct;
                    const currentStage = summary.currentStage;
                    const activeStageName = summary.currentStageName;
                    const activeStageDev = summary.currentDeveloper?.name || "Unassigned";

                    return (
                      <tr key={story._id} className="hover:bg-accent/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                          <span className="bg-primary/5 text-primary text-[10px] px-2 py-0.5 rounded font-mono border border-primary/10">
                            #{story.storyNumber}
                          </span>
                        </td>
                        <td
                          className="py-3.5 px-4 font-semibold text-foreground text-xs max-w-[200px] truncate"
                          title={story.taskName}
                        >
                          {story.taskName}
                        </td>
                        <td className="py-3.5 px-4 font-medium">
                          <div className="space-y-1">
                            <Badge className="bg-secondary text-secondary-foreground border-none text-[10px] py-0 px-2 rounded-full font-medium">
                              {activeStageName}
                            </Badge>
                            <div>
                              <Badge
                                className={cn(
                                  "border-none text-[8px] font-bold px-1.5 py-0.2 capitalize",
                                  story.status === "completed" && "bg-emerald-500/10 text-emerald-600",
                                  story.status === "in_progress" && "bg-blue-500/10 text-blue-600 animate-pulse",
                                  story.status === "blocked" && "bg-rose-500/10 text-rose-600 animate-bounce",
                                  story.status === "delayed" && "bg-amber-500/10 text-amber-600",
                                  story.status === "not_started" && "bg-muted text-muted-foreground"
                                )}
                              >
                                {story.status.replace(/_/g, " ")}
                              </Badge>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground font-semibold">
                          <div className="flex items-center gap-2">
                            <div className="h-5.5 w-5.5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">
                              {activeStageDev
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>
                            <span className="text-xs text-foreground font-semibold">{activeStageDev}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {currentStage && (currentStage.branchName || currentStage.githubPrLink) ? (
                            <div className="space-y-1">
                              {currentStage.branchName && (
                                <p className="font-mono text-[9px] text-foreground font-semibold inline-flex items-center gap-1">
                                  <GitBranch className="h-3 w-3 text-muted-foreground" />
                                  {currentStage.branchName}
                                </p>
                              )}
                              {currentStage.githubPrLink && (
                                <div>
                                  <a
                                    href={currentStage.githubPrLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary hover:underline text-[9px] inline-flex items-center gap-0.5"
                                  >
                                    <GitPullRequest className="h-3 w-3 text-muted-foreground" />
                                    View PR
                                  </a>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60 italic text-[10px]">No branch linked</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1 text-center">
                            <span className="text-[10px] font-semibold text-foreground">
                              {summary.counts.completed}/{summary.counts.total} ({progressPct}%)
                            </span>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full transition-all duration-500",
                                  story.status === "completed"
                                    ? "bg-emerald-500"
                                    : story.status === "blocked"
                                      ? "bg-rose-500"
                                      : "bg-primary"
                                )}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] cursor-pointer"
                            render={<Link href={`/stories/${story._id}`} />}
                          >
                            Track Journey
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  valueClassName,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <Card className="shadow-sm border-border bg-card card-premium">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold font-sans", valueClassName)}>{value}</div>
        <p className="text-[10px] text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function DateCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: number;
  accent?: "rose";
}) {
  return (
    <Card
      className={cn(
        "border border-border bg-card shadow-sm text-center card-premium",
        accent === "rose" && "border-rose-100 bg-rose-50/5"
      )}
    >
      <CardHeader className="pb-1.5 pt-4">
        <CardTitle
          className={cn(
            "text-[9px] uppercase tracking-wider font-bold",
            accent === "rose" ? "text-rose-600" : "text-muted-foreground"
          )}
        >
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className={cn("text-2xl font-bold", accent === "rose" ? "text-rose-600" : "text-foreground")}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
