import React from "react";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/authz";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function StagesPage() {
  const session = await auth();
  requireAdmin(session);

  const catalogStages = [
    { code: "STG-01", name: "Backlog", order: 1, defaultStatus: "not_started", description: "Default entry stage for stories requiring refinement" },
    { code: "STG-02", name: "Analysis", order: 2, defaultStatus: "in_progress", description: "Requirements gathering, architectural spikes, and UX wireframes" },
    { code: "STG-03", name: "Development", order: 3, defaultStatus: "in_progress", description: "Active software engineering and code execution" },
    { code: "STG-04", name: "Testing", order: 4, defaultStatus: "in_progress", description: "Quality assurance validation and test case runs" },
    { code: "STG-05", name: "On Hold", order: 5, defaultStatus: "on_hold", description: "Interim stage when dependencies are pending" },
    { code: "STG-06", name: "Blocked", order: 6, defaultStatus: "blocked", description: "Explicit blocker flags raised requiring review" },
    { code: "STG-07", name: "Completed", order: 7, defaultStatus: "completed", description: "Production delivery checklist verified and finalized" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Stage Catalog Settings</h2>
          <p className="text-sm text-muted-foreground">Admin Configuration - Manage delivery stages available for custom journey maps.</p>
        </div>
        <Button className="flex items-center gap-1.5 self-start cursor-pointer">
          <Plus className="h-4 w-4" />
          Add Stage
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Configured Stage Inventory</CardTitle>
          <CardDescription>
            These stages are stored in the database and can be selected by individual stories.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4 w-[120px]">Code</th>
                  <th className="py-3 px-4">Stage Name</th>
                  <th className="py-3 px-4">Default Status</th>
                  <th className="py-3 px-4">Sequence Order</th>
                  <th className="py-3 px-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {catalogStages.map((stage) => (
                  <tr key={stage.code} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-primary">{stage.code}</td>
                    <td className="py-3 px-4 font-medium text-foreground">{stage.name}</td>
                    <td className="py-3 px-4">
                      <Badge className="bg-secondary text-secondary-foreground border-none font-semibold">
                        {stage.defaultStatus}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-foreground font-mono">{stage.order}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{stage.description}</td>
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
