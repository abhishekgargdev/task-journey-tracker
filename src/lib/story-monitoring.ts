/** Story & stage monitoring — derived analytics (no hard-coded data). */

import {
  type HoldPeriod,
  getActiveHold,
  getActiveHoldDays,
  getEffectivePlannedEnd,
  getTotalHoldDays,
  isStageEffectivelyDelayed,
} from "@/lib/story-hold";

export const DUE_SOON_DAYS = 2;
export const UPCOMING_WINDOW_DAYS = 7;

export type TimelineHealth =
  | "on_track"
  | "due_soon"
  | "delayed"
  | "completed_on_time"
  | "completed_late"
  | "not_started"
  | "on_hold";

export type StoryHealth = "on_track" | "at_risk" | "delayed" | "on_hold";

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
  holdHistory?: HoldPeriod[];
  statusBeforeHold?: string;
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
  isOnHold?: boolean;
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
  isOnHold: boolean;
  holdDurationDays: number | null;
  activeHoldDays: number | null;
  effectivePlannedEnd: string | null;
  activeHoldReason: string | null;
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
  onHold: StageInsight[];
  unassigned: StageInsight[];
  counts: {
    total: number;
    completed: number;
    inProgress: number;
    onHold: number;
    upcoming: number;
    delayed: number;
    blocked: number;
    notStarted: number;
  };
  progressPct: number;
}

export type MessageTemplate = "assignment" | "reminder" | "delay" | "on_hold" | "hold_released";

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
  if (stage.status === "on_hold") return "on_hold";

  if (stage.status === "completed") {
    const plannedEnd = parseDate(stage.plannedEndDate);
    const actualEnd = parseDate(stage.actualEndDate) || now;
    if (plannedEnd && actualEnd > plannedEnd) return "completed_late";
    return "completed_on_time";
  }

  if (stage.status === "not_started") {
    const plannedStart = parseDate(stage.plannedStartDate);
    if (plannedStart && now > plannedStart && !isStageEffectivelyDelayed(stage, now)) return "not_started";
    if (isStageEffectivelyDelayed(stage, now)) return "delayed";
    return "not_started";
  }

  if (isStageEffectivelyDelayed(stage, now)) return "delayed";

  const effectiveEnd = getEffectivePlannedEnd(stage, now);
  if (!effectiveEnd) return "on_track";

  const diff = dayDiff(now, effectiveEnd);
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
  const isOnHold = stage.status === "on_hold";
  const health =
    stage.status === "delayed"
      ? "delayed"
      : isOnHold
        ? "on_hold"
        : getStageTimelineHealth(stage, now);

  const plannedEnd = parseDate(stage.plannedEndDate);
  const plannedStart = parseDate(stage.plannedStartDate);
  const actualStart = parseDate(stage.actualStartDate);
  const actualEnd = parseDate(stage.actualEndDate);
  const effectiveEnd = getEffectivePlannedEnd(stage, now);
  const activeHold = getActiveHold(stage);

  let daysRemaining: number | null = null;
  let daysOverdue: number | null = null;
  let daysUntilStart: number | null = null;

  if (!isOnHold && stage.status !== "completed") {
    const compareEnd = effectiveEnd || plannedEnd;
    if (compareEnd) {
      const diff = dayDiff(now, compareEnd);
      if (diff >= 0) daysRemaining = diff;
      else if (isStageEffectivelyDelayed(stage, now)) daysOverdue = Math.abs(diff);
    }
  }

  if (stage.status === "not_started" && plannedStart && !isOnHold) {
    const diff = dayDiff(now, plannedStart);
    daysUntilStart = diff >= 0 ? diff : 0;
  }

  let durationDays: number | null = null;
  if (actualStart && actualEnd) {
    durationDays = dayDiff(actualStart, actualEnd) + 1;
  } else if (actualStart && (stage.status === "in_progress" || stage.status === "delayed")) {
    durationDays = dayDiff(actualStart, now) + 1;
  }

  const holdDurationDays = getTotalHoldDays(stage, now);
  const activeHoldDays = isOnHold ? getActiveHoldDays(stage, now) : null;

  return {
    stage,
    stageName,
    health,
    daysRemaining,
    daysOverdue,
    daysUntilStart,
    durationDays,
    isCurrent,
    isOnHold,
    holdDurationDays: holdDurationDays > 0 ? holdDurationDays : null,
    activeHoldDays,
    effectivePlannedEnd: effectiveEnd ? effectiveEnd.toISOString() : null,
    activeHoldReason: activeHold?.holdReason || null,
  };
}

export function getTopLevelStages(stages: MonitorStage[]): MonitorStage[] {
  return stages
    .filter((s) => !s.parentStoryStageId)
    .sort((a, b) => a.stageOrder - b.stageOrder);
}

export interface StorySummary extends StoryInsights {
  story: MonitorStory;
}

export function buildStorySummary(
  story: MonitorStory,
  stages: MonitorStage[],
  now = new Date()
): StorySummary {
  return {
    story,
    ...computeStoryInsights(story, stages, now),
  };
}

export interface DashboardMetrics {
  totalStories: number;
  inProgress: number;
  onHold: number;
  stagesOnHold: number;
  completed: number;
  blocked: number;
  delayed: number;
  notStarted: number;
  dueToday: number;
  dueThisWeek: number;
  overdueStories: number;
  upcoming: number;
}

export interface StageCatalogProgress {
  stageId: string;
  name: string;
  colorTag: string;
  total: number;
  completed: number;
  percentage: number;
}

export interface DeveloperWorkloadRow {
  developerId: string;
  developer: string;
  assignedStories: number;
  inProgress: number;
  onHold: number;
  completed: number;
  overdue: number;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function computeDashboardMetrics(
  summaries: StorySummary[],
  now = new Date()
): DashboardMetrics {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const oneWeekLater = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  let dueToday = 0;
  let dueThisWeek = 0;
  let overdueStories = 0;
  let upcoming = 0;

  let stagesOnHold = 0;

  const statusCounts = {
    not_started: 0,
    in_progress: 0,
    completed: 0,
    blocked: 0,
    on_hold: 0,
  };

  for (const summary of summaries) {
    const { story } = summary;
    stagesOnHold += summary.onHold.length;

    if (story.isOnHold) {
      statusCounts.on_hold++;
    } else {
      const status = story.status as keyof typeof statusCounts;
      if (status in statusCounts && status !== "on_hold") {
        statusCounts[status]++;
      }
    }

    if (story.status === "completed" || story.isOnHold) continue;

    const hasDelayedStage = summary.delayed.length > 0;
    const storyPlannedEnd = parseDate(story.plannedEndDate);
    const storyOverdue = hasDelayedStage || (storyPlannedEnd !== null && storyPlannedEnd < todayStart);
    if (storyOverdue) overdueStories++;

    const storyDueToday =
      (storyPlannedEnd && isSameCalendarDay(storyPlannedEnd, now)) ||
      summary.stageInsights.some(
        (i) =>
          i.stage.status !== "completed" &&
          i.stage.status !== "on_hold" &&
          i.stage.plannedEndDate &&
          isSameCalendarDay(parseDate(i.stage.plannedEndDate)!, now)
      );
    if (storyDueToday) dueToday++;

    const storyDueThisWeek =
      (storyPlannedEnd && storyPlannedEnd > todayEnd && storyPlannedEnd <= oneWeekLater) ||
      summary.stageInsights.some((i) => {
        if (i.stage.status === "completed" || i.stage.status === "on_hold") return false;
        const end = parseDate(i.stage.plannedEndDate);
        return end !== null && end > todayEnd && end <= oneWeekLater;
      });
    if (storyDueThisWeek) dueThisWeek++;

    if (summary.upcoming.length > 0) upcoming++;
    else if (storyPlannedEnd && storyPlannedEnd > todayEnd) upcoming++;
  }

  const delayedStories = summaries.filter(
    (s) => s.delayed.length > 0 && s.story.status !== "completed" && !s.story.isOnHold
  ).length;

  const storiesWithHold = summaries.filter(
    (s) => s.story.isOnHold || s.onHold.length > 0
  ).length;

  return {
    totalStories: summaries.length,
    inProgress: statusCounts.in_progress,
    onHold: storiesWithHold,
    stagesOnHold,
    completed: statusCounts.completed,
    blocked: statusCounts.blocked,
    delayed: delayedStories,
    notStarted: statusCounts.not_started,
    dueToday,
    dueThisWeek,
    overdueStories,
    upcoming,
  };
}

export function computeStageCatalogProgress(summaries: StorySummary[]): StageCatalogProgress[] {
  const stageStatsMap = new Map<string, StageCatalogProgress>();

  for (const summary of summaries) {
    for (const insight of summary.stageInsights) {
      const stageDef = insight.stage.stageId;
      if (!stageDef?._id) continue;
      const stageId = stageDef._id;
      const existing = stageStatsMap.get(stageId) || {
        stageId,
        name: stageDef.name || insight.stageName,
        colorTag: stageDef.colorTag || "slate",
        total: 0,
        completed: 0,
        percentage: 0,
      };
      existing.total++;
      if (insight.stage.status === "completed") existing.completed++;
      existing.percentage =
        existing.total > 0 ? Math.round((existing.completed / existing.total) * 100) : 0;
      stageStatsMap.set(stageId, existing);
    }
  }

  return Array.from(stageStatsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function computeDeveloperWorkloads(
  summaries: StorySummary[],
  developers: Array<{ _id: string; name: string }>
): DeveloperWorkloadRow[] {
  return developers.map((dev) => {
    const storyIds = new Set<string>();
    let inProgress = 0;
    let onHold = 0;
    let completed = 0;
    let overdue = 0;

    for (const summary of summaries) {
      let devInStory = false;
      for (const insight of summary.stageInsights) {
        if (insight.stage.developBy?._id?.toString() !== dev._id.toString()) continue;
        devInStory = true;
        if (insight.stage.status === "in_progress" || insight.stage.status === "delayed") {
          inProgress++;
        }
        if (insight.stage.status === "on_hold") onHold++;
        if (insight.stage.status === "completed") completed++;
        if (
          insight.daysOverdue !== null &&
          insight.daysOverdue > 0 &&
          insight.stage.status !== "completed" &&
          insight.stage.status !== "on_hold"
        ) {
          overdue++;
        }
      }
      if (devInStory) storyIds.add(summary.story._id);
    }

    return {
      developerId: dev._id,
      developer: dev.name,
      assignedStories: storyIds.size,
      inProgress,
      onHold,
      completed,
      overdue,
    };
  });
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
      !i.isOnHold &&
      (i.health === "delayed" ||
        i.stage.status === "delayed" ||
        (i.daysOverdue !== null && i.daysOverdue > 0 && i.stage.status !== "completed"))
  );

  const dueSoon = stageInsights.filter(
    (i) =>
      i.health === "due_soon" &&
      i.stage.status !== "completed" &&
      i.stage.status !== "blocked" &&
      i.stage.status !== "on_hold"
  );

  const upcoming = stageInsights.filter((i) => {
    if (i.stage.status !== "not_started" || i.isOnHold) return false;
    const start = parseDate(i.stage.plannedStartDate);
    if (!start) return false;
    const days = dayDiff(now, start);
    return days >= 0 && days <= UPCOMING_WINDOW_DAYS;
  });

  const blocked = stageInsights.filter((i) => i.stage.status === "blocked");
  const onHold = stageInsights.filter((i) => i.stage.status === "on_hold");

  const unassigned = stageInsights.filter(
    (i) => !i.stage.developBy?.name && i.stage.status !== "completed" && i.stage.status !== "on_hold"
  );

  const completed = stageInsights.filter((i) => i.stage.status === "completed").length;
  const inProgress = stageInsights.filter((i) => i.stage.status === "in_progress").length;
  const onHoldCount = onHold.length;
  const notStarted = stageInsights.filter((i) => i.stage.status === "not_started").length;

  let storyHealth: StoryHealth = "on_track";
  if (story.isOnHold) storyHealth = "on_hold";
  else if (delayed.length > 0 || story.status === "delayed") storyHealth = "delayed";
  else if (onHoldCount > 0 || dueSoon.length > 0 || blocked.length > 0 || story.status === "blocked")
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
    onHold,
    unassigned,
    counts: {
      total: topLevel.length,
      completed,
      inProgress,
      onHold: onHoldCount,
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
    on_hold: "On Hold",
  };
  return map[health] || health;
}

export function healthColor(health: StoryHealth): string {
  if (health === "on_track") return "text-emerald-600 bg-emerald-500/10 border-emerald-200";
  if (health === "at_risk") return "text-amber-600 bg-amber-500/10 border-amber-200";
  if (health === "on_hold") return "text-slate-600 bg-slate-500/10 border-slate-200";
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
  const activeHold = getActiveHold(stage);

  const effectiveTemplate =
    template === "assignment" && insight.isOnHold
      ? "on_hold"
      : template;

  const greeting = dev?.name ? `Hi ${dev.name.split(" ")[0]},` : "Hi,";
  lines.push(greeting, "");

  if (effectiveTemplate === "assignment") {
    lines.push("You have been assigned to the following task:", "");
  } else if (effectiveTemplate === "reminder") {
    lines.push("Reminder: Please review your assigned task below.", "");
  } else if (effectiveTemplate === "on_hold") {
    lines.push("The following task is currently on hold:", "");
  } else if (effectiveTemplate === "hold_released") {
    lines.push("The following task has been released from hold. Please resume work:", "");
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
  if (insight.effectivePlannedEnd) {
    addLine("Adjusted Planned End", formatDisplayDate(insight.effectivePlannedEnd));
  }
  addLine(
    "Current Status",
    stage.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );

  if (activeHold) {
    addLine("Hold Started", formatDisplayDate(activeHold.holdStartDate));
    if (activeHold.holdReleasedDate) {
      addLine("Hold Released", formatDisplayDate(activeHold.holdReleasedDate));
    }
    if (insight.activeHoldReason) addLine("Hold Reason", insight.activeHoldReason);
    if (insight.activeHoldDays !== null && insight.isOnHold) {
      lines.push(`On Hold: ${insight.activeHoldDays} day${insight.activeHoldDays === 1 ? "" : "s"}`);
    } else if (insight.holdDurationDays) {
      lines.push(`Hold Duration: ${insight.holdDurationDays} day${insight.holdDurationDays === 1 ? "" : "s"}`);
    }
  }

  if (!insight.isOnHold && insight.daysRemaining !== null && insight.daysRemaining >= 0) {
    lines.push(`Days Remaining: ${insight.daysRemaining} day${insight.daysRemaining === 1 ? "" : "s"}`);
  }
  if (!insight.isOnHold && insight.daysOverdue !== null && insight.daysOverdue > 0) {
    lines.push(`Overdue: ${insight.daysOverdue} day${insight.daysOverdue === 1 ? "" : "s"}`);
  }

  addLine("GitHub Branch", stage.branchName);
  if (stage.githubPrLink) addLine("PR", stage.githubPrLink);
  else if (stage.prStatus && stage.prStatus !== "none") {
    lines.push(`PR Status: ${stage.prStatus}`);
  }

  if (effectiveTemplate === "on_hold") {
    lines.push("", "Please resume the task once the dependency is resolved.", "", "Thanks.");
  } else if (effectiveTemplate === "hold_released") {
    lines.push("", "Please update the Journey Tracker as you make progress.", "", "Thanks.");
  } else {
    lines.push("", "Please update the Journey Tracker once the stage is completed.", "", "Thanks.");
  }

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
