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
