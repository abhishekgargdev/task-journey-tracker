import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { KanbanColumn } from "@/models/KanbanColumn";
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
    const { name, color } = await request.json();

    await dbConnect();

    const column = await KanbanColumn.findOne({ _id: id, owner: session.userId });
    if (!column) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    if (name !== undefined) {
      if (name.trim().length < 1) {
        return NextResponse.json({ error: "Column name cannot be empty" }, { status: 400 });
      }
      column.name = name.trim();
    }

    if (color !== undefined) {
      column.color = color;
    }

    await column.save();

    return NextResponse.json(column);
  } catch (error) {
    console.error("PATCH kanban column error:", error);
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

    // Verify it belongs to the user
    const column = await KanbanColumn.findOne({ _id: id, owner: session.userId });
    if (!column) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    // Delete column
    await KanbanColumn.deleteOne({ _id: id });

    // Also delete any tasks in this column
    await KanbanTask.deleteMany({ columnId: id, owner: session.userId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE kanban column error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
