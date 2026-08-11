import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { StoryStage } from "@/models/StoryStage";
import { getSession } from "@/lib/session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: storyId } = await params;

    await dbConnect();
    const stages = await StoryStage.find({ storyId, isArchived: { $ne: true } })
      .populate("developBy", "name email status")
      .populate("stageId")
      .sort({ stageOrder: 1 });

    return NextResponse.json(stages);
  } catch (error) {
    console.error("GET story stages error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
