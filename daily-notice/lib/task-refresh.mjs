import { japanDate, validSnapshot } from "./snapshot.mjs";

export const TASK_SOURCE_ORIGIN = "https://orangemark0808-code.github.io";
export const TASK_SYNC_URL = TASK_SOURCE_ORIGIN + "/mytool/iroiro/dashboard-sync.html?v=2026-10-29-15";

/**
 * @param {{ dueDate: string, updatedAt?: string | null }} a
 * @param {{ dueDate: string, updatedAt?: string | null }} b
 */
export function compareTaskNotes(a, b) {
  const due = (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
  if (due || a.dueDate || b.dueDate) return due;
  return (Date.parse(b.updatedAt ?? "") || 0) - (Date.parse(a.updatedAt ?? "") || 0);
}

export function acceptedTaskMessage(event, peer, requestId) {
  return Boolean(peer && event.source === peer && event.origin === TASK_SOURCE_ORIGIN &&
    event.data?.type === "iroiro-tasks-result" && event.data.requestId === requestId);
}

export function taskImport(value, now = Date.now()) {
  if (!value || typeof value.fetchedAt !== "string" || !Array.isArray(value.notes)) return null;
  const time = Date.parse(value.fetchedAt);
  if (!Number.isFinite(time) || time > now + 300000 || time < now - 600000) return null;
  const tasks = { date: japanDate(time), lastSuccessAt: value.fetchedAt, lastAttemptAt: value.fetchedAt, error: null, notes: value.notes };
  if (!validSnapshot({ schemaVersion: 1, date: tasks.date, tasks, calendar: { ...tasks, events: [] } })) return null;
  return { ...tasks, notes: tasks.notes.map(note => ({
    title: note.title, status: note.status, priority: note.priority, dueDate: note.dueDate, updatedAt: note.updatedAt ?? null,
    items: note.items.map(item => ({ text: item.text, checked: item.checked })),
  })) };
}

// A polling response that began before a manual refresh must not restore old tasks.
export function newerSnapshot(current, incoming) {
  const newer = key => Date.parse(incoming[key].lastAttemptAt) >= Date.parse(current[key].lastAttemptAt) ? incoming[key] : current[key];
  return { ...incoming, date: current.date > incoming.date ? current.date : incoming.date, calendar: newer("calendar"), tasks: newer("tasks") };
}
