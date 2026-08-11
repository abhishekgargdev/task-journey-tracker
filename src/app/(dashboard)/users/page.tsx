"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Mail, User as UserIcon, Plus, Loader2, Save, Trash2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import DeleteConfirmDialog, { DeleteConfirmItem } from "@/components/shared/DeleteConfirmDialog";

const userSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type UserFormValues = z.infer<typeof userSchema>;

interface DbUser {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DeleteConfirmItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteErrorOpen, setDeleteErrorOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to load users.");
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      console.error(err);
      toast.add({
        title: "Error loading directory",
        description: err.message || "Failed to retrieve developer list.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateDialog = () => {
    reset({
      name: "",
      email: "",
      password: "",
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (user: DbUser) => {
    setPendingDelete({ id: user._id, name: user.name, subtitle: user.email });
    setDeleteOpen(true);
  };

  const confirmDeleteUser = async (id: string) => {
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      setDeleteError(data.error || "Failed to delete user.");
      setDeleteErrorOpen(true);
      fetchUsers();
      throw new Error(data.error);
    }

    toast.add({
      title: "Developer removed",
      description: "The user account has been permanently deleted.",
      type: "success",
    });
    fetchUsers();
  };

  const onSubmit = async (values: UserFormValues) => {
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create user account.");
      }

      toast.add({
        title: "Account created",
        description: `Developer account for "${values.name}" has been provisioned.`,
        type: "success",
      });

      setDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      toast.add({
        title: "Provision failed",
        description: err.message || "An unexpected error occurred.",
        type: "error",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground font-sans">User Directory</h2>
          <p className="text-sm text-muted-foreground">
            View and register team members authorized to access the Task Journey Tracker.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-1.5 self-start cursor-pointer">
          <Plus className="h-4 w-4" />
          Add Developer
        </Button>
      </div>

      {loading && users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading directory...</p>
        </div>
      ) : (
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Workspace Directory</CardTitle>
            <CardDescription>
              Accounts are provisioned below. All registered accounts have identical workspace access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" aria-label="Users list">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-4">User Name</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4 text-right">Date Joined</th>
                    <th className="py-3 px-4 text-right w-[80px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <AnimatePresence initial={false}>
                    {users.map((user) => (
                      <motion.tr
                        key={user._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-accent/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-medium text-foreground flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <UserIcon className="h-3.5 w-3.5" />
                          </div>
                          {user.name}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">
                          <span className="inline-flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground/70" />
                            {user.email}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-muted-foreground text-xs">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                            {new Date(user.createdAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Delete Developer"
                            onClick={() => openDeleteDialog(user)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Developer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Developer</DialogTitle>
            <DialogDescription>
              Create a new user account. They will be immediately available for story assignment.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4 py-2">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="dev-name">Full Name</Label>
                <Input
                  id="dev-name"
                  placeholder="e.g. Jane Doe"
                  className="bg-card"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive font-medium">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="dev-email">Email Address</Label>
                <Input
                  id="dev-email"
                  type="email"
                  placeholder="e.g. jane.doe@company.com"
                  className="bg-card"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive font-medium">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="dev-password">Initial Password</Label>
                <Input
                  id="dev-password"
                  type="password"
                  placeholder="••••••••"
                  className="bg-card"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-destructive font-medium">{errors.password.message}</p>
                )}
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
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Create Account
                  </>
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
        entityLabel="developer"
        consequences="This will permanently remove the developer account. They will no longer be able to sign in or be assigned to stories."
        onConfirm={confirmDeleteUser}
      />

      <Dialog open={deleteErrorOpen} onOpenChange={setDeleteErrorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              Cannot Delete Developer
            </DialogTitle>
            <DialogDescription className="pt-1.5 leading-normal">
              {deleteError}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2" showCloseButton={true} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
