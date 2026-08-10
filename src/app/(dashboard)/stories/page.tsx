"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  BookOpen, 
  Search, 
  Filter, 
  ExternalLink, 
  Loader2, 
  ArrowRight,
  RefreshCw,
  FolderOpen
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";

interface TaskItem {
  _id: string;
  title: string;
}

interface SprintItem {
  _id: string;
  name: string;
}

interface StageDefinition {
  _id: string;
  name: string;
  colorTag: string;
}

interface StagePlanEntry {
  stage: StageDefinition;
  order: number;
}

interface StoryItem {
  _id: string;
  title: string;
  adoStoryLink?: string;
  task: TaskItem;
  sprint: SprintItem;
  stagePlan: StagePlanEntry[];
  currentStageOrder: number;
  overallStatus: "not_started" | "in_progress" | "blocked" | "on_hold" | "completed";
  createdAt: string;
}

export default function StoriesPage() {
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [sprints, setSprints] = useState<SprintItem[]>([]);
  const [stages, setStages] = useState<StageDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSprint, setSelectedSprint] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch stories
      const storiesRes = await fetch("/api/stories");
      if (!storiesRes.ok) throw new Error("Failed to load user stories.");
      const storiesData = await storiesRes.json();
      setStories(storiesData);

      // Fetch sprints
      const sprintsRes = await fetch("/api/sprints");
      if (sprintsRes.ok) {
        const sprintsData = await sprintsRes.json();
        setSprints(sprintsData);
      }

      // Fetch stages
      const stagesRes = await fetch("/api/stages");
      if (stagesRes.ok) {
        const stagesData = await stagesRes.json();
        setStages(stagesData);
      }
    } catch (err: any) {
      console.error(err);
      toast.add({
        title: "Error loading catalog",
        description: err.message || "Failed to load database stories.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedSprint("all");
    setSelectedStage("all");
    setSelectedStatus("all");
  };

  // Helper to extract story details
  const getStoryStageDetails = (story: StoryItem) => {
    const currentEntry = story.stagePlan.find(sp => sp.order === story.currentStageOrder);
    const name = currentEntry?.stage?.name || (story.overallStatus === "completed" ? "Go Live / Completed" : "Completed");
    const colorTag = currentEntry?.stage?.colorTag || "emerald";
    const stageId = currentEntry?.stage?._id || "";
    
    const total = story.stagePlan.length;
    const completed = story.overallStatus === "completed" ? total : Math.max(0, story.currentStageOrder - 1);

    return { stageId, name, colorTag, total, completed };
  };

  // Perform Client-side Filtering
  const filteredStories = stories.filter((story) => {
    const matchesSearch = story.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSprint = selectedSprint === "all" || story.sprint?._id === selectedSprint;
    
    const details = getStoryStageDetails(story);
    const matchesStage = selectedStage === "all" || details.stageId === selectedStage;
    
    const matchesStatus = selectedStatus === "all" || story.overallStatus === selectedStatus;

    return matchesSearch && matchesSprint && matchesStage && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "not_started":
        return <Badge className="bg-status-not-started/10 text-status-not-started border-none font-semibold">Not Started</Badge>;
      case "in_progress":
        return <Badge className="bg-status-in-progress/10 text-status-in-progress border-none font-semibold">In Progress</Badge>;
      case "blocked":
        return <Badge className="bg-status-blocked/10 text-status-blocked border-none font-semibold">Blocked</Badge>;
      case "on_hold":
        return <Badge className="bg-status-on-hold/10 text-status-on-hold border-none font-semibold">On Hold</Badge>;
      case "completed":
        return <Badge className="bg-status-completed/10 text-status-completed border-none font-semibold">Completed</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground font-sans">
            User Stories Workspace
          </h2>
          <p className="text-sm text-muted-foreground">
            Search, filter, and track delivery progress across customizable pipeline sequences.
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" className="self-start sm:self-center cursor-pointer">
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Search and Filters Bar */}
      <Card className="border-border shadow-sm bg-card">
        <CardContent className="p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* Free text search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search user story title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-card"
              />
            </div>

            {/* Sprint Filter */}
            <div className="space-y-1">
              <select
                id="filter-sprint"
                value={selectedSprint}
                onChange={(e) => setSelectedSprint(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All Sprints</option>
                {sprints.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Stage Filter */}
            <div className="space-y-1">
              <select
                id="filter-stage"
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All Active Stages</option>
                {stages.map((st) => (
                  <option key={st._id} value={st._id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <select
                id="filter-status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

          {(searchQuery || selectedSprint !== "all" || selectedStage !== "all" || selectedStatus !== "all") && (
            <div className="flex justify-end pt-1 border-t border-border/60">
              <Button onClick={handleResetFilters} variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                Reset Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, idx) => (
            <div key={idx} className="h-16 w-full animate-pulse border border-border bg-muted/20 rounded-lg" />
          ))}
        </div>
      ) : filteredStories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center max-w-lg mx-auto space-y-4">
          <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="text-base font-semibold text-foreground">No stories match filters</h3>
          <p className="text-sm text-muted-foreground leading-normal">
            No user stories matched your selected filters or search terms. Try loosening your criteria or resetting filters.
          </p>
          <Button onClick={handleResetFilters} variant="outline" size="sm">Reset Filters</Button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Card className="shadow-sm overflow-hidden border-border bg-card">
              <CardContent className="p-0">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-4">User Story</th>
                      <th className="py-3 px-4">Parent Task</th>
                      <th className="py-3 px-4">Sprint</th>
                      <th className="py-3 px-4">Current Stage</th>
                      <th className="py-3 px-4">Completion</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredStories.map((story) => {
                      const details = getStoryStageDetails(story);
                      return (
                        <tr key={story._id} className="hover:bg-accent/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                              {story.title}
                              {story.adoStoryLink && (
                                <a href={story.adoStoryLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Link href={`/tasks/${story.task?._id}`} className="font-semibold text-primary hover:underline">
                              {story.task?.title || "No Task"}
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs font-semibold px-2 py-0.5 bg-secondary text-secondary-foreground rounded">
                              {story.sprint?.name}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className="border-none capitalize font-semibold bg-accent/80 hover:bg-accent/80 flex items-center gap-1.5 self-start w-fit">
                              <span className={`h-2.5 w-2.5 rounded-full bg-${details.colorTag}-500`} />
                              {details.name}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-medium text-foreground">
                            {details.completed} of {details.total} complete
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(story.overallStatus)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button variant="outline" size="sm" render={<Link href={`/tasks/${story.task?._id}`} />}>
                              View Task
                              <ArrowRight className="h-3.5 w-3.5 ml-1" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Cards View */}
          <div className="grid gap-4 sm:grid-cols-2 md:hidden">
            {filteredStories.map((story) => {
              const details = getStoryStageDetails(story);
              return (
                <Card key={story._id} className="shadow-sm border-border bg-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-bold text-foreground line-clamp-2">
                        {story.title}
                      </CardTitle>
                      {story.adoStoryLink && (
                        <a href={story.adoStoryLink} target="_blank" rel="noreferrer" className="text-primary p-1 hover:bg-muted rounded flex-shrink-0">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <CardDescription className="text-[11px] flex flex-wrap gap-x-3 gap-y-1">
                      <span>Task: <Link href={`/tasks/${story.task?._id}`} className="text-primary hover:underline">{story.task?.title}</Link></span>
                      <span>Sprint: {story.sprint?.name}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3 pt-2 text-xs border-t border-border/60 bg-muted/5 flex justify-between items-center">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Active Stage</span>
                      <Badge className="border-none capitalize font-semibold bg-accent/80 hover:bg-accent/80 flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full bg-${details.colorTag}-500`} />
                        {details.name}
                      </Badge>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Completion</span>
                      <span className="font-semibold text-foreground">{details.completed} of {details.total} complete</span>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 border-t border-border flex justify-between items-center">
                    {getStatusBadge(story.overallStatus)}
                    <Button variant="outline" size="sm" render={<Link href={`/tasks/${story.task?._id}`} />}>
                      View Task
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
