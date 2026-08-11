import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { StageDefinition } from "@/models/StageDefinition";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    await dbConnect();
    const query = activeOnly ? { isActive: true } : {};
    const stages = await StageDefinition.find(query).sort({ defaultOrder: 1 });

    return NextResponse.json(stages);
  } catch (error) {
    console.error("GET stages error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, colorTag, defaultOrder, parentStageId } = await request.json();
    if (!name) {
      return NextResponse.json({ error: "Stage name is required." }, { status: 400 });
    }

    await dbConnect();
    
    let orderValue = defaultOrder;
    if (orderValue === undefined || orderValue === null) {
      const lastStage = await StageDefinition.findOne().sort({ defaultOrder: -1 });
      orderValue = lastStage && lastStage.defaultOrder !== undefined ? lastStage.defaultOrder + 1 : 1;
    }

    const newStage = await StageDefinition.create({
      name,
      description,
      colorTag: colorTag || "slate",
      defaultOrder: orderValue,
      parentStageId: parentStageId || null,
      createdBy: session.userId,
    });

    return NextResponse.json(newStage, { status: 201 });
  } catch (error: any) {
    console.error("POST stages error:", error);
    if (error.code === 11000) {
      return NextResponse.json({ error: "A stage with that name already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
