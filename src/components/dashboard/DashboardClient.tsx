"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Layers,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  ExternalLink,
  Calendar,
  ArrowRight,
  GitBranch,
  GitPullRequest,
  Check,
  User as UserIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getStageColorConfig } from "@/lib/stage-colors";

interface DbUser {
  _id: string;
  name: string;
  email: string;
  status: string;
}

interface StageDefinition {
  _id: string;
  name: string;
  colorTag: string;
}

interface StoryStage {
  _id: string;
  storyId: string;
  stageId: StageDefinition;
  stageOrder: number;
  taskName: string;
  description?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  status: "not_started" | "in_progress" | "blocked" | "completed" | "delayed";
  developBy?: DbUser;
  githubPrLink?: string;
  branchName?: string;
  prStatus?: "none" | "pending" | "merged";
}

interface StoryItem {
  _id: string;
  storyNumber: string;
  taskName: string;
  description?: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  status: "not_started" | "in_progress" | "blocked" | "completed" | "delayed";
  stageOrder: StageDefinition[];
  assignedUsers: DbUser[];
  childStages: StoryStage[];
}

interface DashboardClientProps {
  stories: StoryItem[];
  storyStages: StoryStage[];
  developers: DbUser[];
  userName: string;
}

export default function DashboardClient({
  stories,
  storyStages,
  developers,
  userName,
}: DashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDeveloper, setFilterDeveloper] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const oneWeekLater = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 1. Overall Metrics
  const totalMainStories = stories.length;
  const totalChildStories = storyStages.length;
  
  const statusCounts = {
    not_started: stories.filter((s) => s.status === "not_started").length,
    in_progress: stories.filter((s) => s.status === "in_progress").length,
    completed: stories.filter((s) => s.status === "completed").length,
    blocked: stories.filter((s) => s.status === "blocked").length,
    delayed: stories.filter((s) => s.status === "delayed").length,
  };

  // 2. Date Tracking Metrics
  let dueTodayCount = 0;
  let dueThisWeekCount = 0;
  let overdueCount = 0;
  let upcomingCount = 0;

  stories.forEach((story) => {
    if (story.status === "completed") return;

    const plannedEnd = new Date(story.plannedEndDate);

    if (plannedEnd >= todayStart && plannedEnd <= todayEnd) {
      dueTodayCount++;
    }
    if (plannedEnd > todayEnd && plannedEnd <= oneWeekLater) {
      dueThisWeekCount++;
    }
    if (plannedEnd < todayStart) {
      overdueCount++;
    }
    if (plannedEnd > todayEnd) {
      upcomingCount++;
    }
  });

  // 3. Stage-wise Progress Tracking
  // Group child stages and compute completion %
  const stageStatsMap = new Map<string, { name: string; colorTag: string; total: number; completed: number }>();
  storyStages.forEach((cs) => {
    if (!cs.stageId) return;
    const stageId = cs.stageId._id;
    const existing = stageStatsMap.get(stageId) || {
      name: cs.stageId.name,
      colorTag: cs.stageId.colorTag,
      total: 0,
      completed: 0,
    };

    existing.total++;
    if (cs.status === "completed") {
      existing.completed++;
    }
    stageStatsMap.set(stageId, existing);
  });

  const stageProgressList = Array.from(stageStatsMap.values()).map((stat) => ({
    name: stat.name,
    colorTag: stat.colorTag,
    percentage: stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0,
  }));

  // 4. Developer Workloads
  const developerWorkloads = developers.map((dev) => {
    const assignedStoriesCount = stories.filter((s) =>
      s.assignedUsers.some((u) => u._id === dev._id)
    ).length;

    const devStages = storyStages.filter((cs) => cs.developBy?._id === dev._id);

    const inProgressStages = devStages.filter((s) => s.status === "in_progress" || s.status === "delayed").length;
    const completedStages = devStages.filter((s) => s.status === "completed").length;
    
    const overdueStages = devStages.filter((s) => {
      if (s.status === "completed") return false;
      return s.plannedEndDate && new Date(s.plannedEndDate) < todayStart;
    }).length;

    return {
      developer: dev.name,
      assignedStories: assignedStoriesCount,
      inProgress: inProgressStages,
      completed: completedStages,
      overdue: overdueStages,
    };
  });

  // Client-side Filtering for Board List
  const filteredStories = stories.filter((story) => {
    const matchesSearch =
      story.storyNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.taskName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || story.status === filterStatus;

    let matchesDeveloper = true;
    if (filterDeveloper !== "all") {
      const isParentAssignee = story.assignedUsers.some((u) => u._id === filterDeveloper);
      const isStageAssignee = story.childStages.some((cs) => cs.developBy?._id === filterDeveloper);
      matchesDeveloper = isParentAssignee || isStageAssignee;
    }

    return matchesSearch && matchesStatus && matchesDeveloper;
  });

  const getStoryProgressPct = (story: StoryItem) => {
    const total = story.childStages.length;
    const completed = story.childStages.filter((cs) => cs.status === "completed").length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

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
        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stories</CardTitle>
            <Layers className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sans text-foreground">
              {totalMainStories}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Total Parent Stories</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sans text-blue-600">
              {statusCounts.in_progress}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Currently developing</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Blocked</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500 animate-bounce" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sans text-rose-600">
              {statusCounts.blocked}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Awaiting resolution</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Delayed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sans text-amber-600">
              {statusCounts.delayed}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Timeline exceeded</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sans text-emerald-600">
              {statusCounts.completed}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Stories successfully closed</p>
          </CardContent>
        </Card>
      </div>

      {/* Date Tracking Section */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-border bg-card shadow-sm text-center">
          <CardHeader className="pb-1.5 pt-4">
            <CardTitle className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Due Today</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold text-foreground">{dueTodayCount}</div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-sm text-center">
          <CardHeader className="pb-1.5 pt-4">
            <CardTitle className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Due This Week</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold text-foreground">{dueThisWeekCount}</div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-sm text-center border-rose-100 bg-rose-50/5">
          <CardHeader className="pb-1.5 pt-4">
            <CardTitle className="text-[9px] uppercase tracking-wider font-bold text-rose-600">Overdue Stories</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold text-rose-600">{overdueCount}</div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-sm text-center">
          <CardHeader className="pb-1.5 pt-4">
            <CardTitle className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Upcoming Work</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold text-foreground">{upcomingCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Grid: Stage Tracking & Developer Workloads */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Stage-wise Progress */}
        <Card className="border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Stage-wise Progress</CardTitle>
            <CardDescription className="text-xs">Completion percentages computed across all active stages in child stories.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stageProgressList.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-6">No stages active in any story</p>
            ) : (
              stageProgressList.map((stat) => {
                const colors = getStageColorConfig(stat.colorTag);
                return (
                  <div key={stat.name} className="space-y-1.5">
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

        {/* Developer Workload */}
        <Card className="border border-border shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Developer Workload Directory</CardTitle>
            <CardDescription className="text-xs">Story assignment and active child stages workloads.</CardDescription>
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
                    <tr key={wl.developer} className="hover:bg-accent/20 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-foreground flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[9px] font-bold">
                          {wl.developer.split(" ").map(n => n[0]).join("")}
                        </div>
                        {wl.developer}
                      </td>
                      <td className="py-2.5 px-4 text-center text-foreground font-semibold">{wl.assignedStories}</td>
                      <td className="py-2.5 px-4 text-center text-blue-600 font-semibold">{wl.inProgress}</td>
                      <td className="py-2.5 px-4 text-center text-emerald-600 font-semibold">{wl.completed}</td>
                      <td className={cn(
                        "py-2.5 px-4 text-center font-bold",
                        wl.overdue > 0 ? "text-rose-600 bg-rose-50/10" : "text-muted-foreground/60"
                      )}>{wl.overdue}</td>
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
            <p className="text-xs text-muted-foreground">Verify pipeline sequence stages, branches, and code pull requests.</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Search */}
            <div className="relative w-full sm:w-[220px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by story name or number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8.5 bg-card h-8.5 text-xs w-full"
              />
            </div>

            {/* Developer Filter */}
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

            {/* Status Filter */}
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
                    const progressPct = getStoryProgressPct(story);
                    const activeStage = story.childStages.find((cs) => cs.status !== "completed");
                    const activeStageName = activeStage?.stageId?.name || (story.status === "completed" ? "Go Live / Completed" : "Completed");
                    const activeStageColor = activeStage?.stageId?.colorTag || "emerald";
                    const activeStageDev = activeStage?.developBy?.name || "Unassigned";

                    return (
                      <tr key={story._id} className="hover:bg-accent/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                          <span className="bg-primary/5 text-primary text-[10px] px-2 py-0.5 rounded font-mono border border-primary/10">
                            #{story.storyNumber}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-foreground text-xs max-w-[200px] truncate" title={story.taskName}>
                          {story.taskName}
                        </td>
                        <td className="py-3.5 px-4 font-medium">
                          <div className="space-y-1">
                            <Badge className="bg-secondary text-secondary-foreground border-none text-[10px] py-0 px-2 rounded-full font-medium">
                              {activeStageName}
                            </Badge>
                            <div>
                              <Badge className={cn(
                                "border-none text-[8px] font-bold px-1.5 py-0.2",
                                story.status === "completed" && "bg-emerald-500/10 text-emerald-600",
                                story.status === "in_progress" && "bg-blue-500/10 text-blue-600 animate-pulse",
                                story.status === "blocked" && "bg-rose-500/10 text-rose-600 animate-bounce",
                                story.status === "delayed" && "bg-amber-500/10 text-amber-600",
                                story.status === "not_started" && "bg-muted text-muted-foreground"
                              )}>
                                {story.status.toUpperCase().replace("_", " ")}
                              </Badge>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground font-semibold">
                          <div className="flex items-center gap-2">
                            <div className="h-5.5 w-5.5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">
                              {activeStageDev.split(" ").map(n=>n[0]).join("")}
                            </div>
                            <span className="text-xs text-foreground font-semibold">
                              {activeStageDev}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {activeStage && (activeStage.branchName || activeStage.githubPrLink) ? (
                            <div className="space-y-1">
                              {activeStage.branchName && (
                                <p className="font-mono text-[9px] text-foreground font-semibold inline-flex items-center gap-1">
                                  <GitBranch className="h-3 w-3 text-muted-foreground" />
                                  {activeStage.branchName}
                                </p>
                              )}
                              {activeStage.githubPrLink && (
                                <div>
                                  <a
                                    href={activeStage.githubPrLink}
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
                              {progressPct}% Completed
                            </span>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full transition-all duration-500",
                                  story.status === "completed" ? "bg-emerald-500" : story.status === "blocked" ? "bg-rose-500" : "bg-primary"
                                )}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button variant="outline" size="sm" className="h-7 text-[10px] cursor-pointer" render={<Link href={`/stories/${story._id}`} />}>
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
