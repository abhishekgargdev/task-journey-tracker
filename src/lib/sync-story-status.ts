import { Story } from "@/models/Story";
import { StoryStage } from "@/models/StoryStage";

/** Recompute parent story status from top-level child stages. */
export async function syncParentStoryStatus(storyId: string) {
  const story = await Story.findById(storyId);
  if (!story) return;

  if (story.isOnHold) {
    story.status = "blocked";
    await story.save();
    return;
  }

  const stages = await StoryStage.find({
    storyId,
    isArchived: { $ne: true },
    parentStoryStageId: null,
  }).sort({ stageOrder: 1 });

  const statuses = stages.map((s) => s.status);
  let computed: "not_started" | "in_progress" | "blocked" | "completed" | "delayed" = "not_started";

  if (statuses.length === 0) {
    computed = story.status;
  } else if (statuses.every((s) => s === "completed")) {
    computed = "completed";
  } else if (statuses.includes("blocked")) {
    computed = "blocked";
  } else if (statuses.includes("delayed") || statuses.some((s) => s === "in_progress" && s)) {
    const hasDelayed = stages.some((s) => s.status === "delayed");
    computed = hasDelayed ? "delayed" : "in_progress";
  } else if (statuses.includes("on_hold") || statuses.includes("in_progress")) {
    computed = "in_progress";
  } else if (statuses.every((s) => s === "not_started")) {
    computed = "not_started";
  } else {
    computed = "in_progress";
  }

  story.status = computed;
  await story.save();
}
