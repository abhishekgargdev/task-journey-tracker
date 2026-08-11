"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  ArrowLeft, 
  ExternalLink, 
  Layers, 
  Calendar, 
  User as UserIcon,
  AlertTriangle,
  Loader2,
  Edit,
  FileText,
  GripVertical,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/shared/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import JourneyLadder from "@/components/journey/JourneyLadder";
import DeleteConfirmDialog, { DeleteConfirmItem } from "@/components/shared/DeleteConfirmDialog";
import { cn } from "@/lib/utils";
import { getStageColorConfig } from "@/lib/stage-colors";
import { formatDateForInput } from "@/lib/date-utils";

// Validation schema for editing Parent Story
const storyEditSchema = z.object({
  storyNumber: z.string().min(1, { message: "Story Number is required." }),
  taskName: z.string().min(2, { message: "Task/Story Name is required." }),
  description: z.string().optional(),
  sprintUrl: z.string().url({ message: "Must be a valid URL." }).or(z.literal("")),
  plannedStartDate: z.string().min(1, { message: "Planned Start Date is required." }),
  plannedEndDate: z.string().min(1, { message: "Planned End Date is required." }),
});

type StoryEditValues = z.infer<typeof storyEditSchema>;

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
  taskName: string;
  description?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  developBy?: DbUser;
  githubPrLink?: string;
  branchName?: string;
  status: "not_started" | "in_progress" | "blocked" | "completed" | "delayed";
  githubRepo?: string;
  prStatus?: "none" | "pending" | "merged";
  notes?: string;
  implementationDescription?: string;
  adoStoryLink?: string;
}

interface UserStory {
  _id: string;
  storyNumber: string;
  taskName: string;
  description?: string;
  sprintUrl?: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  status: "not_started" | "in_progress" | "blocked" | "completed" | "delayed";
  isOnHold: boolean;
  holdReason?: string;
  stageOrder: StageDefinition[];
  assignedUsers: DbUser[];
  childStages: StoryStage[];
}

interface PlannerStage {
  _id: string;
  name: string;
  colorTag: string;
  checked: boolean;
  isStarted: boolean;
}

export default function StoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storyId } = use(params);
  const router = useRouter();

  // States
  const [story, setStory] = useState<UserStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DeleteConfirmItem | null>(null);
  
  const [allUsers, setAllUsers] = useState<DbUser[]>([]);
  const [catalogStages, setCatalogStages] = useState<PlannerStage[]>([]);

  // Dialog State: Checked users checklist
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  // Dialog State: Drag and drop stages checklist
  const [plannerStages, setPlannerStages] = useState<PlannerStage[]>([]);

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
  } = useForm<StoryEditValues>({
    resolver: zodResolver(storyEditSchema),
  });

  const fetchStoryDetails = async () => {
    try {
      setLoading(true);
      
      const storyRes = await fetch(`/api/stories/${storyId}`);
      if (!storyRes.ok) throw new Error("Failed to load user story.");
      const storyData = await storyRes.json();
      setStory(storyData);

    } catch (err: any) {
      console.error(err);
      toast.add({
        title: "Error loading details",
        description: err.message || "Failed to load journey tracking records.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSelectOptions = async () => {
    try {
      const usersRes = await fetch("/api/users");
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setAllUsers(usersData.filter((u: DbUser) => u.status === "active"));
      }

      const stagesRes = await fetch("/api/stages?active=true");
      if (stagesRes.ok) {
        const stagesData = await stagesRes.json();
        setCatalogStages(stagesData);
      }
    } catch (err) {
      console.error("Failed to load select options:", err);
    }
  };

  useEffect(() => {
    fetchStoryDetails();
    fetchSelectOptions();
  }, [storyId]);

  const openEditDialog = () => {
    if (!story) return;
    
    reset({
      storyNumber: story.storyNumber,
      taskName: story.taskName,
      description: story.description || "",
      sprintUrl: story.sprintUrl || "",
      plannedStartDate: formatDateForInput(story.plannedStartDate),
      plannedEndDate: formatDateForInput(story.plannedEndDate),
    });

    // Populate checked users
    setSelectedUserIds(story.assignedUsers.map((u) => u._id));

    // Populate checklist stages in planner.
    // Started/Completed stages are marked as locked (checked & isStarted).
    const activeStagePlanIds = story.stageOrder.map((s) => s._id);
    const sortedPlanner = catalogStages.map((stage) => {
      const matchedStage = story.childStages.find((cs) => cs.stageId?._id === stage._id);
      const isChecked = activeStagePlanIds.includes(stage._id);
      const isStarted = matchedStage ? matchedStage.status !== "not_started" : false;

      return {
        _id: stage._id,
        name: stage.name,
        colorTag: stage.colorTag,
        checked: isChecked,
        isStarted,
      };
    });

    // Resequence planner list to match the current story's stageOrder position
    const orderedPlanner = [
      ...story.stageOrder.map((s) => {
        const pStage = sortedPlanner.find((ps) => ps._id === s._id);
        return pStage || null;
      }).filter(Boolean),
      ...sortedPlanner.filter((ps) => !activeStagePlanIds.includes(ps._id)),
    ] as PlannerStage[];

    setPlannerStages(orderedPlanner);
    setEditOpen(true);
  };

  const handleToggleStageCheck = (id: string) => {
    setPlannerStages((prev) =>
      prev.map((s) => {
        if (s._id === id) {
          if (s.isStarted) return s; // lock started stages
          return { ...s, checked: !s.checked };
        }
        return s;
      })
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

    const activeItem = plannerStages[oldIndex];
    const overItem = plannerStages[newIndex];

    // cannot reorder started/completed stages
    if (activeItem.isStarted || overItem.isStarted) {
      toast.add({
        title: "Reordering blocked",
        description: "Stages with active progress (completed, in progress, blocked) are locked at the top of the plan.",
        type: "warning",
      });
      return;
    }

    setPlannerStages((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  const openDeleteDialog = () => {
    if (!story) return;
    setPendingDelete({
      id: story._id,
      name: story.taskName,
      subtitle: `Story #${story.storyNumber}`,
    });
    setDeleteOpen(true);
  };

  const confirmDeleteStory = async (id: string) => {
    const res = await fetch(`/api/stories/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      toast.add({
        title: "Delete failed",
        description: data.error || "Failed to delete story.",
        type: "error",
      });
      throw new Error(data.error);
    }

    toast.add({
      title: "Story deleted",
      description: "The story and all its stage records have been permanently removed.",
      type: "success",
    });
    router.push("/stories");
  };

  const handleEditSubmit = async (values: StoryEditValues) => {
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
        userIds: selectedUserIds,
        stageOrder: selectedStagePlanIds,
      };

      const res = await fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update story.");
      }

      toast.add({
        title: "Story updated",
        description: "Parent story details saved successfully.",
        type: "success",
      });

      setEditOpen(false);
      fetchStoryDetails();
    } catch (err: any) {
      console.error(err);
      toast.add({
        title: "Edit failed",
        description: err.message || "An unexpected error occurred.",
        type: "error",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading story journey details...</p>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="space-y-4">
        <Link href="/stories" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Stories workspace
        </Link>
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center max-w-lg mx-auto space-y-3">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <h3 className="text-base font-semibold text-destructive">Story not found</h3>
          <p className="text-sm text-muted-foreground leading-normal">
            The requested User Story could not be located in the database.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link href="/stories" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Stories workspace
      </Link>

      {/* Story Details Card Header */}
      <Card className="border-border bg-card shadow-md">
        <CardHeader className="pb-3 border-b border-border bg-muted/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">User Story Journey</span>
              <div className="flex items-center gap-2.5 flex-wrap">
                <Badge className="bg-primary/5 text-primary text-xs font-mono font-bold border border-primary/20">
                  #{story.storyNumber}
                </Badge>
                <CardTitle className="text-lg font-bold font-sans text-foreground">
                  {story.taskName}
                </CardTitle>
              </div>
            </div>
            <div className="flex items-center gap-2.5 self-start sm:self-center">
              <StatusBadge status={story.status} />
              <Button onClick={openEditDialog} variant="outline" size="sm" className="cursor-pointer">
                <Edit className="h-4 w-4 mr-1.5" />
                Edit Details
              </Button>
              <Button
                onClick={openDeleteDialog}
                variant="outline"
                size="sm"
                className="cursor-pointer text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-4 space-y-4 text-xs">
          {/* Metadata Grid */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-1">
              <span className="text-muted-foreground font-semibold">Assigned Members:</span>
              <p className="font-semibold text-foreground flex flex-wrap gap-1.5 mt-0.5">
                {story.assignedUsers.length === 0 ? (
                  <span className="italic text-muted-foreground/60">No members assigned</span>
                ) : (
                  story.assignedUsers.map((u) => (
                    <span key={u._id} className="bg-secondary/80 text-secondary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <UserIcon className="h-2.5 w-2.5" />
                      {u.name}
                    </span>
                  ))
                )}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground font-semibold">Pipeline Length:</span>
              <p className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                {story.stageOrder.length} delivery stages sequenced
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground font-semibold">Sprint URL:</span>
              <p className="font-medium text-foreground mt-0.5">
                {story.sprintUrl ? (
                  <a href={story.sprintUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                    <ExternalLink className="h-3 w-3" />
                    Open Sprint
                  </a>
                ) : (
                  <span className="italic text-muted-foreground/60">Not set</span>
                )}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground font-semibold">Description:</span>
              <p className="text-muted-foreground font-normal mt-0.5 truncate max-w-[320px]" title={story.description}>
                {story.description || <span className="italic opacity-50">No description provided</span>}
              </p>
            </div>
          </div>

          {/* Timeline Timestamps */}
          <div className="grid gap-4 sm:grid-cols-2 pt-3 border-t border-border/60">
            <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Planned Timeline</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground text-[10px]">Planned Start:</span>
                  <p className="font-medium text-foreground text-xs mt-0.5">
                    {story.plannedStartDate ? new Date(story.plannedStartDate).toLocaleDateString() : "--"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px]">Planned End:</span>
                  <p className="font-medium text-foreground text-xs mt-0.5">
                    {story.plannedEndDate ? new Date(story.plannedEndDate).toLocaleDateString() : "--"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Actual Timeline</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground text-[10px]">Actual Start:</span>
                  <p className="font-medium text-foreground text-xs mt-0.5">
                    {story.actualStartDate ? new Date(story.actualStartDate).toLocaleDateString() : "--"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px]">Actual End:</span>
                  <p className="font-medium text-foreground text-xs mt-0.5">
                    {story.actualEndDate ? new Date(story.actualEndDate).toLocaleDateString() : "--"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          {story.description && (
            <div className="pt-3 border-t border-border/60 space-y-1">
              <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground/75" />
                Detailed Scope
              </span>
              <p className="text-xs text-foreground/80 leading-relaxed bg-muted/5 p-3 rounded-lg border border-border/40 whitespace-pre-wrap">
                {story.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stepper Ladder & Accordion child stories */}
      <JourneyLadder story={story as any} stages={story.childStages as any} onRefresh={fetchStoryDetails} />

      {/* Edit Story Details Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Main Story Details</DialogTitle>
            <DialogDescription>
              Update story fields, team assignments, and delivery pipelines.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(handleEditSubmit)}>
            <div className="space-y-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Story Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-storyNumber">Story Number</Label>
                  <Input
                    id="edit-storyNumber"
                    className="bg-card h-9 text-xs font-mono"
                    {...register("storyNumber")}
                  />
                  {errors.storyNumber && (
                    <p className="text-xs text-destructive font-medium">{errors.storyNumber.message}</p>
                  )}
                </div>

                {/* Story/Task Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-taskName">Story Name</Label>
                  <Input
                    id="edit-taskName"
                    className="bg-card h-9 text-xs"
                    {...register("taskName")}
                  />
                  {errors.taskName && (
                    <p className="text-xs text-destructive font-medium">{errors.taskName.message}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    className="bg-card min-h-[70px] text-xs"
                    {...register("description")}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="edit-sprintUrl">Sprint URL</Label>
                  <Input
                    id="edit-sprintUrl"
                    type="url"
                    placeholder="https://dev.azure.com/.../sprint/..."
                    className="bg-card h-9 text-xs"
                    {...register("sprintUrl")}
                  />
                  {errors.sprintUrl && (
                    <p className="text-xs text-destructive font-medium">{errors.sprintUrl.message}</p>
                  )}
                </div>

                {/* Dates */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-plannedStart">Planned Start Date</Label>
                  <Input
                    id="edit-plannedStart"
                    type="date"
                    className="bg-card h-9 text-xs"
                    {...register("plannedStartDate")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-plannedEnd">Planned End Date</Label>
                  <Input
                    id="edit-plannedEnd"
                    type="date"
                    className="bg-card h-9 text-xs"
                    {...register("plannedEndDate")}
                  />
                </div>
              </div>

              {/* Users Checklist */}
              <div className="space-y-2 pt-1.5">
                <Label className="text-sm font-semibold text-foreground">Story Members</Label>
                <p className="text-[11px] text-muted-foreground">
                  Check developers assigned to this Main Story. Note: You cannot remove a developer currently assigned to any active stage.
                </p>
                <div className="grid grid-cols-2 gap-2 border border-border rounded-lg p-2.5 bg-muted/20 max-h-[140px] overflow-y-auto">
                  {allUsers.map((user) => {
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
                          onChange={() => {}}
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
                  <Label className="text-sm font-semibold text-foreground">Pipeline Stage Sequence</Label>
                  <span className="text-xs font-medium text-primary bg-primary/5 px-2.5 py-0.5 rounded-full">
                    {plannerStages.filter((s) => s.checked).length} selected
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Toggle stages to add/remove, and drag rows to reorder. Completed/active stages are locked at the top.
                </p>

                <div className="space-y-2 border border-border rounded-lg p-2 bg-muted/20 max-h-[220px] overflow-y-auto">
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
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        item={pendingDelete}
        entityLabel="story"
        consequences="This will permanently delete the story, all assigned members, and every child stage record. This action cannot be undone."
        onConfirm={confirmDeleteStory}
      />
    </div>
  );
}

// Drag & Drop Row for Editing
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
  } = useSortable({ id: stage._id, disabled: stage.isStarted });

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
        "flex items-center gap-2 rounded-lg border p-2 bg-card hover:bg-muted/40 transition-colors",
        stage.isStarted ? "border-emerald-200 bg-emerald-50/10" : "border-border",
        isDragging && "shadow-md bg-accent/80 border-primary/20 opacity-80 z-50 select-none"
      )}
    >
      {!stage.isStarted ? (
        <button
          type="button"
          className="p-1 rounded text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none select-none border-none bg-transparent outline-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : (
        <div className="p-1 text-emerald-500 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M20 6 9 17l-5-5"/></svg>
        </div>
      )}

      <input
        type="checkbox"
        id={`edit-stage-check-${stage._id}`}
        checked={stage.checked}
        disabled={stage.isStarted}
        onChange={() => onToggle(stage._id)}
        className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      />

      <label
        htmlFor={`edit-stage-check-${stage._id}`}
        className={cn(
          "flex-1 text-xs font-semibold select-none cursor-pointer disabled:cursor-not-allowed",
          stage.isStarted ? "text-emerald-700 font-bold" : stage.checked ? "text-foreground" : "text-muted-foreground/60 line-through"
        )}
      >
        {stage.name}
      </label>

      {stage.isStarted ? (
        <Badge className="bg-emerald-100 hover:bg-emerald-100 text-emerald-700 border-none font-bold text-[9px] py-0 px-1.5 uppercase">
          Started
        </Badge>
      ) : (
        <Badge className={cn("capitalize text-[9px] font-bold border-none bg-secondary/80", colors.text)}>
          {stage.colorTag}
        </Badge>
      )}
    </div>
  );
}
