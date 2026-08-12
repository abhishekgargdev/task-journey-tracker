"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Zap,
  Plus,
  Search,
  Calendar,
  GitBranch,
  GitPullRequest,
  MessageSquare,
  Edit2,
  Trash2,
  Copy,
  Check,
  Clock,
  AlertCircle,
  CheckCircle2,
  User as UserIcon,
  ArrowRight,
  Send,
  X,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EmptyState from "@/components/shared/EmptyState";
import DeleteConfirmDialog, { DeleteConfirmItem } from "@/components/shared/DeleteConfirmDialog";

interface DbUser {
  _id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
}

interface IComment {
  _id?: string;
  text: string;
  author: DbUser;
  createdAt: string;
}

interface AdhocTaskItem {
  _id: string;
  taskName: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  assignedBy?: DbUser;
  assignee?: DbUser;
  branchName?: string;
  prLink?: string;
  status: "todo" | "in_progress" | "blocked" | "completed";
  comments: IComment[];
  owner: DbUser;
  createdAt: string;
  updatedAt: string;
}

export default function AdhocTasksWorkspace() {
  const [tasks, setTasks] = useState<AdhocTaskItem[]>([]);
  const [users, setUsers] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedAssignee, setSelectedAssignee] = useState("all");
  const [selectedAssignedBy, setSelectedAssignedBy] = useState("all");

  // CRUD Dialog States
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AdhocTaskItem | null>(null);
  const [taskForm, setTaskForm] = useState({
    taskName: "",
    description: "",
    startDate: "",
    endDate: "",
    assignedBy: "",
    assignee: "",
    branchName: "",
    prLink: "",
    status: "todo" as "todo" | "in_progress" | "blocked" | "completed",
  });

  // Comments / Detail panel state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeDetailTask, setActiveDetailTask] = useState<AdhocTaskItem | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Delete modal state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DeleteConfirmItem | null>(null);

  // Copied clipboard states
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, usersRes] = await Promise.all([
        fetch("/api/adhoc-tasks"),
        fetch("/api/users"),
      ]);

      if (!tasksRes.ok) throw new Error("Failed to load ad-hoc tasks.");
      const tasksData = await tasksRes.json();
      setTasks(tasksData);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.filter((u: DbUser) => u.status === "active"));
      }
    } catch (err: any) {
      console.error(err);
      toast.add({
        title: "Error loading workspace",
        description: err.message || "Failed to load ad-hoc task records.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Stats calculation
  const stats = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const blocked = tasks.filter((t) => t.status === "blocked").length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    return { total, todo, inProgress, blocked, completed };
  }, [tasks]);

  // Client-side filtering
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.taskName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (task.branchName && task.branchName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = selectedStatus === "all" || task.status === selectedStatus;

      const matchesAssignee =
        selectedAssignee === "all" ||
        (task.assignee && task.assignee._id === selectedAssignee);

      const matchesAssignedBy =
        selectedAssignedBy === "all" ||
        (task.assignedBy && task.assignedBy._id === selectedAssignedBy);

      return matchesSearch && matchesStatus && matchesAssignee && matchesAssignedBy;
    });
  }, [tasks, searchQuery, selectedStatus, selectedAssignee, selectedAssignedBy]);

  // Copy Branch helper
  const handleCopyBranch = (taskId: string, branchName: string) => {
    navigator.clipboard.writeText(branchName);
    setCopiedTaskId(taskId);
    toast.add({
      title: "Copied to clipboard",
      description: `Branch name "${branchName}" copied.`,
      type: "success",
    });
    setTimeout(() => setCopiedTaskId(null), 2000);
  };

  // Open Create Task Dialog
  const handleOpenCreate = () => {
    setEditingTask(null);
    setTaskForm({
      taskName: "",
      description: "",
      startDate: "",
      endDate: "",
      assignedBy: "",
      assignee: "",
      branchName: "",
      prLink: "",
      status: "todo",
    });
    setTaskModalOpen(true);
  };

  // Open Edit Task Dialog
  const handleOpenEdit = (task: AdhocTaskItem) => {
    setEditingTask(task);
    setTaskForm({
      taskName: task.taskName,
      description: task.description || "",
      startDate: task.startDate ? task.startDate.split("T")[0] : "",
      endDate: task.endDate ? task.endDate.split("T")[0] : "",
      assignedBy: task.assignedBy?._id || "",
      assignee: task.assignee?._id || "",
      branchName: task.branchName || "",
      prLink: task.prLink || "",
      status: task.status,
    });
    setTaskModalOpen(true);
  };

  // Save Task
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.taskName.trim()) return;

    const payload = {
      taskName: taskForm.taskName.trim(),
      description: taskForm.description.trim(),
      startDate: taskForm.startDate || null,
      endDate: taskForm.endDate || null,
      assignedBy: taskForm.assignedBy || null,
      assignee: taskForm.assignee || null,
      branchName: taskForm.branchName.trim(),
      prLink: taskForm.prLink.trim(),
      status: taskForm.status,
    };

    try {
      let res;
      if (editingTask) {
        // Edit Mode
        res = await fetch(`/api/adhoc-tasks/${editingTask._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Create Mode
        res = await fetch("/api/adhoc-tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save task.");

      toast.add({
        title: editingTask ? "Task updated" : "Task created",
        description: `Successfully saved "${payload.taskName}"`,
        type: "success",
      });

      setTaskModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.add({
        title: "Error saving task",
        description: err.message,
        type: "error",
      });
    }
  };

  // Open Delete Task Confirmation
  const openDeleteDialog = (task: AdhocTaskItem) => {
    setPendingDelete({
      id: task._id,
      name: task.taskName,
      subtitle: task.description || undefined,
    });
    setDeleteOpen(true);
  };

  // Confirm delete
  const confirmDeleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/adhoc-tasks/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to delete task.");

      toast.add({
        title: "Task deleted",
        description: "The task has been permanently removed.",
        type: "success",
      });
      fetchData();
    } catch (err: any) {
      toast.add({
        title: "Delete failed",
        description: err.message,
        type: "error",
      });
      throw err;
    }
  };

  // Open task details and comments feed
  const handleOpenDetails = (task: AdhocTaskItem) => {
    setActiveDetailTask(task);
    setNewCommentText("");
    setDetailModalOpen(true);
  };

  // Submit a comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !activeDetailTask || submittingComment) return;

    try {
      setSubmittingComment(true);
      const res = await fetch(`/api/adhoc-tasks/${activeDetailTask._id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newCommentText }),
      });

      const commentsData = await res.json();
      if (!res.ok) throw new Error(commentsData.error || "Failed to post comment.");

      // Update active detail comments list
      const updatedTask = { ...activeDetailTask, comments: commentsData };
      setActiveDetailTask(updatedTask);

      // Update tasks list state to show comments count correctly
      setTasks((prev) =>
        prev.map((t) => (t._id === activeDetailTask._id ? updatedTask : t))
      );

      setNewCommentText("");
      toast.add({
        title: "Comment posted",
        type: "success",
      });
    } catch (err: any) {
      toast.add({
        title: "Error posting comment",
        description: err.message,
        type: "error",
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  // Helper colors for status
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "in_progress":
        return {
          bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/30",
          label: "In Progress",
          icon: Clock,
        };
      case "blocked":
        return {
          bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/30",
          label: "Blocked",
          icon: AlertCircle,
        };
      case "completed":
        return {
          bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/30",
          label: "Completed",
          icon: CheckCircle2,
        };
      default:
        return {
          bg: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200/30",
          label: "To Do",
          icon: Clock,
        };
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
  };

  return (
    <div className="space-y-6 flex flex-col flex-1">
      {/* Banner */}
      <div className="rounded-xl border border-primary/10 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl font-sans flex items-center gap-2">
            <Zap className="h-5.5 w-5.5 text-primary" />
            Ad-hoc Tasks Workspace
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Manage, log, and collaborate on ad-hoc development items assigned directly outside structured sprints.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchData} className="cursor-pointer">
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleOpenCreate} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-1.5" />
            New Task
          </Button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-border bg-card card-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Tasks</CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sans text-foreground">{stats.total}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Directly Assigned Tasks</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border bg-card card-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-blue-500">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sans text-blue-600">{stats.inProgress + stats.todo}</div>
            <p className="text-[10px] text-muted-foreground mt-1">{stats.inProgress} active, {stats.todo} pending</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border bg-card card-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Blocked</CardTitle>
            <AlertCircle className="h-4 w-4 text-rose-500 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sans text-rose-600">{stats.blocked}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Awaiting resolution</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border bg-card card-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sans text-emerald-600">{stats.completed}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Closed successfully</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border shadow-sm bg-card">
        <CardContent className="p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="relative lg:col-span-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, description, branch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-card h-9 text-xs"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Assignee Filter */}
            <div>
              <select
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All Assignees</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned By Filter */}
            <div>
              <select
                value={selectedAssignedBy}
                onChange={(e) => setSelectedAssignedBy(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All Assigned By</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid View */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="h-44 w-full animate-pulse border border-border bg-muted/15 rounded-xl" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={Zap}
          title={tasks.length === 0 ? "No Ad-hoc Tasks created yet" : "No matching tasks"}
          description={
            tasks.length === 0
              ? "Add a sprint-less task with custom owners, PR links, branch tracking, and comments timeline."
              : "No tasks matched your search. Adjust filters or search strings."
          }
          action={
            tasks.length === 0 ? (
              <Button size="sm" onClick={handleOpenCreate} className="cursor-pointer">
                <Plus className="h-4 w-4 mr-1.5" />
                Add your first task
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => {
            const statusConfig = getStatusConfig(task.status);
            const StatusIcon = statusConfig.icon;

            const now = new Date();
            const isOverdue =
              task.status !== "completed" &&
              task.endDate &&
              new Date(task.endDate) < now;

            return (
              <Card
                key={task._id}
                className="group flex flex-col justify-between border border-border hover:border-primary/20 shadow-sm hover:shadow transition-all duration-200 bg-card rounded-xl overflow-hidden card-premium"
              >
                <div className="p-5 space-y-4">
                  {/* Title & Status Row */}
                  <div className="flex items-start justify-between gap-3">
                    <h3
                      onClick={() => handleOpenDetails(task)}
                      className="font-bold text-sm text-foreground leading-snug group-hover:text-primary transition-colors cursor-pointer line-clamp-2"
                      title={task.taskName}
                    >
                      {task.taskName}
                    </h3>
                    <Badge
                      className={cn(
                        "text-[9px] font-bold px-2 py-0.5 border shrink-0 inline-flex items-center gap-1",
                        statusConfig.bg
                      )}
                    >
                      <StatusIcon className="h-2.5 w-2.5" />
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {/* Description */}
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  {/* Dates Row */}
                  {(task.startDate || task.endDate) && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span
                        className={cn(
                          "font-medium",
                          isOverdue ? "text-rose-600 font-bold" : "text-muted-foreground"
                        )}
                      >
                        {task.startDate
                          ? new Date(task.startDate).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })
                          : ""}
                        {task.startDate && task.endDate ? " - " : ""}
                        {task.endDate
                          ? new Date(task.endDate).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric" !== new Date(task.startDate || "").getFullYear().toString() ? "2-digit" : undefined,
                            })
                          : ""}
                        {isOverdue && " (Overdue)"}
                      </span>
                    </div>
                  )}

                  {/* Developer Assignments Row */}
                  <div className="flex flex-col gap-2 border-t border-border/40 pt-3">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Assignee:</span>
                        {task.assignee ? (
                          <div className="flex items-center gap-1 bg-muted/30 py-0.5 px-2 rounded-full border border-border/30">
                            <div className="h-4 w-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[7px] font-bold">
                              {getInitials(task.assignee.name)}
                            </div>
                            <span className="text-foreground font-bold">{task.assignee.name}</span>
                          </div>
                        ) : (
                          <span className="italic text-muted-foreground/60">Unassigned</span>
                        )}
                      </div>

                      {task.assignedBy && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-muted-foreground/60">By:</span>
                          <span className="text-foreground font-bold">{task.assignedBy.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Branch & PR Link Row */}
                  {(task.branchName || task.prLink) && (
                    <div className="flex flex-col gap-2 rounded-lg bg-muted/20 border border-border/30 p-2.5 text-[10px] font-mono">
                      {task.branchName && (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <GitBranch className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                            <span className="text-foreground font-semibold truncate" title={task.branchName}>
                              {task.branchName}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyBranch(task._id, task.branchName || "")}
                            className="text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0 border-none bg-transparent p-0"
                            title="Copy branch name"
                          >
                            {copiedTaskId === task._id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      )}

                      {task.prLink && (
                        <div className="flex items-center gap-1.5">
                          <GitPullRequest className="h-3 w-3 text-muted-foreground/70" />
                          <a
                            href={task.prLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline font-bold truncate"
                          >
                            View PR Link
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between bg-muted/15 border-t border-border px-5 py-3 text-xs">
                  <button
                    onClick={() => handleOpenDetails(task)}
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary cursor-pointer border-none bg-transparent font-medium"
                  >
                    <MessageSquare className="h-4.5 w-4.5" />
                    <span>{task.comments.length} Comments</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={() => handleOpenEdit(task)}
                      title="Edit Task"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      onClick={() => openDeleteDialog(task)}
                      title="Delete Task"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Task Creation & Edit Modal */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {editingTask ? "Edit Ad-hoc Task" : "Create Ad-hoc Task"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Log sprintless work items with branch tags, dates, and developer ownerships.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTask} className="space-y-4 mt-2">
            {/* Task Title */}
            <div className="space-y-1.5">
              <label htmlFor="taskName" className="text-xs font-bold text-foreground">
                Task Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="taskName"
                placeholder="e.g. Hotfix for session storage, database migration"
                value={taskForm.taskName}
                onChange={(e) => setTaskForm({ ...taskForm, taskName: e.target.value })}
                required
                className="bg-card text-xs h-9"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label htmlFor="description" className="text-xs font-bold text-foreground">Description</label>
              <Textarea
                id="description"
                placeholder="Detailed explanations, requirements or test notes..."
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                className="bg-card text-xs min-h-[80px]"
              />
            </div>

            {/* Date Pickers */}
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="startDate" className="text-xs font-bold text-foreground">Start Date</label>
                <Input
                  id="startDate"
                  type="date"
                  value={taskForm.startDate}
                  onChange={(e) => setTaskForm({ ...taskForm, startDate: e.target.value })}
                  className="bg-card text-xs h-9 cursor-pointer"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="endDate" className="text-xs font-bold text-foreground">End Date (Deadline)</label>
                <Input
                  id="endDate"
                  type="date"
                  value={taskForm.endDate}
                  onChange={(e) => setTaskForm({ ...taskForm, endDate: e.target.value })}
                  className="bg-card text-xs h-9 cursor-pointer"
                />
              </div>
            </div>

            {/* Assignee & Assigned By */}
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="assignee" className="text-xs font-bold text-foreground">Assignee</label>
                <select
                  id="assignee"
                  value={taskForm.assignee}
                  onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="">Choose Developer</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="assignedBy" className="text-xs font-bold text-foreground">Assigned By</label>
                <select
                  id="assignedBy"
                  value={taskForm.assignedBy}
                  onChange={(e) => setTaskForm({ ...taskForm, assignedBy: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="">Assigned By User</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* GitHub Fields */}
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="branchName" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                  GitHub Branch
                </label>
                <Input
                  id="branchName"
                  placeholder="e.g. fix/session-leak"
                  value={taskForm.branchName}
                  onChange={(e) => setTaskForm({ ...taskForm, branchName: e.target.value })}
                  className="bg-card text-xs h-9 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="prLink" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <GitPullRequest className="h-3.5 w-3.5 text-muted-foreground" />
                  PR Link
                </label>
                <Input
                  id="prLink"
                  placeholder="e.g. https://github.com/org/repo/pull/123"
                  value={taskForm.prLink}
                  onChange={(e) => setTaskForm({ ...taskForm, prLink: e.target.value })}
                  className="bg-card text-xs h-9 font-mono"
                />
              </div>
            </div>

            {/* Status Dropdown */}
            <div className="space-y-1.5">
              <label htmlFor="status" className="text-xs font-bold text-foreground">Task Status</label>
              <select
                id="status"
                value={taskForm.status}
                onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as any })}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTaskModalOpen(false)}
                className="cursor-pointer text-xs h-9"
              >
                Cancel
              </Button>
              <Button type="submit" className="cursor-pointer text-xs h-9">
                {editingTask ? "Save Changes" : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Details and Comments Side Drawer / Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto flex flex-col p-6">
          <DialogHeader className="border-b border-border pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Zap className="h-4.5 w-4.5 text-primary shrink-0" />
                  {activeDetailTask?.taskName}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Detailed view and collaboration feed.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Details Content */}
          {activeDetailTask && (
            <div className="flex-1 overflow-y-auto space-y-5 py-4 scrollbar-thin">
              {/* Task Description */}
              {activeDetailTask.description && (
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description</h4>
                  <p className="text-xs text-foreground bg-muted/15 p-3 rounded-lg border border-border/40 whitespace-pre-wrap leading-relaxed">
                    {activeDetailTask.description}
                  </p>
                </div>
              )}

              {/* Status and Dates details */}
              <div className="grid gap-4 grid-cols-2 text-xs">
                <div className="space-y-1">
                  <span className="font-bold text-muted-foreground block uppercase tracking-wider text-[10px]">Status</span>
                  <Badge className={cn("text-[9px] font-bold py-0.5 px-2.5 border", getStatusConfig(activeDetailTask.status).bg)}>
                    {getStatusConfig(activeDetailTask.status).label}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <span className="font-bold text-muted-foreground block uppercase tracking-wider text-[10px]">Schedule</span>
                  <span className="text-foreground font-semibold flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {activeDetailTask.startDate || activeDetailTask.endDate ? (
                      <>
                        {activeDetailTask.startDate
                          ? new Date(activeDetailTask.startDate).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })
                          : "Any"}
                        {" to "}
                        {activeDetailTask.endDate
                          ? new Date(activeDetailTask.endDate).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Any"}
                      </>
                    ) : (
                      "No schedule"
                    )}
                  </span>
                </div>
              </div>

              {/* Developer relations details */}
              <div className="grid gap-4 grid-cols-2 text-xs border-t border-border/40 pt-4">
                <div className="space-y-1">
                  <span className="font-bold text-muted-foreground block uppercase tracking-wider text-[10px]">Assignee</span>
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-foreground font-bold">
                      {activeDetailTask.assignee?.name || "Unassigned"}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="font-bold text-muted-foreground block uppercase tracking-wider text-[10px]">Assigned By</span>
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <span className="text-foreground font-bold">
                      {activeDetailTask.assignedBy?.name || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Git & PR links */}
              {(activeDetailTask.branchName || activeDetailTask.prLink) && (
                <div className="space-y-2 border-t border-border/40 pt-4 text-xs font-mono">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">GitHub Coordinates</h4>
                  <div className="flex flex-col gap-2 rounded-lg bg-muted/20 border border-border/30 p-3">
                    {activeDetailTask.branchName && (
                      <div className="flex items-center justify-between">
                        <span className="text-foreground font-bold flex items-center gap-1.5">
                          <GitBranch className="h-3.5 w-3.5 text-muted-foreground/70" />
                          {activeDetailTask.branchName}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyBranch(activeDetailTask._id, activeDetailTask.branchName || "")}
                          className="h-7 w-7 cursor-pointer"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {activeDetailTask.prLink && (
                      <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/20">
                        <GitPullRequest className="h-3.5 w-3.5 text-muted-foreground/70" />
                        <a
                          href={activeDetailTask.prLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline font-bold"
                        >
                          {activeDetailTask.prLink}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div className="border-t border-border/40 pt-4 space-y-4 flex-1 flex flex-col">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-4.5 w-4.5" />
                  Collaboration Feed ({activeDetailTask.comments.length})
                </h4>

                {/* Timeline */}
                <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                  {activeDetailTask.comments.length === 0 ? (
                    <p className="text-xs text-muted-foreground/75 italic text-center py-6">
                      No remarks posted yet. Add comments below to collaborate.
                    </p>
                  ) : (
                    activeDetailTask.comments.map((comment, index) => (
                      <div key={comment._id || index} className="flex gap-3 text-xs items-start bg-muted/10 p-2.5 rounded-lg border border-border/30">
                        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] font-bold shrink-0">
                          {getInitials(comment.author?.name || "User")}
                        </div>
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-foreground truncate">
                              {comment.author?.name || "Developer"}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatRelativeTime(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {comment.text}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Form */}
                <form onSubmit={handleAddComment} className="flex items-end gap-2 pt-2">
                  <div className="flex-1">
                    <Textarea
                      placeholder="Post an update or remark..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      required
                      className="bg-card text-xs min-h-[60px] max-h-[120px]"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submittingComment || !newCommentText.trim()}
                    className="h-9 w-9 shrink-0 cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Post remark</span>
                  </Button>
                </form>
              </div>
            </div>
          )}

          <div className="border-t border-border pt-4 mt-auto flex justify-end">
            <Button
              onClick={() => setDetailModalOpen(false)}
              className="cursor-pointer text-xs h-8 px-4"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permanently Delete Confirmation Modal */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        item={pendingDelete}
        entityLabel="ad-hoc task"
        consequences="This will permanently delete this ad-hoc task record and all historical comments associated with it. This action cannot be undone."
        onConfirm={confirmDeleteTask}
      />
    </div>
  );
}
