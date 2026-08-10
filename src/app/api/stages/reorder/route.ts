import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { StageDefinition } from "@/models/StageDefinition";
import { getSession } from "@/lib/session";

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { stages } = await request.json();
    if (!stages || !Array.isArray(stages)) {
      return NextResponse.json({ error: "Stages array is required." }, { status: 400 });
    }

    await dbConnect();

    // Perform bulkWrite updates to optimize performance and prevent race conditions
    const bulkOps = stages.map((item: { id: string; defaultOrder: number }) => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { defaultOrder: item.defaultOrder } },
      },
    }));

    await StageDefinition.bulkWrite(bulkOps);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH reorder stages error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
