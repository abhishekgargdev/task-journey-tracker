import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { DailyStatusReport } from "@/models/DailyStatusReport";
import { getSession } from "@/lib/session";

// Delete a daily status report (owner only)
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
    if (!id) {
      return NextResponse.json({ error: "ID parameter is required" }, { status: 400 });
    }

    await dbConnect();
    const report = await DailyStatusReport.findById(id);

    if (!report) {
      return NextResponse.json({ error: "Daily status report not found" }, { status: 404 });
    }

    if (report.owner.toString() !== session.userId) {
      return NextResponse.json({ error: "Forbidden: You do not own this report" }, { status: 403 });
    }

    await DailyStatusReport.deleteOne({ _id: id });

    return NextResponse.json({ success: true, message: "Report deleted successfully" });
  } catch (error) {
    console.error("DELETE daily-status error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
