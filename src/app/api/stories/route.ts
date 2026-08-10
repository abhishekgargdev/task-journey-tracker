import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { UserStory } from "@/models/UserStory";
import { StoryStage } from "@/models/StoryStage";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("task");
    const sprintId = searchParams.get("sprint");
    const status = searchParams.get("status");

    await dbConnect();

    const query: any = {};
    if (taskId) query.task = taskId;
    if (sprintId) query.sprint = sprintId;
    if (status) query.overallStatus = status;

    const stories = await UserStory.find(query)
      .populate("task")
      .populate("sprint")
      .populate("stagePlan.stage")
      .sort({ createdAt: -1 });

    return NextResponse.json(stories);
  } catch (error) {
    console.error("GET stories error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, adoStoryLink, task, sprint, stagePlan } = await request.json();

    if (!title || title.trim().length < 2) {
      return NextResponse.json({ error: "Story title is required (min 2 characters)." }, { status: 400 });
    }
    if (!task) {
      return NextResponse.json({ error: "Parent Task is required." }, { status: 400 });
    }
    if (!sprint) {
      return NextResponse.json({ error: "Target Sprint is required." }, { status: 400 });
    }
    if (!stagePlan || !Array.isArray(stagePlan) || stagePlan.length < 1) {
      return NextResponse.json({ error: "Stage plan must have at least one stage definition selected." }, { status: 400 });
    }

    await dbConnect();

    // Map stagePlan array of ids to sequential schema format
    const formattedPlan = stagePlan.map((stageId: string, index: number) => ({
      stage: stageId,
      order: index + 1,
    }));

    // Create the User Story. Default overallStatus is set to 'in_progress' because the first stage starts immediately
    const userStory = await UserStory.create({
      title: title.trim(),
      adoStoryLink: adoStoryLink?.trim() || "",
      task,
      sprint,
      stagePlan: formattedPlan,
      currentStageOrder: 1,
      overallStatus: "in_progress",
    });

    // Create StoryStage tickets for each step in stagePlan
    const storyStages = stagePlan.map((stageId: string, index: number) => ({
      story: userStory._id,
      stage: stageId,
      order: index + 1,
      status: index === 0 ? "in_progress" : "not_started",
    }));

    await StoryStage.insertMany(storyStages);

    return NextResponse.json(userStory, { status: 201 });
  } catch (error) {
    console.error("POST story error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
