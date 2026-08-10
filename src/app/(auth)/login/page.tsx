"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderGit, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <FolderGit className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground font-sans">
            Task Journey Tracker
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Internal Delivery Pipeline Management System
          </p>
        </div>

        <Card className="border-border shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>
              Enter your corporate credentials to access the delivery tracker.
            </CardDescription>
          </CardHeader>
          <form action={formAction}>
            <CardContent className="space-y-4">
              {state?.error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{state.error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Corporate Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@company.com"
                  required
                  autoComplete="email"
                  disabled={isPending}
                  className="bg-card"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={isPending}
                  className="bg-card"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full cursor-pointer" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              <div className="rounded-lg bg-muted/60 p-3 text-[11px] text-muted-foreground w-full space-y-1 border border-border">
                <p className="font-semibold text-foreground">Local Development Accounts:</p>
                <p>🔑 <span className="font-semibold text-foreground">Admin:</span> admin@company.com / admin123</p>
                <p>🔑 <span className="font-semibold text-foreground">Standard:</span> user@company.com / user123</p>
                <p className="text-[10px] italic pt-1 border-t border-border mt-1">
                  Database will be automatically seeded on first sign-in attempt.
                </p>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
