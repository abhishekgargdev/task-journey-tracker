import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { StoryUser } from "@/models/StoryUser";
import { StoryStage } from "@/models/StoryStage";
import { getSession } from "@/lib/session";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (session.userId === id) {
      return NextResponse.json(
        { error: "You cannot delete your own account while logged in." },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const isAssignedToStory = await StoryUser.exists({ userId: id });
    const isAssignedToStage = await StoryStage.exists({ developBy: id });

    if (isAssignedToStory || isAssignedToStage) {
      await User.findByIdAndUpdate(id, { status: "inactive" });
      return NextResponse.json(
        {
          error:
            "This developer is assigned to existing stories or stages and cannot be permanently deleted. Their account has been deactivated instead.",
        },
        { status: 400 }
      );
    }

    await User.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE user error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
