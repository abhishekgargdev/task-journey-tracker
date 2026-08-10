import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Task } from "@/models/Task";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const tasks = await Task.find({}).populate("owner", "name email").sort({ createdAt: -1 });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("GET tasks error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, adoTaskLink } = await request.json();

    if (!title || title.trim().length < 2) {
      return NextResponse.json(
        { error: "Task title must be at least 2 characters." },
        { status: 400 }
      );
    }

    await dbConnect();
    const newTask = await Task.create({
      title: title.trim(),
      description: description?.trim() || "",
      adoTaskLink: adoTaskLink?.trim() || "",
      owner: session.userId,
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error("POST task error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
