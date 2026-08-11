import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Story } from "@/models/Story";
import { StoryStage } from "@/models/StoryStage";
import { StageDefinition } from "@/models/StageDefinition";
import { getSession } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: storyId } = await params;
    const { stagePlan } = await request.json(); // stagePlan is an array of stageId strings

    if (!stagePlan || !Array.isArray(stagePlan) || stagePlan.length < 1) {
      return NextResponse.json({ error: "Stage plan must have at least one stage definition." }, { status: 400 });
    }

    await dbConnect();

    const story = await Story.findById(storyId);
    if (!story) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 });
    }

    // Find all existing child stories for this story
    const existingChildStages = await StoryStage.find({ storyId });

    // Check for removed stages
    const newStageIdsSet = new Set(stagePlan);
    const removedStages = existingChildStages.filter(
      (cs) => !cs.isArchived && !newStageIdsSet.has(cs.stageId.toString())
    );

    // Validation: Block removal of any stage that has started (status !== "not_started")
    for (const rs of removedStages) {
      if (rs.status !== "not_started") {
        const stageDef = await StageDefinition.findById(rs.stageId);
        const stageName = stageDef ? stageDef.name : "Active Stage";
        return NextResponse.json(
          { error: `Cannot remove stage '${stageName}' because it has active progress.` },
          { status: 400 }
        );
      }
    }

    // 1. Delete removed stages
    for (const rs of removedStages) {
      // Check if there is actual work/data
      const hasWork =
        rs.status !== "not_started" ||
        rs.actualStartDate ||
        rs.actualEndDate ||
        rs.githubPrLink ||
        rs.branchName ||
        rs.notes ||
        rs.implementationDescription ||
        rs.developBy;

      if (hasWork) {
        rs.isArchived = true;
        rs.stageOrder = -1;
        await rs.save();
      } else {
        await StoryStage.findByIdAndDelete(rs._id);
      }
    }

    // 2. Resequence/Update kept stages and Create newly added stages
    for (let i = 0; i < stagePlan.length; i++) {
      const stageId = stagePlan[i];
      const newOrder = i + 1;

      const matched = existingChildStages.find((cs) => cs.stageId.toString() === stageId);
      if (matched) {
        matched.stageOrder = newOrder;
        matched.isArchived = false;
        await matched.save();
      } else {
        // Create new child stage
        const stageDef = await StageDefinition.findById(stageId);
        const stageName = stageDef ? stageDef.name : "Stage";

        await StoryStage.create({
          storyId,
          stageId,
          stageOrder: newOrder,
          taskName: `#${story.storyNumber}-${stageName}`,
          description: `Deliverable stage for ${stageName}`,
          plannedStartDate: story.plannedStartDate,
          plannedEndDate: story.plannedEndDate,
          status: "not_started",
        });
      }
    }

    // 3. Update story stageOrder
    story.stageOrder = stagePlan;
    await story.save();

    // Return the updated story populated
    const updatedStory = await Story.findById(storyId).populate("stageOrder");
    return NextResponse.json(updatedStory);
  } catch (error) {
    console.error("PATCH story stagePlan error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
