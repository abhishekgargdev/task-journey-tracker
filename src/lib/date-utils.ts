/**
 * Format a date for HTML <input type="date"> using local timezone (avoids UTC shift bugs).
 */
export function formatDateForInput(value?: string | Date | null): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD from a date input into a local Date at midnight.
 */
export function parseDateInput(value?: string | null): Date | null {
  if (!value) return null;
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day);
}

/**
 * Serialize a date input value for API storage (local midnight as ISO).
 */
export function serializeDateInput(value?: string | null): string | null {
  const parsed = parseDateInput(value);
  return parsed ? parsed.toISOString() : null;
}
