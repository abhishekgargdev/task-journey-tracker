"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { User, Mail, Lock, Shield, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";

const profileSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid corporate email address." }),
  password: z.string().optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        // We can check local session via an API endpoint or load it.
        // Wait, let's fetch current logged in user details!
        // We can call /api/users to find ourselves, or we can fetch a me endpoint.
        // Wait, is there an endpoint that returns the current session details?
        // Let's check: GET /api/users returns all users, but we can also just fetch /api/users/profile or we can create an endpoint /api/users/me,
        // or we can use the GET request from session.
        // Wait, let's create a GET handler in /api/users/profile to return the current logged-in user's details! That is extremely clean.
        // Let's fetch it:
        const res = await fetch("/api/users/profile");
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) throw new Error("Failed to load profile.");
        const data = await res.json();
        setValue("name", data.name);
        setValue("email", data.email);
      } catch (err: any) {
        console.error(err);
        setErrorMsg("Failed to load user profile details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [setValue]);

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to update profile.");
      }

      toast.add({
        title: "Profile updated",
        description: "Your details have been successfully updated.",
        type: "success",
      });

      // Refresh sidebar and header info
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.add({
        title: "Update failed",
        description: err.message || "An error occurred.",
        type: "error",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading profile settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground font-sans">
          Profile Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage your personal details, workspace display name, and password.
        </p>
      </div>

      {errorMsg ? (
        <Card className="border-destructive/20 bg-destructive/5 p-6 text-center space-y-3">
          <p className="text-sm font-semibold text-destructive">{errorMsg}</p>
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-border shadow-md bg-card">
            <CardHeader className="border-b border-border bg-muted/10">
              <CardTitle className="text-base font-semibold">Account Information</CardTitle>
              <CardDescription>
                Updates will take effect immediately and refresh your active login session.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-4 pt-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="profile-name" className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    Full Name
                  </Label>
                  <Input
                    id="profile-name"
                    placeholder="Enter your name"
                    className="bg-card"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive font-medium">{errors.name.message}</p>
                  )}
                </div>

                {/* Email Address */}
                <div className="space-y-2">
                  <Label htmlFor="profile-email" className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    Corporate Email Address
                  </Label>
                  <Input
                    id="profile-email"
                    type="email"
                    placeholder="name@company.com"
                    className="bg-card"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive font-medium">{errors.email.message}</p>
                  )}
                </div>

                {/* Password Change */}
                <div className="space-y-2 pt-2 border-t border-border/80">
                  <Label htmlFor="profile-password" className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    Update Password (Optional)
                  </Label>
                  <Input
                    id="profile-password"
                    type="password"
                    placeholder="Leave blank to keep current password"
                    className="bg-card"
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive font-medium">{errors.password.message}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground italic">
                    Password must be at least 6 characters long if you wish to change it.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/60 bg-muted/10 py-4 flex justify-between items-center">
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  Identical Workspace Access
                </span>
                <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
