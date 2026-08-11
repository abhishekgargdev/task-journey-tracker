import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Story } from "@/models/Story";
import { StoryUser } from "@/models/StoryUser";
import { StoryStage } from "@/models/StoryStage";
import { StageDefinition } from "@/models/StageDefinition";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const developerId = searchParams.get("developer");
    const search = searchParams.get("search");
    const overdueOnly = searchParams.get("overdue") === "true";

    await dbConnect();

    const query: any = {};
    if (status && status !== "all") {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { storyNumber: { $regex: search, $options: "i" } },
        { taskName: { $regex: search, $options: "i" } },
      ];
    }

    // Fetch stories matching basic query first
    let stories = await Story.find(query)
      .populate("stageOrder")
      .sort({ createdAt: -1 });

    // Enhance stories with their assigned users and child stages
    const enhancedStories = [];
    const now = new Date();

    for (const story of stories) {
      const storyUsers = await StoryUser.find({ storyId: story._id })
        .populate("userId", "name email status");
      
      const childStages = await StoryStage.find({ storyId: story._id })
        .populate("developBy", "name email status")
        .populate("stageId")
        .sort({ stageOrder: 1 });

      const assignedUsers = storyUsers.map((su) => su.userId).filter(Boolean);

      // Overdue calculation: parent plannedEndDate is passed, OR any incomplete child stage plannedEndDate is passed
      let isStoryOverdue = false;
      if (story.status !== "completed" && story.plannedEndDate && new Date(story.plannedEndDate) < now) {
        isStoryOverdue = true;
      } else {
        const hasOverdueStage = childStages.some(
          (cs) => cs.status !== "completed" && cs.plannedEndDate && new Date(cs.plannedEndDate) < now
        );
        if (hasOverdueStage) {
          isStoryOverdue = true;
        }
      }

      // Check if developer filter matches either parent users or child stage assignees
      let developerMatches = true;
      if (developerId && developerId !== "all") {
        const userAssignedToParent = assignedUsers.some((u: any) => u._id.toString() === developerId);
        const userAssignedToStage = childStages.some((cs) => cs.developBy?._id?.toString() === developerId);
        developerMatches = userAssignedToParent || userAssignedToStage;
      }

      if (overdueOnly && !isStoryOverdue) {
        continue;
      }

      if (!developerMatches) {
        continue;
      }

      // Serialize story with enhanced fields
      const storyObj = story.toObject();
      enhancedStories.push({
        ...storyObj,
        assignedUsers,
        childStages,
        isOverdue: isStoryOverdue,
      });
    }

    return NextResponse.json(enhancedStories);
  } catch (error) {
    console.error("GET stories error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      storyNumber,
      taskName,
      description,
      plannedStartDate,
      plannedEndDate,
      stageOrder,
      userIds,
    } = await request.json();

    // Validation
    if (!storyNumber || storyNumber.trim().length === 0) {
      return NextResponse.json({ error: "Story Number is required." }, { status: 400 });
    }
    if (!taskName || taskName.trim().length === 0) {
      return NextResponse.json({ error: "Task/Story Name is required." }, { status: 400 });
    }
    if (!plannedStartDate || !plannedEndDate) {
      return NextResponse.json({ error: "Planned Start and End Dates are required." }, { status: 400 });
    }

    const start = new Date(plannedStartDate);
    const end = new Date(plannedEndDate);
    if (end < start) {
      return NextResponse.json({ error: "Planned End Date cannot be before Planned Start Date." }, { status: 400 });
    }

    if (!stageOrder || !Array.isArray(stageOrder) || stageOrder.length === 0) {
      return NextResponse.json({ error: "At least one stage must be selected." }, { status: 400 });
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "At least one assigned user is required." }, { status: 400 });
    }

    await dbConnect();

    // Check duplicate Story Number
    const duplicate = await Story.findOne({ storyNumber: storyNumber.trim() });
    if (duplicate) {
      return NextResponse.json({ error: `Story #${storyNumber} already exists.` }, { status: 400 });
    }

    // Create Main Story
    const story = await Story.create({
      storyNumber: storyNumber.trim(),
      taskName: taskName.trim(),
      description: description || "",
      plannedStartDate: start,
      plannedEndDate: end,
      status: "not_started",
      stageOrder: stageOrder,
    });

    // Save selected users (StoryUser many-to-many relationship)
    for (const userId of userIds) {
      await StoryUser.create({
        storyId: story._id,
        userId: userId,
      });
    }

    // Auto-create Child Stories (StoryStage) for each selected stage
    for (let index = 0; index < stageOrder.length; index++) {
      const stageId = stageOrder[index];
      const stageDef = await StageDefinition.findById(stageId);
      const stageName = stageDef ? stageDef.name : "Stage";

      await StoryStage.create({
        storyId: story._id,
        stageId: stageId,
        stageOrder: index + 1,
        taskName: `#${storyNumber.trim()}-${stageName}`,
        description: `Deliverable stage for ${stageName}`,
        plannedStartDate: start, // Default to parent dates initially
        plannedEndDate: end,
        status: "not_started",
      });
    }

    return NextResponse.json(story, { status: 201 });
  } catch (error: any) {
    console.error("POST story error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
