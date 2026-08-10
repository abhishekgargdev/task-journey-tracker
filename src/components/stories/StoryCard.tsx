"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getStoryStageDetails,
  type StoryItem,
  type StoryStage,
} from "@/lib/story-helpers";

interface StoryCardProps {
  story: StoryItem;
  storyStages: StoryStage[];
}

export default function StoryCard({ story, storyStages }: StoryCardProps) {
  const details = getStoryStageDetails(story, storyStages);
  const progressPct = details.total > 0 ? (details.completed / details.total) * 100 : 0;

  return (
    <Card className="shadow-sm border-border bg-card hover:border-primary/20 transition-all flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm font-bold text-foreground hover:text-primary transition-colors">
            <Link href={`/stories/${story._id}`}>{story.title}</Link>
          </CardTitle>
          {story.isOnHold && (
            <Badge className="bg-amber-500/10 text-amber-600 border-none text-[8px] font-bold shrink-0 py-0.5 px-1 flex items-center gap-0.5">
              <Clock className="h-2 w-2" />
              HOLD
            </Badge>
          )}
        </div>
        <CardDescription className="text-[10px] flex items-center gap-1.5">
          <span>
            Task:{" "}
            <Link href={`/tasks/${story.task?._id}`} className="text-primary hover:underline">
              {story.task?.title}
            </Link>
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3 pt-1 space-y-3">
        <div className="flex items-center justify-between text-xs gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase font-bold text-muted-foreground/60 tracking-wider">
              Active Stage
            </span>
            <Badge className="bg-secondary text-secondary-foreground border-none text-[10px] py-0 px-2 rounded-full font-medium">
              {details.name}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary"
              title={details.assignee?.name || "Unassigned"}
            >
              {details.assignee?.name
                ? details.assignee.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                : "?"}
            </div>
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
              {details.assignee?.name || "Unassigned"}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
            <span>Stages complete</span>
            <span>
              {details.completed}/{details.total}
            </span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2 border-t border-border flex justify-end">
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/stories/${story._id}`} />}
          className="text-xs h-7 cursor-pointer"
        >
          Track Journey
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}
