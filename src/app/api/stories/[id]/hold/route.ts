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
    const { reason } = await request.json();

    if (!reason || reason.trim().length < 2) {
      return NextResponse.json({ error: "Hold reason must be at least 2 characters." }, { status: 400 });
    }

    await dbConnect();

    const story = await UserStory.findById(storyId);
    if (!story) {
      return NextResponse.json({ error: "User Story not found." }, { status: 404 });
    }

    story.isOnHold = true;
    story.holdReason = reason.trim();
    story.overallStatus = "on_hold";
    story.holdHistory.push({
      reason: reason.trim(),
      heldAt: new Date(),
      heldBy: session.userId as any,
    });

    await story.save();

    // Set the current active stage status to on_hold
    const activeStage = await StoryStage.findOne({ story: storyId, order: story.currentStageOrder });
    if (activeStage) {
      activeStage.status = "on_hold";
      await activeStage.save();
    }

    return NextResponse.json(story);
  } catch (error) {
    console.error("POST story hold error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
