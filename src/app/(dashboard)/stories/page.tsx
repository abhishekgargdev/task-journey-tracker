"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BookOpen,
  Search,
  Plus,
  Loader2,
  ArrowRight,
  RefreshCw,
  FolderOpen,
  User as UserIcon,
  Calendar,
  AlertTriangle,
  GripVertical,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import StageBadge from "@/components/shared/StageBadge";
import { getStageColorConfig } from "@/lib/stage-colors";
import { cn } from "@/lib/utils";

// Schema for Main Story Creation Form
const storyFormSchema = z.object({
  storyNumber: z.string().min(1, { message: "Story Number is required." }),
  taskName: z.string().min(2, { message: "Task/Story Name is required." }),
  description: z.string().optional(),
  plannedStartDate: z.string().min(1, { message: "Planned Start Date is required." }),
  plannedEndDate: z.string().min(1, { message: "Planned End Date is required." }),
});

type StoryFormValues = z.infer<typeof storyFormSchema>;

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

interface PlannerStage {
  _id: string;
  name: string;
  colorTag: string;
  checked: boolean;
}

export default function StoriesPage() {
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [users, setUsers] = useState<DbUser[]>([]);
  const [catalogStages, setCatalogStages] = useState<PlannerStage[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDeveloper, setSelectedDeveloper] = useState("all");

  // Drag-and-drop checklist state for creation dialog
  const [plannerStages, setPlannerStages] = useState<PlannerStage[]>([]);
  // Checked users list state for creation dialog
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StoryFormValues>({
    resolver: zodResolver(storyFormSchema),
    defaultValues: {
      storyNumber: "",
      taskName: "",
      description: "",
      plannedStartDate: "",
      plannedEndDate: "",
    },
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch stories
      const storiesRes = await fetch("/api/stories");
      if (!storiesRes.ok) throw new Error("Failed to load stories.");
      const storiesData = await storiesRes.json();
      setStories(storiesData);

      // Fetch users
      const usersRes = await fetch("/api/users");
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.filter((u: DbUser) => u.status === "active"));
      }

      // Fetch active catalog stages
      const stagesRes = await fetch("/api/stages?active=true");
      if (stagesRes.ok) {
        const stagesData = await stagesRes.json();
        const mapped = stagesData.map((stage: any) => ({
          _id: stage._id,
          name: stage.name,
          colorTag: stage.colorTag,
          checked: true,
        }));
        setCatalogStages(mapped);
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

  const openCreateDialog = () => {
    reset({
      storyNumber: "",
      taskName: "",
      description: "",
      plannedStartDate: "",
      plannedEndDate: "",
    });
    setPlannerStages([...catalogStages]);
    setSelectedUserIds([]);
    setDialogOpen(true);
  };

  const handleToggleStageCheck = (id: string) => {
    setPlannerStages((prev) =>
      prev.map((stage) =>
        stage._id === id ? { ...stage, checked: !stage.checked } : stage
      )
    );
  };

  const handleToggleUserCheck = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = plannerStages.findIndex((s) => s._id === active.id);
    const newIndex = plannerStages.findIndex((s) => s._id === over.id);

    setPlannerStages((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  const handleFormSubmit = async (values: StoryFormValues) => {
    // 1. Validation checks
    const start = new Date(values.plannedStartDate);
    const end = new Date(values.plannedEndDate);
    if (end < start) {
      toast.add({
        title: "Validation error",
        description: "Planned End Date cannot be before Planned Start Date.",
        type: "warning",
      });
      return;
    }

    const selectedStagePlanIds = plannerStages
      .filter((s) => s.checked)
      .map((s) => s._id);

    if (selectedStagePlanIds.length === 0) {
      toast.add({
        title: "Validation error",
        description: "Please select at least one stage for this story.",
        type: "warning",
      });
      return;
    }

    if (selectedUserIds.length === 0) {
      toast.add({
        title: "Validation error",
        description: "Please select at least one user to assign to this story.",
        type: "warning",
      });
      return;
    }

    try {
      const payload = {
        ...values,
        stageOrder: selectedStagePlanIds,
        userIds: selectedUserIds,
      };

      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create main story.");
      }

      toast.add({
        title: "Main Story created",
        description: `Story #${values.storyNumber} has been successfully created with ${selectedStagePlanIds.length} child stages.`,
        type: "success",
      });

      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.add({
        title: "Failed to create story",
        description: err.message || "An unexpected error occurred.",
        type: "error",
      });
    }
  };

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
          <Button onClick={openCreateDialog} size="sm" className="cursor-pointer">
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
              <Button onClick={openCreateDialog} size="sm" className="cursor-pointer">
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

      {/* Create Story Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Main Story</DialogTitle>
            <DialogDescription>
              Define story credentials, assign team members, and sequence the custom delivery stages.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="space-y-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Story Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="storyNumber">Story Number</Label>
                  <Input
                    id="storyNumber"
                    placeholder="e.g. 1234"
                    className="bg-card h-9 text-xs font-mono"
                    {...register("storyNumber")}
                  />
                  {errors.storyNumber && (
                    <p className="text-xs text-destructive font-medium">{errors.storyNumber.message}</p>
                  )}
                </div>

                {/* Story/Task Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="taskName">Story Name / Task Name</Label>
                  <Input
                    id="taskName"
                    placeholder="e.g. Implement User Authentication"
                    className="bg-card h-9 text-xs"
                    {...register("taskName")}
                  />
                  {errors.taskName && (
                    <p className="text-xs text-destructive font-medium">{errors.taskName.message}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide overview details or links to ADO ticket description..."
                    className="bg-card min-h-[70px] text-xs leading-normal"
                    {...register("description")}
                  />
                </div>

                {/* Dates */}
                <div className="space-y-1.5">
                  <Label htmlFor="plannedStartDate">Planned Start Date</Label>
                  <Input
                    id="plannedStartDate"
                    type="date"
                    className="bg-card h-9 text-xs"
                    {...register("plannedStartDate")}
                  />
                  {errors.plannedStartDate && (
                    <p className="text-xs text-destructive font-medium">{errors.plannedStartDate.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="plannedEndDate">Planned End Date</Label>
                  <Input
                    id="plannedEndDate"
                    type="date"
                    className="bg-card h-9 text-xs"
                    {...register("plannedEndDate")}
                  />
                  {errors.plannedEndDate && (
                    <p className="text-xs text-destructive font-medium">{errors.plannedEndDate.message}</p>
                  )}
                </div>
              </div>

              {/* Users checklists selection */}
              <div className="space-y-2 pt-1.5">
                <Label className="text-sm font-semibold text-foreground">Assign Story Members</Label>
                <p className="text-[11px] text-muted-foreground">
                  Check developers assigned to this Main Story. Only assigned members will be available for child stage stories.
                </p>
                <div className="grid grid-cols-2 gap-2 border border-border rounded-lg p-2.5 bg-muted/20 max-h-[140px] overflow-y-auto">
                  {users.map((user) => {
                    const isChecked = selectedUserIds.includes(user._id);
                    return (
                      <div
                        key={user._id}
                        onClick={() => handleToggleUserCheck(user._id)}
                        className={cn(
                          "flex items-center gap-2 rounded-md border p-2 bg-card cursor-pointer hover:bg-muted/40 transition-colors select-none",
                          isChecked && "border-primary/40 bg-primary/5"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // toggled via parent div click
                          className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary accent-primary"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-semibold text-foreground truncate">{user.name}</span>
                          <span className="text-[9px] text-muted-foreground truncate">{user.email}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stages checklist sequencer */}
              <div className="space-y-2 pt-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-foreground">Pipeline Stage Sequencer</Label>
                  <span className="text-xs font-medium text-primary bg-primary/5 px-2.5 py-0.5 rounded-full font-sans">
                    {plannerStages.filter((s) => s.checked).length} selected
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Check stages to include. Drag and reorder them to sequence the delivery path.
                </p>

                <div className="space-y-2 border border-border rounded-lg p-2.5 bg-muted/20 max-h-[220px] overflow-y-auto">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={plannerStages.map((s) => s._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {plannerStages.map((stage) => (
                        <SortableStageRow
                          key={stage._id}
                          stage={stage}
                          onToggle={handleToggleStageCheck}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4" showCloseButton={true}>
              <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Story"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Drag & Drop Sortable Stage Checklist row component
interface SortableStageRowProps {
  stage: PlannerStage;
  onToggle: (id: string) => void;
}

function SortableStageRow({ stage, onToggle }: SortableStageRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    position: "relative" as const,
  };

  const colors = getStageColorConfig(stage.colorTag);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border p-2 bg-card hover:bg-muted/40 transition-colors",
        isDragging && "shadow-md bg-accent/80 border-primary/20 opacity-80 z-50 select-none"
      )}
    >
      <button
        type="button"
        className="p-1 rounded text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none select-none border-none bg-transparent outline-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <input
        type="checkbox"
        id={`stage-check-${stage._id}`}
        checked={stage.checked}
        onChange={() => onToggle(stage._id)}
        className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
      />

      <label
        htmlFor={`stage-check-${stage._id}`}
        className={cn(
          "flex-1 text-xs font-semibold select-none cursor-pointer",
          stage.checked ? "text-foreground" : "text-muted-foreground/60 line-through"
        )}
      >
        {stage.name}
      </label>

      <Badge className={cn("capitalize text-[9px] font-bold border-none bg-secondary/80", colors.text)}>
        {stage.colorTag}
      </Badge>
    </div>
  );
}
