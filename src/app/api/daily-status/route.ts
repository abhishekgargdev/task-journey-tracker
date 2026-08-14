import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { DailyStatusReport } from "@/models/DailyStatusReport";
import { getSession } from "@/lib/session";

// Fetch reports. Supports date ranges or filtering by user
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || undefined;
    const startDateStr = searchParams.get("startDate") || undefined;
    const endDateStr = searchParams.get("endDate") || undefined;

    await dbConnect();

    const query: { owner?: string; date?: { $gte?: Date; $lte?: Date } } = {};
    if (userId) {
      query.owner = userId;
    }
    if (startDateStr || endDateStr) {
      query.date = {};
      if (startDateStr) {
        const start = new Date(startDateStr);
        start.setUTCHours(0, 0, 0, 0);
        query.date.$gte = start;
      }
      if (endDateStr) {
        const end = new Date(endDateStr);
        end.setUTCHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const reports = await DailyStatusReport.find(query)
      .populate("owner", "name email")
      .sort({ date: -1 });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("GET daily-status error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Create or update a report for a specific date
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { date, completedWork, plannedWork, blockers, hoursSpent, mood, linkedTasks } = body;

    if (!date) {
      return NextResponse.json({ error: "Date is required." }, { status: 400 });
    }
    if (!completedWork || completedWork.trim().length < 5) {
      return NextResponse.json(
        { error: "Completed work summary must be at least 5 characters." },
        { status: 400 }
      );
    }

    await dbConnect();

    // Align date to UTC midnight representation
    const reportDate = new Date(date);
    reportDate.setUTCHours(0, 0, 0, 0);

    const payload = {
      owner: session.userId,
      date: reportDate,
      completedWork: completedWork.trim(),
      plannedWork: plannedWork?.trim() || "",
      blockers: blockers?.trim() || "",
      hoursSpent: Number(hoursSpent) || 0,
      mood: mood || "average",
      linkedTasks: linkedTasks || [],
    };

    // Upsert (update if exists, create if not) to prevent duplicate reports for owner+date
    const report = await DailyStatusReport.findOneAndUpdate(
      { owner: session.userId, date: reportDate },
      payload,
      { new: true, upsert: true }
    ).populate("owner", "name email");

    return NextResponse.json(report);
  } catch (error) {
    console.error("POST daily-status error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
