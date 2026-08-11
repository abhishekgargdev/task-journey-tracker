import React from "react";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Mail, User as UserIcon } from "lucide-react";

export default async function UsersPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  await dbConnect();
  const dbUsers = await User.find({}).sort({ name: 1 }).lean();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground font-sans">User Directory</h2>
          <p className="text-sm text-muted-foreground">
            View team members authorized to access the Task Journey Tracker.
          </p>
        </div>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Workspace Directory</CardTitle>
          <CardDescription>
            Accounts are provisioned solely via database seeding scripts. All accounts have identical workspace access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">User Name</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4 text-right font-sans">Date Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dbUsers.map((user: any) => (
                  <tr key={user.email} className="hover:bg-accent/40 transition-colors">
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
