import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { AdhocTask } from "@/models/AdhocTask";
import { getSession } from "@/lib/session";

// Retrieve a single ad-hoc task
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

    const task = await AdhocTask.findById(id)
      .populate("assignee", "name email")
      .populate("assignedBy", "name email")
      .populate("owner", "name email")
      .populate("comments.author", "name email");

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("GET adhoc-task error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Update task details
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

    const task = await AdhocTask.findById(id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (body.taskName !== undefined) {
      if (body.taskName.trim().length < 2) {
        return NextResponse.json(
          { error: "Task name must be at least 2 characters." },
          { status: 400 }
        );
      }
      task.taskName = body.taskName.trim();
    }

    if (body.description !== undefined) task.description = body.description.trim();
    if (body.branchName !== undefined) task.branchName = body.branchName.trim();
    if (body.prLink !== undefined) task.prLink = body.prLink.trim();
    if (body.status !== undefined) task.status = body.status;
    
    // Dates can be set to null/undefined if cleared
    if (body.startDate !== undefined) {
      task.startDate = body.startDate ? new Date(body.startDate) : undefined;
    }
    if (body.endDate !== undefined) {
      task.endDate = body.endDate ? new Date(body.endDate) : undefined;
    }

    if (body.assignedBy !== undefined) {
      task.assignedBy = body.assignedBy || undefined;
    }
    if (body.assignee !== undefined) {
      task.assignee = body.assignee || undefined;
    }

    await task.save();

    const populated = await AdhocTask.findById(id)
      .populate("assignee", "name email")
      .populate("assignedBy", "name email")
      .populate("owner", "name email")
      .populate("comments.author", "name email");

    return NextResponse.json(populated);
  } catch (error) {
    console.error("PATCH adhoc-task error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Delete an ad-hoc task
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

    const result = await AdhocTask.findByIdAndDelete(id);
    if (!result) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE adhoc-task error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
