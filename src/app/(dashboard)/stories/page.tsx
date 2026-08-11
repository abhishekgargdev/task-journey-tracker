"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Search,
  Plus,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import StageBadge from "@/components/shared/StageBadge";
import { cn } from "@/lib/utils";

interface DbUser {
  _id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
}

interface StageDefinition {
  _id: string;
  name: string;
  colorTag: string;
}

interface StoryStage {
  _id: string;
  stageId: StageDefinition;
  stageOrder: number;
  status: string;
  developBy?: DbUser;
  plannedEndDate?: string;
}

interface StoryItem {
  _id: string;
  storyNumber: string;
  taskName: string;
  description?: string;
  plannedStartDate: string;
  plannedEndDate: string;
  status: "not_started" | "in_progress" | "blocked" | "completed" | "delayed";
  stageOrder: StageDefinition[];
  assignedUsers: DbUser[];
  childStages: StoryStage[];
  isOverdue?: boolean;
}

export default function StoriesPage() {
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [users, setUsers] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDeveloper, setSelectedDeveloper] = useState("all");

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch stories
      const storiesRes = await fetch("/api/stories");
      if (!storiesRes.ok) throw new Error("Failed to load stories.");
      const storiesData = await storiesRes.json();
      setStories(storiesData);

      // Fetch users for filters
      const usersRes = await fetch("/api/users");
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.filter((u: DbUser) => u.status === "active"));
      }
    } catch (err: any) {
      console.error(err);
      toast.add({
        title: "Error loading workspace",
        description: err.message || "Failed to load database records.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStoryProgressDetails = (story: StoryItem) => {
    const total = story.childStages.length;
    const completed = story.childStages.filter((cs) => cs.status === "completed").length;
    const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Current stage is the first incomplete stage
    const currentStageEntry = story.childStages.find((cs) => cs.status !== "completed");
    const currentStageName = currentStageEntry?.stageId?.name || (story.status === "completed" ? "Go Live / Completed" : "Completed");
    const currentStageColor = currentStageEntry?.stageId?.colorTag || "emerald";
    const currentDeveloperName = currentStageEntry?.developBy?.name || "Unassigned";

    return { total, completed, progressPct, currentStageName, currentStageColor, currentDeveloperName };
  };

  // Client-side Filtering
  const filteredStories = stories.filter((story) => {
    const matchesSearch =
      story.storyNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.taskName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === "all" || story.status === selectedStatus;

    let matchesDeveloper = true;
    if (selectedDeveloper !== "all") {
      const isParentAssignee = story.assignedUsers.some((u) => u._id === selectedDeveloper);
      const isStageAssignee = story.childStages.some((cs) => cs.developBy?._id === selectedDeveloper);
      matchesDeveloper = isParentAssignee || isStageAssignee;
    }

    return matchesSearch && matchesStatus && matchesDeveloper;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground font-sans">
            Stories Workspace
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitor parent delivery streams, dates, stage progress, and developers centrally.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button onClick={fetchData} variant="outline" size="sm" className="cursor-pointer">
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
          <Button size="sm" className="cursor-pointer" render={<Link href="/stories/create" />}>
            <Plus className="h-4 w-4 mr-1" />
            Create Story
          </Button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <Card className="border-border shadow-sm bg-card">
        <CardContent className="p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search input */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by story number or task name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-card h-9 text-xs"
              />
            </div>

            {/* Developer Filter */}
            <div>
              <select
                value={selectedDeveloper}
                onChange={(e) => setSelectedDeveloper(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All Developers</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="h-16 w-full animate-pulse border border-border bg-muted/20 rounded-lg" />
          ))}
        </div>
      ) : filteredStories.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={stories.length === 0 ? "No Stories created yet" : "No matching stories"}
          description={
            stories.length === 0
              ? "Create your first Main Story to auto-generate child stage stories and begin tracking."
              : "No stories matched your filters. Adjust search queries or filters to view active stories."
          }
          action={
            stories.length === 0 ? (
              <Button size="sm" className="cursor-pointer" render={<Link href="/stories/create" />}>
                <Plus className="h-4 w-4 mr-1" />
                Create Story
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="shadow-sm overflow-hidden border-border bg-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse" aria-label="Stories catalog">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3.5 px-4 w-[110px]">Story No</th>
                    <th className="py-3.5 px-4">Task Name</th>
                    <th className="py-3.5 px-4">Current Stage</th>
                    <th className="py-3.5 px-4">Active Developer</th>
                    <th className="py-3.5 px-4">Planned End</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 w-[140px] text-center">Progress</th>
                    <th className="py-3.5 px-4 text-right w-[100px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStories.map((story) => {
                    const {
                      total,
                      completed,
                      progressPct,
                      currentStageName,
                      currentStageColor,
                      currentDeveloperName,
                    } = getStoryProgressDetails(story);

                    const now = new Date();
                    const isOverdue = story.status !== "completed" && story.plannedEndDate && new Date(story.plannedEndDate) < now;

                    return (
                      <tr key={story._id} className="hover:bg-accent/30 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-foreground">
                          <span className="bg-primary/5 text-primary text-[10px] px-2 py-0.5 rounded font-mono border border-primary/10">
                            #{story.storyNumber}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-foreground text-xs max-w-[220px] truncate" title={story.taskName}>
                          {story.taskName}
                        </td>
                        <td className="py-3.5 px-4">
                          <StageBadge name={currentStageName} colorTag={currentStageColor} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 font-medium text-foreground">
                          {currentDeveloperName}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={cn(
                            "font-medium",
                            isOverdue ? "text-rose-600 font-bold flex items-center gap-1" : "text-muted-foreground"
                          )}>
                            {isOverdue && <AlertTriangle className="h-3 w-3 text-rose-500 shrink-0" />}
                            {new Date(story.plannedEndDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" })}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={story.status} size="sm" />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1 text-center">
                            <span className="text-[10px] font-semibold text-foreground">
                              {completed}/{total} Completed ({progressPct}%)
                            </span>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div className={cn(
                                "h-full transition-all duration-500",
                                story.status === "completed" ? "bg-emerald-500" : story.status === "blocked" ? "bg-rose-500" : "bg-primary"
                              )} style={{ width: `${progressPct}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button variant="outline" size="sm" className="h-7 text-[10px] cursor-pointer" render={<Link href={`/stories/${story._id}`} />}>
                            View Details
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
