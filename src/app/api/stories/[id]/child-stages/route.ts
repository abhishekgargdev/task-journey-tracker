import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Story } from "@/models/Story";
import { StoryStage } from "@/models/StoryStage";
import { getSession } from "@/lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: storyId } = await params;
    const body = await request.json();
    const { parentStoryStageId, taskName, sprintId, description, developBy, status } = body;

    if (!parentStoryStageId) {
      return NextResponse.json({ error: "Parent story stage is required." }, { status: 400 });
    }
    if (!taskName || !taskName.trim()) {
      return NextResponse.json({ error: "Sub-ticket name is required." }, { status: 400 });
    }

    await dbConnect();

    const story = await Story.findById(storyId);
    if (!story) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 });
    }

    const parentStage = await StoryStage.findOne({
      _id: parentStoryStageId,
      storyId,
      isArchived: { $ne: true },
    });

    if (!parentStage) {
      return NextResponse.json({ error: "Parent story stage not found." }, { status: 404 });
    }

    const siblingCount = await StoryStage.countDocuments({
      storyId,
      parentStoryStageId,
      isArchived: { $ne: true },
    });

    const childStage = await StoryStage.create({
      storyId,
      stageId: parentStage.stageId,
      parentStoryStageId,
      stageOrder: siblingCount + 1,
      taskName: taskName.trim(),
      description: description?.trim() || `Sub-ticket under ${parentStage.taskName}`,
      sprintId: sprintId?.trim() || "",
      developBy: developBy || undefined,
      status: status || "not_started",
      plannedStartDate: parentStage.plannedStartDate,
      plannedEndDate: parentStage.plannedEndDate,
    });

    const populated = await StoryStage.findById(childStage._id)
      .populate("developBy", "name email status")
      .populate("stageId");

    return NextResponse.json(populated, { status: 201 });
  } catch (error: unknown) {
    console.error("POST child stage error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
