import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { KanbanColumn } from "@/models/KanbanColumn";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    let columns = await KanbanColumn.find({ owner: session.userId }).sort({ order: 1 });

    // Seed default columns if none exist for this user
    if (columns.length === 0) {
      const defaultCols = [
        { name: "To Do", color: "indigo", order: 1, owner: session.userId },
        { name: "In Progress", color: "blue", order: 2, owner: session.userId },
        { name: "Completed", color: "emerald", order: 3, owner: session.userId },
      ];
      columns = await KanbanColumn.create(defaultCols);
    }

    return NextResponse.json(columns);
  } catch (error) {
    console.error("GET kanban columns error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, color } = await request.json();

    if (!name || name.trim().length < 1) {
      return NextResponse.json({ error: "Column name is required" }, { status: 400 });
    }

    await dbConnect();

    // Determine the order for the new column (max order + 1)
    const lastCol = await KanbanColumn.findOne({ owner: session.userId }).sort({ order: -1 });
    const order = lastCol ? lastCol.order + 1 : 1;

    const newCol = await KanbanColumn.create({
      name: name.trim(),
      color: color || "slate",
      order,
      owner: session.userId,
    });

    return NextResponse.json(newCol, { status: 201 });
  } catch (error) {
    console.error("POST kanban column error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ids } = await request.json(); // Array of column IDs in order
    if (!Array.isArray(ids)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await dbConnect();

    // Bulk update the orders
    const updatePromises = ids.map((id, index) =>
      KanbanColumn.updateOne({ _id: id, owner: session.userId }, { order: index + 1 })
    );
    await Promise.all(updatePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT kanban columns order error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

