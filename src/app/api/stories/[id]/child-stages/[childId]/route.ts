import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { StoryStage } from "@/models/StoryStage";
import { StoryUser } from "@/models/StoryUser";
import { getSession } from "@/lib/session";
import { syncParentStoryStatus } from "@/lib/sync-story-status";

async function deleteStageAndDescendants(storyId: string, stageId: string) {
  const children = await StoryStage.find({ storyId, parentStoryStageId: stageId });
  for (const child of children) {
    await deleteStageAndDescendants(storyId, child._id.toString());
  }
  await StoryStage.findByIdAndDelete(stageId);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; childId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: storyId, childId } = await params;
    const updates = await request.json();

    await dbConnect();

    const storyStage = await StoryStage.findOne({ _id: childId, storyId, isArchived: { $ne: true } });
    if (!storyStage) {
      return NextResponse.json({ error: "Story stage not found." }, { status: 404 });
    }

    if (updates.assignedTo !== undefined) updates.developBy = updates.assignedTo;
    if (updates.prLink !== undefined) updates.githubPrLink = updates.prLink;

    if (updates.developBy !== undefined && updates.developBy !== null && updates.developBy !== "") {
      const isAssignedToParent = await StoryUser.exists({ storyId, userId: updates.developBy });
      if (!isAssignedToParent) {
        return NextResponse.json({
          error: "Assigned developer must be selected/added as a member of the parent story first.",
        }, { status: 400 });
      }
    }

    if (updates.status === "on_hold") {
      return NextResponse.json(
        { error: "Use Place on Hold action to set a stage on hold." },
        { status: 400 }
      );
    }

    const allowedFields = [
      "plannedStartDate", "plannedEndDate", "actualStartDate", "actualEndDate",
      "status", "githubRepo", "branchName", "githubPrLink", "prStatus",
      "developBy", "notes", "implementationDescription", "adoStoryLink", "sprintId", "hasSprintId", "taskName",
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        let value = updates[field];
        if (["plannedStartDate", "plannedEndDate", "actualStartDate", "actualEndDate"].includes(field)) {
          value = value ? new Date(value) : null;
        }
        if (field === "developBy") value = value || null;
        if (field === "hasSprintId" && !value) storyStage.sprintId = "";
        (storyStage as any)[field] = value;
      }
    });

    await storyStage.save();
    await syncParentStoryStatus(storyId);

    const populated = await StoryStage.findById(storyStage._id)
      .populate("developBy", "name email status")
      .populate("stageId");

    return NextResponse.json(populated);
  } catch (error: unknown) {
    console.error("PATCH child stage error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; childId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: storyId, childId } = await params;

    await dbConnect();

    const childStage = await StoryStage.findOne({ _id: childId, storyId });
    if (!childStage) {
      return NextResponse.json({ error: "Child stage not found." }, { status: 404 });
    }

    if (!childStage.parentStoryStageId) {
      return NextResponse.json(
        { error: "Cannot delete a top-level stage ticket from here. Use stage plan editor instead." },
        { status: 400 }
      );
    }

    await deleteStageAndDescendants(storyId, childId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE child stage error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
