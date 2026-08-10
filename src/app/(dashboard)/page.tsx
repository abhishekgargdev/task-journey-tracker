import React from "react";
import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  PlayCircle, 
  AlertTriangle, 
  HelpCircle, 
  Clock, 
  Layers,
  ArrowRight,
  TrendingUp
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();

  // Mock pipeline journey counts
  const pipelineMetrics = [
    { label: "Backlog", count: 8, status: "not_started" },
    { label: "Analysis", count: 4, status: "in_progress" },
    { label: "Development", count: 6, status: "in_progress" },
    { label: "Testing", count: 3, status: "in_progress" },
    { label: "On Hold", count: 2, status: "on_hold" },
    { label: "Blocked", count: 1, status: "blocked" },
    { label: "Completed", count: 12, status: "completed" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "not_started":
        return <Badge className="bg-status-not-started/10 text-status-not-started hover:bg-status-not-started/20 border-none font-semibold">Not Started</Badge>;
      case "in_progress":
        return <Badge className="bg-status-in-progress/10 text-status-in-progress hover:bg-status-in-progress/20 border-none font-semibold">In Progress</Badge>;
      case "blocked":
        return <Badge className="bg-status-blocked/10 text-status-blocked hover:bg-status-blocked/20 border-none font-semibold">Blocked</Badge>;
      case "on_hold":
        return <Badge className="bg-status-on-hold/10 text-status-on-hold hover:bg-status-on-hold/20 border-none font-semibold">On Hold</Badge>;
      case "completed":
        return <Badge className="bg-status-completed/10 text-status-completed hover:bg-status-completed/20 border-none font-semibold">Completed</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-xl border border-primary/10 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent p-6 shadow-sm">
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">
          Welcome back, {session?.user?.name}!
        </h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          You are logged in as <span className="font-semibold text-foreground">{session?.user?.role === 'admin' ? 'Administrator' : 'Standard User'}</span>. Here is the current delivery status across the active stages in your Task Journey Tracker.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Stories</CardTitle>
            <Layers className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">36</div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-status-completed" />
              +4 this week
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">In Progress</CardTitle>
            <PlayCircle className="h-4 w-4 text-status-in-progress" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">13</div>
            <p className="text-[11px] text-muted-foreground mt-1">Across 3 active pipeline stages</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Blocked Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-status-blocked" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-blocked">1</div>
            <p className="text-[11px] text-muted-foreground mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completed Stories</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-status-completed" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-[11px] text-muted-foreground mt-1">Successfully deployed to production</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Sections */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Stages list */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Active Configurable Stage Catalog</CardTitle>
            <CardDescription>
              Each user story progresses through a customized sequence of these stages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-4">Stage Name</th>
                    <th className="py-3 px-4">Status Mapping</th>
                    <th className="py-3 px-4 text-right">Active Stories</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pipelineMetrics.map((stage) => (
                    <tr key={stage.label} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">{stage.label}</td>
                      <td className="py-3 px-4">{getStatusBadge(stage.status)}</td>
                      <td className="py-3 px-4 text-right font-bold text-foreground">{stage.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Info panel */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">System Diagnostics</CardTitle>
            <CardDescription>
              Task Journey Tracker system health and settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border p-3 space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Database Connection</span>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-completed opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-status-completed"></span>
                </span>
                <span className="text-sm font-medium text-foreground">MongoDB Connected</span>
              </div>
            </div>

            <div className="rounded-lg border border-border p-3 space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Session Info</span>
              <div className="text-xs space-y-1 text-foreground">
                <p><span className="font-semibold text-muted-foreground">User:</span> {session?.user?.name}</p>
                <p><span className="font-semibold text-muted-foreground">Email:</span> {session?.user?.email}</p>
                <p><span className="font-semibold text-muted-foreground">Role:</span> {session?.user?.role}</p>
              </div>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs text-primary space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Local testing seeding note
              </p>
              <p className="text-muted-foreground leading-relaxed">
                If the database was empty, logging in automatically seeded standard credentials. Go to <strong>Stage Catalog</strong> to define custom flow maps.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
