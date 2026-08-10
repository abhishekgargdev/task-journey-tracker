export interface TaskItem {
  _id: string;
  title: string;
}

export interface SprintItem {
  _id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  status?: "active" | "hold" | "completed";
}

export interface StageDefinition {
  _id: string;
  name: string;
  colorTag?: string;
  defaultOrder?: number;
}

export interface StagePlanEntry {
  stage: StageDefinition;
  order: number;
}

export interface UserItem {
  _id: string;
  name: string;
  email?: string;
}

export interface StoryItem {
  _id: string;
  title: string;
  adoStoryLink?: string;
  task: TaskItem;
  sprint: SprintItem;
  stagePlan: StagePlanEntry[];
  currentStageOrder: number;
  overallStatus: "not_started" | "in_progress" | "blocked" | "on_hold" | "completed";
  isOnHold: boolean;
  holdReason?: string;
}

export interface StoryStage {
  _id: string;
  story: string;
  stage: string;
  order: number;
  plannedEndDate?: string;
  actualEndDate?: string;
  status: string;
  assignedTo?: UserItem;
}

export interface StoryStageDetails {
  name: string;
  total: number;
  completed: number;
  assignee?: UserItem;
}

export interface StageBreakdownEntry {
  name: string;
  count: number;
  order: number;
}

export function getStoryStageDetails(
  story: StoryItem,
  storyStages: StoryStage[]
): StoryStageDetails {
  const currentEntry = story.stagePlan.find((sp) => sp.order === story.currentStageOrder);
  const name =
    currentEntry?.stage?.name ||
    (story.overallStatus === "completed" ? "Go Live / Completed" : "Completed");

  const matchedStageDoc = storyStages.find(
    (ss) => ss.story === story._id && ss.stage === currentEntry?.stage?._id
  );
  const assignee = matchedStageDoc?.assignedTo;

  const total = story.stagePlan.length;
  const completed =
    story.overallStatus === "completed" ? total : Math.max(0, story.currentStageOrder - 1);

  return { name, total, completed, assignee };
}

export function aggregateStageBreakdown(stories: StoryItem[]): StageBreakdownEntry[] {
  const stageCountsMap: Record<string, { name: string; count: number; order: number }> = {};

  stories.forEach((story) => {
    if (story.overallStatus === "completed") return;
    const activePlanEntry = story.stagePlan.find((sp) => sp.order === story.currentStageOrder);
    if (!activePlanEntry?.stage) return;

    const stageId = activePlanEntry.stage._id;
    const name = activePlanEntry.stage.name;
    const order = activePlanEntry.stage.defaultOrder ?? 99;

    if (!stageCountsMap[stageId]) {
      stageCountsMap[stageId] = { name, count: 0, order };
    }
    stageCountsMap[stageId].count++;
  });

  return Object.values(stageCountsMap).sort((a, b) => a.order - b.order);
}
