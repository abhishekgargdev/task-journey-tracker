import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Milestone, Calendar, ArrowUpRight } from "lucide-react";

export default function SprintsPage() {
  const mockSprints = [
    { id: "S-04", name: "Sprint 4 - Core Architecture Setup", duration: "Aug 01 - Aug 14", goal: "Complete design system configuration, cached Mongoose helpers, and custom authentication flow.", status: "active" },
    { id: "S-05", name: "Sprint 5 - Stage Journey Mapping", duration: "Aug 15 - Aug 28", goal: "Implement dynamic stage pipeline catalogs and user story progress movement.", status: "future" },
    { id: "S-03", name: "Sprint 3 - Initial Discovery & Wireframes", duration: "Jul 18 - Jul 31", goal: "Requirement gathering and initial shadcn/ui components installation.", status: "completed" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Sprints Planning</h2>
        <p className="text-sm text-muted-foreground">Manage and assign tasks into time-boxed iterative sprints.</p>
      </div>

      <div className="grid gap-6">
        {mockSprints.map((sprint) => (
          <Card key={sprint.id} className="shadow-sm hover:shadow transition-shadow">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 border-b border-border">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold">{sprint.name}</CardTitle>
                  <span className="font-mono text-xs text-muted-foreground">({sprint.id})</span>
                </div>
                <CardDescription className="flex items-center gap-1.5 text-xs">
                  <Calendar className="h-3.5 w-3.5" />
                  {sprint.duration}
                </CardDescription>
              </div>
              <div>
                {sprint.status === "active" && (
                  <Badge className="bg-status-in-progress/10 text-status-in-progress border-none font-semibold">Active Sprint</Badge>
                )}
                {sprint.status === "future" && (
                  <Badge className="bg-status-not-started/10 text-status-not-started border-none font-semibold">Future Sprint</Badge>
                )}
                {sprint.status === "completed" && (
                  <Badge className="bg-status-completed/10 text-status-completed border-none font-semibold">Completed</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sprint Goal</span>
              <p className="text-sm text-foreground leading-relaxed">{sprint.goal}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
