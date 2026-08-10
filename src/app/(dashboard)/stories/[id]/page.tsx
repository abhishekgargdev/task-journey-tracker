"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  ExternalLink, 
  Layers, 
  Calendar, 
  FolderGit,
  AlertTriangle,
  Loader2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/shared/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import JourneyLadder from "@/components/journey/JourneyLadder";

interface TaskItem {
  _id: string;
  title: string;
}

interface SprintItem {
  _id: string;
  name: string;
}

interface StageDefinition {
  _id: string;
  name: string;
  colorTag: string;
}

interface StagePlanEntry {
  stage: StageDefinition;
  order: number;
}

interface UserItem {
  _id: string;
  name: string;
  email: string;
}

interface StoryHoldHistory {
  reason: string;
  heldAt: string;
  resumedAt?: string;
  heldBy: UserItem;
}

interface UserStory {
  _id: string;
  title: string;
  adoStoryLink?: string;
  task: TaskItem;
  sprint: SprintItem;
  stagePlan: StagePlanEntry[];
  currentStageOrder: number;
  overallStatus: "not_started" | "in_progress" | "blocked" | "on_hold" | "completed";
  isOnHold: boolean;
  holdReason?: string;
  holdHistory: StoryHoldHistory[];
}

interface StoryStage {
  _id: string;
  story: string;
  stage: string; // ID string
  order: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  status: "not_started" | "in_progress" | "blocked" | "on_hold" | "completed";
  githubRepo?: string;
  branchName?: string;
  prLink?: string;
  assignedTo?: UserItem;
  notes?: string;
}

export default function StoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storyId } = use(params);

  // States
  const [story, setStory] = useState<UserStory | null>(null);
  const [stages, setStages] = useState<StoryStage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStoryDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch story detail (which populates task, sprint, and stagePlan.stage)
      const storyRes = await fetch(`/api/stories`);
      if (!storyRes.ok) throw new Error("Failed to load user story.");
      const storiesList: UserStory[] = await storyRes.json();
      
      // Find the specific story
      const matchedStory = storiesList.find(s => s._id === storyId);
      if (!matchedStory) {
        throw new Error("User Story not found.");
      }
      setStory(matchedStory);

      // Fetch related StoryStage documents for this story
      // We can create a simple endpoint or fetch a list, but wait!
      // In Prompt 7, we created the story stages PATCH. We need a way to GET all StoryStage documents for this story.
      // Wait, is there a GET `/api/stories/[id]/stages` route?
      // No, but wait, do we have an API to get stages for a story?
      // Ah! We can easily query all StoryStages in a sub-route or add a GET handler to the stories population, OR
      // we can query it directly in a new GET endpoint at `src/app/api/stories/[id]/stages/route.ts`!
      // Yes! Creating a simple GET endpoint at `src/app/api/stories/[id]/stages/route.ts` is extremely clean, matches Next.js api routes patterns, and retrieves all stage tickets for a story!
      // Let's implement that GET route in a second. For now, let's write the fetch call:
      const stagesRes = await fetch(`/api/stories/${storyId}/stages`);
      if (!stagesRes.ok) throw new Error("Failed to load story stages.");
      const stagesData = await stagesRes.json();
      setStages(stagesData);

    } catch (err: any) {
      console.error(err);
      toast.add({
        title: "Error loading story details",
        description: err.message || "Failed to load journey tracking records.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoryDetails();
  }, [storyId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading story journey detail...</p>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="space-y-4">
        <Link href="/stories" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Stories workspace
        </Link>
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center max-w-lg mx-auto space-y-3">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <h3 className="text-base font-semibold text-destructive">Story not found</h3>
          <p className="text-sm text-muted-foreground leading-normal">
            The requested User Story could not be located in the database.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link href="/stories" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Stories workspace
      </Link>

      {/* Story Details Card Header */}
      <Card className="border-border bg-card shadow-md">
        <CardHeader className="pb-3 border-b border-border bg-muted/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">User Story Journey</span>
              <div className="flex items-center gap-2.5 flex-wrap">
                <CardTitle className="text-xl font-bold font-sans text-foreground">
                  {story.title}
                </CardTitle>
                {story.adoStoryLink && (
                  <a href={story.adoStoryLink} target="_blank" rel="noreferrer" className="text-primary p-1 hover:bg-muted rounded inline-flex items-center">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
            <div className="self-start sm:self-center">
              <StatusBadge status={story.overallStatus} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3 text-xs">
          <div className="space-y-1">
            <span className="text-muted-foreground font-semibold">Parent Task:</span>
            <p className="font-semibold text-foreground">
              {story.task ? (
                <Link href={`/tasks/${story.task._id}`} className="text-primary hover:underline">
                  {story.task.title}
                </Link>
              ) : (
                "None"
              )}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground font-semibold">Sprint Workspace:</span>
            <p className="font-semibold text-foreground">{story.sprint?.name || "Unassigned"}</p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground font-semibold">Pipeline Length:</span>
            <p className="font-semibold text-foreground flex items-center gap-1">
              <Layers className="h-3.5 w-3.5 text-primary" />
              {story.stagePlan.length} delivery stages mapped
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Centerpiece Journey Stepper Ladder */}
      <JourneyLadder story={story} stages={stages} onRefresh={fetchStoryDetails} />
    </div>
  );
}
