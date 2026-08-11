import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { StageDefinition } from "@/models/StageDefinition";
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

    const { id } = await params;
    const { name, description, colorTag, isActive, parentStageId } = await request.json();

    await dbConnect();
    const stage = await StageDefinition.findById(id);
    if (!stage) {
      return NextResponse.json({ error: "Stage not found." }, { status: 404 });
    }

    if (name !== undefined) stage.name = name;
    if (description !== undefined) stage.description = description;
    if (colorTag !== undefined) stage.colorTag = colorTag;
    if (isActive !== undefined) stage.isActive = isActive;
    if (parentStageId !== undefined) {
      stage.parentStageId = parentStageId || null;
    }

    await stage.save();

    return NextResponse.json(stage);
  } catch (error) {
    console.error("PATCH stage error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

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

    // Check if any StoryStage references this stage
    const isReferenced = await StoryStage.exists({ stage: id });

    if (isReferenced) {
      // Force deactivate the stage instead of deleting
      await StageDefinition.findByIdAndUpdate(id, { isActive: false });
      return NextResponse.json(
        { 
          error: "This stage is referenced by existing user stories and cannot be deleted. It has been deactivated instead to prevent data loss." 
        },
        { status: 400 }
      );
    }

    const deleted = await StageDefinition.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Stage not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE stage error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
