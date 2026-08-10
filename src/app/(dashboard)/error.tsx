"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <Card className="max-w-lg mx-auto border-destructive/20 shadow-sm" role="alert">
      <CardHeader className="text-center">
        <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-2" aria-hidden="true" />
        <CardTitle className="text-lg">Something went wrong</CardTitle>
        <CardDescription>
          An unexpected error occurred while loading this page. Try again or return to the dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-2 justify-center">
        <Button onClick={reset} className="cursor-pointer">
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Try again
        </Button>
        <Button variant="outline" render={<a href="/" />} className="cursor-pointer">
          Go to Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}
