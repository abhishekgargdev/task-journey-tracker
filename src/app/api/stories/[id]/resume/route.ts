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

    story.isOnHold = false;
    story.holdReason = undefined;
    story.status = "in_progress";

    await story.save();

    // Set the current active stage status back to in_progress
    const activeStages = await StoryStage.find({ storyId, isArchived: { $ne: true } })
      .sort({ stageOrder: 1 });
    
    const activeStage = activeStages.find((s) => s.status === "blocked" || s.status === "not_started");
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
