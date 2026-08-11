/** Story & stage monitoring — derived analytics (no hard-coded data). */

export const DUE_SOON_DAYS = 2;
export const UPCOMING_WINDOW_DAYS = 7;

export type TimelineHealth =
  | "on_track"
  | "due_soon"
  | "delayed"
  | "completed_on_time"
  | "completed_late"
  | "not_started";

export type StoryHealth = "on_track" | "at_risk" | "delayed";

export interface MonitorUser {
  _id?: string;
  name: string;
  email?: string;
}

export interface MonitorStage {
  _id: string;
  stageOrder: number;
  taskName: string;
  status: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  developBy?: MonitorUser;
  branchName?: string;
  githubPrLink?: string;
  prStatus?: string;
  stageId?: { _id: string; name: string; colorTag?: string };
  parentStoryStageId?: string;
}

export interface MonitorStory {
  _id: string;
  storyNumber: string;
  taskName: string;
  description?: string;
  status: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  hasSprint?: boolean;
  sprintUrl?: string;
  assignedUsers?: MonitorUser[];
}

export interface StageInsight {
  stage: MonitorStage;
  stageName: string;
  health: TimelineHealth;
  daysRemaining: number | null;
  daysOverdue: number | null;
  daysUntilStart: number | null;
  durationDays: number | null;
  isCurrent: boolean;
}

export interface StoryInsights {
  storyHealth: StoryHealth;
  storyTimelineHealth: TimelineHealth;
  currentStage: MonitorStage | null;
  currentStageName: string;
  currentDeveloper: MonitorUser | null;
  currentStageInsight: StageInsight | null;
  stageInsights: StageInsight[];
  delayed: StageInsight[];
  dueSoon: StageInsight[];
  upcoming: StageInsight[];
  blocked: StageInsight[];
  unassigned: StageInsight[];
  counts: {
    total: number;
    completed: number;
    inProgress: number;
    upcoming: number;
    delayed: number;
    blocked: number;
    notStarted: number;
  };
  progressPct: number;
}

export type MessageTemplate = "assignment" | "reminder" | "delay";

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dayDiff(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDisplayDate(value?: string | null): string {
  const d = parseDate(value);
  if (!d) return "—";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function getStageTimelineHealth(stage: MonitorStage, now = new Date()): TimelineHealth {
  if (stage.status === "completed") {
    const plannedEnd = parseDate(stage.plannedEndDate);
    const actualEnd = parseDate(stage.actualEndDate) || now;
    if (plannedEnd && actualEnd > plannedEnd) return "completed_late";
    return "completed_on_time";
  }

  if (stage.status === "not_started") {
    const plannedStart = parseDate(stage.plannedStartDate);
    if (plannedStart && now > plannedStart) return "delayed";
    return "not_started";
  }

  const plannedEnd = parseDate(stage.plannedEndDate);
  if (!plannedEnd) return "on_track";

  const diff = dayDiff(now, plannedEnd);
  if (diff < 0) return "delayed";
  if (diff <= DUE_SOON_DAYS) return "due_soon";
  return "on_track";
}

export function getStoryTimelineHealth(story: MonitorStory, now = new Date()): TimelineHealth {
  if (story.status === "completed") {
    const plannedEnd = parseDate(story.plannedEndDate);
    const actualEnd = parseDate(story.actualEndDate) || now;
    if (plannedEnd && actualEnd > plannedEnd) return "completed_late";
    return "completed_on_time";
  }

  const plannedEnd = parseDate(story.plannedEndDate);
  if (!plannedEnd) return "on_track";
  const diff = dayDiff(now, plannedEnd);
  if (diff < 0 && story.status !== "completed") return "delayed";
  if (diff <= DUE_SOON_DAYS) return "due_soon";
  return "on_track";
}

function buildStageInsight(stage: MonitorStage, isCurrent: boolean, now: Date): StageInsight {
  const stageName = stage.stageId?.name || stage.taskName;
  const health = stage.status === "delayed" ? "delayed" : getStageTimelineHealth(stage, now);

  const plannedEnd = parseDate(stage.plannedEndDate);
  const plannedStart = parseDate(stage.plannedStartDate);
  const actualStart = parseDate(stage.actualStartDate);
  const actualEnd = parseDate(stage.actualEndDate);

  let daysRemaining: number | null = null;
  let daysOverdue: number | null = null;
  let daysUntilStart: number | null = null;

  if (stage.status !== "completed" && plannedEnd) {
    const diff = dayDiff(now, plannedEnd);
    if (diff >= 0) daysRemaining = diff;
    else daysOverdue = Math.abs(diff);
  }

  if (stage.status === "not_started" && plannedStart) {
    const diff = dayDiff(now, plannedStart);
    daysUntilStart = diff >= 0 ? diff : 0;
  }

  let durationDays: number | null = null;
  if (actualStart && actualEnd) {
    durationDays = dayDiff(actualStart, actualEnd) + 1;
  } else if (actualStart && stage.status === "in_progress") {
    durationDays = dayDiff(actualStart, now) + 1;
  }

  return {
    stage,
    stageName,
    health,
    daysRemaining,
    daysOverdue,
    daysUntilStart,
    durationDays,
    isCurrent,
  };
}

export function computeStoryInsights(
  story: MonitorStory,
  stages: MonitorStage[],
  now = new Date()
): StoryInsights {
  const topLevel = stages
    .filter((s) => !s.parentStoryStageId)
    .sort((a, b) => a.stageOrder - b.stageOrder);

  const currentStage =
    topLevel.find((s) => s.status !== "completed") ||
    topLevel[topLevel.length - 1] ||
    null;

  const stageInsights = topLevel.map((s) =>
    buildStageInsight(s, currentStage?._id === s._id, now)
  );

  const delayed = stageInsights.filter(
    (i) =>
      i.health === "delayed" ||
      i.stage.status === "delayed" ||
      (i.daysOverdue !== null && i.daysOverdue > 0 && i.stage.status !== "completed")
  );

  const dueSoon = stageInsights.filter(
    (i) =>
      i.health === "due_soon" &&
      i.stage.status !== "completed" &&
      i.stage.status !== "blocked"
  );

  const upcoming = stageInsights.filter((i) => {
    if (i.stage.status !== "not_started") return false;
    const start = parseDate(i.stage.plannedStartDate);
    if (!start) return false;
    const days = dayDiff(now, start);
    return days >= 0 && days <= UPCOMING_WINDOW_DAYS;
  });

  const blocked = stageInsights.filter((i) => i.stage.status === "blocked");

  const unassigned = stageInsights.filter(
    (i) => !i.stage.developBy?.name && i.stage.status !== "completed"
  );

  const completed = stageInsights.filter((i) => i.stage.status === "completed").length;
  const inProgress = stageInsights.filter((i) => i.stage.status === "in_progress").length;
  const notStarted = stageInsights.filter((i) => i.stage.status === "not_started").length;

  let storyHealth: StoryHealth = "on_track";
  if (delayed.length > 0 || story.status === "delayed") storyHealth = "delayed";
  else if (dueSoon.length > 0 || blocked.length > 0 || story.status === "blocked")
    storyHealth = "at_risk";

  const currentStageInsight = stageInsights.find((i) => i.isCurrent) || null;

  return {
    storyHealth,
    storyTimelineHealth: getStoryTimelineHealth(story, now),
    currentStage,
    currentStageName: currentStage?.stageId?.name || currentStage?.taskName || "—",
    currentDeveloper: currentStage?.developBy || null,
    currentStageInsight,
    stageInsights,
    delayed,
    dueSoon,
    upcoming,
    blocked,
    unassigned,
    counts: {
      total: topLevel.length,
      completed,
      inProgress,
      upcoming: upcoming.length,
      delayed: delayed.length,
      blocked: blocked.length,
      notStarted,
    },
    progressPct: topLevel.length > 0 ? Math.round((completed / topLevel.length) * 100) : 0,
  };
}

export function healthLabel(health: TimelineHealth | StoryHealth): string {
  const map: Record<string, string> = {
    on_track: "On Track",
    at_risk: "At Risk",
    due_soon: "Due Soon",
    delayed: "Delayed",
    completed_on_time: "Completed On Time",
    completed_late: "Completed Late",
    not_started: "Not Started",
  };
  return map[health] || health;
}

export function healthColor(health: StoryHealth): string {
  if (health === "on_track") return "text-emerald-600 bg-emerald-500/10 border-emerald-200";
  if (health === "at_risk") return "text-amber-600 bg-amber-500/10 border-amber-200";
  return "text-rose-600 bg-rose-500/10 border-rose-200";
}

interface MessageContext {
  story: MonitorStory;
  insight: StageInsight;
  template: MessageTemplate;
}

export function generateDeveloperMessage({ story, insight, template }: MessageContext): string {
  const dev = insight.stage.developBy;
  const stage = insight.stage;
  const lines: string[] = [];

  const greeting = dev?.name ? `Hi ${dev.name.split(" ")[0]},` : "Hi,";
  lines.push(greeting, "");

  if (template === "assignment") {
    lines.push("You have been assigned to the following task:", "");
  } else if (template === "reminder") {
    lines.push("Reminder: Please review your assigned task below.", "");
  } else {
    lines.push("The following task is currently overdue and needs your attention:", "");
  }

  const addLine = (label: string, value?: string | null) => {
    if (value && value.trim()) lines.push(`${label}:`, value.trim());
  };

  addLine("Story", `#${story.storyNumber}`);
  addLine("Story Name", story.taskName);
  if (story.hasSprint && story.sprintUrl?.trim()) {
    addLine("Sprint URL", story.sprintUrl.trim());
  }
  addLine("Stage", insight.stageName);
  addLine("Task", stage.taskName);
  if (stage.taskName !== insight.stageName) addLine("Task Name", stage.taskName);
  addLine("Planned Start", formatDisplayDate(stage.plannedStartDate));
  addLine("Planned End", formatDisplayDate(stage.plannedEndDate));
  addLine("Current Status", stage.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));

  if (insight.daysRemaining !== null && insight.daysRemaining >= 0) {
    lines.push(`Days Remaining: ${insight.daysRemaining} day${insight.daysRemaining === 1 ? "" : "s"}`);
  }
  if (insight.daysOverdue !== null && insight.daysOverdue > 0) {
    lines.push(`Overdue: ${insight.daysOverdue} day${insight.daysOverdue === 1 ? "" : "s"}`);
  }

  addLine("GitHub Branch", stage.branchName);
  if (stage.githubPrLink) addLine("PR", stage.githubPrLink);
  else if (stage.prStatus && stage.prStatus !== "none") {
    lines.push(`PR Status: ${stage.prStatus}`);
  }

  lines.push("", "Please update the Journey Tracker once the stage is completed.", "", "Thanks.");

  return lines.join("\n");
}

export function parseDescriptionSections(description?: string): { label: string; body: string }[] {
  if (!description?.trim()) return [];
  const text = description.trim();
  const knownHeaders = ["Component", "Objective", "Expected Outcome", "Acceptance", "Important Notes"];
  const sections: { label: string; body: string }[] = [];

  for (const header of knownHeaders) {
    const regex = new RegExp(`${header}\\s*[:\\-]\\s*`, "i");
    const match = text.match(regex);
    if (match && match.index !== undefined) {
      const start = match.index + match[0].length;
      let end = text.length;
      for (const other of knownHeaders) {
        if (other === header) continue;
        const nextRegex = new RegExp(`\\n\\s*${other}\\s*[:\\-]\\s*`, "i");
        const nextMatch = text.slice(start).match(nextRegex);
        if (nextMatch && nextMatch.index !== undefined) {
          end = Math.min(end, start + nextMatch.index);
        }
      }
      sections.push({ label: header, body: text.slice(start, end).trim() });
    }
  }

  if (sections.length === 0) {
    return [{ label: "Overview", body: text }];
  }
  return sections;
}
