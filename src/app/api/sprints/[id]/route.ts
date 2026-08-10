import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Sprint } from "@/models/Sprint";
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
    const sprint = await Sprint.findById(id).populate("holdHistory.heldBy", "name email");
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found." }, { status: 404 });
    }

    return NextResponse.json(sprint);
  } catch (error) {
    console.error("GET sprint detail error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
