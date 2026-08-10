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

    story.isOnHold = false;
    story.holdReason = undefined;
    story.overallStatus = "in_progress";

    // Set resumedAt date on the open hold history entry
    const openHoldIndex = story.holdHistory.findIndex(h => !h.resumedAt);
    if (openHoldIndex !== -1) {
      story.holdHistory[openHoldIndex].resumedAt = new Date();
    }

    await story.save();

    // Set the current active stage status back to in_progress
    const activeStage = await StoryStage.findOne({ story: storyId, order: story.currentStageOrder });
    if (activeStage) {
      activeStage.status = "in_progress";
      await activeStage.save();
    }

    return NextResponse.json(story);
  } catch (error) {
    console.error("POST story resume error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
