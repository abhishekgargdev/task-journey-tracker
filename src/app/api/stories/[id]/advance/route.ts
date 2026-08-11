import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Story } from "@/models/Story";
import { StoryStage } from "@/models/StoryStage";
import { getSession } from "@/lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: storyId } = await params;

    await dbConnect();

    const story = await Story.findById(storyId);
    if (!story) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 });
    }

    // Get active child stages in sequence
    const activeStages = await StoryStage.find({ storyId, isArchived: { $ne: true } })
      .sort({ stageOrder: 1 });

    if (activeStages.length === 0) {
      return NextResponse.json({ error: "No stages found in story plan." }, { status: 400 });
    }

    // Find the current active stage (first stage that is not completed)
    const currentActiveStageIndex = activeStages.findIndex((s) => s.status !== "completed");

    if (currentActiveStageIndex === -1) {
      // All stages are already completed
      story.status = "completed";
      if (!story.actualEndDate) {
        story.actualEndDate = new Date();
      }
      await story.save();
      return NextResponse.json(story);
    }

    const currentStage = activeStages[currentActiveStageIndex];
    
    // 1. Complete the current active stage
    currentStage.status = "completed";
    if (!currentStage.actualEndDate) {
      currentStage.actualEndDate = new Date();
    }
    await currentStage.save();

    // 2. Start the next stage if it exists
    if (currentActiveStageIndex + 1 < activeStages.length) {
      const nextStage = activeStages[currentActiveStageIndex + 1];
      nextStage.status = "in_progress";
      if (!nextStage.actualStartDate) {
        nextStage.actualStartDate = new Date();
      }
      await nextStage.save();
      story.status = "in_progress";
    } else {
      // Completed the final stage in the plan
      story.status = "completed";
      if (!story.actualEndDate) {
        story.actualEndDate = new Date();
      }
    }

    // Recalculate parent actualStartDate if not set
    if (!story.actualStartDate) {
      story.actualStartDate = new Date();
    }

    await story.save();

    return NextResponse.json(story);
  } catch (error) {
    console.error("POST story advance error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
