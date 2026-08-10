import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Calendar, User } from "lucide-react";

export default function TasksPage() {
  const mockTasks = [
    { id: "T-101", title: "Implement MongoDB connection retry policy", assignee: "Sarah Jenkins", sprint: "Sprint 4", status: "completed" },
    { id: "T-102", title: "Design database schemas for stage configuration", assignee: "Alex Rivera", sprint: "Sprint 4", status: "in_progress" },
    { id: "T-103", title: "Set up Framer Motion page transitions", assignee: "Marcus Chen", sprint: "Sprint 4", status: "completed" },
    { id: "T-104", title: "Resolve session cookie token serialization issues", assignee: "Sarah Jenkins", sprint: "Sprint 5", status: "not_started" },
    { id: "T-105", title: "Integrate tailwind v4 theme variables into components", assignee: "Alex Rivera", sprint: "Sprint 4", status: "blocked" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "not_started":
        return <Badge className="bg-status-not-started/10 text-status-not-started border-none font-semibold">Not Started</Badge>;
      case "in_progress":
        return <Badge className="bg-status-in-progress/10 text-status-in-progress border-none font-semibold">In Progress</Badge>;
      case "blocked":
        return <Badge className="bg-status-blocked/10 text-status-blocked border-none font-semibold">Blocked</Badge>;
      case "completed":
        return <Badge className="bg-status-completed/10 text-status-completed border-none font-semibold">Completed</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Tasks Workspace</h2>
        <p className="text-sm text-muted-foreground">Manage and track specific execution items across team sprints.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Tasks Catalog</CardTitle>
          <CardDescription>A list of active operational tasks across sprints.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4 w-[100px]">ID</th>
                  <th className="py-3 px-4">Task Description</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Sprint</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mockTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-primary">{task.id}</td>
                    <td className="py-3 px-4 font-medium text-foreground">{task.title}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      <span className="flex items-center gap-1.5">
                        <User className="h-3 w-3" />
                        {task.assignee}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {task.sprint}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">{getStatusBadge(task.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
