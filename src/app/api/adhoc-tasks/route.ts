import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { AdhocTask } from "@/models/AdhocTask";
import { getSession } from "@/lib/session";

// Fetch all ad-hoc tasks, populated with user information
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const tasks = await AdhocTask.find({})
      .populate("assignee", "name email")
      .populate("assignedBy", "name email")
      .populate("owner", "name email")
      .populate("comments.author", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("GET adhoc-tasks error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Create a new ad-hoc task
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      taskName,
      description,
      startDate,
      endDate,
      assignedBy,
      assignee,
      branchName,
      prLink,
      status,
    } = body;

    if (!taskName || taskName.trim().length < 2) {
      return NextResponse.json(
        { error: "Task name must be at least 2 characters." },
        { status: 400 }
      );
    }

    await dbConnect();

    // Setup payload
    const payload: any = {
      taskName: taskName.trim(),
      description: description?.trim() || "",
      branchName: branchName?.trim() || "",
      prLink: prLink?.trim() || "",
      status: status || "todo",
      owner: session.userId,
    };

    if (startDate) payload.startDate = new Date(startDate);
    if (endDate) payload.endDate = new Date(endDate);
    if (assignedBy) payload.assignedBy = assignedBy;
    
    // Assignee defaults to the creator if not chosen
    payload.assignee = assignee || session.userId;

    const newTask = await AdhocTask.create(payload);

    // Populate user relations for client return
    const populated = await AdhocTask.findById(newTask._id)
      .populate("assignee", "name email")
      .populate("assignedBy", "name email")
      .populate("owner", "name email")
      .populate("comments.author", "name email");

    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    console.error("POST adhoc-task error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
