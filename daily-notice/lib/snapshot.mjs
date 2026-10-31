const validDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + "T00:00:00Z"));
const validTime = value => typeof value === "string" && Number.isFinite(Date.parse(value));
const shortText = value => typeof value === "string" && value.length <= 10000;

export function validSnapshot(data) {
  if (!data || data.schemaVersion !== 1 || !validDate(data.date)) return false;
  const { calendar, tasks } = data;
  if (!calendar || !tasks || !Array.isArray(calendar.events) || !Array.isArray(tasks.notes)) return false;
  if (calendar.events.length > 500 || tasks.notes.length > 500) return false;
  for (const source of [calendar, tasks]) {
    if (!validDate(source.date) || !(source.lastSuccessAt === null || validTime(source.lastSuccessAt)) || !validTime(source.lastAttemptAt)) return false;
    if (!(source.error === null || shortText(source.error))) return false;
  }
  return calendar.events.every(e => e && shortText(e.title) && shortText(e.url) && typeof e.allDay === "boolean" && validTime(e.start) && validTime(e.end)) &&
    tasks.notes.every(n => n && shortText(n.title) && ["todo", "doing", "done"].includes(n.status) && ["high", "normal", "low"].includes(n.priority) && (n.dueDate === "" || validDate(n.dueDate)) && (n.updatedAt == null || validTime(n.updatedAt)) && Array.isArray(n.items) && n.items.length <= 500 && n.items.every(i => i && shortText(i.text) && typeof i.checked === "boolean"));
}

export function safeSourceUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["www.google.com", "calendar.google.com", "orangemark0808-code.github.io"].includes(url.hostname) ? url.href : null;
  } catch { return null; }
}

/** @param {string | Date | number} [value] */
export function japanDate(value = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

export function eventOnDay(event, day) {
  if (event.allDay) return event.start.slice(0, 10) <= day && event.end.slice(0, 10) > day;
  const from = Date.parse(day + "T00:00:00+09:00");
  return Date.parse(event.start) < from + 86400000 && Date.parse(event.end) > from;
}
