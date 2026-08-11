import dbConnect from "@/lib/mongodb";
import { Story } from "@/models/Story";
import { StoryStage } from "@/models/StoryStage";
import { StoryUser } from "@/models/StoryUser";
import type { MonitorStage, MonitorStory } from "@/lib/story-monitoring";

export interface StoryWithStages extends MonitorStory {
  childStages: MonitorStage[];
  assignedUsers: Array<{ _id: string; name: string; email?: string; status?: string }>;
  isOnHold?: boolean;
  holdReason?: string;
  stageOrder?: Array<{ _id: string; name: string; colorTag?: string }>;
  createdAt?: string;
  updatedAt?: string;
}

/** Shared DB loader — same shape as GET /api/stories/[id] aggregated for all stories. */
export async function fetchAllStoriesWithStages(): Promise<StoryWithStages[]> {
  await dbConnect();

  const storiesRaw = await Story.find({})
    .populate("stageOrder")
    .sort({ createdAt: -1 })
    .lean();

  const enhancedStories: StoryWithStages[] = [];

  for (const story of storiesRaw) {
    const storyUsers = await StoryUser.find({ storyId: story._id })
      .populate("userId", "name email status")
      .lean();

    const assignedUsers = storyUsers
      .map((su: { userId?: unknown }) => su.userId)
      .filter(Boolean) as StoryWithStages["assignedUsers"];

    const childStages = await StoryStage.find({ storyId: story._id, isArchived: { $ne: true } })
      .populate("developBy", "name email status")
      .populate("stageId", "name colorTag")
      .sort({ stageOrder: 1 })
      .lean();

    enhancedStories.push({
      ...(story as unknown as MonitorStory),
      assignedUsers,
      childStages: childStages as unknown as MonitorStage[],
    });
  }

  return JSON.parse(JSON.stringify(enhancedStories)) as StoryWithStages[];
}
