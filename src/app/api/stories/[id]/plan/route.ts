import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { UserStory } from "@/models/UserStory";
import { StoryStage } from "@/models/StoryStage";
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
    const { stagePlan } = await request.json();

    if (!stagePlan || !Array.isArray(stagePlan) || stagePlan.length < 1) {
      return NextResponse.json({ error: "Stage plan must have at least one stage definition." }, { status: 400 });
    }

    await dbConnect();

    const story = await UserStory.findById(storyId);
    if (!story) {
      return NextResponse.json({ error: "User Story not found." }, { status: 404 });
    }

    // Fetch existing StoryStage documents for this story
    const existingStoryStages = await StoryStage.find({ story: storyId }).populate("stage");
    
    // Create map based on stage ID string
    const existingStagesMap = new Map();
    existingStoryStages.forEach((ss) => {
      const idStr = ss.stage._id ? ss.stage._id.toString() : ss.stage.toString();
      existingStagesMap.set(idStr, ss);
    });

    // Check for removed stages
    const newStageIdsSet = new Set(stagePlan);
    const removedStages = existingStoryStages.filter((ss) => {
      const idStr = ss.stage._id ? ss.stage._id.toString() : ss.stage.toString();
      return !newStageIdsSet.has(idStr);
    });

    // Validation: Block removal of any stage that has started (status !== "not_started")
    for (const rs of removedStages) {
      if (rs.status !== "not_started") {
        const stageName = (rs.stage as any)?.name || "Active Stage";
        return NextResponse.json(
          { error: `Cannot remove stage '${stageName}' because it has active progress.` },
          { status: 400 }
        );
      }
    }

    // Identify which stage was active before modification
    const oldActivePlanEntry = story.stagePlan.find((sp) => sp.order === story.currentStageOrder);
    const oldActiveStageId = oldActivePlanEntry?.stage.toString();

    // 1. Delete removed stages
    const removedIds = removedStages.map((rs) => rs._id);
    if (removedIds.length > 0) {
      await StoryStage.deleteMany({ _id: { $in: removedIds } });
    }

    // 2. Resequence/Update kept stages and Create newly added stages
    const updatedPlan = [];
    for (let i = 0; i < stagePlan.length; i++) {
      const stageId = stagePlan[i];
      const newOrder = i + 1;

      updatedPlan.push({
        stage: stageId,
        order: newOrder,
      });

      const existingSS = existingStagesMap.get(stageId);
      if (existingSS) {
        // Resequence order
        existingSS.order = newOrder;
        await existingSS.save();
      } else {
        // Create new StoryStage
        await StoryStage.create({
          story: storyId,
          stage: stageId,
          order: newOrder,
          status: "not_started",
        });
      }
    }

    // 3. Update story.currentStageOrder based on the position of the active stage
    if (oldActiveStageId) {
      const newActiveOrderIndex = stagePlan.indexOf(oldActiveStageId);
      if (newActiveOrderIndex !== -1) {
        story.currentStageOrder = newActiveOrderIndex + 1;
      } else {
        // Fallback: If active stage is missing, keep at 1
        story.currentStageOrder = 1;
      }
    } else {
      story.currentStageOrder = 1;
    }

    // 4. Save story's new plan
    story.stagePlan = updatedPlan as any;
    await story.save();

    // Fetch the updated story with populated stage definitions to return
    const updatedStory = await UserStory.findById(storyId)
      .populate("task")
      .populate("sprint")
      .populate("stagePlan.stage");

    return NextResponse.json(updatedStory);
  } catch (error) {
    console.error("PATCH story stagePlan error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
