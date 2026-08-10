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

    await dbConnect();

    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found." }, { status: 404 });
    }

    sprint.status = "active";

    // Set resumedAt date on the open hold history entry
    const openHoldIndex = sprint.holdHistory.findIndex(h => !h.resumedAt);
    if (openHoldIndex !== -1) {
      sprint.holdHistory[openHoldIndex].resumedAt = new Date();
    }

    await sprint.save();

    return NextResponse.json(sprint);
  } catch (error) {
    console.error("POST sprint resume error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
