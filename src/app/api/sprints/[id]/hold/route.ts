import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Sprint } from "@/models/Sprint";
import { getSession } from "@/lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sprintId } = await params;
    const { reason } = await request.json();

    if (!reason || reason.trim().length < 2) {
      return NextResponse.json({ error: "Hold reason must be at least 2 characters." }, { status: 400 });
    }

    await dbConnect();

    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found." }, { status: 404 });
    }

    sprint.status = "hold";
    sprint.holdHistory.push({
      reason: reason.trim(),
      heldAt: new Date(),
      heldBy: session.userId as any,
    });

    await sprint.save();

    return NextResponse.json(sprint);
  } catch (error) {
    console.error("POST sprint hold error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
