"use client";

import React, { useEffect, useState } from "react";
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
  Settings,
  Plus,
  GripVertical,
  Edit,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import EmptyState from "@/components/shared/EmptyState";
import DeleteConfirmDialog, { DeleteConfirmItem } from "@/components/shared/DeleteConfirmDialog";
import { STAGE_COLORS } from "@/lib/stage-colors";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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

// TypeScript interface for StageDefinition
interface Stage {
  _id: string;
  name: string;
  key: string;
  description?: string;
  colorTag: string;
  isActive: boolean;
  defaultOrder: number;
}

const COLORS = STAGE_COLORS.map(({ name, label, bg, text }) => ({ name, label, bg, text }));

const stageSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  description: z.string().optional(),
  colorTag: z.string(),
});

type StageFormValues = z.infer<typeof stageSchema>;

export default function StagesSettingsPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dialog Controls
  const [formOpen, setFormOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [pendingDeactivateStage, setPendingDeactivateStage] = useState<Stage | null>(null);
  const [pendingDeleteStage, setPendingDeleteStage] = useState<DeleteConfirmItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StageFormValues>({
    resolver: zodResolver(stageSchema),
    defaultValues: {
      name: "",
      description: "",
      colorTag: "slate",
    },
  });

  const selectedColor = watch("colorTag");

  const fetchStages = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/stages");
      if (!res.ok) throw new Error("Failed to load stages.");
      const data = await res.json();
      setStages(data);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Error retrieving stage catalog definitions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStages();
  }, []);

  const openAddDialog = () => {
    setEditingStage(null);
    reset({
      name: "",
      description: "",
      colorTag: "slate",
    });
    setFormOpen(true);
  };

  const openEditDialog = (stage: Stage) => {
    setEditingStage(stage);
    reset({
      name: stage.name,
      description: stage.description || "",
      colorTag: stage.colorTag,
    });
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: StageFormValues) => {
    try {
      const url = editingStage ? `/api/stages/${editingStage._id}` : "/api/stages";
      const method = editingStage ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save stage.");
      }

      setFormOpen(false);
      fetchStages();
    } catch (err: any) {
      alert(err.message || "An error occurred.");
    }
  };

  const handleToggleActive = async (stage: Stage, checked: boolean) => {
    if (!checked) {
      // Prompt warning dialog for deactivation
      setPendingDeactivateStage(stage);
      setDeactivateOpen(true);
    } else {
      // Instantly activate
      await updateStageActiveState(stage._id, true);
    }
  };

  const confirmDeactivate = async () => {
    if (pendingDeactivateStage) {
      await updateStageActiveState(pendingDeactivateStage._id, false);
      setDeactivateOpen(false);
      setPendingDeactivateStage(null);
    }
  };

  const updateStageActiveState = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/stages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to update status.");
      fetchStages();
    } catch (error) {
      console.error(error);
      alert("Error toggling active state.");
    }
  };

  const openDeleteDialog = (stage: Stage) => {
    setPendingDeleteStage({
      id: stage._id,
      name: stage.name,
      subtitle: `Slug: ${stage.key}`,
    });
    setDeleteOpen(true);
  };

  const confirmDeleteStage = async (id: string) => {
    const res = await fetch(`/api/stages/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      setActionError(data.error || "Failed to delete stage.");
      setErrorOpen(true);
      fetchStages();
      throw new Error(data.error);
    }

    fetchStages();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stages.findIndex((s) => s._id === active.id);
    const newIndex = stages.findIndex((s) => s._id === over.id);

    const reordered = arrayMove(stages, oldIndex, newIndex);
    const updated = reordered.map((stage, index) => ({
      ...stage,
      defaultOrder: index + 1,
    }));

    setStages(updated);

    try {
      const res = await fetch("/api/stages/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stages: updated.map((s) => ({ id: s._id, defaultOrder: s.defaultOrder })),
        }),
      });

      if (!res.ok) throw new Error("Failed to save stage order.");
    } catch (err) {
      console.error(err);
      alert("Failed to synchronize stage reordering to server.");
      fetchStages(); // Revert state
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground font-sans">
            Pipeline Stage Catalog
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure delivery stages, define pipeline sequencing, and control active catalog items.
          </p>
        </div>
        <Button onClick={openAddDialog} className="flex items-center gap-1.5 self-start cursor-pointer">
          <Plus className="h-4 w-4" />
          Add Catalog Stage
        </Button>
      </div>

      {loading && stages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading stage definitions...</p>
        </div>
      ) : errorMessage ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center max-w-lg mx-auto space-y-3">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm font-semibold text-destructive">{errorMessage}</p>
          <Button onClick={fetchStages} variant="outline" size="sm">Retry</Button>
        </div>
      ) : stages.length === 0 ? (
        <EmptyState
          icon={Settings}
          title="No stages defined yet"
          description="Your delivery pipeline catalog is empty. Add the first stage to define how user stories progress through your workflow."
          action={
            <Button onClick={openAddDialog} size="sm" className="cursor-pointer">
              <Plus className="h-4 w-4 mr-1" />
              Add First Stage
            </Button>
          }
        />
      ) : (
        <Card className="shadow-sm overflow-hidden border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Configured Stage Sequence</CardTitle>
            <CardDescription>
              Drag stages using handles to modify default delivery pipeline order. Touch-friendly.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-4 w-[60px] text-center">Move</th>
                    <th className="py-3 px-4 w-[100px]">Slug Key</th>
                    <th className="py-3 px-4">Stage Name</th>
                    <th className="py-3 px-4 w-[110px] text-center">Color Swatch</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 w-[100px] text-center">Active</th>
                    <th className="py-3 px-4 w-[110px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={stages.map((s) => s._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <AnimatePresence initial={false}>
                        {stages.map((stage) => (
                          <SortableStageRow
                            key={stage._id}
                            stage={stage}
                            onEdit={openEditDialog}
                            onDelete={openDeleteDialog}
                            onToggleActive={handleToggleActive}
                          />
                        ))}
                      </AnimatePresence>
                    </SortableContext>
                  </DndContext>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add / Edit Stage Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStage ? "Edit Stage Definition" : "Create New Stage"}</DialogTitle>
            <DialogDescription>
              {editingStage 
                ? "Update properties for this stage. Key slug will remain locked." 
                : "Add a newly-introduced stage. Slugs are auto-generated from names."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name">Stage Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Code Review"
                  className="bg-card"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive font-medium">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Summarize stage activities, gates, or timelines..."
                  className="bg-card min-h-[80px]"
                  {...register("description")}
                />
              </div>

              <div className="space-y-2">
                <Label>Color Tag Swatch</Label>
                <div className="grid grid-cols-5 gap-2 pt-1.5">
                  {COLORS.map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => setValue("colorTag", color.name)}
                      className={`h-9 rounded-lg flex items-center justify-center font-medium text-xs capitalize cursor-pointer transition-all border ${
                        selectedColor === color.name
                          ? "ring-2 ring-primary ring-offset-2 border-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <span className={`h-4 w-4 rounded-full ${color.bg}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="pt-4" showCloseButton={true}>
              <Button type="submit" disabled={isSubmitting}>
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

      {/* Confirmation Dialog for Deletion */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        item={pendingDeleteStage}
        entityLabel="stage"
        consequences="This will permanently remove the stage from the catalog. If the stage is referenced by existing stories, it will be deactivated instead."
        onConfirm={confirmDeleteStage}
      />

      {/* Confirmation Dialog for Deactivation */}
      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Deactivate Stage?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-1.5">
              <p>
                Are you sure you want to deactivate <strong>{pendingDeactivateStage?.name}</strong>?
              </p>
              <p className="text-xs leading-normal">
                Existing stories currently mapping or using this stage will keep their historical record cards. However, it will not be selectable for new user stories going forward.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDeactivateOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeactivate}>
              Confirm Deactivation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deletion Error Dialog */}
      <Dialog open={errorOpen} onOpenChange={setErrorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Cannot Delete Stage
            </DialogTitle>
            <DialogDescription className="pt-1.5 leading-normal">
              {actionError}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2" showCloseButton={true} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sortable Row Component
interface SortableStageRowProps {
  stage: Stage;
  onEdit: (stage: Stage) => void;
  onDelete: (stage: Stage) => void;
  onToggleActive: (stage: Stage, checked: boolean) => void;
}

function SortableStageRow({
  stage,
  onEdit,
  onDelete,
  onToggleActive,
}: SortableStageRowProps) {
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
    zIndex: isDragging ? 20 : 1,
    position: "relative" as const,
  };

  const colorConfig = COLORS.find((c) => c.name === stage.colorTag) || COLORS[0];

  return (
    <motion.tr
      ref={setNodeRef}
      style={style}
      layoutId={stage._id}
      transition={{ type: "spring", stiffness: 450, damping: 30 }}
      className={`border-b border-border bg-card hover:bg-muted/30 transition-colors ${
        isDragging ? "shadow-md bg-accent/90 opacity-70 z-50 select-none" : ""
      }`}
    >
      <td className="py-3 px-4 text-center">
        <button
          type="button"
          className="p-1.5 rounded hover:bg-muted cursor-grab active:cursor-grabbing touch-none select-none text-muted-foreground hover:text-foreground inline-flex items-center justify-center border-none bg-transparent outline-none focus:ring-1 focus:ring-primary"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="py-3 px-4">
        <span className="font-mono text-xs font-semibold text-muted-foreground">{stage.key}</span>
      </td>
      <td className="py-3 px-4">
        <span className={`font-semibold text-sm ${stage.isActive ? "text-foreground" : "text-muted-foreground line-through"}`}>
          {stage.name}
        </span>
      </td>
      <td className="py-3 px-4 text-center">
        <Badge className={`border-none capitalize font-semibold bg-accent/80 hover:bg-accent/80 ${colorConfig.text}`}>
          <span className={`h-2.5 w-2.5 rounded-full mr-1.5 ${colorConfig.bg}`} />
          {stage.colorTag}
        </Badge>
      </td>
      <td className="py-3 px-4 text-muted-foreground text-xs max-w-[240px] truncate" title={stage.description}>
        {stage.description || <span className="italic text-muted-foreground/50">No description provided</span>}
      </td>
      <td className="py-3 px-4 text-center">
        <Switch
          checked={stage.isActive}
          onCheckedChange={(checked) => onToggleActive(stage, checked)}
          className="mx-auto"
        />
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            title="Edit Details"
            onClick={() => onEdit(stage)}
            className="cursor-pointer"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Delete Permanently"
            onClick={() => onDelete(stage)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </motion.tr>
  );
}
