"use client";

import React, { useState, useEffect } from "react";
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
  PieChart,
  Pie,
  Legend,
} from "recharts";
import {
  Layers,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  ExternalLink,
  Loader2,
  Calendar,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";

// Types
interface TaskItem {
  _id: string;
  title: string;
}

interface SprintItem {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "active" | "hold" | "completed";
  holdHistory: any[];
}

interface StageDefinition {
  _id: string;
  name: string;
  colorTag: string;
  defaultOrder?: number;
}

interface StagePlanEntry {
  stage: StageDefinition;
  order: number;
}

interface UserItem {
  _id: string;
  name: string;
  email: string;
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
  isOnHold: boolean;
  holdReason?: string;
}

interface StoryStage {
  _id: string;
  story: string;
  stage: string;
  order: number;
  plannedEndDate?: string;
  actualEndDate?: string;
  status: string;
  assignedTo?: UserItem;
}

interface DashboardClientProps {
  stories: StoryItem[];
  sprints: SprintItem[];
  storyStages: StoryStage[];
  userName: string;
}

// Premium animated count-up
function CountUp({ value }: { value: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setCount(0);
      return;
    }
    let start = 0;
    const duration = 600; // ms
    const increment = value / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{count}</span>;
}

export default function DashboardClient({ stories, sprints, storyStages, userName }: DashboardClientProps) {
  const router = useRouter();

  // Search/Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTask, setFilterTask] = useState("all");

  // Hold dialog controls for quick Sprint block
  const [sprintHoldOpen, setSprintHoldOpen] = useState(false);
  const [targetSprintId, setTargetSprintId] = useState<string | null>(null);
  const [sprintHoldReason, setSprintHoldReason] = useState("");
  const [sprintHoldLoading, setSprintHoldLoading] = useState(false);

  // 1. Calculations for KPIs
  const now = new Date();
  
  // Total Active Stories (overallStatus is not completed)
  const activeStories = stories.filter(s => s.overallStatus !== "completed");
  const totalActive = activeStories.length;

  // On Hold
  const totalOnHold = stories.filter(s => s.isOnHold || s.overallStatus === "on_hold").length;

  // Completed in current active sprint(s)
  const activeSprintIds = new Set(sprints.map(sp => sp._id));
  const totalCompleted = stories.filter(s => 
    s.overallStatus === "completed" && s.sprint && activeSprintIds.has(s.sprint._id)
  ).length;

  // Blocked / Overdue: active stage plannedEndDate has passed but not completed
  let totalOverdue = 0;
  stories.forEach((story) => {
    if (story.overallStatus === "completed") return;
    const activePlanEntry = story.stagePlan.find(sp => sp.order === story.currentStageOrder);
    if (!activePlanEntry) return;

    const matchedStageDoc = storyStages.find(ss => 
      ss.story === story._id && ss.stage === activePlanEntry.stage._id
    );

    if (matchedStageDoc && !matchedStageDoc.actualEndDate) {
      if (matchedStageDoc.plannedEndDate && new Date(matchedStageDoc.plannedEndDate) < now) {
        totalOverdue++;
      }
    }
  });

  // 2. Aggregate Stories by current Stage for Horizontal Bar Chart
  const stageCountsMap: Record<string, { name: string; count: number; order: number }> = {};
  stories.forEach((story) => {
    if (story.overallStatus === "completed") return;
    const activePlanEntry = story.stagePlan.find(sp => sp.order === story.currentStageOrder);
    if (!activePlanEntry || !activePlanEntry.stage) return;
    
    const stageId = activePlanEntry.stage._id;
    const name = activePlanEntry.stage.name;
    const order = activePlanEntry.stage.defaultOrder ?? 99;

    if (!stageCountsMap[stageId]) {
      stageCountsMap[stageId] = { name, count: 0, order };
    }
    stageCountsMap[stageId].count++;
  });

  const barChartData = Object.values(stageCountsMap).sort((a, b) => a.order - b.order);

  // 3. Status breakdown count for Donut Chart
  const statusCounts = {
    not_started: 0,
    in_progress: 0,
    blocked: 0,
    on_hold: 0,
  };

  activeStories.forEach((story) => {
    const status = story.overallStatus;
    if (status === "not_started") statusCounts.not_started++;
    else if (status === "in_progress") statusCounts.in_progress++;
    else if (status === "blocked") statusCounts.blocked++;
    else if (status === "on_hold") statusCounts.on_hold++;
  });

  const donutChartData = [
    { name: "Not Started", value: statusCounts.not_started, color: "#64748b" }, // slate
    { name: "In Progress", value: statusCounts.in_progress, color: "#3b82f6" }, // blue
    { name: "Blocked", value: statusCounts.blocked, color: "#f43f5e" }, // rose/red
    { name: "On Hold", value: statusCounts.on_hold, color: "#f59e0b" }, // amber
  ].filter(d => d.value > 0); // only show populated slices

  // Quick action hold toggle on Sprint level
  const handleSprintHoldToggle = async (sprint: SprintItem) => {
    if (sprint.status === "hold") {
      // Resume
      try {
        setSprintHoldLoading(true);
        const res = await fetch(`/api/sprints/${sprint._id}/resume`, { method: "POST" });
        if (!res.ok) throw new Error("Failed to resume sprint.");
        toast.add({
          title: "Sprint resumed",
          description: `Sprint "${sprint.name}" is now active.`,
          type: "success",
        });
        router.refresh();
      } catch (err: any) {
        alert(err.message);
      } finally {
        setSprintHoldLoading(false);
      }
    } else {
      // Open dialog
      setTargetSprintId(sprint._id);
      setSprintHoldReason("");
      setSprintHoldOpen(true);
    }
  };

  const submitSprintHold = async () => {
    if (!targetSprintId) return;
    try {
      setSprintHoldLoading(true);
      const res = await fetch(`/api/sprints/${targetSprintId}/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: sprintHoldReason }),
      });

      if (!res.ok) throw new Error("Failed to hold sprint.");

      toast.add({
        title: "Sprint placed on hold",
        description: "Target sprint is now suspended.",
        type: "warning",
      });

      setSprintHoldOpen(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSprintHoldLoading(false);
    }
  };

  // 4. Calculate Sprint Details
  const getSprintDetails = (sprint: SprintItem) => {
    const end = new Date(sprint.endDate);
    const diff = end.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    const storyCount = stories.filter(s => s.sprint?._id === sprint._id).length;
    return { daysRemaining, storyCount };
  };

  // Helper to extract story current stage info
  const getStoryStageDetails = (story: StoryItem) => {
    const currentEntry = story.stagePlan.find(sp => sp.order === story.currentStageOrder);
    const name = currentEntry?.stage?.name || (story.overallStatus === "completed" ? "Go Live / Completed" : "Completed");
    
    // Find assignee for this stage
    const matchedStageDoc = storyStages.find(ss => 
      ss.story === story._id && ss.stage === currentEntry?.stage?._id
    );
    const assignee = matchedStageDoc?.assignedTo;

    const total = story.stagePlan.length;
    const completed = story.overallStatus === "completed" ? total : Math.max(0, story.currentStageOrder - 1);

    return { name, total, completed, assignee };
  };

  // Filter tasks list for dropdown
  const uniqueTasksMap = new Map();
  stories.forEach(s => {
    if (s.task) uniqueTasksMap.set(s.task._id, s.task.title);
  });
  const taskOptions = Array.from(uniqueTasksMap.entries()).map(([id, title]) => ({ id, title }));

  // 5. Client side filter stories grid
  const filteredStories = stories.filter((story) => {
    const matchesSearch = story.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTask = filterTask === "all" || story.task?._id === filterTask;
    return matchesSearch && matchesTask;
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-xl border border-primary/10 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent p-6 shadow-sm">
        <h2 className="text-xl font-bold text-foreground sm:text-2xl font-sans">
          Welcome back, {userName}!
        </h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Here is your delivery journey workspace overview across active sprints and customizable pipeline catalogs.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI: Active Stories */}
        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Stories</CardTitle>
            <Layers className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sans">
              <CountUp value={totalActive} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Currently moving in pipelines</p>
          </CardContent>
        </Card>

        {/* KPI: Hold Stories */}
        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Blocked / On Hold</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sans text-amber-600">
              <CountUp value={totalOnHold} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Awaiting blocker resolutions</p>
          </CardContent>
        </Card>

        {/* KPI: Blocked / Overdue */}
        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overdue Stages</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sans text-rose-600">
              <CountUp value={totalOverdue} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Target dates has passed</p>
          </CardContent>
        </Card>

        {/* KPI: Completed Stories */}
        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sprint Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sans text-emerald-600">
              <CountUp value={totalCompleted} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Shipped during this sprint</p>
          </CardContent>
        </Card>
      </div>

      {/* Recharts Analytics Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Horizontal Bar Chart: Stories by Stage */}
        <Card className="lg:col-span-2 shadow-sm border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-bold tracking-tight">Active Stories by Delivery Stage</CardTitle>
            <CardDescription>
              Shows active stories sitting at their current pipeline stages.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] pl-0">
            {barChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs italic">
                No stories currently active in the delivery stages.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis type="number" allowDecimals={false} stroke="#888888" fontSize={11} />
                  <YAxis dataKey="name" type="category" stroke="#888888" fontSize={11} width={130} />
                  <Tooltip
                    contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#3b82f6" opacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie/Donut Chart: Status Breakdown */}
        <Card className="shadow-sm border-border bg-card flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm font-bold tracking-tight">Status Breakdown</CardTitle>
            <CardDescription>
              Aesthetic summary across all active stories.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[180px] flex-1">
            {donutChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs italic">
                No active stories to categorize.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
          {donutChartData.length > 0 && (
            <CardFooter className="pt-0 pb-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[10px] font-semibold uppercase text-muted-foreground border-none">
              {donutChartData.map((d) => (
                <div key={d.name} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span>{d.name}: {d.value}</span>
                </div>
              ))}
            </CardFooter>
          )}
        </Card>
      </div>

      {/* Sprints Overview Section */}
      <div className="space-y-4">
        <h3 className="text-base font-bold font-sans text-foreground">Sprint Overview</h3>
        {sprints.length === 0 ? (
          <Card className="border border-border bg-card p-6 text-center text-xs text-muted-foreground italic">
            No sprints stored in the database.
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sprints.map((sprint) => {
              const details = getSprintDetails(sprint);
              return (
                <Card key={sprint._id} className="shadow-sm border-border bg-card flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-bold text-foreground line-clamp-1">{sprint.name}</CardTitle>
                      <Badge className={cn(
                        "border-none py-0.5 text-[10px] uppercase font-bold",
                        sprint.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                      )}>
                        {sprint.status === "active" ? "Active" : "On Hold"}
                      </Badge>
                    </div>
                    <CardDescription className="text-[11px] flex items-center gap-1.5 pt-0.5">
                      <Calendar className="h-3 w-3" />
                      {new Date(sprint.startDate).toLocaleDateString()} to {new Date(sprint.endDate).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3 pt-1 text-xs text-muted-foreground grid grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground/60 tracking-wider">Days Left</span>
                      <p className="font-semibold text-foreground text-sm">{details.daysRemaining} days remaining</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground/60 tracking-wider">Linked Stories</span>
                      <p className="font-semibold text-foreground text-sm">{details.storyCount} stories</p>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 border-t border-border flex justify-end">
                    <Button
                      variant={sprint.status === "hold" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSprintHoldToggle(sprint)}
                      className="text-xs h-8 cursor-pointer"
                    >
                      {sprint.status === "hold" ? "Resume Sprint" : "Place on Hold"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Individual Story Tracker Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-base font-bold font-sans text-foreground">Individual Story Tracker</h3>
          
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Filter Search Input */}
            <div className="relative w-full sm:w-[220px]">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search stories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 bg-card h-8 text-xs w-full"
              />
            </div>

            {/* Filter Task Dropdown */}
            <select
              value={filterTask}
              onChange={(e) => setFilterTask(e.target.value)}
              className="flex h-8 w-full sm:w-[150px] rounded-md border border-input bg-card px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All Tasks</option>
              {taskOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredStories.length === 0 ? (
          <Card className="border border-border bg-card p-12 text-center text-xs text-muted-foreground italic">
            No user stories match the filters or search inputs.
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStories.map((story) => {
              const details = getStoryStageDetails(story);
              const progressPct = details.total > 0 ? (details.completed / details.total) * 100 : 0;
              return (
                <Card key={story._id} className="shadow-sm border-border bg-card hover:border-primary/20 transition-all flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-sm font-bold text-foreground hover:text-primary transition-colors">
                        <Link href={`/stories/${story._id}`}>
                          {story.title}
                        </Link>
                      </CardTitle>
                      {story.isOnHold && (
                        <Badge className="bg-amber-500/10 text-amber-600 border-none text-[8px] font-bold shrink-0 py-0.5 px-1 flex items-center gap-0.5">
                          <Clock className="h-2 w-2" />
                          HOLD
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-[10px] flex items-center gap-1.5">
                      <span>Task: <Link href={`/tasks/${story.task?._id}`} className="text-primary hover:underline">{story.task?.title}</Link></span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3 pt-1 space-y-3">
                    {/* Stage Badge & Assignee Avatar */}
                    <div className="flex items-center justify-between text-xs gap-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground/60 tracking-wider">Active Stage</span>
                        <Badge className="bg-secondary text-secondary-foreground border-none text-[10px] py-0 px-2 rounded-full font-medium">
                          {details.name}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary" title={details.assignee?.name || "Unassigned"}>
                          {details.assignee?.name ? details.assignee.name.split(" ").map(n=>n[0]).join("") : "?"}
                        </div>
                        <span className="text-xs text-muted-foreground font-medium hidden sm:inline">{details.assignee?.name || "Unassigned"}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                        <span>Stages complete</span>
                        <span>{details.completed}/{details.total}</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 border-t border-border flex justify-end">
                    <Button variant="outline" size="sm" render={<Link href={`/stories/${story._id}`} />} className="text-xs h-7 cursor-pointer">
                      Track Journey
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Place Sprint on Hold Dialog */}
      <Dialog open={sprintHoldOpen} onOpenChange={setSprintHoldOpen}>
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
            <Label htmlFor="sprint-hold-reason">Hold Reason</Label>
            <Input
              id="sprint-hold-reason"
              placeholder="e.g. Blocked by Environment Outage"
              value={sprintHoldReason}
              onChange={(e) => setSprintHoldReason(e.target.value)}
              className="bg-card"
            />
          </div>
          <DialogFooter className="pt-2" showCloseButton={true}>
            <Button variant="outline" onClick={() => setSprintHoldOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submitSprintHold}
              disabled={sprintHoldReason.trim().length < 2 || sprintHoldLoading}
              className="cursor-pointer"
            >
              {sprintHoldLoading ? "Holding..." : "Block Sprint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
