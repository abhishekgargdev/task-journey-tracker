import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { KanbanTask } from "@/models/KanbanTask";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date"); // 'YYYY-MM-DD' or 'all'

    await dbConnect();

    const query: any = { owner: session.userId };

    if (dateStr && dateStr !== "all") {
      const targetDate = new Date(dateStr);
      if (!isNaN(targetDate.getTime())) {
        const startOfDay = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 0, 0, 0));
        const endOfDay = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 23, 59, 59, 999));
        query.date = { $gte: startOfDay, $lte: endOfDay };
      }
    }

    const tasks = await KanbanTask.find(query).sort({ order: 1 });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("GET kanban tasks error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, columnId, date, priority, tags, dueDate } = await request.json();

    if (!title || title.trim().length < 1) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }

    if (!columnId) {
      return NextResponse.json({ error: "Column ID is required" }, { status: 400 });
    }

    await dbConnect();

    // Parse planner date (midnight UTC)
    let plannerDate = new Date();
    if (date) {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        plannerDate = parsed;
      }
    }
    const utcDate = new Date(Date.UTC(plannerDate.getUTCFullYear(), plannerDate.getUTCMonth(), plannerDate.getUTCDate(), 0, 0, 0));

    // Calculate order within the column for this specific day
    const startOfDay = new Date(Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate(), 0, 0, 0));
    const endOfDay = new Date(Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate(), 23, 59, 59, 999));

    const lastTask = await KanbanTask.findOne({
      owner: session.userId,
      columnId,
      date: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ order: -1 });

    const order = lastTask ? lastTask.order + 1 : 1;

    const newTask = await KanbanTask.create({
      title: title.trim(),
      description: description?.trim() || "",
      columnId,
      order,
      owner: session.userId,
      date: utcDate,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      priority: priority || "medium",
      tags: Array.isArray(tags) ? tags.map((t) => t.trim()) : [],
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error("POST kanban task error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Bulk update / reorder tasks
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reorderedTasks } = await request.json(); // Array of { _id: string, columnId: string, order: number }
    if (!Array.isArray(reorderedTasks)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await dbConnect();

    const updatePromises = reorderedTasks.map((t) =>
      KanbanTask.updateOne(
        { _id: t._id, owner: session.userId },
        { columnId: t.columnId, order: t.order }
      )
    );
    await Promise.all(updatePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT kanban tasks bulk update error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
