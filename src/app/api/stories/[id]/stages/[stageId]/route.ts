import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { StoryStage } from "@/models/StoryStage";
import { Story } from "@/models/Story";
import { StoryUser } from "@/models/StoryUser";
import { getSession } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: storyId, stageId } = await params;
    const updates = await request.json();

    await dbConnect();

    // Find the story stage
    const storyStage = await StoryStage.findOne({
      storyId,
      stageId,
      parentStoryStageId: null,
      isArchived: { $ne: true },
    });
    if (!storyStage) {
      return NextResponse.json({ error: "Story stage not found." }, { status: 404 });
    }

    // Map frontend field names to database schema names
    if (updates.assignedTo !== undefined) {
      updates.developBy = updates.assignedTo;
    }
    if (updates.prLink !== undefined) {
      updates.githubPrLink = updates.prLink;
    }

    // 1. Validate Assigned Developer (developBy)
    if (updates.developBy !== undefined && updates.developBy !== null && updates.developBy !== "") {
      const isAssignedToParent = await StoryUser.exists({
        storyId,
        userId: updates.developBy,
      });

      if (!isAssignedToParent) {
        return NextResponse.json({
          error: "Assigned developer must be selected/added as a member of the parent story first."
        }, { status: 400 });
      }
    }

    // 2. Validate dates
    let plannedStart = updates.plannedStartDate !== undefined ? (updates.plannedStartDate ? new Date(updates.plannedStartDate) : undefined) : storyStage.plannedStartDate;
    let plannedEnd = updates.plannedEndDate !== undefined ? (updates.plannedEndDate ? new Date(updates.plannedEndDate) : undefined) : storyStage.plannedEndDate;
    let actualStart = updates.actualStartDate !== undefined ? (updates.actualStartDate ? new Date(updates.actualStartDate) : undefined) : storyStage.actualStartDate;
    let actualEnd = updates.actualEndDate !== undefined ? (updates.actualEndDate ? new Date(updates.actualEndDate) : undefined) : storyStage.actualEndDate;

    if (plannedStart && plannedEnd && plannedEnd < plannedStart) {
      return NextResponse.json({ error: "Planned End Date cannot be before Planned Start Date." }, { status: 400 });
    }
    if (actualStart && actualEnd && actualEnd < actualStart) {
      return NextResponse.json({ error: "Actual End Date cannot be before Actual Start Date." }, { status: 400 });
    }

    // 3. Update fields
    const allowedFields = [
      "plannedStartDate",
      "plannedEndDate",
      "actualStartDate",
      "actualEndDate",
      "status",
      "githubRepo",
      "branchName",
      "githubPrLink", // maps from githubPrLink
      "prStatus",
      "developBy", // maps to developBy
      "notes",
      "implementationDescription",
      "adoStoryLink",
      "sprintId",
      "hasSprintId",
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        let value = updates[field];
        if (field === "plannedStartDate" || field === "plannedEndDate" || field === "actualStartDate" || field === "actualEndDate") {
          value = value ? new Date(value) : null;
        }
        if (field === "developBy") {
          value = value || null;
        }
        if (field === "hasSprintId" && !value) {
          storyStage.sprintId = "";
        }
        (storyStage as any)[field] = value;
      }
    });

    // 4. Overdue Date Tracking calculations for Child Stage
    const now = new Date();
    // If the status is not completed, check if plannedEndDate is in the past to mark it as delayed
    if (storyStage.status !== "completed") {
      if (storyStage.plannedEndDate && new Date(storyStage.plannedEndDate) < now) {
        storyStage.status = "delayed";
      }
    }

    await storyStage.save();

    // 5. Synchronize Parent Story Status
    const parentStory = await Story.findById(storyId);
    if (parentStory) {
      const activeStages = await StoryStage.find({ storyId, isArchived: { $ne: true } });

      const allCompleted = activeStages.every((s) => s.status === "completed");
      const anyBlocked = activeStages.some((s) => s.status === "blocked");
      const anyDelayed = activeStages.some((s) => s.status === "delayed" || (s.status !== "completed" && s.plannedEndDate && new Date(s.plannedEndDate) < now));
      const allNotStarted = activeStages.every((s) => s.status === "not_started");

      let newStatus: "not_started" | "in_progress" | "blocked" | "completed" | "delayed" = "in_progress";
      if (allCompleted) {
        newStatus = "completed";
        parentStory.actualEndDate = new Date();
      } else if (anyBlocked) {
        newStatus = "blocked";
      } else if (anyDelayed) {
        newStatus = "delayed";
      } else if (allNotStarted) {
        newStatus = "not_started";
      }

      parentStory.status = newStatus;
      
      // Auto-populate actualStartDate if it's the first active/in-progress child stage
      const hasAnyStarted = activeStages.some((s) => s.status !== "not_started");
      if (hasAnyStarted && !parentStory.actualStartDate) {
        parentStory.actualStartDate = new Date();
      }

      await parentStory.save();
    }

    return NextResponse.json(storyStage);
  } catch (error: any) {
    console.error("PATCH story stage error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
