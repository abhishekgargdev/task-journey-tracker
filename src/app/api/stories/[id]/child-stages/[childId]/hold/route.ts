import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { StoryStage } from "@/models/StoryStage";
import { getSession } from "@/lib/session";
import { validateHoldDates } from "@/lib/story-hold";
import { syncParentStoryStatus } from "@/lib/sync-story-status";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; childId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: storyId, childId } = await params;
    const body = await request.json();
    const holdStartDate = body.holdStartDate ? new Date(body.holdStartDate) : new Date();
    const holdReason = body.holdReason?.trim() || "";

    const validationError = validateHoldDates(holdStartDate.toISOString(), null);
    if (validationError && validationError !== "Hold start date is required.") {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await dbConnect();

    const storyStage = await StoryStage.findOne({ _id: childId, storyId, isArchived: { $ne: true } });
    if (!storyStage) {
      return NextResponse.json({ error: "Story stage not found." }, { status: 404 });
    }

    if (storyStage.status === "on_hold") {
      return NextResponse.json({ error: "Stage is already on hold." }, { status: 400 });
    }

    if (storyStage.status === "completed") {
      return NextResponse.json({ error: "Cannot place a completed stage on hold." }, { status: 400 });
    }

    if (storyStage.actualEndDate && holdStartDate > storyStage.actualEndDate) {
      return NextResponse.json(
        { error: "Hold start date cannot be after actual end date." },
        { status: 400 }
      );
    }

    storyStage.statusBeforeHold = storyStage.status;
    storyStage.status = "on_hold";
    storyStage.holdHistory.push({
      holdStartDate,
      holdReason: holdReason || undefined,
    });

    await storyStage.save();
    await syncParentStoryStatus(storyId);

    const populated = await StoryStage.findById(storyStage._id)
      .populate("developBy", "name email status")
      .populate("stageId");

    return NextResponse.json(populated);
  } catch (error) {
    console.error("POST stage hold error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
