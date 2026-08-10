"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  CheckSquare, 
  Plus, 
  ExternalLink, 
  Loader2, 
  User, 
  Calendar,
  AlertCircle,
  Eye
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface TaskOwner {
  _id: string;
  name: string;
  email: string;
}

interface TaskItem {
  _id: string;
  title: string;
  description?: string;
  adoTaskLink?: string;
  owner?: TaskOwner;
  createdAt: string;
}

const taskFormSchema = z.object({
  title: z.string().min(2, { message: "Task title must be at least 2 characters." }),
  description: z.string().optional(),
  adoTaskLink: z.string().url({ message: "Must be a valid Azure DevOps URL." }).or(z.literal("")),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      adoTaskLink: "",
    },
  });

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to load tasks.");
      const data = await res.json();
      setTasks(data);
    } catch (err: any) {
      console.error(err);
      toast.add({
        title: "Error loading tasks",
        description: "Could not retrieve the task inventory from the database.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const openCreateDialog = () => {
    reset({
      title: "",
      description: "",
      adoTaskLink: "",
    });
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: TaskFormValues) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create task.");
      }

      toast.add({
        title: "Task created successfully",
        description: `Task "${values.title}" has been saved.`,
        type: "success",
      });

      setFormOpen(false);
      fetchTasks();
    } catch (err: any) {
      console.error(err);
      toast.add({
        title: "Failed to create task",
        description: err.message || "An unexpected error occurred.",
        type: "error",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground font-sans">
            Engineering Tasks
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitor, assign, and organize high-level deliverables and map related story journeys.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-1.5 self-start cursor-pointer">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, idx) => (
            <Card key={idx} className="animate-pulse border-border bg-card">
              <CardHeader className="h-20 bg-muted/20" />
              <CardContent className="h-24 bg-card" />
            </Card>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks defined"
          description="There are currently no engineering tasks stored. Create a task to begin attaching user stories and custom stages."
          action={
            <Button onClick={openCreateDialog} size="sm" className="cursor-pointer">
              Create First Task
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto min-w-0">
            <Card className="shadow-sm overflow-hidden border-border bg-card min-w-[640px]">
              <CardContent className="p-0">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-4">Task Name</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Owner</th>
                      <th className="py-3 px-4">ADO Link</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {tasks.map((task) => (
                      <tr key={task._id} className="hover:bg-accent/30 transition-colors">
                        <td className="py-3 px-4">
                          <Link href={`/tasks/${task._id}`} className="font-semibold text-primary hover:underline">
                            {task.title}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground max-w-[280px] truncate" title={task.description}>
                          {task.description || <span className="italic opacity-50">No description</span>}
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          {task.owner?.name || "Unassigned"}
                        </td>
                        <td className="py-3 px-4">
                          {task.adoTaskLink ? (
                            <a 
                              href={task.adoTaskLink} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-primary hover:text-primary-foreground inline-flex items-center gap-1.5 hover:underline"
                            >
                              ADO Link
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground/40 font-mono text-xs">--</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">
                          {new Date(task.createdAt).toLocaleDateString(undefined, {
                            dateStyle: "medium"
                          })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="outline" size="sm" render={<Link href={`/tasks/${task._id}`} />}>
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Cards Grid View */}
          <div className="grid gap-4 sm:grid-cols-2 md:hidden">
            {tasks.map((task) => (
              <Card key={task._id} className="shadow-sm border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold text-foreground">
                    <Link href={`/tasks/${task._id}`} className="hover:underline">
                      {task.title}
                    </Link>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Created on {new Date(task.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-3 text-xs text-muted-foreground leading-normal min-h-[60px]">
                  <p className="line-clamp-3">
                    {task.description || <span className="italic opacity-50">No description provided.</span>}
                  </p>
                </CardContent>
                <CardFooter className="pt-2 border-t border-border flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                      {task.owner?.name ? task.owner.name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0, 2) : "?"}
                    </div>
                    <span className="font-medium text-foreground">{task.owner?.name || "Unassigned"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.adoTaskLink && (
                      <a href={task.adoTaskLink} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-muted rounded text-primary">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <Button variant="outline" size="sm" render={<Link href={`/tasks/${task._id}`} />}>
                      View
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* New Task Dialog Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a high-level engineering task. You can attach user stories to this task later.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Migrate Compliance Gateways"
                  className="bg-card"
                  {...register("title")}
                />
                {errors.title && (
                  <p className="text-xs text-destructive font-medium">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Summarize engineering goals, architectural requirements, or parameters..."
                  className="bg-card min-h-[90px]"
                  {...register("description")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adoTaskLink">Azure DevOps Task Link (Optional)</Label>
                <Input
                  id="adoTaskLink"
                  type="url"
                  placeholder="https://dev.azure.com/..."
                  className="bg-card"
                  {...register("adoTaskLink")}
                />
                {errors.adoTaskLink && (
                  <p className="text-xs text-destructive font-medium">{errors.adoTaskLink.message}</p>
                )}
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
                  "Create Task"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
