/** Hold period helpers — shared across Story Details, Dashboard, and APIs. */

export interface HoldPeriod {
  holdStartDate: string;
  holdReleasedDate?: string | null;
  holdReason?: string;
}

export interface HoldAwareStage {
  status: string;
  plannedEndDate?: string;
  plannedStartDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  holdHistory?: HoldPeriod[];
  statusBeforeHold?: string;
}

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

/** Currently open hold entry (no release date). */
export function getActiveHold(stage: HoldAwareStage): HoldPeriod | null {
  const history = stage.holdHistory || [];
  for (let i = history.length - 1; i >= 0; i--) {
    if (!history[i].holdReleasedDate) return history[i];
  }
  return null;
}

/** Sum of all hold periods including the active hold. */
export function getTotalHoldDays(stage: HoldAwareStage, now = new Date()): number {
  let total = 0;
  for (const h of stage.holdHistory || []) {
    const start = parseDate(h.holdStartDate);
    if (!start) continue;
    const released = parseDate(h.holdReleasedDate);
    const end = released || (stage.status === "on_hold" && !h.holdReleasedDate ? now : null);
    if (end) total += Math.max(0, dayDiff(start, end));
  }
  return total;
}

/** Days in the current active hold. */
export function getActiveHoldDays(stage: HoldAwareStage, now = new Date()): number {
  const active = getActiveHold(stage);
  if (!active) return 0;
  const start = parseDate(active.holdStartDate);
  if (!start) return 0;
  return Math.max(0, dayDiff(start, now));
}

/** Original planned end + total hold days (does not overwrite planned end). */
export function getEffectivePlannedEnd(stage: HoldAwareStage, now = new Date()): Date | null {
  const plannedEnd = parseDate(stage.plannedEndDate);
  if (!plannedEnd) return null;
  const holdDays = getTotalHoldDays(stage, now);
  const adjusted = new Date(plannedEnd);
  adjusted.setDate(adjusted.getDate() + holdDays);
  return adjusted;
}

/** Hold-aware delay: on-hold stages are never delayed; calendar delay uses effective end. */
export function isStageEffectivelyDelayed(stage: HoldAwareStage, now = new Date()): boolean {
  if (stage.status === "completed" || stage.status === "on_hold") return false;
  const effectiveEnd = getEffectivePlannedEnd(stage, now);
  if (!effectiveEnd) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDay = new Date(effectiveEnd.getFullYear(), effectiveEnd.getMonth(), effectiveEnd.getDate());
  return today > endDay;
}

export function validateHoldDates(
  holdStartDate: string,
  holdReleasedDate?: string | null
): string | null {
  const start = parseDate(holdStartDate);
  if (!start) return "Hold start date is required.";
  if (holdReleasedDate) {
    const released = parseDate(holdReleasedDate);
    if (!released) return "Invalid hold released date.";
    if (released < start) return "Hold released date cannot be before hold start date.";
  }
  return null;
}

export function inferStatusAfterHoldRelease(stage: HoldAwareStage): "not_started" | "in_progress" | "delayed" {
  if (stage.statusBeforeHold && stage.statusBeforeHold !== "on_hold") {
    const prev = stage.statusBeforeHold;
    if (prev === "completed" || prev === "blocked") return "in_progress";
    if (prev === "not_started" || prev === "in_progress" || prev === "delayed") return prev;
  }
  if (stage.actualStartDate) return "in_progress";
  return "not_started";
}
