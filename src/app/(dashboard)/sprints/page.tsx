"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import {
  Plus,
  Calendar as CalendarIcon,
  Loader2,
  AlertTriangle,
  Milestone,
  BookOpen,
  PauseCircle,
  PlayCircle,
  Eye,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmptyState from "@/components/shared/EmptyState";
import SprintStatusBadge from "@/components/shared/SprintStatusBadge";
import AnimatedCard from "@/components/shared/AnimatedCard";
import StaggerGrid from "@/components/shared/StaggerGrid";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";

interface SprintItem {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "active" | "hold" | "completed";
  holdHistory: unknown[];
}

interface StoryRef {
  _id: string;
  sprint: string | { _id: string };
}

const sprintFormSchema = z
  .object({
    name: z.string().min(2, { message: "Sprint name must be at least 2 characters." }),
    startDate: z.date({ error: "Start date is required." }),
    endDate: z.date({ error: "End date is required." }),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after start date.",
    path: ["endDate"],
  });

type SprintFormValues = z.infer<typeof sprintFormSchema>;

function DatePickerField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value?: Date;
  onChange: (date: Date | undefined) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm transition-colors",
            "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            !value && "text-muted-foreground"
          )}
        >
          <span>{value ? format(value, "PPP") : "Pick a date"}</span>
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
    </div>
  );
}

export default function SprintsPage() {
  const router = useRouter();
  const [sprints, setSprints] = useState<SprintItem[]>([]);
  const [stories, setStories] = useState<StoryRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const [holdOpen, setHoldOpen] = useState(false);
  const [targetSprintId, setTargetSprintId] = useState<string | null>(null);
  const [holdReason, setHoldReason] = useState("");
  const [holdLoading, setHoldLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SprintFormValues>({
    resolver: zodResolver(sprintFormSchema),
    defaultValues: {
      name: "",
      startDate: undefined,
      endDate: undefined,
    },
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sprintsRes, storiesRes] = await Promise.all([
        fetch("/api/sprints"),
        fetch("/api/stories"),
      ]);

      if (!sprintsRes.ok) throw new Error("Failed to load sprints.");
      const sprintsData = await sprintsRes.json();
      setSprints(sprintsData);

      if (storiesRes.ok) {
        const storiesData = await storiesRes.json();
        setStories(storiesData);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.add({
        title: "Error loading sprints",
        description: message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStoryCount = (sprintId: string) =>
    stories.filter((s) => {
      const sprintRef = s.sprint;
      const id = typeof sprintRef === "object" ? sprintRef?._id : sprintRef;
      return id === sprintId;
    }).length;

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${endDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  };

  const openCreateDialog = () => {
    reset({ name: "", startDate: undefined, endDate: undefined });
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: SprintFormValues) => {
    try {
      const res = await fetch("/api/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          startDate: values.startDate.toISOString(),
          endDate: values.endDate.toISOString(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create sprint.");
      }

      toast.add({
        title: "Sprint created",
        description: `Sprint "${values.name}" has been saved.`,
        type: "success",
      });

      setFormOpen(false);
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.add({
        title: "Failed to create sprint",
        description: message,
        type: "error",
      });
    }
  };

  const handleHoldToggle = async (sprint: SprintItem) => {
    if (sprint.status === "hold") {
      try {
        setHoldLoading(true);
        const res = await fetch(`/api/sprints/${sprint._id}/resume`, { method: "POST" });
        if (!res.ok) throw new Error("Failed to resume sprint.");
        toast.add({
          title: "Sprint resumed",
          description: `Sprint "${sprint.name}" is now active.`,
          type: "success",
        });
        fetchData();
        router.refresh();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred.";
        toast.add({ title: "Resume failed", description: message, type: "error" });
      } finally {
        setHoldLoading(false);
      }
    } else {
      setTargetSprintId(sprint._id);
      setHoldReason("");
      setHoldOpen(true);
    }
  };

  const submitHold = async () => {
    if (!targetSprintId) return;
    try {
      setHoldLoading(true);
      const res = await fetch(`/api/sprints/${targetSprintId}/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: holdReason }),
      });

      if (!res.ok) throw new Error("Failed to hold sprint.");

      toast.add({
        title: "Sprint placed on hold",
        description: "Target sprint is now suspended.",
        type: "warning",
      });

      setHoldOpen(false);
      fetchData();
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.add({ title: "Hold failed", description: message, type: "error" });
    } finally {
      setHoldLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground font-sans">
            Sprints Planning
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage time-boxed sprints, track hold history, and view linked user stories.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-1.5 self-start cursor-pointer">
          <Plus className="h-4 w-4" />
          New Sprint
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, idx) => (
            <Card key={idx} className="animate-pulse border-border bg-card">
              <CardHeader className="h-24 bg-muted/20" />
              <CardContent className="h-16 bg-card" />
            </Card>
          ))}
        </div>
      ) : sprints.length === 0 ? (
        <EmptyState
          icon={Milestone}
          title="No sprints defined"
          description="Create your first sprint to start assigning user stories and tracking delivery progress."
          action={
            <Button onClick={openCreateDialog} size="sm" className="cursor-pointer">
              Create First Sprint
            </Button>
          }
        />
      ) : (
        <StaggerGrid className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sprints.map((sprint) => {
            const storyCount = getStoryCount(sprint._id);
            const canToggleHold = sprint.status === "active" || sprint.status === "hold";

            return (
              <AnimatedCard key={sprint._id}>
                <Card className="shadow-sm border-border bg-card flex flex-col justify-between h-full hover:border-primary/20 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-bold text-foreground line-clamp-2">
                      {sprint.name}
                    </CardTitle>
                    <SprintStatusBadge status={sprint.status} />
                  </div>
                  <CardDescription className="text-[11px] flex items-center gap-1.5 pt-0.5">
                    <CalendarIcon className="h-3 w-3" />
                    {formatDateRange(sprint.startDate, sprint.endDate)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-3 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span className="font-semibold text-foreground">{storyCount}</span>
                    <span>{storyCount === 1 ? "story" : "stories"}</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t border-border flex flex-wrap justify-end gap-2">
                  {canToggleHold && (
                    <Button
                      variant={sprint.status === "hold" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleHoldToggle(sprint)}
                      disabled={holdLoading}
                      className="text-xs h-8 cursor-pointer"
                    >
                      {sprint.status === "hold" ? (
                        <>
                          <PlayCircle className="h-3.5 w-3.5 mr-1" />
                          Resume
                        </>
                      ) : (
                        <>
                          <PauseCircle className="h-3.5 w-3.5 mr-1" />
                          Hold
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/sprints/${sprint._id}`} />}
                    className="text-xs h-8 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    View Stories
                  </Button>
                </CardFooter>
                </Card>
              </AnimatedCard>
            );
          })}
        </StaggerGrid>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Sprint</DialogTitle>
            <DialogDescription>
              Define a time-boxed sprint window. You can assign user stories to it from task detail pages.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="sprint-name">Sprint Name</Label>
                <Input
                  id="sprint-name"
                  placeholder="e.g. Sprint 6 - API Hardening"
                  className="bg-card"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive font-medium">{errors.name.message}</p>
                )}
              </div>

              <Controller
                control={control}
                name="startDate"
                render={({ field }) => (
                  <DatePickerField
                    label="Start Date"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.startDate?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="endDate"
                render={({ field }) => (
                  <DatePickerField
                    label="End Date"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.endDate?.message}
                  />
                )}
              />
            </div>
            <DialogFooter className="pt-4" showCloseButton={true}>
              <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Sprint"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={holdOpen} onOpenChange={setHoldOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Place Sprint On Hold
            </DialogTitle>
            <DialogDescription>
              Provide an explanation of why this entire sprint planning backlog has been suspended.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Label htmlFor="sprint-hold-reason">Hold Reason</Label>
            <Input
              id="sprint-hold-reason"
              placeholder="e.g. Blocked by Environment Outage"
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
              {holdLoading ? "Holding..." : "Block Sprint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
