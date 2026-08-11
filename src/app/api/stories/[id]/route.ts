import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { UserStory } from "@/models/UserStory";
import { StoryStage } from "@/models/StoryStage";
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

    const story = await UserStory.findById(id)
      .populate("task")
      .populate("sprint")
      .populate("assignedTo", "name email")
      .populate("stagePlan.stage");

    if (!story) {
      return NextResponse.json({ error: "User Story not found." }, { status: 404 });
    }

    return NextResponse.json(story);
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
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    await dbConnect();

    const story = await UserStory.findById(id);
    if (!story) {
      return NextResponse.json({ error: "User Story not found." }, { status: 404 });
    }

    // Update fields if provided
    if (body.title !== undefined) story.title = body.title.trim();
    if (body.description !== undefined) story.description = body.description;
    if (body.adoStoryLink !== undefined) story.adoStoryLink = body.adoStoryLink.trim();
    if (body.sprint !== undefined) story.sprint = body.sprint;
    if (body.assignedTo !== undefined) story.assignedTo = body.assignedTo || null;
    
    if (body.state !== undefined) {
      story.state = body.state;
      // Sync overallStatus based on State
      if (body.state === "Closed") {
        story.overallStatus = "completed";
      } else if (body.state === "Active") {
        story.overallStatus = "in_progress";
      } else if (body.state === "New") {
        story.overallStatus = "not_started";
      }
    }

    if (body.plannedStartDate !== undefined) story.plannedStartDate = body.plannedStartDate || null;
    if (body.plannedEndDate !== undefined) story.plannedEndDate = body.plannedEndDate || null;
    if (body.actualStartDate !== undefined) story.actualStartDate = body.actualStartDate || null;
    if (body.actualEndDate !== undefined) story.actualEndDate = body.actualEndDate || null;

    await story.save();

    const updated = await UserStory.findById(id)
      .populate("task")
      .populate("sprint")
      .populate("assignedTo", "name email")
      .populate("stagePlan.stage");

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH story detail error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE user story and its story stages
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

    const story = await UserStory.findById(id);
    if (!story) {
      return NextResponse.json({ error: "User Story not found." }, { status: 404 });
    }

    // Delete related StoryStages
    await StoryStage.deleteMany({ story: id });
    
    // Delete UserStory
    await UserStory.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE story error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
