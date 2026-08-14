"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  ClipboardList,
  Calendar,
  Clock,
  Sparkles,
  Users,
  BarChart2,
  Copy,
  Check,
  Plus,
  Trash2,
  AlertCircle,
  Activity,
  Flame,
  Award,
  Link as LinkIcon,
  HelpCircle,
  BrainCircuit,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from "recharts";

interface DailyStatusWorkspaceProps {
  currentUserId: string;
  currentUserName: string;
}

interface LinkedTaskItem {
  taskId: string;
  taskType: "KanbanTask" | "AdhocTask" | "UserStory";
  title: string;
}

interface StatusReportItem {
  _id: string;
  owner: {
    _id: string;
    name: string;
    email: string;
  };
  date: string;
  completedWork: string;
  plannedWork: string;
  blockers: string;
  hoursSpent: number;
  mood: "productive" | "average" | "blocked" | "exhausted";
  linkedTasks: LinkedTaskItem[];
  createdAt: string;
}

interface TodayActivityItem {
  id: string;
  title: string;
  status: string;
  type: "KanbanTask" | "AdhocTask" | "UserStory";
}

interface AnalyticsData {
  moodDistribution: {
    productive: number;
    average: number;
    blocked: number;
    exhausted: number;
  };
  trendData: Array<{
    date: string;
    hoursSpent: number;
    moodScore: number;
    moodLabel: string;
    linkedTasksCount: number;
  }>;
  summary: {
    totalReports: number;
    totalHours: number;
    averageHours: number;
    blockerDaysCount: number;
    currentStreak: number;
    longestStreak: number;
  };
}

export default function DailyStatusWorkspace({
  currentUserId,
  currentUserName,
}: DailyStatusWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"log" | "team" | "analytics">("log");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  // Form State
  const [mood, setMood] = useState<"productive" | "average" | "blocked" | "exhausted">("average");
  const [hoursSpent, setHoursSpent] = useState<string>("8");
  const [completedWork, setCompletedWork] = useState<string>("");
  const [plannedWork, setPlannedWork] = useState<string>("");
  const [blockers, setBlockers] = useState<string>("None.");
  const [linkedTasks, setLinkedTasks] = useState<LinkedTaskItem[]>([]);

  // System status states
  const [loadingReport, setLoadingReport] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [copyingScrum, setCopyingScrum] = useState(false);

  // Today's Activity states
  const [todayActivities, setTodayActivities] = useState<{
    kanban: TodayActivityItem[];
    adhoc: TodayActivityItem[];
    stories: TodayActivityItem[];
  }>({ kanban: [], adhoc: [], stories: [] });
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Team Feed states
  const [teamReports, setTeamReports] = useState<StatusReportItem[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  // Analytics states
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // General state
  const [hasReportForSelectedDate, setHasReportForSelectedDate] = useState(false);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  // Fetch Report for Selected Date
  const fetchReportForDate = useCallback(async (dateVal: string) => {
    try {
      setLoadingReport(true);
      const res = await fetch(`/api/daily-status?userId=${currentUserId}&startDate=${dateVal}&endDate=${dateVal}`);
      if (!res.ok) throw new Error("Failed to load status report");
      
      const reports: StatusReportItem[] = await res.json();
      
      if (reports.length > 0) {
        const report = reports[0];
        setMood(report.mood);
        setHoursSpent(String(report.hoursSpent));
        setCompletedWork(report.completedWork);
        setPlannedWork(report.plannedWork || "");
        setBlockers(report.blockers || "None.");
        setLinkedTasks(report.linkedTasks || []);
        setHasReportForSelectedDate(true);
        setActiveReportId(report._id);
      } else {
        // Clear form for fresh entry
        setMood("average");
        setHoursSpent("8");
        setCompletedWork("");
        setPlannedWork("");
        setBlockers("None.");
        setLinkedTasks([]);
        setHasReportForSelectedDate(false);
        setActiveReportId(null);
      }
    } catch (err: unknown) {
      console.error(err);
      toast.add({
        title: "Error loading status report",
        description: err instanceof Error ? err.message : "Failed to fetch previous entries.",
        type: "error",
      });
    } finally {
      setLoadingReport(false);
    }
  }, [currentUserId]);

  // Fetch Today's Work from active modules
  const fetchTodayActivities = useCallback(async (dateVal: string) => {
    try {
      setLoadingActivities(true);
      const res = await fetch(`/api/daily-status/today-activity?date=${dateVal}`);
      if (!res.ok) throw new Error("Failed to load activities");
      const data = await res.json();
      setTodayActivities(data);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  // Pre-fill fields based on today's activities
  const handlePreFill = () => {
    const completedList: string[] = [];
    const plannedList: string[] = [];
    const blockerList: string[] = [];
    const autoLinked: LinkedTaskItem[] = [];

    // Process Kanban
    todayActivities.kanban.forEach((t) => {
      const bullet = `• [Planner] ${t.title}`;
      autoLinked.push({ taskId: t.id, taskType: "KanbanTask", title: t.title });
      if (t.status.toLowerCase().includes("done") || t.status.toLowerCase().includes("complete")) {
        completedList.push(bullet);
      } else if (t.status.toLowerCase().includes("block")) {
        blockerList.push(bullet);
      } else {
        plannedList.push(bullet);
      }
    });

    // Process Adhoc
    todayActivities.adhoc.forEach((t) => {
      const bullet = `• [Adhoc] ${t.title}`;
      autoLinked.push({ taskId: t.id, taskType: "AdhocTask", title: t.title });
      if (t.status.toLowerCase() === "completed") {
        completedList.push(bullet);
      } else if (t.status.toLowerCase() === "blocked") {
        blockerList.push(bullet);
        plannedList.push(bullet);
      } else {
        plannedList.push(bullet);
      }
    });

    // Process User Stories
    todayActivities.stories.forEach((t) => {
      const bullet = `• [Story] ${t.title}`;
      autoLinked.push({ taskId: t.id, taskType: "UserStory", title: t.title });
      if (
        t.status.toLowerCase() === "completed" ||
        t.status.toLowerCase() === "resolved" ||
        t.status.toLowerCase() === "closed"
      ) {
        completedList.push(bullet);
      } else if (t.status.toLowerCase() === "blocked") {
        blockerList.push(bullet);
        plannedList.push(bullet);
      } else {
        plannedList.push(bullet);
      }
    });

    setCompletedWork((prev) =>
      completedList.length > 0 ? completedList.join("\n") : prev || "• Completed active engineering items."
    );
    setPlannedWork((prev) =>
      plannedList.length > 0 ? plannedList.join("\n") : prev || "• Continue sprint planner pipeline backlog."
    );
    setBlockers((prev) =>
      blockerList.length > 0 ? blockerList.join("\n") : prev === "None." ? "None." : prev
    );
    setLinkedTasks(autoLinked);

    toast.add({
      title: "Standup report auto-drafted",
      description: `Imported ${autoLinked.length} work items into your text fields.`,
      type: "success",
    });
  };

  // Submit report to backend
  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completedWork.trim()) {
      toast.add({
        title: "Validation error",
        description: "Completed work summary is required.",
        type: "error",
      });
      return;
    }

    try {
      setSavingReport(true);
      const res = await fetch("/api/daily-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          mood,
          hoursSpent: Number(hoursSpent) || 0,
          completedWork: completedWork.trim(),
          plannedWork: plannedWork.trim(),
          blockers: blockers.trim(),
          linkedTasks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save daily report");

      toast.add({
        title: hasReportForSelectedDate ? "Daily report updated" : "Daily report saved",
        description: `Successfully logged status for ${selectedDate}`,
        type: "success",
      });

      setHasReportForSelectedDate(true);
      setActiveReportId(data._id);
      
      // Refresh context
      fetchTodayActivities(selectedDate);
      if (activeTab === "team") fetchTeamFeed();
      if (activeTab === "analytics") fetchAnalytics();
    } catch (err: unknown) {
      toast.add({
        title: "Save failed",
        description: err instanceof Error ? err.message : "An error occurred.",
        type: "error",
      });
    } finally {
      setSavingReport(false);
    }
  };

  // Copy Scrum Standup message to clipboard
  const handleCopyScrumUpdate = () => {
    try {
      setCopyingScrum(true);
      const moodEmojis = {
        productive: "😊 Productive",
        average: "😐 Average",
        blocked: "⚠️ Blocked",
        exhausted: "😴 Exhausted",
      };

      const standupText = `📅 *Daily Standup - ${selectedDate}*
👤 *Developer:* ${currentUserName}
⏱️ *Hours spent:* ${hoursSpent} hrs | *Mood:* ${moodEmojis[mood]}

✅ *Completed:*
${completedWork || "• None logged."}

🚀 *Planned:*
${plannedWork || "• None logged."}

⚠️ *Blockers:*
${blockers || "None."}`;

      navigator.clipboard.writeText(standupText);
      toast.add({
        title: "Standup copied!",
        description: "Scrum update copied to clipboard in Slack markdown format.",
        type: "success",
      });
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setTimeout(() => setCopyingScrum(false), 800);
    }
  };

  // Fetch Team Feed
  const fetchTeamFeed = useCallback(async () => {
    try {
      setLoadingTeam(true);
      const res = await fetch("/api/daily-status");
      if (!res.ok) throw new Error("Failed to load team feed");
      const data = await res.json();
      setTeamReports(data);
    } catch (err: unknown) {
      toast.add({
        title: "Team feed error",
        description: err instanceof Error ? err.message : "Failed to fetch team feed.",
        type: "error",
      });
    } finally {
      setLoadingTeam(false);
    }
  }, []);

  // Fetch Analytics & Insights
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoadingAnalytics(true);
      const res = await fetch("/api/daily-status/analytics");
      if (!res.ok) throw new Error("Failed to load analytics");
      const data = await res.json();
      setAnalytics(data);
    } catch (err: unknown) {
      toast.add({
        title: "Analytics error",
        description: err instanceof Error ? err.message : "Failed to fetch analytics.",
        type: "error",
      });
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  // Delete status report
  const handleDeleteReport = async () => {
    if (!activeReportId) return;
    if (!confirm("Are you sure you want to delete this daily status report?")) return;

    try {
      const res = await fetch(`/api/daily-status/${activeReportId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete report");

      toast.add({
        title: "Report deleted",
        description: `Permanently removed report for ${selectedDate}`,
        type: "success",
      });

      // Clear states
      setCompletedWork("");
      setPlannedWork("");
      setBlockers("None.");
      setMood("average");
      setHoursSpent("8");
      setLinkedTasks([]);
      setHasReportForSelectedDate(false);
      setActiveReportId(null);
    } catch (err: unknown) {
      toast.add({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Failed to delete report.",
        type: "error",
      });
    }
  };

  // Watch selected date to fetch report and activity
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReportForDate(selectedDate);
    fetchTodayActivities(selectedDate);
  }, [selectedDate, fetchReportForDate, fetchTodayActivities]);

  // Load team or analytics if tab is clicked
  useEffect(() => {
    if (activeTab === "team") fetchTeamFeed();
    if (activeTab === "analytics") fetchAnalytics();
  }, [activeTab, fetchTeamFeed, fetchAnalytics]);

  // Task linking helper
  const toggleLinkTask = (task: TodayActivityItem) => {
    const isLinked = linkedTasks.some((t) => t.taskId === task.id);
    if (isLinked) {
      setLinkedTasks(linkedTasks.filter((t) => t.taskId !== task.id));
    } else {
      setLinkedTasks([
        ...linkedTasks,
        { taskId: task.id, taskType: task.type, title: task.title },
      ]);
    }
  };

  // Group team reports by date
  const reportsByDate = useMemo(() => {
    const groups: { [key: string]: StatusReportItem[] } = {};
    teamReports.forEach((r) => {
      const dateStr = new Date(r.date).toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(r);
    });
    return Object.entries(groups);
  }, [teamReports]);

  // Mood config definitions
  const moods = [
    {
      id: "productive" as const,
      label: "Productive",
      emoji: "😊",
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20",
      activeColor: "bg-emerald-500 text-white dark:bg-emerald-600 border-emerald-500 dark:border-emerald-600 shadow-md shadow-emerald-500/20",
    },
    {
      id: "average" as const,
      label: "Average",
      emoji: "😐",
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20",
      activeColor: "bg-blue-500 text-white dark:bg-blue-600 border-blue-500 dark:border-blue-600 shadow-md shadow-blue-500/20",
    },
    {
      id: "blocked" as const,
      label: "Blocked",
      emoji: "⚠️",
      color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20",
      activeColor: "bg-rose-500 text-white dark:bg-rose-600 border-rose-500 dark:border-rose-600 shadow-md shadow-rose-500/20",
    },
    {
      id: "exhausted" as const,
      label: "Exhausted",
      emoji: "😴",
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/20",
      activeColor: "bg-purple-500 text-white dark:bg-purple-600 border-purple-500 dark:border-purple-600 shadow-md shadow-purple-500/20",
    },
  ];

  return (
    <div className="space-y-6 flex flex-col flex-1">
      {/* Page Header */}
      <div className="rounded-xl border border-primary/10 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl font-sans flex items-center gap-2">
            <ClipboardList className="h-5.5 w-5.5 text-primary" />
            Daily Standup Logs
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Record what you did today, link your Jira stories or Kanban tasks, sync updates with team feeds, and view productivity metrics.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="inline-flex rounded-lg bg-muted p-0.5 self-start md:self-center">
          <button
            onClick={() => setActiveTab("log")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer border-none bg-transparent flex items-center gap-1.5",
              activeTab === "log"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            My Standup
          </button>
          <button
            onClick={() => setActiveTab("team")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer border-none bg-transparent flex items-center gap-1.5",
              activeTab === "team"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Team Logs
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer border-none bg-transparent flex items-center gap-1.5",
              activeTab === "analytics"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            Analytics
          </button>
        </div>
      </div>

      {/* Main Tab Views */}
      {activeTab === "log" && (
        <div className="grid gap-6 lg:grid-cols-3 items-start">
          {/* Main Entry Card */}
          <Card className="lg:col-span-2 shadow-sm border border-border bg-card card-premium">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-1.5">
                    <BrainCircuit className="h-5 w-5 text-primary" />
                    Write Daily Status Update
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Document achievements, tomorrow&apos;s plan, and list any workflow blockers.
                  </CardDescription>
                </div>
                <div className="relative shrink-0 flex items-center gap-1">
                  <Calendar className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pl-8 bg-card h-8 text-xs font-semibold pr-2 select-none w-36"
                  />
                  {activeReportId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDeleteReport}
                      title="Delete this report"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              {loadingReport ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <span className="text-xs font-semibold">Loading status data...</span>
                </div>
              ) : (
                <form onSubmit={handleSaveReport} className="space-y-5">
                  {/* Mood & Hours Row */}
                  <div className="grid gap-5 sm:grid-cols-2">
                    {/* Mood Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-foreground block">
                        How was your day? (Mood Tracker)
                      </label>
                      <div className="flex gap-2">
                        {moods.map((m) => {
                          const isActive = mood === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setMood(m.id)}
                              className={cn(
                                "flex-1 py-1.5 px-2 border rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none",
                                isActive ? m.activeColor : m.color
                              )}
                              title={m.label}
                            >
                              <span className="text-sm">{m.emoji}</span>
                              <span className="hidden sm:inline text-[10px]">{m.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hours Spent */}
                    <div className="space-y-2">
                      <label htmlFor="hours-worked" className="text-xs font-bold text-foreground block">
                        Hours Logged
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="hours-worked"
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          placeholder="e.g. 8"
                          value={hoursSpent}
                          onChange={(e) => setHoursSpent(e.target.value)}
                          className="pl-9 bg-card text-xs h-9"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pre-fill Option Banner */}
                  {(todayActivities.kanban.length > 0 ||
                    todayActivities.adhoc.length > 0 ||
                    todayActivities.stories.length > 0) && (
                    <div className="rounded-lg border border-primary/15 bg-primary/5 p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4.5 w-4.5 text-primary shrink-0" />
                        <span className="text-muted-foreground font-medium">
                          You worked on <strong className="text-foreground">{
                            todayActivities.kanban.length +
                            todayActivities.adhoc.length +
                            todayActivities.stories.length
                          } tasks</strong> in other modules today.
                        </span>
                      </div>
                      <Button
                        type="button"
                        onClick={handlePreFill}
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] font-bold border-primary/30 hover:bg-primary/10 cursor-pointer"
                      >
                        Auto-Draft Standup
                      </Button>
                    </div>
                  )}

                  {/* Text Areas */}
                  <div className="space-y-4">
                    {/* Completed Work */}
                    <div className="space-y-1.5">
                      <label htmlFor="completed-work" className="text-xs font-bold text-foreground block">
                        What did you complete today? <span className="text-destructive">*</span>
                      </label>
                      <Textarea
                        id="completed-work"
                        rows={3}
                        placeholder="• Completed sprint task user story API endpoints&#10;• Debugged session authentication logout loop"
                        value={completedWork}
                        onChange={(e) => setCompletedWork(e.target.value)}
                        className="bg-card text-xs min-h-[80px]"
                        required
                      />
                    </div>

                    {/* Planned Work */}
                    <div className="space-y-1.5">
                      <label htmlFor="planned-work" className="text-xs font-bold text-foreground block">
                        What is planned for next?
                      </label>
                      <Textarea
                        id="planned-work"
                        rows={2}
                        placeholder="• Link MongoDB database schema and deploy staging&#10;• Build charts component for analytics"
                        value={plannedWork}
                        onChange={(e) => setPlannedWork(e.target.value)}
                        className="bg-card text-xs min-h-[60px]"
                      />
                    </div>

                    {/* Blockers */}
                    <div className="space-y-1.5">
                      <label htmlFor="blockers-work" className="text-xs font-bold text-foreground block">
                        Are you experiencing blockers?
                      </label>
                      <Textarea
                        id="blockers-work"
                        rows={1.5}
                        placeholder="None."
                        value={blockers}
                        onChange={(e) => setBlockers(e.target.value)}
                        className="bg-card text-xs min-h-[45px]"
                      />
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCopyScrumUpdate}
                      disabled={copyingScrum || !completedWork}
                      className="cursor-pointer"
                    >
                      {copyingScrum ? (
                        <>
                          <Check className="h-4 w-4 mr-1.5 text-emerald-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1.5" />
                          Copy Scrum Text
                        </>
                      )}
                    </Button>

                    <Button type="submit" disabled={savingReport} className="cursor-pointer">
                      {savingReport ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          Saving...
                        </>
                      ) : hasReportForSelectedDate ? (
                        "Update Log"
                      ) : (
                        "Save Daily Log"
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Activity Integration sidebar */}
          <Card className="shadow-sm border border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Activity className="h-4.5 w-4.5 text-primary" />
                Work Linked Today
              </CardTitle>
              <CardDescription className="text-xs">
                Link active items you touched today directly to this daily log.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loadingActivities ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  <span className="text-xs font-semibold">Scanning activities...</span>
                </div>
              ) : todayActivities.kanban.length === 0 &&
                todayActivities.adhoc.length === 0 &&
                todayActivities.stories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                  <HelpCircle className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-xs font-semibold text-muted-foreground">No updates logged today</p>
                  <p className="text-[10px] text-muted-foreground/80 leading-relaxed max-w-[200px]">
                    Create Kanban tasks or update Ad-hoc items to view and link work here automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Kanban Tasks list */}
                  {todayActivities.kanban.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
                        Kanban Tasks
                      </p>
                      <div className="space-y-1">
                        {todayActivities.kanban.map((t) => {
                          const isLinked = linkedTasks.some((lt) => lt.taskId === t.id);
                          return (
                            <div
                              key={t.id}
                              onClick={() => toggleLinkTask(t)}
                              className={cn(
                                "flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all",
                                isLinked
                                  ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
                                  : "bg-muted/15 border-border/40 hover:border-border"
                              )}
                            >
                              <div
                                className={cn(
                                  "h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 transition-all",
                                  isLinked
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-muted-foreground/45"
                                )}
                              >
                                {isLinked && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-foreground truncate">{t.title}</p>
                                <p className="text-[9px] text-muted-foreground font-semibold">
                                  Column: {t.status}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Adhoc Tasks list */}
                  {todayActivities.adhoc.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
                        Ad-hoc Tasks
                      </p>
                      <div className="space-y-1">
                        {todayActivities.adhoc.map((t) => {
                          const isLinked = linkedTasks.some((lt) => lt.taskId === t.id);
                          return (
                            <div
                              key={t.id}
                              onClick={() => toggleLinkTask(t)}
                              className={cn(
                                "flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all",
                                isLinked
                                  ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
                                  : "bg-muted/15 border-border/40 hover:border-border"
                              )}
                            >
                              <div
                                className={cn(
                                  "h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 transition-all",
                                  isLinked
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-muted-foreground/45"
                                )}
                              >
                                {isLinked && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-foreground truncate">{t.title}</p>
                                <p className="text-[9px] text-muted-foreground font-semibold">
                                  Status: {t.status}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* User Stories list */}
                  {todayActivities.stories.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
                        User Stories
                      </p>
                      <div className="space-y-1">
                        {todayActivities.stories.map((t) => {
                          const isLinked = linkedTasks.some((lt) => lt.taskId === t.id);
                          return (
                            <div
                              key={t.id}
                              onClick={() => toggleLinkTask(t)}
                              className={cn(
                                "flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all",
                                isLinked
                                  ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
                                  : "bg-muted/15 border-border/40 hover:border-border"
                              )}
                            >
                              <div
                                className={cn(
                                  "h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 transition-all",
                                  isLinked
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-muted-foreground/45"
                                )}
                              >
                                {isLinked && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-foreground truncate">{t.title}</p>
                                <p className="text-[9px] text-muted-foreground font-semibold">
                                  Pipeline: {t.status}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Feed Tab */}
      {activeTab === "team" && (
        <div className="space-y-6">
          {loadingTeam ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <span className="text-xs font-semibold">Loading team activity logs...</span>
            </div>
          ) : reportsByDate.length === 0 ? (
            <Card className="border border-border shadow-sm bg-card py-16 flex flex-col items-center justify-center text-center gap-3">
              <Users className="h-10 w-10 text-muted-foreground/50" />
              <h3 className="text-sm font-bold text-foreground">No reports logged yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Encourage your team to log their daily updates. Once they save logs, they will appear here in chronological order.
              </p>
            </Card>
          ) : (
            <div className="space-y-8">
              {reportsByDate.map(([dateTitle, reports]) => (
                <div key={dateTitle} className="space-y-4">
                  {/* Date Heading */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{dateTitle}</span>
                    <div className="flex-1 h-[1px] bg-border/40" />
                  </div>

                  {/* Reports Grid */}
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {reports.map((report) => {
                      const selectedMood = moods.find((m) => m.id === report.mood);
                      const isOwner = report.owner._id === currentUserId;

                      return (
                        <Card
                          key={report._id}
                          className={cn(
                            "flex flex-col justify-between border shadow-sm transition-all duration-200 bg-card rounded-xl overflow-hidden card-premium",
                            isOwner ? "border-primary/20 shadow-primary/5" : "border-border"
                          )}
                        >
                          <div className="p-5 space-y-4">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h4 className="font-bold text-sm text-foreground truncate">
                                  {report.owner.name}
                                </h4>
                                <p className="text-[10px] text-muted-foreground truncate leading-relaxed">
                                  {report.owner.email}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Badge className="bg-muted text-muted-foreground hover:bg-muted font-bold text-[9px] px-2 py-0.5 border-none">
                                  {report.hoursSpent} hrs
                                </Badge>
                                {selectedMood && (
                                  <Badge
                                    className={cn(
                                      "text-[9px] font-bold px-2 py-0.5 border shrink-0 inline-flex items-center gap-1 border-none",
                                      selectedMood.color
                                    )}
                                  >
                                    <span>{selectedMood.emoji}</span>
                                    <span>{selectedMood.label}</span>
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Bullet Updates */}
                            <div className="space-y-3 pt-1 text-xs">
                              {/* Completed */}
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                  Completed Today
                                </p>
                                <p className="text-foreground leading-relaxed whitespace-pre-line font-sans text-xs bg-muted/20 p-2 rounded-lg border border-border/20">
                                  {report.completedWork}
                                </p>
                              </div>

                              {/* Planned */}
                              {report.plannedWork && (
                                <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                    Next Focus
                                  </p>
                                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line font-sans text-xs bg-muted/10 p-2 rounded-lg border border-border/10">
                                    {report.plannedWork}
                                  </p>
                                </div>
                              )}

                              {/* Blockers */}
                              {report.blockers && report.blockers !== "None." && (
                                <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3 animate-pulse" />
                                    Blockers
                                  </p>
                                  <p className="text-rose-600 dark:text-rose-400 font-medium leading-relaxed whitespace-pre-line font-sans text-xs bg-rose-500/5 p-2 rounded-lg border border-rose-200/20">
                                    {report.blockers}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Linked Work Items Footer */}
                            {report.linkedTasks && report.linkedTasks.length > 0 && (
                              <div className="border-t border-border/40 pt-3 flex flex-wrap gap-1.5 items-center">
                                <LinkIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                                {report.linkedTasks.map((t) => (
                                  <Badge
                                    key={t.taskId}
                                    variant="outline"
                                    className="text-[8px] font-semibold font-mono py-0.5 px-1.5 text-muted-foreground bg-muted/30 border-border/40 truncate max-w-[120px]"
                                    title={t.title}
                                  >
                                    {t.title}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Personal Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {loadingAnalytics ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <span className="text-xs font-semibold">Generating productivity analytics...</span>
            </div>
          ) : !analytics || analytics.summary.totalReports === 0 ? (
            <Card className="border border-border shadow-sm bg-card py-16 flex flex-col items-center justify-center text-center gap-3">
              <BarChart2 className="h-10 w-10 text-muted-foreground/50" />
              <h3 className="text-sm font-bold text-foreground">No reports recorded</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Document daily standup reports on the first tab to populate streaks, hours charts, and mood trends.
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Summary KPIs Row */}
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-sm border border-border bg-card card-premium">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Submissions</CardTitle>
                    <ClipboardList className="h-4.5 w-4.5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-sans text-foreground">
                      {analytics.summary.totalReports}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Logged Daily Updates</p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border border-border bg-card card-premium">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Current Streak</CardTitle>
                    <Flame className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-sans text-amber-600">
                      {analytics.summary.currentStreak} <span className="text-xs font-semibold text-muted-foreground">days</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Active daily logging run</p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border border-border bg-card card-premium">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Longest Streak</CardTitle>
                    <Award className="h-4.5 w-4.5 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-sans text-emerald-600">
                      {analytics.summary.longestStreak} <span className="text-xs font-semibold text-muted-foreground">days</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Personal record high run</p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border border-border bg-card card-premium">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Avg. Logged Hours</CardTitle>
                    <Clock className="h-4.5 w-4.5 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-sans text-blue-600">
                      {analytics.summary.averageHours} <span className="text-xs font-semibold text-muted-foreground">hrs</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Recorded average focus time</p>
                  </CardContent>
                </Card>
              </div>

              {/* Chart Grid */}
              <div className="grid gap-6 md:grid-cols-3">
                {/* Mood & Focus trend line */}
                <Card className="md:col-span-2 shadow-sm border border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Hours Worked & Mood Trend
                    </CardTitle>
                    <CardDescription className="text-[10px]">
                      Correlation of hours logged (left axis) vs. mood score on 1-4 scale (right axis) over the last 30 logs.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[250px] pl-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={analytics.trendData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                        <XAxis
                          dataKey="date"
                          stroke="#888888"
                          fontSize={9}
                          tickLine={false}
                          dy={5}
                        />
                        <YAxis
                          yAxisId="left"
                          stroke="#3b82f6"
                          fontSize={9}
                          tickLine={false}
                          allowDecimals={false}
                          label={{ value: "Hours spent", angle: -90, position: "insideLeft", fontSize: 9, fill: "#3b82f6", dx: 5 }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          stroke="#10b981"
                          fontSize={9}
                          tickLine={false}
                          domain={[1, 4]}
                          ticks={[1, 2, 3, 4]}
                          label={{ value: "Mood (1-4)", angle: 90, position: "insideRight", fontSize: 9, fill: "#10b981", dx: -5 }}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            fontSize: "11px",
                            color: "var(--foreground)"
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "10px", paddingTop: 10 }} />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="hoursSpent"
                          name="Hours Logged"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="moodScore"
                          name="Mood Rating"
                          stroke="#10b981"
                          strokeWidth={2}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Linked Tasks count bar */}
                <Card className="shadow-sm border border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Linked Tasks Density
                    </CardTitle>
                    <CardDescription className="text-[10px]">
                      Count of engineering items linked to daily standups.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[250px] pl-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.trendData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                        <XAxis
                          dataKey="date"
                          stroke="#888888"
                          fontSize={9}
                          tickLine={false}
                          dy={5}
                        />
                        <YAxis stroke="#888888" fontSize={9} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            background: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            fontSize: "11px",
                            color: "var(--foreground)"
                          }}
                        />
                        <Bar
                          dataKey="linkedTasksCount"
                          name="Tasks Link Density"
                          fill="#8b5cf6"
                          radius={[3, 3, 0, 0]}
                          maxBarSize={15}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
