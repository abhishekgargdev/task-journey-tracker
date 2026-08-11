import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Story } from "@/models/Story";
import { StoryStage } from "@/models/StoryStage";
import { getSession } from "@/lib/session";
import { inferStatusAfterHoldRelease } from "@/lib/story-hold";
import { syncParentStoryStatus } from "@/lib/sync-story-status";

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

    story.isOnHold = false;
    story.holdReason = undefined;
    story.status = "in_progress";

    await story.save();

    // Set the current active stage status back to in_progress
    const activeStages = await StoryStage.find({ storyId, isArchived: { $ne: true } })
      .sort({ stageOrder: 1 });
    
    const activeStage = activeStages.find(
      (s) => !s.parentStoryStageId && (s.status === "on_hold" || s.status === "blocked")
    );
    if (activeStage && activeStage.status === "on_hold") {
      const openHold = [...activeStage.holdHistory].reverse().find((h) => !h.holdReleasedDate);
      if (openHold) openHold.holdReleasedDate = new Date();
      activeStage.status = inferStatusAfterHoldRelease({
        status: activeStage.status,
        statusBeforeHold: activeStage.statusBeforeHold,
        actualStartDate: activeStage.actualStartDate?.toISOString(),
        holdHistory: activeStage.holdHistory.map((h) => ({
          holdStartDate: h.holdStartDate.toISOString(),
          holdReleasedDate: h.holdReleasedDate?.toISOString(),
        })),
      });
      activeStage.statusBeforeHold = undefined;
      await activeStage.save();
    } else if (activeStage) {
      activeStage.status = "in_progress";
      await activeStage.save();
    }

    await syncParentStoryStatus(storyId);

    return NextResponse.json(story);
  } catch (error) {
    console.error("POST story resume error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
