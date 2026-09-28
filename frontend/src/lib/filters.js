import { daysUntil } from "./dates.js";

export const EMPTY_FILTERS = { q: "", priority: "", assignee: "", due: "" };

export function isFiltering(filters) {
  return Object.values(filters).some(Boolean);
}

/**
 * Client-side mirror of GET /api/boards/:id/tasks filtering. Filtering locally
 * keeps results instant and lets live socket updates flow straight through.
 */
export function matchesFilters(task, filters, currentUserId) {
  const { q, priority, assignee, due } = filters;

  if (q) {
    const needle = q.trim().toLowerCase();
    const haystack = `${task.title} ${task.description || ""}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  if (priority && task.priority !== priority) return false;

  if (assignee === "me" && task.assignee_id !== currentUserId) return false;
  if (assignee === "none" && task.assignee_id != null) return false;
  if (/^\d+$/.test(assignee) && task.assignee_id !== Number(assignee)) return false;

  if (due) {
    const days = daysUntil(task.due_date);
    if (due === "none") return days === null;
    if (days === null) return false;
    if (due === "overdue" && days >= 0) return false;
    if (due === "today" && days !== 0) return false;
    if (due === "week" && (days < 0 || days > 7)) return false;
  }

  return true;
}
