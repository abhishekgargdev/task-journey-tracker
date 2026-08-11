import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Story } from "@/models/Story";
import { StoryStage } from "@/models/StoryStage";
import { getSession } from "@/lib/session";
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
    const { reason } = await request.json();

    if (!reason || reason.trim().length < 2) {
      return NextResponse.json({ error: "Hold reason must be at least 2 characters." }, { status: 400 });
    }

    await dbConnect();

    const story = await Story.findById(storyId);
    if (!story) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 });
    }

    story.isOnHold = true;
    story.holdReason = reason.trim();
    story.status = "blocked"; // Maps to blocked status

    await story.save();

    // Set the current active stage status to blocked/on_hold
    const activeStages = await StoryStage.find({ storyId, isArchived: { $ne: true } })
      .sort({ stageOrder: 1 });
    
    const activeStage = activeStages.find((s) => s.status !== "completed" && !s.parentStoryStageId);
    if (activeStage && activeStage.status !== "on_hold") {
      activeStage.statusBeforeHold = activeStage.status;
      activeStage.status = "on_hold";
      activeStage.holdHistory.push({
        holdStartDate: new Date(),
        holdReason: reason.trim(),
      });
      await activeStage.save();
    }

    await syncParentStoryStatus(storyId);

    return NextResponse.json(story);
  } catch (error) {
    console.error("POST story hold error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
