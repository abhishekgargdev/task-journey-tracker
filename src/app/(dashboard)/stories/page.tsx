import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, User, GitBranch } from "lucide-react";

export default function StoriesPage() {
  const mockStories = [
    { id: "US-201", title: "Configurable user delivery pipeline", author: "Sarah Jenkins", activeStage: "Analysis", pipeline: "Standard Release Map" },
    { id: "US-202", title: "Simple credentials authentication flow", author: "Marcus Chen", activeStage: "Development", pipeline: "Security Validation Map" },
    { id: "US-203", title: "Responsive sidebar with role accessibility", author: "Sarah Jenkins", activeStage: "Development", pipeline: "Standard Release Map" },
    { id: "US-204", title: "Mongoose database cached connection helper", author: "Alex Rivera", activeStage: "Testing", pipeline: "Standard Release Map" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">User Stories</h2>
        <p className="text-sm text-muted-foreground">Manage corporate product requirements and their custom delivery maps.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">User Stories Catalog</CardTitle>
          <CardDescription>A list of user stories currently flowing through custom delivery pipelines.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4 w-[100px]">ID</th>
                  <th className="py-3 px-4">User Story Title</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Active Stage</th>
                  <th className="py-3 px-4 text-right">Pipeline Map</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mockStories.map((story) => (
                  <tr key={story.id} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-primary">{story.id}</td>
                    <td className="py-3 px-4 font-medium text-foreground">{story.title}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      <span className="flex items-center gap-1.5">
                        <User className="h-3 w-3" />
                        {story.author}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-primary">
                      <Badge className="bg-primary/10 text-primary border-none">
                        {story.activeStage}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground text-xs">
                      <span className="inline-flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        {story.pipeline}
                      </span>
                    </td>
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
