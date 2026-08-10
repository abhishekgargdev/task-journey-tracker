"use client";

import React, { use, useEffect, useState } from "react";
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
  User,
  ArrowLeft,
  Calendar,
  ExternalLink,
  Plus,
  Loader2,
  FolderGit,
  AlertTriangle,
  GripVertical,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import EmptyState from "@/components/shared/EmptyState";
import StageBadge from "@/components/shared/StageBadge";
import { getStageColorConfig } from "@/lib/stage-colors";
import { cn } from "@/lib/utils";

interface TaskOwner {
  _id: string;
  name: string;
  email: string;
}

interface TaskDetail {
  _id: string;
  title: string;
  description?: string;
  adoTaskLink?: string;
  owner?: TaskOwner;
  createdAt: string;
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

interface SprintItem {
  _id: string;
  name: string;
  status: string;
}

interface StoryItem {
  _id: string;
  title: string;
  adoStoryLink?: string;
  sprint: SprintItem;
  stagePlan: StagePlanEntry[];
  currentStageOrder: number;
  overallStatus: "not_started" | "in_progress" | "blocked" | "on_hold" | "completed";
}

interface PlannerStage {
  _id: string;
  name: string;
  colorTag: string;
  checked: boolean;
}

const storyFormSchema = z.object({
  title: z.string().min(2, { message: "Story title must be at least 2 characters." }),
  adoStoryLink: z.string().url({ message: "Must be a valid Azure DevOps URL." }).or(z.literal("")),
  sprint: z.string().min(1, { message: "Target sprint is required." }),
});

type StoryFormValues = z.infer<typeof storyFormSchema>;

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = use(params);

  // States
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [sprints, setSprints] = useState<SprintItem[]>([]);
  const [catalogStages, setCatalogStages] = useState<PlannerStage[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  // Drag-and-drop checklist state
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
  } = useForm<StoryFormValues>({
    resolver: zodResolver(storyFormSchema),
    defaultValues: {
      title: "",
      adoStoryLink: "",
      sprint: "",
    },
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch task details
      const taskRes = await fetch(`/api/tasks/${taskId}`);
      if (!taskRes.ok) throw new Error("Failed to load task details.");
      const taskData = await taskRes.json();
      setTask(taskData);
      
      // Fetch sprints
      const sprintRes = await fetch("/api/sprints");
      if (sprintRes.ok) {
        const sprintData = await sprintRes.json();
        setSprints(sprintData);
      }
    } catch (err: any) {
      console.error(err);
      toast.add({
        title: "Error loading task",
        description: err.message || "Could not retrieve task details.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStories = async () => {
    try {
      setStoriesLoading(true);
      const res = await fetch(`/api/stories?task=${taskId}`);
      if (!res.ok) throw new Error("Failed to load stories.");
      const data = await res.json();
      setStories(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setStoriesLoading(false);
    }
  };

  const fetchActiveStages = async () => {
    try {
      const res = await fetch("/api/stages?active=true");
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((stage: any) => ({
          _id: stage._id,
          name: stage.name,
          colorTag: stage.colorTag,
          checked: true,
        }));
        setCatalogStages(mapped);
      }
    } catch (err) {
      console.error("Failed to load stages:", err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchStories();
    fetchActiveStages();
  }, [taskId]);

  const openCreateDialog = () => {
    // Reset form values
    reset({
      title: "",
      adoStoryLink: "",
      sprint: sprints[0]?._id || "",
    });
    // Set stage planner state to default active stages order
    setPlannerStages([...catalogStages]);
    setFormOpen(true);
  };

  const handleToggleStageCheck = (id: string) => {
    setPlannerStages((prev) =>
      prev.map((stage) =>
        stage._id === id ? { ...stage, checked: !stage.checked } : stage
      )
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
    try {
      // Validate that at least one stage is selected in stagePlan
      const selectedStagePlanIds = plannerStages
        .filter((s) => s.checked)
        .map((s) => s._id);

      if (selectedStagePlanIds.length === 0) {
        toast.add({
          title: "Stage Plan validation error",
          description: "You must check at least one stage to build a delivery plan for this story.",
          type: "warning",
        });
        return;
      }

      const payload = {
        ...values,
        task: taskId,
        stagePlan: selectedStagePlanIds,
      };

      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create story.");
      }

      toast.add({
        title: "User Story created",
        description: `Story "${values.title}" has been successfully added with ${selectedStagePlanIds.length} stage tickets.`,
        type: "success",
      });

      setFormOpen(false);
      fetchStories();
    } catch (err: any) {
      console.error(err);
      toast.add({
        title: "Failed to create story",
        description: err.message || "An unexpected error occurred.",
        type: "error",
      });
    }
  };

  // Helper to extract story details
  const getStoryStageDetails = (story: StoryItem) => {
    const currentEntry = story.stagePlan.find(sp => sp.order === story.currentStageOrder);
    const name = currentEntry?.stage?.name || (story.overallStatus === "completed" ? "Go Live / Completed" : "Completed");
    const colorTag = currentEntry?.stage?.colorTag || "emerald";
    
    const total = story.stagePlan.length;
    const completed = story.overallStatus === "completed" ? total : Math.max(0, story.currentStageOrder - 1);

    return { name, colorTag, total, completed };
  };

  const activeTicketsCount = plannerStages.filter((s) => s.checked).length;

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link href="/tasks" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Tasks list
      </Link>

      {loading || !task ? (
        <Card className="animate-pulse border-border bg-card p-6 h-36" />
      ) : (
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold font-sans text-foreground">
                  {task.title}
                </CardTitle>
                <CardDescription className="text-xs flex items-center gap-4">
                  <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Owner: {task.owner?.name || "Unassigned"}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center">
                {task.adoTaskLink && (
                  <Button variant="outline" size="sm" render={<a href={task.adoTaskLink} target="_blank" rel="noreferrer" />}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    ADO Task
                  </Button>
                )}
                <Button onClick={openCreateDialog} size="sm" className="cursor-pointer">
                  <Plus className="h-4 w-4 mr-1" />
                  New Story
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed pt-2 border-t border-border bg-muted/10">
            {task.description || <p className="italic opacity-50">No description provided for this task.</p>}
          </CardContent>
        </Card>
      )}

      {/* Related Stories */}
      <div className="space-y-4">
        <h3 className="text-base font-bold tracking-tight text-foreground font-sans">
          Attached User Stories
        </h3>

        {storiesLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="h-16 w-full animate-pulse rounded-lg border border-border bg-muted/20" />
            ))}
          </div>
        ) : stories.length === 0 ? (
          <EmptyState
            icon={FolderGit}
            title="No stories attached"
            description="There are no user stories linked to this task. Add a story to map its configurable delivery pipeline."
            action={
              <Button onClick={openCreateDialog} size="sm" variant="outline" className="cursor-pointer">
                Attach Story
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3">
            {stories.map((story) => {
              const details = getStoryStageDetails(story);
              return (
                <Card key={story._id} className="shadow-sm border-border bg-card hover:border-primary/20 transition-all">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground text-sm truncate max-w-[280px] sm:max-w-md block">
                          {story.title}
                        </span>
                        {story.adoStoryLink && (
                          <a href={story.adoStoryLink} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="bg-secondary/60 text-secondary-foreground px-2 py-0.5 rounded font-medium">
                          {story.sprint?.name}
                        </span>
                        <span className="font-medium text-foreground/80">
                          {details.completed} of {details.total} stages complete
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-center">
                      <div className="flex flex-col items-start sm:items-end gap-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Current Stage</span>
                        <StageBadge name={details.name} colorTag={details.colorTag} size="sm" />
                      </div>
                      <Button variant="outline" size="sm" className="hidden sm:inline-flex" render={<Link href="/stories" />}>
                        Track
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* New Story Dialog Stage Planner */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Attach User Story</DialogTitle>
            <DialogDescription>
              Define credentials and map the dynamic delivery pipeline for this user story.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="space-y-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="story-title">Story Title</Label>
                  <Input
                    id="story-title"
                    placeholder="e.g. Implement OAuth Compliance Validation"
                    className="bg-card"
                    {...register("title")}
                  />
                  {errors.title && (
                    <p className="text-xs text-destructive font-medium">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="story-sprint">Target Sprint</Label>
                  <select
                    id="story-sprint"
                    className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    {...register("sprint")}
                  >
                    {sprints.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {errors.sprint && (
                    <p className="text-xs text-destructive font-medium">{errors.sprint.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="story-ado">ADO Link (Optional)</Label>
                  <Input
                    id="story-ado"
                    type="url"
                    placeholder="https://dev.azure.com/..."
                    className="bg-card"
                    {...register("adoStoryLink")}
                  />
                  {errors.adoStoryLink && (
                    <p className="text-xs text-destructive font-medium">{errors.adoStoryLink.message}</p>
                  )}
                </div>
              </div>

              {/* Stage Planner checklist */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-foreground">Pipeline Stage Sequence Planner</Label>
                  <span className="text-xs font-medium text-primary bg-primary/5 px-2.5 py-1 rounded-full">
                    {activeTicketsCount} stages / {activeTicketsCount} tickets
                  </span>
                </div>
                <p className="text-xs text-muted-foreground pb-2">
                  Check stages to include. Drag rows to customize the delivery path order for this story.
                </p>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 border border-border rounded-lg p-2.5 bg-muted/20">
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
                        <SortableStageCheck
                          key={stage._id}
                          item={stage}
                          onToggle={handleToggleStageCheck}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            </div>
            <DialogFooter className="pt-4" showCloseButton={true}>
              <Button type="submit" disabled={isSubmitting}>
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

// Reorderable Stage Checklist Row
interface SortableStageCheckProps {
  item: PlannerStage;
  onToggle: (id: string) => void;
}

function SortableStageCheck({ item, onToggle }: SortableStageCheckProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : 1,
    position: "relative" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border border-border p-2.5 bg-card hover:bg-muted/40 transition-colors ${
        isDragging ? "shadow-md bg-accent/80 border-primary/20 opacity-80 z-50 select-none" : ""
      }`}
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
        id={`stage-check-${item._id}`}
        checked={item.checked}
        onChange={() => onToggle(item._id)}
        className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
      />

      <label
        htmlFor={`stage-check-${item._id}`}
        className={`flex-1 text-xs font-semibold select-none cursor-pointer ${
          item.checked ? "text-foreground" : "text-muted-foreground/60 line-through"
        }`}
      >
        {item.name}
      </label>

      <Badge className={cn("capitalize text-[9px] font-bold border-none bg-secondary/80", getStageColorConfig(item.colorTag).text)}>
        {item.colorTag}
      </Badge>
    </div>
  );
}
