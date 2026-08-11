"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  ArrowLeft, 
  ExternalLink, 
  Layers, 
  Calendar, 
  User as UserIcon,
  AlertTriangle,
  Loader2,
  Edit,
  Clock,
  CheckCircle,
  FileText
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/shared/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import JourneyLadder from "@/components/journey/JourneyLadder";

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

interface UserItem {
  _id: string;
  name: string;
  email: string;
}

interface StoryHoldHistory {
  reason: string;
  heldAt: string;
  resumedAt?: string;
  heldBy: UserItem;
}

interface UserStory {
  _id: string;
  title: string;
  description?: string;
  adoStoryLink?: string;
  task: TaskItem;
  sprint: SprintItem;
  stagePlan: StagePlanEntry[];
  currentStageOrder: number;
  overallStatus: "not_started" | "in_progress" | "blocked" | "on_hold" | "completed";
  assignedTo?: UserItem;
  state: "New" | "Active" | "Resolved" | "Closed";
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  isOnHold: boolean;
  holdReason?: string;
  holdHistory: StoryHoldHistory[];
}

interface StoryStage {
  _id: string;
  story: string;
  stage: string; 
  order: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  status: "not_started" | "in_progress" | "blocked" | "on_hold" | "completed";
  githubRepo?: string;
  branchName?: string;
  prLink?: string;
  assignedTo?: UserItem;
  notes?: string;
}

const storyEditSchema = z.object({
  title: z.string().min(2, { message: "Story title must be at least 2 characters." }),
  description: z.string().optional(),
  adoStoryLink: z.string().url({ message: "Must be a valid Azure DevOps URL." }).or(z.literal("")),
  sprint: z.string().min(1, { message: "Sprint is required." }),
  assignedTo: z.string().optional(),
  state: z.enum(["New", "Active", "Resolved", "Closed"]),
  plannedStartDate: z.string().optional().or(z.literal("")),
  plannedEndDate: z.string().optional().or(z.literal("")),
  actualStartDate: z.string().optional().or(z.literal("")),
  actualEndDate: z.string().optional().or(z.literal("")),
});

type StoryEditValues = z.infer<typeof storyEditSchema>;

export default function StoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storyId } = use(params);

  // States
  const [story, setStory] = useState<UserStory | null>(null);
  const [stages, setStages] = useState<StoryStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [sprints, setSprints] = useState<SprintItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);

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

      const stagesRes = await fetch(`/api/stories/${storyId}/stages`);
      if (!stagesRes.ok) throw new Error("Failed to load story stages.");
      const stagesData = await stagesRes.json();
      setStages(stagesData);

    } catch (err: any) {
      console.error(err);
      toast.add({
        title: "Error loading story details",
        description: err.message || "Failed to load journey tracking records.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSelectOptions = async () => {
    try {
      const [sprintsRes, usersRes] = await Promise.all([
        fetch("/api/sprints"),
        fetch("/api/users")
      ]);
      if (sprintsRes.ok) {
        const sprintsData = await sprintsRes.json();
        setSprints(sprintsData);
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
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
    
    const formatDate = (dateStr?: string) => {
      if (!dateStr) return "";
      return new Date(dateStr).toISOString().split("T")[0];
    };

    reset({
      title: story.title,
      description: story.description || "",
      adoStoryLink: story.adoStoryLink || "",
      sprint: story.sprint?._id || "",
      assignedTo: story.assignedTo?._id || "",
      state: story.state || "New",
      plannedStartDate: formatDate(story.plannedStartDate),
      plannedEndDate: formatDate(story.plannedEndDate),
      actualStartDate: formatDate(story.actualStartDate),
      actualEndDate: formatDate(story.actualEndDate),
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (values: StoryEditValues) => {
    try {
      const payload = {
        ...values,
        assignedTo: values.assignedTo || null,
        plannedStartDate: values.plannedStartDate ? new Date(values.plannedStartDate).toISOString() : null,
        plannedEndDate: values.plannedEndDate ? new Date(values.plannedEndDate).toISOString() : null,
        actualStartDate: values.actualStartDate ? new Date(values.actualStartDate).toISOString() : null,
        actualEndDate: values.actualEndDate ? new Date(values.actualEndDate).toISOString() : null,
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
        description: "User story details saved successfully.",
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
        <p className="text-sm text-muted-foreground">Loading story journey detail...</p>
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
                <CardTitle className="text-xl font-bold font-sans text-foreground">
                  {story.title}
                </CardTitle>
                {story.adoStoryLink && (
                  <a href={story.adoStoryLink} target="_blank" rel="noreferrer" className="text-primary p-1 hover:bg-muted rounded inline-flex items-center">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-center">
              <Badge className="bg-primary/10 text-primary border-none font-bold py-1 px-3">
                {story.state || "New"}
              </Badge>
              <StatusBadge status={story.overallStatus} />
              <Button onClick={openEditDialog} variant="outline" size="sm" className="cursor-pointer">
                <Edit className="h-4 w-4 mr-1.5" />
                Edit Details
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-4 space-y-4 text-xs">
          {/* Metadata Grid */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-1">
              <span className="text-muted-foreground font-semibold">Parent Task:</span>
              <p className="font-semibold text-foreground">
                {story.task ? (
                  <Link href={`/tasks/${story.task._id}`} className="text-primary hover:underline">
                    {story.task.title}
                  </Link>
                ) : (
                  "None"
                )}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground font-semibold">Sprint Workspace:</span>
              <p className="font-semibold text-foreground">{story.sprint?.name || "Unassigned"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground font-semibold">Assigned Developer:</span>
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                {story.assignedTo?.name || "Unassigned"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground font-semibold">Pipeline Length:</span>
              <p className="font-semibold text-foreground flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-primary" />
                {story.stagePlan.length} delivery stages mapped
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
                Description & Scope
              </span>
              <p className="text-xs text-foreground/80 leading-relaxed bg-muted/5 p-3 rounded-lg border border-border/40 whitespace-pre-wrap">
                {story.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Centerpiece Journey Stepper Ladder */}
      <JourneyLadder story={story} stages={stages} onRefresh={fetchStoryDetails} />

      {/* Edit Story Details Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Story Details</DialogTitle>
            <DialogDescription>
              Update credentials and process-tracking configurations for this story.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleEditSubmit)}>
            <div className="space-y-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Title */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="edit-title">Story Title</Label>
                  <Input
                    id="edit-title"
                    className="bg-card"
                    {...register("title")}
                  />
                  {errors.title && (
                    <p className="text-xs text-destructive font-medium">{errors.title.message}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    className="bg-card min-h-[80px] text-xs"
                    {...register("description")}
                  />
                </div>

                {/* Sprint */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-sprint">Sprint</Label>
                  <select
                    id="edit-sprint"
                    className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    {...register("sprint")}
                  >
                    {sprints.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ADO Link */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-ado">ADO Link (Optional)</Label>
                  <Input
                    id="edit-ado"
                    className="bg-card"
                    {...register("adoStoryLink")}
                  />
                  {errors.adoStoryLink && (
                    <p className="text-xs text-destructive font-medium">{errors.adoStoryLink.message}</p>
                  )}
                </div>

                {/* Assignee */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-assignee">Assigned Developer</Label>
                  <select
                    id="edit-assignee"
                    className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    {...register("assignedTo")}
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* State */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-state">ADO State</Label>
                  <select
                    id="edit-state"
                    className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    {...register("state")}
                  >
                    <option value="New">New</option>
                    <option value="Active">Active</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                {/* Dates */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-plannedStart">Planned Start</Label>
                  <Input
                    id="edit-plannedStart"
                    type="date"
                    className="bg-card h-9 text-xs"
                    {...register("plannedStartDate")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-plannedEnd">Planned End</Label>
                  <Input
                    id="edit-plannedEnd"
                    type="date"
                    className="bg-card h-9 text-xs"
                    {...register("plannedEndDate")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-actualStart">Actual Start</Label>
                  <Input
                    id="edit-actualStart"
                    type="date"
                    className="bg-card h-9 text-xs"
                    {...register("actualStartDate")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-actualEnd">Actual End</Label>
                  <Input
                    id="edit-actualEnd"
                    type="date"
                    className="bg-card h-9 text-xs"
                    {...register("actualEndDate")}
                  />
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
    </div>
  );
}
