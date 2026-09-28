const DAY = 24 * 60 * 60 * 1000;

/** Parse "YYYY-MM-DD" as a local date (not UTC midnight). */
export function parseDate(value) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function today() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Whole days from today until the date (negative when overdue). */
export function daysUntil(value) {
  const date = parseDate(value);
  return date ? Math.round((date - today()) / DAY) : null;
}

/** "overdue" | "today" | "soon" | "later" | null */
export function dueStatus(value) {
  const days = daysUntil(value);
  if (days === null) return null;
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 2) return "soon";
  return "later";
}

export function formatDue(value) {
  const days = daysUntil(value);
  if (days === null) return "";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  const date = parseDate(value);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
