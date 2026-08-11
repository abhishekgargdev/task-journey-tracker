import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Story } from "@/models/Story";
import { StoryUser } from "@/models/StoryUser";
import { StoryStage } from "@/models/StoryStage";
import { StageDefinition } from "@/models/StageDefinition";
import mongoose from "mongoose";
import { getSession } from "@/lib/session";

async function createSubTicketsRecursively(
  storyId: mongoose.Types.ObjectId,
  parentStage: { _id: mongoose.Types.ObjectId; stageId: mongoose.Types.ObjectId; plannedStartDate?: Date; plannedEndDate?: Date; taskName: string },
  subTickets: Array<{
    taskName?: string;
    description?: string;
    sprintId?: string;
    hasSprintId?: boolean;
    plannedStartDate?: string;
    plannedEndDate?: string;
    actualStartDate?: string;
    actualEndDate?: string;
    developBy?: string;
    branchName?: string;
    githubRepo?: string;
    status?: string;
    prStatus?: string;
    githubPrLink?: string;
    notes?: string;
    implementationDescription?: string;
    adoStoryLink?: string;
    subTickets?: unknown[];
  }>
) {
  for (let i = 0; i < subTickets.length; i++) {
    const sub = subTickets[i];
    const subStage = await StoryStage.create({
      storyId,
      stageId: parentStage.stageId,
      parentStoryStageId: parentStage._id,
      stageOrder: i + 1,
      taskName: sub.taskName?.trim() || `Sub-ticket ${i + 1}`,
      description: sub.description?.trim() || `Sub-ticket under ${parentStage.taskName}`,
      sprintId: sub.hasSprintId && sub.sprintId ? sub.sprintId.trim() : "",
      hasSprintId: Boolean(sub.hasSprintId),
      plannedStartDate: sub.plannedStartDate ? new Date(sub.plannedStartDate) : parentStage.plannedStartDate,
      plannedEndDate: sub.plannedEndDate ? new Date(sub.plannedEndDate) : parentStage.plannedEndDate,
      actualStartDate: sub.actualStartDate ? new Date(sub.actualStartDate) : undefined,
      actualEndDate: sub.actualEndDate ? new Date(sub.actualEndDate) : undefined,
      developBy: sub.developBy || undefined,
      branchName: sub.branchName?.trim() || "",
      githubRepo: sub.githubRepo?.trim() || "",
      status: (sub.status as "not_started" | "in_progress" | "blocked" | "completed" | "delayed") || "not_started",
      prStatus: (sub.prStatus as "none" | "pending" | "merged") || "none",
      githubPrLink: sub.githubPrLink?.trim() || "",
      notes: sub.notes?.trim() || "",
      implementationDescription: sub.implementationDescription?.trim() || "",
      adoStoryLink: sub.adoStoryLink?.trim() || "",
    });

    if (sub.subTickets && Array.isArray(sub.subTickets) && sub.subTickets.length > 0) {
      await createSubTicketsRecursively(storyId, subStage, sub.subTickets as typeof subTickets);
    }
  }
}

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
    const sprint = searchParams.get("sprint");

    await dbConnect();

    const query: any = {};
    if (status && status !== "all") {
      query.status = status;
    }

    if (sprint === "assigned") {
      query.hasSprint = true;
    } else if (sprint === "none") {
      query.hasSprint = false;
    }

    const overdueOnly = searchParams.get("overdue") === "true";

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
      sprintUrl,
      hasSprint,
      plannedStartDate,
      plannedEndDate,
      stageOrder,
      userIds,
      stagesDetails, // Array of stage details: { stageId, plannedStartDate, plannedEndDate, developBy, description, branchName, githubRepo }
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

    // Validate that custom stage developers are members of the parent story
    if (stagesDetails && Array.isArray(stagesDetails)) {
      const userIdsSet = new Set(userIds);
      for (const detail of stagesDetails) {
        if (detail.developBy && !userIdsSet.has(detail.developBy)) {
          return NextResponse.json(
            { error: "Cannot assign a developer to a stage who is not selected as a story member." },
            { status: 400 }
          );
        }
        if (detail.plannedStartDate && detail.plannedEndDate) {
          const sDate = new Date(detail.plannedStartDate);
          const eDate = new Date(detail.plannedEndDate);
          if (eDate < sDate) {
            return NextResponse.json(
              { error: "Child stage planned end date cannot be before planned start date." },
              { status: 400 }
            );
          }
        }
      }
    }

    // Create Main Story
    const story = await Story.create({
      storyNumber: storyNumber.trim(),
      taskName: taskName.trim(),
      description: description || "",
      sprintUrl: hasSprint && sprintUrl ? sprintUrl.trim() : "",
      hasSprint: Boolean(hasSprint),
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
    const createdStages = [];
    for (let index = 0; index < stageOrder.length; index++) {
      const stageId = stageOrder[index];
      const stageDef = await StageDefinition.findById(stageId);
      const stageName = stageDef ? stageDef.name : "Stage";

      // Match custom stage details if provided
      const customDetail = stagesDetails?.find((d: any) => d.stageId === stageId.toString());

      const stagePlannedStart = customDetail?.plannedStartDate ? new Date(customDetail.plannedStartDate) : start;
      const stagePlannedEnd = customDetail?.plannedEndDate ? new Date(customDetail.plannedEndDate) : end;
      const stageActualStart = customDetail?.actualStartDate ? new Date(customDetail.actualStartDate) : undefined;
      const stageActualEnd = customDetail?.actualEndDate ? new Date(customDetail.actualEndDate) : undefined;
      const stageDev = customDetail?.developBy || undefined;
      const stageDesc = customDetail?.description?.trim() || `Deliverable stage for ${stageName}`;
      const stageBranch = customDetail?.branchName?.trim() || "";
      const stageRepo = customDetail?.githubRepo?.trim() || "";
      const stageStatus = customDetail?.status || "not_started";
      const stagePrStatus = customDetail?.prStatus || "none";
      const stagePrLink = customDetail?.githubPrLink?.trim() || "";
      const stageNotes = customDetail?.notes?.trim() || "";
      const stageImplDesc = customDetail?.implementationDescription?.trim() || "";
      const stageAdoLink = customDetail?.adoStoryLink?.trim() || "";
      const stageSprintId = customDetail?.hasSprintId && customDetail?.sprintId
        ? customDetail.sprintId.trim()
        : "";

      const childStage = await StoryStage.create({
        storyId: story._id,
        stageId: stageId,
        stageOrder: index + 1,
        taskName: `#${storyNumber.trim()}-${stageName}`,
        description: stageDesc,
        sprintId: stageSprintId,
        hasSprintId: Boolean(customDetail?.hasSprintId),
        plannedStartDate: stagePlannedStart,
        plannedEndDate: stagePlannedEnd,
        actualStartDate: stageActualStart,
        actualEndDate: stageActualEnd,
        developBy: stageDev,
        branchName: stageBranch,
        githubRepo: stageRepo,
        status: stageStatus,
        prStatus: stagePrStatus,
        githubPrLink: stagePrLink,
        notes: stageNotes,
        implementationDescription: stageImplDesc,
        adoStoryLink: stageAdoLink,
      });

      createdStages.push(childStage);

      // Create nested sub-tickets if provided
      if (customDetail?.subTickets && Array.isArray(customDetail.subTickets)) {
        await createSubTicketsRecursively(story._id, childStage, customDetail.subTickets);
      }
    }

    // Synchronize parent overall status based on child statuses
    const statuses = createdStages.map((cs) => cs.status);
    let computedStatus: "not_started" | "in_progress" | "blocked" | "completed" | "delayed" = "not_started";

    if (statuses.length > 0) {
      if (statuses.every((s) => s === "completed")) {
        computedStatus = "completed";
      } else if (statuses.includes("blocked")) {
        computedStatus = "blocked";
      } else if (statuses.includes("delayed")) {
        computedStatus = "delayed";
      } else if (statuses.every((s) => s === "not_started")) {
        computedStatus = "not_started";
      } else {
        computedStatus = "in_progress";
      }
    }

    story.status = computedStatus;
    await story.save();

    return NextResponse.json(story, { status: 201 });
  } catch (error: any) {
    console.error("POST story error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
