import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { UserStory } from "@/models/UserStory";
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

    const story = await UserStory.findById(storyId);
    if (!story) {
      return NextResponse.json({ error: "User Story not found." }, { status: 404 });
    }

    const maxOrder = story.stagePlan.length;
    const currentOrder = story.currentStageOrder;

    // 1. Complete the current active stage
    const currentStage = await StoryStage.findOne({ story: storyId, order: currentOrder });
    if (currentStage) {
      currentStage.status = "completed";
      if (!currentStage.actualEndDate) {
        currentStage.actualEndDate = new Date();
      }
      await currentStage.save();
    }

    // 2. Determine progression
    if (currentOrder >= maxOrder) {
      // Completed the final stage in the plan
      story.overallStatus = "completed";
    } else {
      // Advance to the next stage in sequence
      const nextOrder = currentOrder + 1;
      story.currentStageOrder = nextOrder;
      story.overallStatus = "in_progress";

      const nextStage = await StoryStage.findOne({ story: storyId, order: nextOrder });
      if (nextStage) {
        nextStage.status = "in_progress";
        if (!nextStage.actualStartDate) {
          nextStage.actualStartDate = new Date();
        }
        await nextStage.save();
      }
    }

    await story.save();

    return NextResponse.json(story);
  } catch (error) {
    console.error("POST story advance error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
