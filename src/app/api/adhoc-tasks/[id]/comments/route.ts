import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { AdhocTask } from "@/models/AdhocTask";
import { getSession } from "@/lib/session";

// Add a comment to a specific ad-hoc task
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { text } = await request.json();

    if (!text || text.trim().length < 1) {
      return NextResponse.json({ error: "Comment text cannot be empty." }, { status: 400 });
    }

    await dbConnect();

    const task = await AdhocTask.findById(id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Append new comment
    task.comments.push({
      text: text.trim(),
      author: session.userId as any, // Cast to any because it expects mongoose ObjectId
      createdAt: new Date(),
    });

    await task.save();

    // Populate comments.author to return the fresh comments feed
    const populated = await AdhocTask.findById(id)
      .populate("comments.author", "name email");

    return NextResponse.json(populated?.comments || [], { status: 201 });
  } catch (error) {
    console.error("POST adhoc-task comments error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
