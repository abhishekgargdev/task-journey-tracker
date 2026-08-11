import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { StoryStage } from "@/models/StoryStage";
import { getSession } from "@/lib/session";
import { validateHoldDates, inferStatusAfterHoldRelease } from "@/lib/story-hold";
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
    const holdReleasedDate = body.holdReleasedDate ? new Date(body.holdReleasedDate) : new Date();

    await dbConnect();

    const storyStage = await StoryStage.findOne({ _id: childId, storyId, isArchived: { $ne: true } });
    if (!storyStage) {
      return NextResponse.json({ error: "Story stage not found." }, { status: 404 });
    }

    if (storyStage.status !== "on_hold") {
      return NextResponse.json({ error: "Stage is not currently on hold." }, { status: 400 });
    }

    const openHold = [...storyStage.holdHistory].reverse().find((h) => !h.holdReleasedDate);
    if (!openHold) {
      return NextResponse.json({ error: "No active hold record found." }, { status: 400 });
    }

    const validationError = validateHoldDates(
      openHold.holdStartDate.toISOString(),
      holdReleasedDate.toISOString()
    );
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    openHold.holdReleasedDate = holdReleasedDate;

    const restoredStatus = inferStatusAfterHoldRelease({
      status: storyStage.status,
      statusBeforeHold: storyStage.statusBeforeHold,
      actualStartDate: storyStage.actualStartDate?.toISOString(),
      holdHistory: storyStage.holdHistory.map((h) => ({
        holdStartDate: h.holdStartDate.toISOString(),
        holdReleasedDate: h.holdReleasedDate?.toISOString(),
        holdReason: h.holdReason,
      })),
    });

    storyStage.status = restoredStatus;
    storyStage.statusBeforeHold = undefined;

    await storyStage.save();
    await syncParentStoryStatus(storyId);

    const populated = await StoryStage.findById(storyStage._id)
      .populate("developBy", "name email status")
      .populate("stageId");

    return NextResponse.json(populated);
  } catch (error) {
    console.error("POST stage release-hold error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
