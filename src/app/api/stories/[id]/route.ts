import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Story } from "@/models/Story";
import { StoryUser } from "@/models/StoryUser";
import { StoryStage } from "@/models/StoryStage";
import { StageDefinition } from "@/models/StageDefinition";
import { getSession } from "@/lib/session";

// GET single story details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await dbConnect();

    const story = await Story.findById(id).populate("stageOrder");
    if (!story) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 });
    }

    // Find assigned users
    const storyUsers = await StoryUser.find({ storyId: id })
      .populate("userId", "name email status");
    const assignedUsers = storyUsers.map((su) => su.userId).filter(Boolean);

    // Find active child stages
    const childStages = await StoryStage.find({ storyId: id, isArchived: { $ne: true } })
      .populate("developBy", "name email status")
      .populate("stageId")
      .sort({ stageOrder: 1 });

    const responseData = {
      ...story.toObject(),
      assignedUsers,
      childStages,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("GET story detail error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH update story details
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    await dbConnect();

    const story = await Story.findById(id);
    if (!story) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 });
    }

    // 1. Validate unique storyNumber if changed
    if (body.storyNumber !== undefined && body.storyNumber !== story.storyNumber) {
      const duplicate = await Story.findOne({ storyNumber: body.storyNumber.trim() });
      if (duplicate) {
        return NextResponse.json({ error: `Story #${body.storyNumber} already exists.` }, { status: 400 });
      }
      story.storyNumber = body.storyNumber.trim();
    }

    // 2. Validate planned dates if provided
    let plannedStart = story.plannedStartDate;
    let plannedEnd = story.plannedEndDate;

    if (body.plannedStartDate !== undefined) {
      plannedStart = new Date(body.plannedStartDate);
    }
    if (body.plannedEndDate !== undefined) {
      plannedEnd = new Date(body.plannedEndDate);
    }

    if (plannedEnd < plannedStart) {
      return NextResponse.json({ error: "Planned End Date cannot be before Planned Start Date." }, { status: 400 });
    }

    if (body.plannedStartDate !== undefined) story.plannedStartDate = plannedStart;
    if (body.plannedEndDate !== undefined) story.plannedEndDate = plannedEnd;

    // Update other simple fields
    if (body.taskName !== undefined) story.taskName = body.taskName.trim();
    if (body.description !== undefined) story.description = body.description;
    if (body.sprintUrl !== undefined) story.sprintUrl = body.sprintUrl?.trim() || "";
    if (body.actualStartDate !== undefined) story.actualStartDate = body.actualStartDate ? new Date(body.actualStartDate) : undefined;
    if (body.actualEndDate !== undefined) story.actualEndDate = body.actualEndDate ? new Date(body.actualEndDate) : undefined;
    if (body.status !== undefined) story.status = body.status;

    // 3. User updates & validation (Many-to-many relationship)
    if (body.userIds !== undefined && Array.isArray(body.userIds)) {
      // Find current StoryUser records
      const currentStoryUsers = await StoryUser.find({ storyId: id });
      const currentUserIds = currentStoryUsers.map((su) => su.userId.toString());

      // Identify users who are being removed
      const removedUserIds = currentUserIds.filter((uid) => !body.userIds.includes(uid));

      // Check if any removed user is currently assigned to an active child stage story
      if (removedUserIds.length > 0) {
        const assignedChildStories = await StoryStage.find({
          storyId: id,
          isArchived: { $ne: true },
          developBy: { $in: removedUserIds },
        }).populate("developBy", "name");

        if (assignedChildStories.length > 0) {
          const names = assignedChildStories.map((cs: any) => cs.developBy?.name).filter(Boolean);
          const uniqueNames = Array.from(new Set(names));
          return NextResponse.json({
            error: `Cannot remove developer(s): ${uniqueNames.join(", ")} is currently assigned to one or more active child stages. Please reassign the child stages first.`
          }, { status: 400 });
        }
      }

      // Update StoryUser records (delete old, insert new)
      await StoryUser.deleteMany({ storyId: id });
      for (const uid of body.userIds) {
        await StoryUser.create({
          storyId: id,
          userId: uid,
        });
      }
    }

    // 4. Stage updates & validation
    if (body.stageOrder !== undefined && Array.isArray(body.stageOrder)) {
      if (body.stageOrder.length === 0) {
        return NextResponse.json({ error: "At least one stage must be selected." }, { status: 400 });
      }

      const newStageIds = body.stageOrder.map((sid: string) => sid.toString());

      // Find all existing child stories for this story
      const existingChildStages = await StoryStage.find({ storyId: id });

      // Find removed stages
      const removedStages = existingChildStages.filter(
        (cs) => !cs.isArchived && !newStageIds.includes(cs.stageId.toString())
      );

      // Handle removed stages safely
      for (const removed of removedStages) {
        // Check if there is actual work/data
        const hasWork =
          removed.status !== "not_started" ||
          removed.actualStartDate ||
          removed.actualEndDate ||
          removed.githubPrLink ||
          removed.branchName ||
          removed.notes ||
          removed.implementationDescription ||
          removed.developBy;

        if (hasWork) {
          // Archive/deactivate child stage, do not delete
          removed.isArchived = true;
          removed.stageOrder = -1; // Detached order
          await removed.save();
        } else {
          // Hard delete since there's no work/data
          await StoryStage.findByIdAndDelete(removed._id);
        }
      }

      // Handle active stages: insert new or update order
      for (let index = 0; index < newStageIds.length; index++) {
        const stageId = newStageIds[index];
        const order = index + 1;

        // Check if a child stage exists (could be archived or active)
        const matched = existingChildStages.find((cs) => cs.stageId.toString() === stageId);

        if (matched) {
          // Update order and restore if archived
          matched.stageOrder = order;
          matched.isArchived = false;
          await matched.save();
        } else {
          // Create new child stage
          const stageDef = await StageDefinition.findById(stageId);
          const stageName = stageDef ? stageDef.name : "Stage";

          await StoryStage.create({
            storyId: id,
            stageId: stageId,
            stageOrder: order,
            taskName: `#${story.storyNumber}-${stageName}`,
            description: `Deliverable stage for ${stageName}`,
            plannedStartDate: plannedStart,
            plannedEndDate: plannedEnd,
            status: "not_started",
          });
        }
      }

      story.stageOrder = newStageIds;
    }

    await story.save();

    // Fetch and return the fully enhanced updated story
    const updatedStory = await Story.findById(id).populate("stageOrder");
    const storyUsers = await StoryUser.find({ storyId: id })
      .populate("userId", "name email status");
    const assignedUsers = storyUsers.map((su) => su.userId).filter(Boolean);

    const childStages = await StoryStage.find({ storyId: id, isArchived: { $ne: true } })
      .populate("developBy", "name email status")
      .populate("stageId")
      .sort({ stageOrder: 1 });

    return NextResponse.json({
      ...updatedStory!.toObject(),
      assignedUsers,
      childStages,
    });
  } catch (error: any) {
    console.error("PATCH story detail error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

// DELETE user story and its relationships
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await dbConnect();

    const story = await Story.findById(id);
    if (!story) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 });
    }

    // Delete relationships
    await StoryUser.deleteMany({ storyId: id });
    await StoryStage.deleteMany({ storyId: id });
    await Story.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE story error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
