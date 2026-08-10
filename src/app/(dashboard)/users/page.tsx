import React from "react";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users as UsersIcon, Plus, UserCheck, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function UsersPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const mockUsers = [
    { name: "Admin User", email: "admin@company.com", role: "admin", status: "Active" },
    { name: "Standard User", email: "user@company.com", role: "engineer", status: "Active" },
    { name: "Sarah Jenkins", email: "sarah.j@company.com", role: "lead", status: "Active" },
    { name: "Alex Rivera", email: "alex.r@company.com", role: "engineer", status: "Active" },
    { name: "Marcus Chen", email: "marcus.c@company.com", role: "engineer", status: "Inactive" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">User Directory Settings</h2>
          <p className="text-sm text-muted-foreground">Admin Configuration - Manage system users, access authorization, and roles.</p>
        </div>
        <Button className="flex items-center gap-1.5 self-start cursor-pointer">
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">User Inventory</CardTitle>
          <CardDescription>
            A directory of users authorized to access the Task Journey Tracker.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">User Name</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">System Role</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mockUsers.map((user) => (
                  <tr key={user.email} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">{user.name}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{user.email}</td>
                    <td className="py-3 px-4">
                      {user.role === "admin" ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                          <Shield className="h-3.5 w-3.5" />
                          Admin
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground capitalize">{user.role}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {user.status === "Active" ? (
                        <Badge className="bg-status-completed/10 text-status-completed border-none font-semibold">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-status-not-started/10 text-status-not-started border-none font-semibold">
                          Inactive
                        </Badge>
                      )}
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
