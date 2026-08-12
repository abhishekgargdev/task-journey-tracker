"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  ChevronRightSquare,
  ChevronLeftSquare,
  Check,
  Tag,
  AlertCircle,
  Clock,
  LayoutGrid,
  Filter,
  CheckCircle2,
  User,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import DeleteConfirmDialog, { DeleteConfirmItem } from "@/components/shared/DeleteConfirmDialog";

interface KanbanColumn {
  _id: string;
  name: string;
  color: string;
  order: number;
}

interface KanbanTask {
  _id: string;
  title: string;
  description?: string;
  columnId: string;
  order: number;
  date: string;
  dueDate?: string;
  priority: "low" | "medium" | "high";
  tags: string[];
}

export default function KanbanBoard() {
  // State
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"daily" | "all">("daily");

  // Drag state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [activeOverColumnId, setActiveOverColumnId] = useState<string | null>(null);

  // Modal / Editing state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    columnId: "",
    priority: "medium" as "low" | "medium" | "high",
    tagsString: "",
    dueDate: "",
  });

  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);
  const [columnForm, setColumnForm] = useState({
    name: "",
    color: "slate",
  });

  // Quick-add inputs for columns
  const [quickAddTexts, setQuickAddTexts] = useState<{ [columnId: string]: string }>({});
  const [activeQuickAddColId, setActiveQuickAddColId] = useState<string | null>(null);

  // Delete task modal state
  const [deleteTaskOpen, setDeleteTaskOpen] = useState(false);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<DeleteConfirmItem | null>(null);

  // Delete column modal state
  const [deleteColOpen, setDeleteColOpen] = useState(false);
  const [pendingDeleteCol, setPendingDeleteCol] = useState<DeleteConfirmItem | null>(null);

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formattedDateString = getLocalDateString(selectedDate);

  // Fetch Board Data
  const fetchBoard = async () => {
    try {
      setLoading(true);
      // Fetch columns
      const colsRes = await fetch("/api/kanban/columns");
      if (!colsRes.ok) throw new Error("Failed to load columns.");
      const colsData = await colsRes.json();
      // Sort columns by order
      const sortedCols = colsData.sort((a: KanbanColumn, b: KanbanColumn) => a.order - b.order);
      setColumns(sortedCols);

      // Fetch tasks (filtered by selected date if viewMode is daily)
      const dateParam = viewMode === "daily" ? formattedDateString : "all";
      const tasksRes = await fetch(`/api/kanban/tasks?date=${dateParam}`);
      if (!tasksRes.ok) throw new Error("Failed to load tasks.");
      const tasksData = await tasksRes.json();
      setTasks(tasksData);
    } catch (err: any) {
      console.error(err);
      toast.add({
        title: "Error loading board",
        description: err.message || "Failed to fetch planner details.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, [formattedDateString, viewMode]);

  // Date controls
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const handleSetToday = () => {
    setSelectedDate(new Date());
  };

  // COLUMN OPERATIONS
  const handleOpenAddColumn = () => {
    setEditingColumn(null);
    setColumnForm({ name: "", color: "indigo" });
    setColumnModalOpen(true);
  };

  const handleOpenEditColumn = (col: KanbanColumn) => {
    setEditingColumn(col);
    setColumnForm({ name: col.name, color: col.color });
    setColumnModalOpen(true);
  };

  const handleSaveColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!columnForm.name.trim()) return;

    try {
      if (editingColumn) {
        // Edit Column
        const res = await fetch(`/api/kanban/columns/${editingColumn._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(columnForm),
        });
        if (!res.ok) throw new Error("Failed to update column.");
        const updated = await res.json();
        setColumns((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
        toast.add({ title: "Column renamed", type: "success" });
      } else {
        // Add Column
        const res = await fetch("/api/kanban/columns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(columnForm),
        });
        if (!res.ok) throw new Error("Failed to create column.");
        const created = await res.json();
        setColumns((prev) => [...prev, created]);
        toast.add({ title: "Column created", type: "success" });
      }
      setColumnModalOpen(false);
    } catch (err: any) {
      toast.add({ title: "Error saving column", description: err.message, type: "error" });
    }
  };

  const openDeleteColumnDialog = (col: KanbanColumn) => {
    setPendingDeleteCol({
      id: col._id,
      name: col.name,
      subtitle: "This column and all tasks inside it will be permanently deleted.",
    });
    setDeleteColOpen(true);
  };

  const confirmDeleteColumn = async (colId: string) => {
    const res = await fetch(`/api/kanban/columns/${colId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      toast.add({
        title: "Delete failed",
        description: data.error || "Failed to delete column.",
        type: "error",
      });
      throw new Error(data.error);
    }
    setColumns((prev) => prev.filter((c) => c._id !== colId));
    setTasks((prev) => prev.filter((t) => t.columnId !== colId));
    toast.add({ title: "Column deleted", type: "success" });
  };

  // TASK OPERATIONS
  const handleOpenAddTask = (columnId: string) => {
    setEditingTask(null);
    setTaskForm({
      title: "",
      description: "",
      columnId,
      priority: "medium",
      tagsString: "",
      dueDate: "",
    });
    setTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: KanbanTask) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || "",
      columnId: task.columnId,
      priority: task.priority,
      tagsString: task.tags.join(", "),
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
    });
    setTaskModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim() || !taskForm.columnId) return;

    const payload = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      columnId: taskForm.columnId,
      priority: taskForm.priority,
      tags: taskForm.tagsString
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
      dueDate: taskForm.dueDate || undefined,
      date: formattedDateString, // planned for the currently viewed day
    };

    try {
      if (editingTask) {
        // Edit Task
        const res = await fetch(`/api/kanban/tasks/${editingTask._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update task.");
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
        toast.add({ title: "Task updated", type: "success" });
      } else {
        // Create Task
        const res = await fetch("/api/kanban/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create task.");
        const created = await res.json();
        setTasks((prev) => [...prev, created]);
        toast.add({ title: "Task created", type: "success" });
      }
      setTaskModalOpen(false);
    } catch (err: any) {
      toast.add({ title: "Error saving task", description: err.message, type: "error" });
    }
  };

  const handleQuickAddTask = async (columnId: string) => {
    const text = quickAddTexts[columnId];
    if (!text || !text.trim()) return;

    const payload = {
      title: text.trim(),
      description: "",
      columnId,
      priority: "medium",
      tags: [],
      date: formattedDateString,
    };

    try {
      const res = await fetch("/api/kanban/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to quick create task.");
      const created = await res.json();
      setTasks((prev) => [...prev, created]);
      setQuickAddTexts((prev) => ({ ...prev, [columnId]: "" }));
      toast.add({ title: "Task added", type: "success" });
    } catch (err: any) {
      toast.add({ title: "Error saving task", description: err.message, type: "error" });
    }
  };

  const openDeleteTaskDialog = (task: KanbanTask) => {
    setPendingDeleteTask({
      id: task._id,
      name: task.title,
      subtitle: task.description || undefined,
    });
    setDeleteTaskOpen(true);
  };

  const confirmDeleteTask = async (taskId: string) => {
    const res = await fetch(`/api/kanban/tasks/${taskId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      toast.add({
        title: "Delete failed",
        description: data.error || "Failed to delete task.",
        type: "error",
      });
      throw new Error(data.error);
    }
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
    toast.add({ title: "Task deleted", type: "success" });
  };

  // Quick manual moves for cards (accessibility & mobile support)
  const handleMoveTaskColumn = async (task: KanbanTask, direction: "prev" | "next") => {
    const colIndex = columns.findIndex((c) => c._id === task.columnId);
    if (colIndex === -1) return;

    let targetColIndex = direction === "prev" ? colIndex - 1 : colIndex + 1;
    if (targetColIndex < 0 || targetColIndex >= columns.length) return;

    const targetColId = columns[targetColIndex]._id;

    try {
      const res = await fetch(`/api/kanban/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId: targetColId }),
      });
      if (!res.ok) throw new Error();
      setTasks((prev) => prev.map((t) => (t._id === task._id ? { ...t, columnId: targetColId } : t)));
      toast.add({ title: `Moved to ${columns[targetColIndex].name}`, type: "success" });
    } catch (err) {
      toast.add({ title: "Failed to move task", type: "error" });
    }
  };

  // DRAG & DROP HANDLERS (HTML5 implementation)
  const onDragStartTask = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    setDraggedColumnId(null);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragStartColumn = (e: React.DragEvent, colId: string) => {
    setDraggedColumnId(colId);
    setDraggedTaskId(null);
    e.dataTransfer.setData("text/plain", colId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedTaskId) {
      setActiveOverColumnId(columnId);
    }
  };

  const onDragLeave = () => {
    setActiveOverColumnId(null);
  };

  const onDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setActiveOverColumnId(null);

    // Scenario A: Dropped a Task
    if (draggedTaskId) {
      const taskId = draggedTaskId;
      setDraggedTaskId(null);

      const task = tasks.find((t) => t._id === taskId);
      if (!task || task.columnId === targetColumnId) return;

      // Optimistic Update
      const oldColumnId = task.columnId;
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, columnId: targetColumnId } : t)));

      try {
        const res = await fetch(`/api/kanban/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ columnId: targetColumnId }),
        });
        if (!res.ok) throw new Error();
      } catch (err) {
        // Rollback
        setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, columnId: oldColumnId } : t)));
        toast.add({ title: "Failed to move task", type: "error" });
      }
    }

    // Scenario B: Dropped a Column (Reorder Columns)
    if (draggedColumnId) {
      const colId = draggedColumnId;
      setDraggedColumnId(null);

      if (colId === targetColumnId) return;

      const oldIndex = columns.findIndex((c) => c._id === colId);
      const newIndex = columns.findIndex((c) => c._id === targetColumnId);
      if (oldIndex === -1 || newIndex === -1) return;

      const newCols = [...columns];
      const [removed] = newCols.splice(oldIndex, 1);
      newCols.splice(newIndex, 0, removed);

      // Re-assign orders
      const reorderedCols = newCols.map((c, index) => ({ ...c, order: index + 1 }));
      setColumns(reorderedCols);

      try {
        const res = await fetch("/api/kanban/columns", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: reorderedCols.map((c) => c._id) }),
        });
        if (!res.ok) throw new Error();
      } catch (err) {
        fetchBoard(); // Reload board on error
        toast.add({ title: "Failed to save column order", type: "error" });
      }
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "high":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/30";
      case "medium":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/30";
      default:
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200/30";
    }
  };

  const getColumnBorderColor = (color: string) => {
    switch (color) {
      case "indigo":
        return "border-t-indigo-500";
      case "blue":
        return "border-t-blue-500";
      case "emerald":
        return "border-t-emerald-500";
      case "violet":
        return "border-t-violet-500";
      case "cyan":
        return "border-t-cyan-500";
      case "orange":
        return "border-t-orange-500";
      case "amber":
        return "border-t-amber-500";
      case "rose":
        return "border-t-rose-500";
      default:
        return "border-t-slate-400";
    }
  };

  return (
    <div className="space-y-6 flex flex-col flex-1">
      {/* Banner */}
      <div className="rounded-xl border border-primary/10 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl font-sans flex items-center gap-2">
            <Sparkles className="h-5.5 w-5.5 text-primary animate-pulse" />
            Daily Planner Board
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Plan your mornings, track daily progress, and stay focused. Move tasks between columns as they develop.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleOpenAddColumn} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-1.5" />
            New Column
          </Button>
        </div>
      </div>

      {/* Date Controls & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card border border-border p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === "daily" ? "all" : "daily")}
            className={cn(
              "flex h-8.5 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-all cursor-pointer",
              viewMode === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-input hover:bg-accent"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            {viewMode === "all" ? "All Tasks Board" : "Filter Daily Mode"}
          </button>
        </div>

        {viewMode === "daily" && (
          <div className="flex items-center gap-1.5 self-center">
            <Button variant="outline" size="icon" className="h-8.5 w-8.5 rounded-lg cursor-pointer" onClick={handlePrevDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 border border-input bg-background rounded-lg px-3 py-1.5 h-8.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-bold text-foreground font-mono">
                {selectedDate.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <Button variant="outline" size="icon" className="h-8.5 w-8.5 rounded-lg cursor-pointer" onClick={handleNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-xs font-bold text-primary hover:bg-primary/5 cursor-pointer ml-1" onClick={handleSetToday}>
              Today
            </Button>
          </div>
        )}
      </div>

      {/* Columns Grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-3 flex-1">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="bg-muted/10 border border-border rounded-xl h-[450px] animate-pulse" />
          ))}
        </div>
      ) : columns.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-12 text-center bg-card flex-1">
          <Calendar className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-bold text-foreground">No Columns Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
            Add columns to start organizing your daily planner workspace.
          </p>
          <Button size="sm" className="mt-4 cursor-pointer" onClick={handleOpenAddColumn}>
            Create your first column
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-5 min-h-[500px] h-full items-start select-none">
            {columns.map((col) => {
              const colTasks = tasks.filter((t) => t.columnId === col._id);
              const isOver = activeOverColumnId === col._id;

              return (
                <div
                  key={col._id}
                  onDragOver={(e) => onDragOver(e, col._id)}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => onDrop(e, col._id)}
                  draggable
                  onDragStart={(e) => onDragStartColumn(e, col._id)}
                  className={cn(
                    "flex flex-col w-[300px] sm:w-[320px] max-h-[70vh] bg-card border border-border rounded-xl shadow-sm transition-all overflow-hidden shrink-0 border-t-4",
                    getColumnBorderColor(col.color),
                    isOver && "border-primary bg-primary/5 shadow-md scale-[1.01]",
                    draggedColumnId === col._id && "opacity-40"
                  )}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between p-3.5 border-b border-border bg-muted/10">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground uppercase tracking-wider">
                        {col.name}
                      </span>
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                        {colTasks.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded cursor-pointer text-muted-foreground hover:text-foreground" onClick={() => handleOpenEditColumn(col)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded cursor-pointer text-muted-foreground hover:text-destructive" onClick={() => openDeleteColumnDialog(col)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Tasks Container */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[150px] scrollbar-thin">
                    {colTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center border border-dashed border-border/60 rounded-lg py-8 px-2 text-center bg-muted/5 opacity-60">
                        <Clock className="h-6 w-6 text-muted-foreground/40 mb-1" />
                        <span className="text-[10px] text-muted-foreground font-semibold">No tasks</span>
                      </div>
                    ) : (
                      colTasks.map((task) => (
                        <div
                          key={task._id}
                          draggable
                          onDragStart={(e) => onDragStartTask(e, task._id)}
                          className={cn(
                            "group flex flex-col bg-card border border-border hover:border-primary/20 p-3 rounded-lg shadow-sm hover:shadow transition-all duration-200 cursor-grab active:cursor-grabbing card-premium",
                            draggedTaskId === task._id && "opacity-45 scale-95 border-primary/30"
                          )}
                        >
                          {/* Card tags & priority */}
                          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                            <span className={cn("text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border capitalize", getPriorityColor(task.priority))}>
                              {task.priority}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* Left move (only show if not first col) */}
                              {columns.indexOf(col) > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveTaskColumn(task, "prev")}
                                  title="Move to previous column"
                                  className="text-muted-foreground hover:text-primary p-0.5 rounded border border-none bg-transparent cursor-pointer"
                                >
                                  <ChevronLeftSquare className="h-4 w-4" />
                                </button>
                              )}
                              {/* Right move (only show if not last col) */}
                              {columns.indexOf(col) < columns.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveTaskColumn(task, "next")}
                                  title="Move to next column"
                                  className="text-muted-foreground hover:text-primary p-0.5 rounded border border-none bg-transparent cursor-pointer"
                                >
                                  <ChevronRightSquare className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Title */}
                          <h4 className="font-semibold text-xs text-foreground leading-snug group-hover:text-primary transition-colors">
                            {task.title}
                          </h4>

                          {/* Description */}
                          {task.description && (
                            <p className="text-[10px] text-muted-foreground leading-normal mt-1.5 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          {/* Tags */}
                          {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2.5">
                              {task.tags.map((tag, i) => (
                                <span key={i} className="bg-secondary/70 text-secondary-foreground text-[8px] font-medium px-1.5 py-0.2 rounded-full inline-flex items-center gap-0.5">
                                  <Tag className="h-2 w-2" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Due Date & Action controls */}
                          <div className="flex items-center justify-between border-t border-border/40 mt-3 pt-2 text-muted-foreground text-[9px]">
                            <div className="flex items-center gap-1">
                              {task.dueDate ? (
                                <span className={cn(
                                  "inline-flex items-center gap-1 font-semibold font-mono",
                                  new Date(task.dueDate) < new Date() ? "text-rose-600 font-bold" : "text-muted-foreground"
                                )}>
                                  <Clock className="h-3 w-3" />
                                  {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                </span>
                              ) : (
                                <span className="opacity-40">No due date</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => handleOpenEditTask(task)}
                                className="p-0.5 hover:text-primary rounded border-none bg-transparent cursor-pointer"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeleteTaskDialog(task)}
                                className="p-0.5 hover:text-destructive rounded border-none bg-transparent cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Task Control */}
                  <div className="p-2 border-t border-border bg-muted/5 flex flex-col gap-1.5">
                    {activeQuickAddColId === col._id ? (
                      <div className="space-y-1.5 p-1 animate-fadeIn duration-150">
                        <Input
                          placeholder="What needs to be done?"
                          className="text-xs bg-card h-8.5"
                          autoFocus
                          value={quickAddTexts[col._id] || ""}
                          onChange={(e) => setQuickAddTexts({ ...quickAddTexts, [col._id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleQuickAddTask(col._id);
                            if (e.key === "Escape") setActiveQuickAddColId(null);
                          }}
                        />
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" className="h-7 text-[10px] cursor-pointer" onClick={() => handleQuickAddTask(col._id)}>
                            Add Card
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-[10px] cursor-pointer" onClick={() => setActiveQuickAddColId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-1.5 w-full">
                        <button
                          type="button"
                          onClick={() => setActiveQuickAddColId(col._id)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary/20 hover:bg-primary/5 text-[10px] font-bold transition-all cursor-pointer bg-card"
                        >
                          <Plus className="h-3 w-3" />
                          Quick Add Task
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenAddTask(col._id)}
                          title="Create details"
                          className="flex items-center justify-center p-1.5 rounded-lg border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all cursor-pointer bg-card shrink-0"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Task Details Dialog Modal */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Planner Task" : "Create Planner Task"}</DialogTitle>
            <DialogDescription>
              Detail your focus task. Cards will display on the daily board according to your selection.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTask} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-title" className="text-xs font-bold text-foreground">Task Title</Label>
              <Input
                id="task-title"
                placeholder="e.g. Draft morning sprint goals"
                required
                className="bg-card text-xs h-9"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-description" className="text-xs font-bold text-foreground">Description (Optional)</Label>
              <Textarea
                id="task-description"
                placeholder="Add subtasks or notes for the day..."
                className="bg-card text-xs min-h-[70px]"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="task-column" className="text-xs font-bold text-foreground">Board Column</Label>
                <select
                  id="task-column"
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={taskForm.columnId}
                  onChange={(e) => setTaskForm({ ...taskForm, columnId: e.target.value })}
                >
                  {columns.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="task-priority" className="text-xs font-bold text-foreground">Priority</Label>
                <select
                  id="task-priority"
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="task-tags" className="text-xs font-bold text-foreground">Tags (Comma-separated)</Label>
                <Input
                  id="task-tags"
                  placeholder="e.g. dev, api, bug"
                  className="bg-card text-xs h-9"
                  value={taskForm.tagsString}
                  onChange={(e) => setTaskForm({ ...taskForm, tagsString: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="task-due-date" className="text-xs font-bold text-foreground">Due Date (Optional)</Label>
                <Input
                  id="task-due-date"
                  type="date"
                  className="bg-card text-xs h-9"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="pt-3" showCloseButton={true}>
              <Button type="submit" size="sm" className="cursor-pointer">
                {editingTask ? "Save Changes" : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Column Details Dialog Modal */}
      <Dialog open={columnModalOpen} onOpenChange={setColumnModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingColumn ? "Configure Column" : "Add Board Column"}</DialogTitle>
            <DialogDescription>
              Create new boards or edit names and colors.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveColumn} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="col-name" className="text-xs font-bold text-foreground">Column Name</Label>
              <Input
                id="col-name"
                placeholder="e.g. Ready for Test"
                required
                className="bg-card text-xs h-9"
                value={columnForm.name}
                onChange={(e) => setColumnForm({ ...columnForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="col-color" className="text-xs font-bold text-foreground">Column Theme Tag</Label>
              <select
                id="col-color"
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={columnForm.color}
                onChange={(e) => setColumnForm({ ...columnForm, color: e.target.value })}
              >
                <option value="indigo">Indigo Accent</option>
                <option value="blue">Blue Accent</option>
                <option value="emerald">Emerald Accent</option>
                <option value="violet">Violet Accent</option>
                <option value="cyan">Cyan Accent</option>
                <option value="orange">Orange Accent</option>
                <option value="amber">Amber Accent</option>
                <option value="rose">Rose Accent</option>
                <option value="slate">Slate Accent</option>
              </select>
            </div>

            <DialogFooter className="pt-3" showCloseButton={true}>
              <Button type="submit" size="sm" className="cursor-pointer">
                {editingColumn ? "Save Configuration" : "Add Column"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Premium Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteTaskOpen}
        onOpenChange={setDeleteTaskOpen}
        item={pendingDeleteTask}
        entityLabel="task"
        consequences="This will permanently delete this card from your daily board. This action cannot be undone."
        onConfirm={confirmDeleteTask}
      />

      {/* Premium Delete Confirmation Dialog for Column */}
      <DeleteConfirmDialog
        open={deleteColOpen}
        onOpenChange={setDeleteColOpen}
        item={pendingDeleteCol}
        entityLabel="column"
        consequences="This will permanently delete this column and all its task cards from your planner board. This action cannot be undone."
        onConfirm={confirmDeleteColumn}
      />
    </div>
  );
}
