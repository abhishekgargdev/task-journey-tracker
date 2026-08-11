import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import dbConnect from "@/lib/mongodb";
import { Story } from "@/models/Story";
import { StoryStage } from "@/models/StoryStage";
import { StoryUser } from "@/models/StoryUser";
import { User } from "@/models/User";
import { getSession } from "@/lib/session";
import { pageMetadata } from "@/lib/site-metadata";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = pageMetadata(
  "Dashboard",
  "Overview of active stories, development metrics, and pipeline tracking."
);

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  await dbConnect();

  // Fetch all active developers
  const usersRaw = await User.find({ status: "active" }).lean();
  
  // Fetch all parent stories
  const storiesRaw = await Story.find({})
    .populate("stageOrder")
    .sort({ createdAt: -1 })
    .lean();

  const enhancedStories = [];
  const allChildStages = [];

  for (const story of storiesRaw) {
    // Fetch assigned users
    const storyUsers = await StoryUser.find({ storyId: story._id })
      .populate("userId", "name email status")
      .lean();
    const assignedUsers = storyUsers.map((su: any) => su.userId).filter(Boolean);

    // Fetch active child stages
    const childStages = await StoryStage.find({ storyId: story._id, isArchived: { $ne: true } })
      .populate("developBy", "name email status")
      .populate("stageId")
      .sort({ stageOrder: 1 })
      .lean();

    allChildStages.push(...childStages);

    enhancedStories.push({
      ...story,
      assignedUsers,
      childStages,
    });
  }

  // Safely serialize database documents to plain objects for hydration
  const stories = JSON.parse(JSON.stringify(enhancedStories));
  const storyStages = JSON.parse(JSON.stringify(allChildStages));
  const developers = JSON.parse(JSON.stringify(usersRaw));

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClient
        stories={stories}
        storyStages={storyStages}
        developers={developers}
        userName={session.name || "Developer"}
      />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="h-28 animate-pulse bg-muted/20 border-border" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, idx) => (
          <Card key={idx} className="h-24 animate-pulse bg-muted/20 border-border" />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 h-[250px] animate-pulse bg-muted/20 border-border" />
        <Card className="h-[250px] animate-pulse bg-muted/20 border-border" />
      </div>
    </div>
  );
}
