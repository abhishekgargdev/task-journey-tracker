import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { StoryStage } from "@/models/StoryStage";
import { UserStory } from "@/models/UserStory";
import { getSession } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: storyId, stageId } = await params;
    const updates = await request.json();

    await dbConnect();

    const storyStage = await StoryStage.findOne({ story: storyId, stage: stageId });
    if (!storyStage) {
      return NextResponse.json({ error: "Story stage not found." }, { status: 404 });
    }

    const allowedFields = [
      "plannedStartDate",
      "plannedEndDate",
      "actualStartDate",
      "actualEndDate",
      "status",
      "githubRepo",
      "branchName",
      "prLink",
      "assignedTo",
      "notes",
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        (storyStage as any)[field] = updates[field];
      }
    });

    await storyStage.save();

    // If this stage is the current active stage, synchronize the UserStory's overallStatus
    const story = await UserStory.findById(storyId);
    if (story && story.currentStageOrder === storyStage.order) {
      if (updates.status !== undefined) {
        story.overallStatus = updates.status;
        await story.save();
      }
    }

    return NextResponse.json(storyStage);
  } catch (error) {
    console.error("PATCH story stage error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
