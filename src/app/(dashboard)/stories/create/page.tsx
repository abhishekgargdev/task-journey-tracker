"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  ArrowLeft,
  Loader2,
  Plus,
  GripVertical,
  UserPlus,
  FolderPlus,
  Calendar,
  Save,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion } from "@/components/ui/accordion";
import { getStageColorConfig } from "@/lib/stage-colors";
import { cn } from "@/lib/utils";
import { ChildStoryAccordionItem } from "@/components/journey/JourneyLadder";

// Validation schema for Story Creation
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

interface PlannerStage {
  _id: string;
  name: string;
  colorTag: string;
  checked: boolean;
}

interface StageDetails {
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  developBy?: string;
  status: "not_started" | "in_progress" | "blocked" | "completed" | "delayed";
  description?: string;
  branchName?: string;
  githubRepo?: string;
  prStatus?: "none" | "pending" | "merged";
  githubPrLink?: string;
  notes?: string;
  implementationDescription?: string;
  adoStoryLink?: string;
}

export default function CreateStoryPage() {
  const router = useRouter();

  // Core Data Lists
  const [users, setUsers] = useState<DbUser[]>([]);
  const [plannerStages, setPlannerStages] = useState<PlannerStage[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Checked user IDs
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  // Accordion expanded state in creation form
  const [expandedItems, setExpandedItems] = useState<any[]>([]);

  // Child Stage Custom Settings State (key is stageId)
  const [childStageDetails, setChildStageDetails] = useState<Record<string, StageDetails>>({});

  // Dialog Controls
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [addStageOpen, setAddStageOpen] = useState(false);
  
  // Custom dialog to confirm removing stage with entered details
  const [stageToRemove, setStageToRemove] = useState<{ id: string; name: string } | null>(null);

  // Inline forms state
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [addingUser, setAddingUser] = useState(false);

  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("slate");
  const [addingStage, setAddingStage] = useState(false);

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
    watch,
    formState: { errors },
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

  // Watch main dates and story number
  const parentStoryNumber = watch("storyNumber");
  const parentStartDate = watch("plannedStartDate");
  const parentEndDate = watch("plannedEndDate");

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch users
      const usersRes = await fetch("/api/users");
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        // Fallback checks for legacy users missing status property
        setUsers(usersData.filter((u: DbUser) => u.status !== "inactive"));
      }

      // Fetch active stages catalog
      const stagesRes = await fetch("/api/stages?active=true");
      if (stagesRes.ok) {
        const stagesData = await stagesRes.json();
        const mapped = stagesData.map((stage: any) => ({
          _id: stage._id,
          name: stage.name,
          colorTag: stage.colorTag,
          checked: true,
        }));
        setPlannerStages(mapped);
      }
    } catch (err: any) {
      console.error(err);
      toast.add({
        title: "Initialization error",
        description: "Failed to load active users or stages.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const hasCustomData = (stageId: string) => {
    const details = childStageDetails[stageId];
    if (!details) return false;

    if (details.adoStoryLink?.trim()) return true;
    if (details.developBy) return true;
    if (details.status && details.status !== "not_started") return true;
    if (details.branchName?.trim()) return true;
    if (details.githubRepo?.trim()) return true;
    if (details.prStatus && details.prStatus !== "none") return true;
    if (details.githubPrLink?.trim()) return true;
    if (details.notes?.trim()) return true;
    if (details.implementationDescription?.trim()) return true;

    if (details.plannedStartDate && details.plannedStartDate !== parentStartDate) return true;
    if (details.plannedEndDate && details.plannedEndDate !== parentEndDate) return true;
    if (details.actualStartDate || details.actualEndDate) return true;

    return false;
  };

  const handleToggleStageCheck = (id: string) => {
    const stage = plannerStages.find(s => s._id === id);
    if (!stage) return;

    if (stage.checked) {
      if (hasCustomData(id)) {
        setStageToRemove({ id, name: stage.name });
        return;
      }
      
      // Clean up child details and uncheck immediately
      setChildStageDetails(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setPlannerStages((prev) =>
        prev.map((s) => (s._id === id ? { ...s, checked: false } : s))
      );
    } else {
      // Checking stage
      setPlannerStages((prev) =>
        prev.map((s) => (s._id === id ? { ...s, checked: true } : s))
      );
      setExpandedItems([id]);
    }
  };

  const confirmRemoveStage = () => {
    if (!stageToRemove) return;
    const { id } = stageToRemove;

    setChildStageDetails(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    setPlannerStages((prev) =>
      prev.map((s) => (s._id === id ? { ...s, checked: false } : s))
    );

    setStageToRemove(null);
  };

  const handleToggleUserCheck = (id: string) => {
    setSelectedUserIds((prev) => {
      const next = prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id];
      // If a user is removed, remove them from any pre-assigned child stages
      if (prev.includes(id)) {
        setChildStageDetails((details) => {
          const updated = { ...details };
          Object.keys(updated).forEach((stageId) => {
            if (updated[stageId].developBy === id) {
              updated[stageId] = { ...updated[stageId], developBy: "" };
            }
          });
          return updated;
        });
      }
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = plannerStages.findIndex((s) => s._id === active.id);
    const newIndex = plannerStages.findIndex((s) => s._id === over.id);

    setPlannerStages((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  const updateStageDetail = useCallback((stageId: string, details: StageDetails) => {
    setChildStageDetails((prev) => {
      const prevDetails = prev[stageId];
      if (
        prevDetails &&
        prevDetails.adoStoryLink === details.adoStoryLink &&
        prevDetails.developBy === details.developBy &&
        prevDetails.status === details.status &&
        prevDetails.branchName === details.branchName &&
        prevDetails.githubRepo === details.githubRepo &&
        prevDetails.prStatus === details.prStatus &&
        prevDetails.githubPrLink === details.githubPrLink &&
        prevDetails.plannedStartDate === details.plannedStartDate &&
        prevDetails.plannedEndDate === details.plannedEndDate &&
        prevDetails.actualStartDate === details.actualStartDate &&
        prevDetails.actualEndDate === details.actualEndDate &&
        prevDetails.implementationDescription === details.implementationDescription &&
        prevDetails.notes === details.notes
      ) {
        return prev;
      }
      return {
        ...prev,
        [stageId]: details,
      };
    });
  }, []);

  // Add new User to database directly
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim().includes("@")) {
      toast.add({
        title: "Validation error",
        description: "Please enter a valid developer name and corporate email address.",
        type: "warning",
      });
      return;
    }

    try {
      setAddingUser(true);
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim().toLowerCase(),
          password: "TempPassword@123", // default password
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user.");

      toast.add({
        title: "Developer created",
        description: `"${newUserName}" has been added and automatically assigned to this story.`,
        type: "success",
      });

      // Update local state: append and check
      const createdUser: DbUser = {
        _id: data._id,
        name: data.name,
        email: data.email,
        status: "active",
      };
      setUsers((prev) => [...prev, createdUser].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedUserIds((prev) => [...prev, data._id]);

      // Reset form & close
      setNewUserName("");
      setNewUserEmail("");
      setAddUserOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.add({
        title: "Creation failed",
        description: err.message || "Could not register developer.",
        type: "error",
      });
    } finally {
      setAddingUser(false);
    }
  };

  // Add new Stage to database directly
  const handleAddStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) {
      toast.add({
        title: "Validation error",
        description: "Stage name is required.",
        type: "warning",
      });
      return;
    }

    try {
      setAddingStage(true);
      const res = await fetch("/api/stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStageName.trim(),
          colorTag: newStageColor,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create catalog stage.");

      toast.add({
        title: "Catalog Stage created",
        description: `"${newStageName}" has been created and automatically selected.`,
        type: "success",
      });

      // Update local state: append and check
      const createdStage: PlannerStage = {
        _id: data._id,
        name: data.name,
        colorTag: data.colorTag,
        checked: true,
      };
      setPlannerStages((prev) => [...prev, createdStage]);

      // Reset form & close
      setNewStageName("");
      setNewStageColor("slate");
      setAddStageOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.add({
        title: "Creation failed",
        description: err.message || "Could not append catalog stage.",
        type: "error",
      });
    } finally {
      setAddingStage(false);
    }
  };

  const handleFormSubmit = async (values: StoryFormValues) => {
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

    // Prepare child stages array with preconfigured details
    const stagesDetails = selectedStagePlanIds.map((stageId) => {
      const details = childStageDetails[stageId] || { status: "not_started" };
      return {
        stageId,
        plannedStartDate: details.plannedStartDate || values.plannedStartDate,
        plannedEndDate: details.plannedEndDate || values.plannedEndDate,
        actualStartDate: details.actualStartDate || null,
        actualEndDate: details.actualEndDate || null,
        developBy: details.developBy || null,
        status: details.status || "not_started",
        description: details.implementationDescription || `Deliverable stage for ${plannerStages.find(s => s._id === stageId)?.name || "Stage"}`,
        branchName: details.branchName || "",
        githubRepo: details.githubRepo || "",
        githubPrLink: details.githubPrLink || "",
        prStatus: details.prStatus || "none",
        notes: details.notes || "",
        adoStoryLink: details.adoStoryLink || "",
      };
    });

    // Sub-stage dates validation
    for (const detail of stagesDetails) {
      if (detail.plannedStartDate && detail.plannedEndDate) {
        const sDate = new Date(detail.plannedStartDate);
        const eDate = new Date(detail.plannedEndDate);
        if (eDate < sDate) {
          const stageName = plannerStages.find(s => s._id === detail.stageId)?.name || "Stage";
          toast.add({
            title: "Validation error",
            description: `Child stage "${stageName}" planned end date cannot be before planned start date.`,
            type: "warning",
          });
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        ...values,
        stageOrder: selectedStagePlanIds,
        userIds: selectedUserIds,
        stagesDetails,
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
        description: `Story #${values.storyNumber} has been successfully created.`,
        type: "success",
      });

      router.push("/stories");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.add({
        title: "Failed to create story",
        description: err.message || "An unexpected error occurred.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedUsers = users.filter((u) => selectedUserIds.includes(u._id));
  const checkedStages = plannerStages.filter((s) => s.checked);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/stories" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Stories Workspace
      </Link>

      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground font-sans">
          Create Main Story
        </h2>
        <p className="text-sm text-muted-foreground">
          Define delivery credentials, select team members, and sequence the custom pipeline stages.
        </p>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <div className="grid gap-6 lg:grid-cols-3 items-start">
          {/* Left Column - Main Details & Accordion Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Story Details Card */}
            <Card className="border-border shadow-md bg-card">
              <CardHeader className="border-b border-border bg-muted/10">
                <CardTitle className="text-base font-semibold">Story Details</CardTitle>
                <CardDescription>Primary story scopes and dates settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Story Number */}
                  <div className="space-y-1.5">
                    <Label htmlFor="storyNumber" className="font-semibold text-xs">Story Number</Label>
                    <Input
                      id="storyNumber"
                      placeholder="e.g. 55104"
                      className="bg-card h-9 text-xs font-mono"
                      {...register("storyNumber")}
                    />
                    {errors.storyNumber && (
                      <p className="text-[10px] text-destructive font-semibold">{errors.storyNumber.message}</p>
                    )}
                  </div>

                  {/* Story Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="taskName" className="font-semibold text-xs">Story Name / Task Name</Label>
                    <Input
                      id="taskName"
                      placeholder="e.g. Implement Tokenized Pay Gateways"
                      className="bg-card h-9 text-xs"
                      {...register("taskName")}
                    />
                    {errors.taskName && (
                      <p className="text-[10px] text-destructive font-semibold">{errors.taskName.message}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="description" className="font-semibold text-xs">Description / Scope Overview</Label>
                    <Textarea
                      id="description"
                      placeholder="Provide overview details or links to ADO ticket description..."
                      className="bg-card min-h-[100px] text-xs leading-normal"
                      {...register("description")}
                    />
                  </div>

                  {/* Dates */}
                  <div className="space-y-1.5">
                    <Label htmlFor="plannedStartDate" className="font-semibold text-xs">Planned Start Date</Label>
                    <div className="relative">
                      <Input
                        id="plannedStartDate"
                        type="date"
                        className="bg-card h-9 text-xs pl-8"
                        {...register("plannedStartDate")}
                      />
                      <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/75" />
                    </div>
                    {errors.plannedStartDate && (
                      <p className="text-[10px] text-destructive font-semibold">{errors.plannedStartDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="plannedEndDate" className="font-semibold text-xs">Planned End Date</Label>
                    <div className="relative">
                      <Input
                        id="plannedEndDate"
                        type="date"
                        className="bg-card h-9 text-xs pl-8"
                        {...register("plannedEndDate")}
                      />
                      <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/75" />
                    </div>
                    {errors.plannedEndDate && (
                      <p className="text-[10px] text-destructive font-semibold">{errors.plannedEndDate.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reusable Accordion Editor */}
            <Card className="border-border shadow-md bg-card">
              <CardHeader className="border-b border-border bg-muted/10 pb-3">
                <CardTitle className="text-base font-semibold">Child Stories (Stage-wise Deliverables)</CardTitle>
                <CardDescription>
                  Configure developers, timelines, and details dynamically based on your selected pipeline stages.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {checkedStages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground gap-2">
                    <Info className="h-5 w-5 text-muted-foreground/80 animate-pulse" />
                    <p>No stages selected in the Stage Sequencer checklist on the right.</p>
                  </div>
                ) : (
                  <Accordion
                    value={expandedItems}
                    onValueChange={setExpandedItems}
                    className="w-full space-y-3"
                  >
                    {checkedStages.map((stage) => {
                      const details = childStageDetails[stage._id] || {};
                      
                      // Map parent values as fallback inside draft accordion values
                      const mockStageStory = {
                        _id: stage._id,
                        stageId: stage._id,
                        taskName: `#${parentStoryNumber || "e.g."} - ${stage.name}`,
                        status: details.status || "not_started",
                        plannedStartDate: details.plannedStartDate || parentStartDate || "",
                        plannedEndDate: details.plannedEndDate || parentEndDate || "",
                        actualStartDate: details.actualStartDate || "",
                        actualEndDate: details.actualEndDate || "",
                        githubRepo: details.githubRepo || "",
                        branchName: details.branchName || "",
                        githubPrLink: details.githubPrLink || "",
                        prStatus: details.prStatus || "none",
                        developBy: users.find(u => u._id === details.developBy) || null,
                        notes: details.notes || "",
                        implementationDescription: details.implementationDescription || "",
                        adoStoryLink: details.adoStoryLink || "",
                      };

                      return (
                        <ChildStoryAccordionItem
                          key={stage._id}
                          storyStage={mockStageStory}
                          stageName={stage.name}
                          colorTag={stage.colorTag}
                          storyId="new-story-id"
                          users={selectedUsers} // sync members directly
                          mode="create"
                          onChangeDetails={(stageId, updatedDetails) => updateStageDetail(stageId, updatedDetails)}
                        />
                      );
                    })}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Team Selection & Stepper Sequencer */}
          <div className="space-y-6">
            {/* Story Members Card */}
            <Card className="border-border shadow-md bg-card">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/10 pb-3">
                <div>
                  <CardTitle className="text-base font-semibold">Assign Story Members</CardTitle>
                  <CardDescription className="text-[10px]">Assigned developers for child deliverables.</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setAddUserOpen(true)}
                  className="cursor-pointer text-[10px] h-7 px-2.5"
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Add User
                </Button>
              </CardHeader>
              <CardContent className="pt-4">
                {users.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-6">No active users in database.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {users.map((user) => {
                      const isChecked = selectedUserIds.includes(user._id);
                      return (
                        <div
                          key={user._id}
                          onClick={() => handleToggleUserCheck(user._id)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg border p-2 bg-card cursor-pointer hover:bg-muted/40 transition-colors select-none",
                            isChecked ? "border-primary/40 bg-primary/5" : "border-border"
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
                )}
              </CardContent>
            </Card>

            {/* Stepper Sequencer Card */}
            <Card className="border-border shadow-md bg-card">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/10 pb-3">
                <div>
                  <CardTitle className="text-base font-semibold">Stage Sequencer</CardTitle>
                  <CardDescription className="text-[10px]">Drag to order the pipeline flow.</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setAddStageOpen(true)}
                  className="cursor-pointer text-[10px] h-7 px-2.5"
                >
                  <FolderPlus className="h-3 w-3 mr-1" />
                  Add Stage
                </Button>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
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
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/stories")}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Saving Story...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-4 w-4" />
                Create Main Story
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Dialog: Confirm Remove Stage */}
      <Dialog open={stageToRemove !== null} onOpenChange={(open) => !open && setStageToRemove(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove {stageToRemove?.name}?</DialogTitle>
            <DialogDescription>
              Any information entered for this stage will be removed from this draft.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2" showCloseButton={true}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStageToRemove(null)}
              className="cursor-pointer text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmRemoveStage}
              className="cursor-pointer text-xs bg-rose-600 hover:bg-rose-700 text-white border-none rounded px-3 py-1.5 font-semibold"
            >
              Remove Stage
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>

      {/* Dialog: Add New User */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddUserSubmit}>
            <DialogHeader>
              <DialogTitle>Add New Developer</DialogTitle>
              <DialogDescription>
                Create a new developer account. It will be added to the active directory and automatically selected.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-user-name">Developer Full Name</Label>
                <Input
                  id="new-user-name"
                  placeholder="e.g. John Doe"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="bg-card text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-user-email">Corporate Email Address</Label>
                <Input
                  id="new-user-email"
                  type="email"
                  placeholder="e.g. john.doe@company.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="bg-card text-xs"
                  required
                />
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                Note: A default password "TempPassword@123" will be assigned. Users can update this in Profile Settings.
              </p>
            </div>
            <DialogFooter className="pt-2" showCloseButton={true}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddUserOpen(false)}
                className="cursor-pointer text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addingUser}
                className="cursor-pointer text-xs"
              >
                {addingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register Developer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Add New Stage */}
      <Dialog open={addStageOpen} onOpenChange={setAddStageOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddStageSubmit}>
            <DialogHeader>
              <DialogTitle>Create Custom Catalog Stage</DialogTitle>
              <DialogDescription>
                Define a new deliverable stage. It will be added to the catalog and automatically selected.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-stage-name">Stage Name</Label>
                <Input
                  id="new-stage-name"
                  placeholder="e.g. Integration Testing"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  className="bg-card text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-stage-color">Color Accent Tag</Label>
                <select
                  id="new-stage-color"
                  value={newStageColor}
                  onChange={(e) => setNewStageColor(e.target.value)}
                  className="flex h-8.5 w-full rounded-md border border-input bg-card px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="slate">Slate</option>
                  <option value="gray">Gray</option>
                  <option value="zinc">Zinc</option>
                  <option value="orange">Orange</option>
                  <option value="amber">Amber</option>
                  <option value="yellow">Yellow</option>
                  <option value="emerald">Emerald</option>
                  <option value="teal">Teal</option>
                  <option value="cyan">Cyan</option>
                  <option value="sky">Sky</option>
                  <option value="blue">Blue</option>
                  <option value="indigo">Indigo</option>
                  <option value="violet">Violet</option>
                  <option value="rose">Rose</option>
                </select>
              </div>
            </div>
            <DialogFooter className="pt-2" showCloseButton={true}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddStageOpen(false)}
                className="cursor-pointer text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addingStage}
                className="cursor-pointer text-xs"
              >
                {addingStage ? <Loader2 className="h-4 w-4 animate-spin" /> : "Append Stage"}
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
