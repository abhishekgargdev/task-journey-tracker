"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
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
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Clock,
  ExternalLink,
  Clipboard,
  Check,
  User,
  ArrowRight,
  Settings,
  GripVertical,
  Loader2,
  Save,
  GitBranch,
  GitPullRequest
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getStageColorConfig } from "@/lib/stage-colors";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

// Types
interface StageDefinition {
  _id: string;
  name: string;
  colorTag: string;
}

interface UserItem {
  _id: string;
  name: string;
  email: string;
  status: string;
}

interface UserStory {
  _id: string;
  storyNumber: string;
  taskName: string;
  description?: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  status: "not_started" | "in_progress" | "blocked" | "completed" | "delayed";
  isOnHold: boolean;
  holdReason?: string;
  stageOrder: StageDefinition[];
  assignedUsers: UserItem[];
}

interface StoryStage {
  _id: string;
  storyId: string;
  stageId: StageDefinition;
  stageOrder: number;
  taskName: string;
  description?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  status: "not_started" | "in_progress" | "blocked" | "completed" | "delayed";
  githubRepo?: string;
  branchName?: string;
  githubPrLink?: string;
  prStatus?: "none" | "pending" | "merged";
  developBy?: UserItem;
  notes?: string;
  implementationDescription?: string;
  adoStoryLink?: string;
}

interface JourneyLadderProps {
  story: UserStory;
  stages: StoryStage[];
  onRefresh: () => void;
}

// Stage Form Validation Schema
const stageEditSchema = z.object({
  plannedStartDate: z.string().or(z.literal("")),
  plannedEndDate: z.string().or(z.literal("")),
  actualStartDate: z.string().or(z.literal("")),
  actualEndDate: z.string().or(z.literal("")),
  status: z.enum(["not_started", "in_progress", "blocked", "completed", "delayed"]),
  githubRepo: z.string().optional(),
  branchName: z.string().optional(),
  prLink: z.string().url({ message: "Must be a valid URL." }).or(z.literal("")),
  prStatus: z.enum(["none", "pending", "merged"]),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
  implementationDescription: z.string().optional(),
  adoStoryLink: z.string().optional(),
});

type StageEditFormValues = z.infer<typeof stageEditSchema>;

export default function JourneyLadder({ story, stages, onRefresh }: JourneyLadderProps) {
  const [expandedItem, setExpandedItem] = useState<any>(undefined);

  // Dialog Controls
  const [holdOpen, setHoldOpen] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [planOpen, setPlanOpen] = useState(false);
  const [advanceLoading, setAdvanceLoading] = useState(false);
  const [holdLoading, setHoldLoading] = useState(false);

  // Stage plan edit state
  const [plannerStages, setPlannerStages] = useState<{ _id: string; name: string; colorTag: string; checked: boolean; isStarted: boolean }[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleNodeClick = (storyStage: StoryStage) => {
    setExpandedItem(storyStage._id);
    const accordionEl = document.getElementById(`accordion-item-${storyStage._id}`);
    if (accordionEl) {
      accordionEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleAdvance = async () => {
    try {
      setAdvanceLoading(true);
      const res = await fetch(`/api/stories/${story._id}/advance`, {
        method: "POST",
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to advance story.");
      }

      toast.add({
        title: "Story advanced",
        description: `Story has progressed in the delivery pipeline.`,
        type: "success",
      });

      onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.add({
        title: "Advance failed",
        description: err.message || "Could not progress the pipeline.",
        type: "error",
      });
    } finally {
      setAdvanceLoading(false);
    }
  };

  const handleHoldToggle = async () => {
    if (story.isOnHold || story.status === "blocked") {
      // Resume
      try {
        setHoldLoading(true);
        const res = await fetch(`/api/stories/${story._id}/resume`, { method: "POST" });
        if (!res.ok) throw new Error("Failed to resume story.");
        toast.add({
          title: "Story resumed",
          description: "Story overall status returned to in_progress.",
          type: "success",
        });
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      } finally {
        setHoldLoading(false);
      }
    } else {
      // Open Hold dialog
      setHoldReason("");
      setHoldOpen(true);
    }
  };

  const submitHold = async () => {
    try {
      setHoldLoading(true);
      const res = await fetch(`/api/stories/${story._id}/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: holdReason }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to place on hold.");
      }

      toast.add({
        title: "Story placed on hold",
        description: "Delivery pipeline is now blocked.",
        type: "warning",
      });

      setHoldOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setHoldLoading(false);
    }
  };

  // Stage plan edit functions
  const openPlanEditor = async () => {
    try {
      // Fetch all active stages first
      const res = await fetch("/api/stages?active=true");
      if (!res.ok) throw new Error("Failed to load catalog stages.");
      const activeStages = await res.json();

      // Find story's existing stages status
      const existingPlanIds = story.stageOrder.map((s: any) => s._id);

      const plannerList = activeStages.map((stage: any) => {
        const matchedStage = stages.find((s: any) => s.stageId?._id === stage._id);
        const isChecked = existingPlanIds.includes(stage._id);
        const isStarted = matchedStage ? matchedStage.status !== "not_started" : false;

        return {
          _id: stage._id,
          name: stage.name,
          colorTag: stage.colorTag,
          checked: isChecked,
          isStarted,
        };
      });

      // Sort: place completed/started stages at the top in their current stageOrder
      const sortedPlanner = [
        ...plannerList.filter((s: any) => existingPlanIds.includes(s._id)).sort((a: any, b: any) => existingPlanIds.indexOf(a._id) - existingPlanIds.indexOf(b._id)),
        ...plannerList.filter((s: any) => !existingPlanIds.includes(s._id)),
      ];

      setPlannerStages(sortedPlanner);
      setPlanOpen(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTogglePlannerCheck = (id: string) => {
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

  const handlePlannerDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = plannerStages.findIndex((s) => s._id === active.id);
    const newIndex = plannerStages.findIndex((s) => s._id === over.id);

    const activeItem = plannerStages[oldIndex];
    const overItem = plannerStages[newIndex];

    // Enforce safety gate: cannot move started/completed stages
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

  const submitStagePlanMutation = async () => {
    const selectedIds = plannerStages.filter(s => s.checked).map(s => s._id);
    if (selectedIds.length === 0) {
      alert("Must keep at least 1 stage in the plan.");
      return;
    }

    try {
      const res = await fetch(`/api/stories/${story._id}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stagePlan: selectedIds }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update plan.");
      }

      toast.add({
        title: "Stage plan updated",
        description: "User story pipeline has been successfully re-sequenced.",
        type: "success",
      });

      setPlanOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Node Status Aesthetics helper
  const getNodeAesthetics = (status: string) => {
    switch (status) {
      case "completed":
        return {
          bg: "bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20",
          icon: <CheckCircle2 className="h-5.5 w-5.5" />,
          labelColor: "text-emerald-600 font-semibold",
        };
      case "in_progress":
        return {
          bg: "bg-blue-500 border-blue-500 text-white shadow-blue-500/20 ring-4 ring-blue-500/20 animate-pulse",
          icon: <Play className="h-4.5 w-4.5 fill-current ml-0.5" />,
          labelColor: "text-blue-600 font-semibold",
        };
      case "blocked":
        return {
          bg: "bg-rose-500 border-rose-500 text-white shadow-rose-500/20 ring-4 ring-rose-500/20 animate-bounce",
          icon: <XCircle className="h-5 w-5" />,
          labelColor: "text-rose-600 font-bold",
        };
      case "on_hold":
      case "delayed":
        return {
          bg: "bg-amber-500 border-amber-500 text-white shadow-amber-500/20",
          icon: <Clock className="h-5 w-5" />,
          labelColor: "text-amber-600 font-semibold",
        };
      default:
        return {
          bg: "bg-card border-border text-muted-foreground hover:bg-muted/40",
          icon: <HelpCircle className="h-5 w-5" />,
          labelColor: "text-muted-foreground/80 font-medium",
        };
    }
  };

  // Math helper
  const totalStagesCount = stages.length;
  const completedStagesCount = stages.filter(s => s.status === "completed").length;
  const progressRatio = totalStagesCount > 1 
    ? (completedStagesCount / (totalStagesCount - 1)) * 100 
    : 100;

  const nextStage = stages.find(s => s.status !== "completed");
  const nextStageName = nextStage?.stageId?.name || "Go Live";

  return (
    <div className="space-y-6">
      {/* Banner Hold Banner */}
      <AnimatePresence>
        {(story.isOnHold || story.status === "blocked") && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-800 font-sans">Story Blocked / On Hold</h4>
                  <p className="text-xs text-amber-700 leading-normal">
                    Reason: <strong>{story.holdReason || "No details provided"}</strong>
                  </p>
                </div>
              </div>
              <Button
                onClick={handleHoldToggle}
                disabled={holdLoading}
                className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 self-start sm:self-center cursor-pointer"
              >
                {holdLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resume Journey"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Buttons & Progress Headers */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card border border-border p-4 rounded-xl shadow-sm">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Overall Progress</span>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground sm:text-base">
              {completedStagesCount} of {totalStagesCount} stages complete
            </h3>
            <Badge className="bg-primary/10 text-primary border-none font-bold py-0.5 text-[10px]">
              {totalStagesCount > 0 ? Math.round((completedStagesCount / totalStagesCount) * 100) : 0}%
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={openPlanEditor}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 cursor-pointer text-xs"
          >
            <Settings className="h-4 w-4" />
            Edit Stage Plan
          </Button>

          <Button
            onClick={handleHoldToggle}
            variant={story.status === "blocked" ? "default" : "outline"}
            size="sm"
            className="cursor-pointer text-xs"
          >
            {story.status === "blocked" ? "Resume" : "Place on Hold"}
          </Button>

          <Button
            onClick={handleAdvance}
            disabled={story.status === "blocked" || story.status === "completed" || advanceLoading}
            size="sm"
            className="flex items-center gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
          >
            {advanceLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Advance to: {nextStageName}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Interactive Journey Ladder */}
      <Card className="border border-border shadow-md bg-card overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/20 pb-4">
          <CardTitle className="text-sm font-bold tracking-tight">Dynamic Stepper Ladder</CardTitle>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 md:p-12 relative flex flex-col md:flex-row justify-between items-center gap-12 md:gap-4 overflow-x-auto min-h-[200px] md:min-h-[300px]">
          {totalStagesCount === 0 ? (
            <EmptyState
              icon={Settings}
              title="No stages in plan"
              description="This story has no delivery stages configured. Use Edit Stage Plan to add pipeline stages."
              className="border-none bg-transparent p-4 w-full max-w-md"
            />
          ) : (
          <>
          {/* Connector Line behind nodes */}
          {totalStagesCount > 1 && (
            <>
              {/* Desktop Connecting Line */}
              <div className="absolute hidden md:block left-[8%] right-[8%] top-[45px] h-[3px] bg-muted overflow-hidden z-0">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressRatio}%` }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="h-full bg-emerald-500"
                />
              </div>
              {/* Mobile Connecting Line */}
              <div className="absolute md:hidden left-1/2 top-[80px] bottom-[80px] w-[3px] bg-muted -translate-x-1/2 overflow-hidden z-0">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${progressRatio}%` }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="w-full bg-emerald-500"
                />
              </div>
            </>
          )}

          {/* Render Stepper Steps */}
          {stages.map((stageVal, index) => {
            const stageDef = stageVal.stageId;
            if (!stageDef) return null;
            const stageColors = getStageColorConfig(stageDef.colorTag);
            const aes = getNodeAesthetics(stageVal.status);

            return (
              <motion.div
                key={stageVal._id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
                onClick={() => handleNodeClick(stageVal)}
                className="flex flex-col items-center gap-2.5 z-10 cursor-pointer group text-center select-none"
              >
                {/* Node Circle */}
                <div
                  className={cn(
                    "h-12 w-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 shadow-sm",
                    aes.bg,
                    "hover:ring-4 group-hover:scale-105",
                    stageColors.ring
                  )}
                >
                  {aes.icon}
                </div>

                {/* Node Text info */}
                <div className="space-y-0.5">
                  <h4 className={cn("text-xs font-semibold tracking-tight transition-colors", aes.labelColor)}>
                    {stageDef.name}
                  </h4>
                  <div className="flex items-center justify-center gap-1">
                    <span className={cn("h-1.5 w-1.5 rounded-full", stageColors.dot)} />
                    <span className="text-[9px] uppercase font-bold text-muted-foreground/60">{stageDef.colorTag}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
          </>
          )}
        </CardContent>
      </Card>

      {/* Child Stories / Accordion Sections */}
      <Card className="border border-border shadow-md bg-card overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/10 pb-4">
          <CardTitle className="text-sm font-bold tracking-tight">Child Stories (Stage-wise Deliverables)</CardTitle>
          <CardDescription>
            Configure dates, assignments, branch info, and logs for each active pipeline stage.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {stages.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No child stories initialized. Configure the stage plan above.
            </div>
          ) : (
            <Accordion 
              value={expandedItem} 
              onValueChange={setExpandedItem} 
              className="w-full space-y-3"
            >
              {stages.map((stageVal) => {
                const stageDef = stageVal.stageId;
                if (!stageDef) return null;
                return (
                  <ChildStoryAccordionItem
                    key={stageVal._id}
                    storyStage={stageVal}
                    stageName={stageDef.name}
                    colorTag={stageDef.colorTag}
                    storyId={story._id}
                    users={story.assignedUsers} // Restricted to Main Story users
                    onRefresh={onRefresh}
                  />
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Place on Hold dialog */}
      <Dialog open={holdOpen} onOpenChange={setHoldOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Place Story On Hold
            </DialogTitle>
            <DialogDescription>
              Provide an explanation of why this story has been blocked or put on hold.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Label htmlFor="hold-reason-input">Reason</Label>
            <Input
              id="hold-reason-input"
              placeholder="e.g. Awaiting Biz Compliance Sign-off"
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              className="bg-card text-xs"
            />
          </div>
          <DialogFooter className="pt-2" showCloseButton={true}>
            <Button variant="outline" onClick={() => setHoldOpen(false)} className="cursor-pointer text-xs">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submitHold}
              disabled={holdReason.trim().length < 2 || holdLoading}
              className="cursor-pointer text-xs"
            >
              {holdLoading ? "Blocking..." : "Block Journey"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stage plan edit Dialog */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Pipeline Stage Plan</DialogTitle>
            <DialogDescription>
              Toggle stages and drag to customize the sequence. Locked stages at the top represent active or completed milestones.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handlePlannerDragEnd}
              >
                <SortableContext
                  items={plannerStages.map((s) => s._id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 border border-border rounded-lg p-2 bg-muted/20">
                    {plannerStages.map((stage) => (
                      <SortablePlannerRow
                        key={stage._id}
                        stage={stage}
                        onToggle={handleTogglePlannerCheck}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>

          <DialogFooter className="pt-2" showCloseButton={true}>
            <Button variant="outline" onClick={() => setPlanOpen(false)} className="cursor-pointer text-xs">
              Cancel
            </Button>
            <Button onClick={submitStagePlanMutation} className="cursor-pointer text-xs">
              Save Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Collapsible Inline Form Accordion Item for Child Stories
interface ChildStoryAccordionItemProps {
  storyStage: StoryStage;
  stageName: string;
  colorTag: string;
  storyId: string;
  users: UserItem[];
  onRefresh: () => void;
}

function ChildStoryAccordionItem({
  storyStage,
  stageName,
  colorTag,
  storyId,
  users,
  onRefresh,
}: ChildStoryAccordionItemProps) {
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StageEditFormValues>({
    resolver: zodResolver(stageEditSchema),
    defaultValues: {
      plannedStartDate: storyStage.plannedStartDate ? new Date(storyStage.plannedStartDate).toISOString().split("T")[0] : "",
      plannedEndDate: storyStage.plannedEndDate ? new Date(storyStage.plannedEndDate).toISOString().split("T")[0] : "",
      actualStartDate: storyStage.actualStartDate ? new Date(storyStage.actualStartDate).toISOString().split("T")[0] : "",
      actualEndDate: storyStage.actualEndDate ? new Date(storyStage.actualEndDate).toISOString().split("T")[0] : "",
      status: storyStage.status,
      githubRepo: storyStage.githubRepo || "",
      branchName: storyStage.branchName || "",
      prLink: storyStage.githubPrLink || "", // bind correctly to backend githubPrLink
      prStatus: storyStage.prStatus || "none",
      assignedTo: storyStage.developBy?._id || "", // bind correctly to developBy ID
      notes: storyStage.notes || "",
      implementationDescription: storyStage.implementationDescription || "",
      adoStoryLink: storyStage.adoStoryLink || "",
    },
  });

  const onSubmit = async (values: StageEditFormValues) => {
    // Dates validation
    if (values.plannedStartDate && values.plannedEndDate && new Date(values.plannedEndDate) < new Date(values.plannedStartDate)) {
      toast.add({ title: "Validation error", description: "Planned End cannot be before Planned Start", type: "warning" });
      return;
    }
    if (values.actualStartDate && values.actualEndDate && new Date(values.actualEndDate) < new Date(values.actualStartDate)) {
      toast.add({ title: "Validation error", description: "Actual End cannot be before Actual Start", type: "warning" });
      return;
    }

    try {
      const formatted = {
        ...values,
        plannedStartDate: values.plannedStartDate ? new Date(values.plannedStartDate).toISOString() : null,
        plannedEndDate: values.plannedEndDate ? new Date(values.plannedEndDate).toISOString() : null,
        actualStartDate: values.actualStartDate ? new Date(values.actualStartDate).toISOString() : null,
        actualEndDate: values.actualEndDate ? new Date(values.actualEndDate).toISOString() : null,
        assignedTo: values.assignedTo || null,
        prLink: values.prLink || "",
      };

      const res = await fetch(`/api/stories/${storyId}/stages/${storyStage.stageId?._id || (storyStage as any).stageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formatted),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update child story details.");
      }

      toast.add({
        title: "Child Story updated",
        description: `"${stageName}" details saved successfully.`,
        type: "success",
      });

      onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.add({
        title: "Save failed",
        description: err.message || "An error occurred.",
        type: "error",
      });
    }
  };

  const handleCopyBranchName = (e: React.MouseEvent, name?: string) => {
    e.stopPropagation();
    if (!name) return;
    navigator.clipboard.writeText(name);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.add({
      title: "Copied",
      description: "Branch name copied to clipboard.",
      type: "success",
    });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "completed":
        return { bg: "bg-emerald-500/10 text-emerald-600", icon: <CheckCircle2 className="h-4 w-4" /> };
      case "in_progress":
        return { bg: "bg-blue-500/10 text-blue-600 animate-pulse", icon: <Play className="h-3.5 w-3.5 fill-current ml-0.5" /> };
      case "blocked":
        return { bg: "bg-rose-500/10 text-rose-600", icon: <XCircle className="h-4 w-4" /> };
      case "on_hold":
      case "delayed":
        return { bg: "bg-amber-500/10 text-amber-600", icon: <Clock className="h-4 w-4" /> };
      default:
        return { bg: "bg-muted text-muted-foreground", icon: <HelpCircle className="h-4 w-4" /> };
    }
  };

  const stageColors = getStageColorConfig(colorTag);
  const statusStyle = getStatusStyle(storyStage.status);
  const isDelayed = storyStage.status === "delayed";

  return (
    <AccordionItem 
      value={storyStage._id} 
      id={`accordion-item-${storyStage._id}`}
      className={cn(
        "border rounded-xl bg-card overflow-hidden shadow-sm hover:border-primary/10 transition-colors",
        isDelayed ? "border-rose-200" : "border-border"
      )}
    >
      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/10 transition-colors text-foreground">
        <div className="flex items-center justify-between w-full gap-4 pr-2">
          <div className="flex items-center gap-3 text-left">
            <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs", statusStyle.bg)}>
              {statusStyle.icon}
            </div>
            <div>
              <h4 className="font-semibold text-foreground text-xs sm:text-sm flex items-center gap-2">
                {storyStage.taskName}
                <Badge className={cn("capitalize text-[9px] border-none bg-secondary/80", stageColors.text)}>
                  {colorTag}
                </Badge>
                {isDelayed && (
                  <Badge className="bg-rose-100 hover:bg-rose-100 text-rose-700 border-none font-bold text-[8px] py-0 px-1 flex items-center gap-0.5 uppercase shrink-0 animate-pulse">
                    Delayed
                  </Badge>
                )}
              </h4>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Developer: <span className="text-foreground font-semibold">{storyStage.developBy?.name || "Unassigned"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {storyStage.branchName && (
              <Badge 
                variant="outline" 
                onClick={(e) => handleCopyBranchName(e, storyStage.branchName)}
                className="font-mono text-[9px] bg-muted/40 cursor-pointer hover:bg-muted transition-colors inline-flex items-center gap-1"
              >
                <GitBranch className="h-3 w-3 text-muted-foreground" />
                {storyStage.branchName}
                {copied ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Clipboard className="h-2.5 w-2.5 text-muted-foreground/60" />}
              </Badge>
            )}
            {storyStage.prStatus && storyStage.prStatus !== "none" && (
              <Badge className={cn("text-[9px] font-bold border-none inline-flex items-center gap-1", 
                storyStage.prStatus === "merged" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
              )}>
                <GitPullRequest className="h-3 w-3" />
                PR {storyStage.prStatus}
              </Badge>
            )}
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="border-t border-border/50 bg-muted/5 p-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {/* ADO Child Link */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ADO Child Link / ID</Label>
              <Input 
                placeholder="https://dev.azure.com/..." 
                type="url"
                className="bg-card h-8.5 text-xs" 
                {...register("adoStoryLink")} 
              />
            </div>

            {/* Developer Dropdown restricted to Main Story users */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned Developer</Label>
              <select
                className="flex h-8.5 w-full rounded-md border border-input bg-card px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

            {/* Child Status */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Child Story Status</Label>
              <select
                className="flex h-8.5 w-full rounded-md border border-input bg-card px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register("status")}
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="completed">Completed</option>
                <option value="delayed">Delayed</option>
              </select>
            </div>

            {/* Git Branch name */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Git Branch Name</Label>
              <Input 
                placeholder="feature/oauth-integration" 
                className="bg-card h-8.5 text-xs font-mono" 
                {...register("branchName")} 
              />
            </div>

            {/* GitHub Repo */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GitHub Repo</Label>
              <Input 
                placeholder="org/repository-name" 
                className="bg-card h-8.5 text-xs" 
                {...register("githubRepo")} 
              />
            </div>

            {/* Git PR Status */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">PR Status</Label>
              <select
                className="flex h-8.5 w-full rounded-md border border-input bg-card px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register("prStatus")}
              >
                <option value="none">No Pull Request</option>
                <option value="pending">PR Pending (Open)</option>
                <option value="merged">PR Merged</option>
              </select>
            </div>

            {/* GitHub PR Link */}
            <div className="space-y-1.5 sm:col-span-2 md:col-span-3">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GitHub PR Link URL</Label>
              <Input 
                id={`pr-link-${storyStage._id}`}
                type="url"
                placeholder="https://github.com/org/repo/pull/123" 
                className="bg-card h-8.5 text-xs" 
                {...register("prLink")} 
              />
              {errors.prLink && <p className="text-[10px] text-destructive">{errors.prLink.message}</p>}
            </div>

            {/* Timelines */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Planned Start</Label>
              <Input type="date" className="bg-card h-8.5 text-xs" {...register("plannedStartDate")} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Planned End</Label>
              <Input type="date" className="bg-card h-8.5 text-xs" {...register("plannedEndDate")} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Actual Start</Label>
              <Input type="date" className="bg-card h-8.5 text-xs" {...register("actualStartDate")} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Actual End</Label>
              <Input type="date" className="bg-card h-8.5 text-xs" {...register("actualEndDate")} />
            </div>

            {/* Implementation details */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Implementation Description</Label>
              <Textarea 
                placeholder="Detail what technical steps/tasks were executed in this stage child story..."
                className="bg-card min-h-[85px] text-xs leading-relaxed" 
                {...register("implementationDescription")} 
              />
            </div>

            {/* Notes Logs */}
            <div className="space-y-1.5 sm:col-span-2 md:col-span-3">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notes & Logs</Label>
              <Textarea 
                placeholder="Log blockers, testing remarks, key notes..."
                className="bg-card min-h-[60px] text-xs" 
                {...register("notes")} 
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSubmitting} size="sm" className="cursor-pointer text-xs">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-4 w-4" />
                  Save Stage Story
                </>
              )}
            </Button>
          </div>
        </form>
      </AccordionContent>
    </AccordionItem>
  );
}

// Reorderable Stage Planner checklist Row
interface SortablePlannerRowProps {
  stage: { _id: string; name: string; colorTag: string; checked: boolean; isStarted: boolean };
  onToggle: (id: string) => void;
}

function SortablePlannerRow({ stage, onToggle }: SortablePlannerRowProps) {
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
        id={`planner-check-${stage._id}`}
        checked={stage.checked}
        disabled={stage.isStarted}
        onChange={() => onToggle(stage._id)}
        className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      />

      <label
        htmlFor={`planner-check-${stage._id}`}
        className={cn(
          "flex-1 text-xs font-semibold select-none cursor-pointer disabled:cursor-not-allowed",
          stage.isStarted ? "text-emerald-700" : stage.checked ? "text-foreground" : "text-muted-foreground/60 line-through"
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
