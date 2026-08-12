import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { KanbanTask } from "@/models/KanbanTask";
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
    const body = await request.json();

    await dbConnect();

    const task = await KanbanTask.findOne({ _id: id, owner: session.userId });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // List of allowable fields to update
    const fields = ["title", "description", "columnId", "order", "priority", "tags", "dueDate"];
    fields.forEach((field) => {
      if (body[field] !== undefined) {
        if (field === "title") {
          if (body.title.trim().length < 1) return;
          task.title = body.title.trim();
        } else if (field === "description") {
          task.description = body.description.trim();
        } else if (field === "columnId") {
          task.columnId = body.columnId;
        } else if (field === "order") {
          task.order = body.order;
        } else if (field === "priority") {
          task.priority = body.priority;
        } else if (field === "tags") {
          task.tags = Array.isArray(body.tags) ? body.tags.map((t: string) => t.trim()) : [];
        } else if (field === "dueDate") {
          task.dueDate = body.dueDate ? new Date(body.dueDate) : undefined;
        }
      }
    });

    // Also support moving the planned date
    if (body.date !== undefined) {
      const parsed = new Date(body.date);
      if (!isNaN(parsed.getTime())) {
        task.date = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0));
      }
    }

    await task.save();

    return NextResponse.json(task);
  } catch (error) {
    console.error("PATCH kanban task error:", error);
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

    const result = await KanbanTask.deleteOne({ _id: id, owner: session.userId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE kanban task error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
