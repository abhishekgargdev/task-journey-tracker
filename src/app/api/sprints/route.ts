import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Sprint } from "@/models/Sprint";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const sprints = await Sprint.find({}).sort({ startDate: -1 });
    return NextResponse.json(sprints);
  } catch (error) {
    console.error("GET sprints error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, startDate, endDate } = await request.json();

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Sprint name must be at least 2 characters." },
        { status: 400 }
      );
    }
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required." },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid date format." }, { status: 400 });
    }
    if (end < start) {
      return NextResponse.json(
        { error: "End date must be on or after start date." },
        { status: 400 }
      );
    }

    await dbConnect();
    const sprint = await Sprint.create({
      name: name.trim(),
      startDate: start,
      endDate: end,
      status: "active",
      holdHistory: [],
    });

    return NextResponse.json(sprint, { status: 201 });
  } catch (error) {
    console.error("POST sprint error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
