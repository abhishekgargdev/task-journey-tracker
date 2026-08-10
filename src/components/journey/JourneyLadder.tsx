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
  ChevronRight,
  Clipboard,
  Check,
  Edit2,
  User,
  ArrowRight,
  Settings,
  GripVertical,
  Loader2,
  Calendar,
} from "lucide-react";

import { cn } from "@/lib/utils";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

// Types
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
  adoStoryLink?: string;
  task: TaskItem;
  sprint: SprintItem;
  stagePlan: StagePlanEntry[];
  currentStageOrder: number;
  overallStatus: "not_started" | "in_progress" | "blocked" | "on_hold" | "completed";
  isOnHold: boolean;
  holdReason?: string;
  holdHistory: StoryHoldHistory[];
}

interface StoryStage {
  _id: string;
  story: string;
  stage: string; // ID string
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
  status: z.enum(["not_started", "in_progress", "blocked", "on_hold", "completed"]),
  githubRepo: z.string().optional(),
  branchName: z.string().optional(),
  prLink: z.string().url({ message: "Must be a valid URL." }).or(z.literal("")),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});

type StageEditFormValues = z.infer<typeof stageEditSchema>;

export default function JourneyLadder({ story, stages, onRefresh }: JourneyLadderProps) {
  const [selectedStage, setSelectedStage] = useState<StoryStage | null>(null);
  const [stageDetailsOpen, setStageDetailsOpen] = useState(false);
  const [isEditingStage, setIsEditingStage] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [copiedText, setCopiedText] = useState(false);

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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StageEditFormValues>({
    resolver: zodResolver(stageEditSchema),
  });

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleNodeClick = (storyStage: StoryStage) => {
    setSelectedStage(storyStage);
    setIsEditingStage(false);
    
    // Format dates to YYYY-MM-DD for input fields
    const formatDate = (dateStr?: string) => {
      if (!dateStr) return "";
      return new Date(dateStr).toISOString().split("T")[0];
    };

    reset({
      plannedStartDate: formatDate(storyStage.plannedStartDate),
      plannedEndDate: formatDate(storyStage.plannedEndDate),
      actualStartDate: formatDate(storyStage.actualStartDate),
      actualEndDate: formatDate(storyStage.actualEndDate),
      status: storyStage.status,
      githubRepo: storyStage.githubRepo || "",
      branchName: storyStage.branchName || "",
      prLink: storyStage.prLink || "",
      assignedTo: storyStage.assignedTo?._id || "",
      notes: storyStage.notes || "",
    });

    setStageDetailsOpen(true);
  };

  const handleCopyBranch = (branchName?: string) => {
    if (!branchName) return;
    navigator.clipboard.writeText(branchName);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
    toast.add({
      title: "Copied",
      description: "Branch name copied to clipboard.",
      type: "success",
    });
  };

  const handleStageEditSubmit = async (values: StageEditFormValues) => {
    if (!selectedStage) return;
    try {
      const formatted = {
        ...values,
        plannedStartDate: values.plannedStartDate ? new Date(values.plannedStartDate).toISOString() : null,
        plannedEndDate: values.plannedEndDate ? new Date(values.plannedEndDate).toISOString() : null,
        actualStartDate: values.actualStartDate ? new Date(values.actualStartDate).toISOString() : null,
        actualEndDate: values.actualEndDate ? new Date(values.actualEndDate).toISOString() : null,
        assignedTo: values.assignedTo || null,
      };

      const res = await fetch(`/api/stories/${story._id}/stages/${selectedStage.stage}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formatted),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update stage details.");
      }

      toast.add({
        title: "Stage details saved",
        description: "Story stage has been updated.",
        type: "success",
      });

      setStageDetailsOpen(false);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.add({
        title: "Update failed",
        description: err.message || "An error occurred.",
        type: "error",
      });
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

      const nextStageEntry = story.stagePlan.find(sp => sp.order === story.currentStageOrder + 1);
      const nextStageName = nextStageEntry?.stage?.name || "Go Live";

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
    if (story.isOnHold) {
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
      const existingPlanIds = story.stagePlan.map((sp: any) => sp.stage._id);

      const plannerList = activeStages.map((stage: any) => {
        const matchedStage = stages.find((s: any) => s.stage === stage._id);
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

      // Sort: place completed/started stages at the top in their current stagePlan order
      const startedInOrder = story.stagePlan
        .filter((sp: any) => {
          const matchedStage = stages.find((s: any) => s.stage === sp.stage._id);
          return matchedStage ? matchedStage.status !== "not_started" : false;
        })
        .map((sp: any) => sp.stage._id);

      const sortedPlanner = [
        ...plannerList.filter((s: any) => startedInOrder.includes(s._id)).sort((a: any, b: any) => startedInOrder.indexOf(a._id) - startedInOrder.indexOf(b._id)),
        ...plannerList.filter((s: any) => !startedInOrder.includes(s._id)),
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
        return {
          bg: "bg-amber-500 border-amber-500 text-white shadow-amber-500/20 hold-stripes",
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

  // Date delta badge calculator
  const getDeltaBadge = (plannedStr?: string, actualStr?: string) => {
    if (!plannedStr) return null;
    const planned = new Date(plannedStr);
    const actual = actualStr ? new Date(actualStr) : new Date();

    // calculate difference in days
    const diffTime = actual.getTime() - planned.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return (
        <Badge className="bg-rose-500/10 text-rose-600 border-none font-bold text-[10px]">
          {diffDays} {diffDays === 1 ? "day" : "days"} late
        </Badge>
      );
    } else if (diffDays < 0) {
      const earlyDays = Math.abs(diffDays);
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-bold text-[10px]">
          {earlyDays} {earlyDays === 1 ? "day" : "days"} early
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-blue-500/10 text-blue-600 border-none font-bold text-[10px]">
          On time
        </Badge>
      );
    }
  };

  // Math helper
  const totalStagesCount = story.stagePlan.length;
  const completedStagesCount = story.overallStatus === "completed" 
    ? totalStagesCount 
    : Math.max(0, story.currentStageOrder - 1);
  const progressRatio = totalStagesCount > 1 
    ? (completedStagesCount / (totalStagesCount - 1)) * 100 
    : 100;

  const nextStage = story.stagePlan.find(sp => sp.order === story.currentStageOrder);
  const nextStageName = nextStage?.stage?.name || "Go Live";

  return (
    <div className="space-y-6">
      {/* Banner Hold Banner */}
      <AnimatePresence>
        {story.isOnHold && (
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
            <h3 className="text-lg font-bold text-foreground">
              {completedStagesCount} of {totalStagesCount} stages complete
            </h3>
            <Badge className="bg-primary/10 text-primary border-none font-bold py-0.5">
              {Math.round((completedStagesCount / totalStagesCount) * 100)}%
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={openPlanEditor}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <Settings className="h-4 w-4" />
            Edit Stage Plan
          </Button>

          <Button
            onClick={handleHoldToggle}
            variant={story.isOnHold ? "default" : "outline"}
            size="sm"
            className="cursor-pointer"
          >
            {story.isOnHold ? "Resume" : "Place on Hold"}
          </Button>

          <Button
            onClick={handleAdvance}
            disabled={story.isOnHold || story.overallStatus === "completed" || advanceLoading}
            size="sm"
            className="flex items-center gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
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
        <CardContent className="p-8 md:p-12 relative flex flex-col md:flex-row justify-between items-center gap-12 md:gap-4 overflow-visible min-h-[300px]">
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
          {story.stagePlan.map((plan, index) => {
            const stageDef = plan.stage;
            // Find corresponding StoryStage values
            const stageVal = stages.find((s) => s.stage === stageDef._id) || {
              status: "not_started",
              plannedStartDate: "",
              plannedEndDate: "",
              actualStartDate: "",
              actualEndDate: "",
            } as StoryStage;

            const aes = getNodeAesthetics(stageVal.status);

            return (
              <motion.div
                key={stageDef._id}
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
                    `hover:ring-4 hover:ring-${stageDef.colorTag}-500/20 group-hover:scale-105`
                  )}
                >
                  {aes.icon}
                </div>

                {/* Node Text info */}
                <div className="space-y-0.5">
                  <h4 className={cn("text-xs font-semibold tracking-tight transition-colors", aes.labelColor)}>
                    {stageDef.name}
                  </h4>
                  {/* Subtle colorTag dot accent indicator */}
                  <div className="flex items-center justify-center gap-1">
                    <span className={cn("h-1.5 w-1.5 rounded-full", `bg-${stageDef.colorTag}-500`)} />
                    <span className="text-[9px] uppercase font-bold text-muted-foreground/60">{stageDef.colorTag}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>

      {/* Stage Details Popover Sheet */}
      <Sheet open={stageDetailsOpen} onOpenChange={setStageDetailsOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-3 border-b border-border">
            <SheetTitle className="text-lg font-bold font-sans flex items-center gap-2">
              {selectedStage ? story.stagePlan.find(sp => sp.stage._id === selectedStage.stage)?.stage?.name : "Stage Details"}
            </SheetTitle>
            <SheetDescription>
              View planning sequences and commit links for this delivery stage.
            </SheetDescription>
          </SheetHeader>

          {selectedStage && (
            <div className="py-4 space-y-4">
              {!isEditingStage ? (
                // View Mode
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Planned dates */}
                    <div className="rounded-lg border border-border p-3 space-y-1 bg-muted/10">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Planned Timeline</span>
                      <p className="text-xs font-medium text-foreground">
                        {selectedStage.plannedStartDate ? new Date(selectedStage.plannedStartDate).toLocaleDateString() : "--"} to{" "}
                        {selectedStage.plannedEndDate ? new Date(selectedStage.plannedEndDate).toLocaleDateString() : "--"}
                      </p>
                    </div>

                    {/* Actual dates */}
                    <div className="rounded-lg border border-border p-3 space-y-1 bg-muted/10">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Actual Timeline</span>
                        {getDeltaBadge(selectedStage.plannedEndDate, selectedStage.actualEndDate)}
                      </div>
                      <p className="text-xs font-medium text-foreground">
                        {selectedStage.actualStartDate ? new Date(selectedStage.actualStartDate).toLocaleDateString() : "--"} to{" "}
                        {selectedStage.actualEndDate ? new Date(selectedStage.actualEndDate).toLocaleDateString() : "--"}
                      </p>
                    </div>
                  </div>

                  {/* Git branch and repo */}
                  <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/10">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Code Repository details</span>
                    <div className="grid gap-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">GitHub Repo:</span>
                        <span className="font-semibold text-foreground">{selectedStage.githubRepo || "None"}</span>
                      </div>
                      {selectedStage.branchName && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Branch:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-foreground font-semibold bg-secondary px-1.5 py-0.5 rounded">{selectedStage.branchName}</span>
                            <button
                              onClick={() => handleCopyBranch(selectedStage.branchName)}
                              className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer border-none bg-transparent"
                              title="Copy branch name"
                            >
                              <Clipboard className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                      {selectedStage.prLink && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Pull Request:</span>
                          <a href={selectedStage.prLink} target="_blank" rel="noreferrer" className="text-primary font-semibold hover:underline inline-flex items-center gap-1">
                            View PR
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assignee and notes */}
                  <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/10">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Assignment</span>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {selectedStage.assignedTo?.name ? selectedStage.assignedTo.name.split(" ").map(n=>n[0]).join("") : "?"}
                      </div>
                      <div className="text-xs">
                        <p className="font-semibold text-foreground">{selectedStage.assignedTo?.name || "Unassigned"}</p>
                        <p className="text-muted-foreground text-[10px]">{selectedStage.assignedTo?.email || ""}</p>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="rounded-lg border border-border p-3 space-y-1.5 bg-muted/10">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Notes</span>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                      {selectedStage.notes || <span className="italic opacity-60">No notes provided for this stage.</span>}
                    </p>
                  </div>

                  <Button onClick={() => setIsEditingStage(true)} className="w-full cursor-pointer flex items-center justify-center gap-1.5">
                    <Edit2 className="h-4 w-4" />
                    Edit Stage Details
                  </Button>
                </div>
              ) : (
                // Edit Mode
                <form onSubmit={handleSubmit(handleStageEditSubmit)} className="space-y-4 pt-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="plannedStartDate" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Planned Start</Label>
                      <Input id="plannedStartDate" type="date" className="bg-card h-8 text-xs" {...register("plannedStartDate")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="plannedEndDate" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Planned End</Label>
                      <Input id="plannedEndDate" type="date" className="bg-card h-8 text-xs" {...register("plannedEndDate")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="actualStartDate" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Actual Start</Label>
                      <Input id="actualStartDate" type="date" className="bg-card h-8 text-xs" {...register("actualStartDate")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="actualEndDate" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Actual End</Label>
                      <Input id="actualEndDate" type="date" className="bg-card h-8 text-xs" {...register("actualEndDate")} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="status-select" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stage Status</Label>
                    <select
                      id="status-select"
                      className="flex h-8 w-full rounded-md border border-input bg-card px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      {...register("status")}
                    >
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="blocked">Blocked</option>
                      <option value="on_hold">On Hold</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="assignee-select" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned Developer</Label>
                    <select
                      id="assignee-select"
                      className="flex h-8 w-full rounded-md border border-input bg-card px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="githubRepo" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GitHub Repo</Label>
                      <Input id="githubRepo" placeholder="org/repo" className="bg-card h-8 text-xs" {...register("githubRepo")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="branchName" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Branch Name</Label>
                      <Input id="branchName" placeholder="feature/oauth" className="bg-card h-8 text-xs" {...register("branchName")} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="prLink" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">PR Link URL</Label>
                    <Input id="prLink" type="url" placeholder="https://github.com/..." className="bg-card h-8 text-xs" {...register("prLink")} />
                    {errors.prLink && <p className="text-[10px] text-destructive">{errors.prLink.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notes-area" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notes & Logs</Label>
                    <Textarea id="notes-area" placeholder="Enter logs, progress remarks, block blockers..." className="bg-card min-h-[70px] text-xs" {...register("notes")} />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsEditingStage(false)} className="flex-1 cursor-pointer">
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={isSubmitting} className="flex-1 cursor-pointer">
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

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
              className="bg-card"
            />
          </div>
          <DialogFooter className="pt-2" showCloseButton={true}>
            <Button variant="outline" onClick={() => setHoldOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submitHold}
              disabled={holdReason.trim().length < 2 || holdLoading}
              className="cursor-pointer"
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
            <Button variant="outline" onClick={() => setPlanOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button onClick={submitStagePlanMutation} className="cursor-pointer">
              Save Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
    zIndex: isDragging ? 30 : 1,
    position: "relative" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg border p-2 bg-card hover:bg-muted/40 transition-colors",
        stage.isStarted ? "border-emerald-200 bg-emerald-50/10 hover:bg-emerald-50/10 opacity-90" : "border-border",
        isDragging && "shadow-md bg-accent/80 border-primary/20 opacity-80 z-50 select-none"
      )}
    >
      {/* Hide drag handle if stage has already started to enforce sequence lock */}
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
          <Check className="h-4 w-4 stroke-[3px]" />
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
        <Badge className={`capitalize text-[9px] font-bold border-none bg-secondary/80 text-${stage.colorTag}-600`}>
          {stage.colorTag}
        </Badge>
      )}
    </div>
  );
}
