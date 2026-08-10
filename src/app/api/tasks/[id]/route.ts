import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Task } from "@/models/Task";
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

    const { id } = await params;

    await dbConnect();
    const task = await Task.findById(id).populate("owner", "name email");
    if (!task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("GET task detail error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

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
    const { title, description, adoTaskLink } = await request.json();

    await dbConnect();
    const task = await Task.findById(id);
    if (!task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    if (title !== undefined) {
      if (title.trim().length < 2) {
        return NextResponse.json({ error: "Title must be at least 2 characters." }, { status: 400 });
      }
      task.title = title.trim();
    }
    if (description !== undefined) task.description = description.trim();
    if (adoTaskLink !== undefined) task.adoTaskLink = adoTaskLink.trim();

    await task.save();

    return NextResponse.json(task);
  } catch (error) {
    console.error("PATCH task error:", error);
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
    const deleted = await Task.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE task error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
