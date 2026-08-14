import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { KanbanTask } from "@/models/KanbanTask";
import { AdhocTask } from "@/models/AdhocTask";
import { UserStory } from "@/models/UserStory";
import { getSession } from "@/lib/session";

// Fetch user's active/updated tasks for a specific date
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    if (!dateStr) {
      return NextResponse.json({ error: "Date parameter is required" }, { status: 400 });
    }

    await dbConnect();

    const targetDate = new Date(dateStr);
    
    // Create start and end range for local date in UTC representation
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // 1. Fetch Kanban Tasks scheduled/updated today
    const kanbanTasks = await KanbanTask.find({
      owner: session.userId,
      $or: [
        { date: { $gte: startOfDay, $lte: endOfDay } },
        { updatedAt: { $gte: startOfDay, $lte: endOfDay } }
      ]
    }).populate("columnId", "name color");

    // 2. Fetch Ad-hoc Tasks assigned to user or owned by user, active or completed today
    const adhocTasks = await AdhocTask.find({
      $and: [
        { $or: [{ assignee: session.userId }, { owner: session.userId }] },
        {
          $or: [
            { status: { $in: ["in_progress", "blocked"] } },
            { updatedAt: { $gte: startOfDay, $lte: endOfDay } },
          ],
        },
      ],
    });

    // 3. Fetch User Stories assigned to user, active or completed today
    const userStories = await UserStory.find({
      assignedTo: session.userId,
      $or: [
        { overallStatus: { $in: ["in_progress", "blocked", "on_hold"] } },
        { updatedAt: { $gte: startOfDay, $lte: endOfDay } }
      ]
    });

    // Map to a clean common structure
    const activities = {
      kanban: kanbanTasks.map((t) => ({
        id: t._id,
        title: t.title,
        status: (t.columnId as unknown as { name: string })?.name || "Task",
        type: "KanbanTask" as const,
      })),
      adhoc: adhocTasks.map((t) => ({
        id: t._id,
        title: t.taskName,
        status: t.status === "in_progress" ? "In Progress" : t.status === "completed" ? "Completed" : t.status === "blocked" ? "Blocked" : "To Do",
        type: "AdhocTask" as const,
      })),
      stories: userStories.map((t) => ({
        id: t._id,
        title: t.title,
        status: t.overallStatus.replace("_", " "),
        type: "UserStory" as const,
      })),
    };

    return NextResponse.json(activities);
  } catch (error) {
    console.error("GET today-activity error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
