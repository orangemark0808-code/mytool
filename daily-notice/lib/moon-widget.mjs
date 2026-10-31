import * as SunCalc from "../vendor/suncalc/suncalc.js";

const DAY_MS = 86400000;
const HOUR_MS = 3600000;
const tokyoDay = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
});

const phaseNames = ["新月", "上弦", "満月", "下弦"];
const calendarCache = new Map();

function dayStart(day) {
  const start = Date.parse(`${day}T00:00:00+09:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(start) || tokyoDay.format(new Date(start)) !== day) {
    throw new RangeError("Invalid Tokyo calendar date");
  }
  return start;
}
const dayDifference = (from, to) => Math.round((dayStart(to) - dayStart(from)) / DAY_MS);

/** Quarter-longitude crossings, using the existing hourly/bisection method.
 * The same Tokyo civil-day events drive names and countdowns. No date tables.
 */
export function lunarEvents(day) {
  const start = dayStart(day);
  if (calendarCache.has(day)) return calendarCache.get(day);
  const events = [];
  let before = start - 32 * DAY_MS;
  let beforePhase = SunCalc.getMoonIllumination(new Date(before)).phase;
  for (let hour = 0; hour < 65 * 24; hour++) {
    const after = before + HOUR_MS;
    const afterPhase = SunCalc.getMoonIllumination(new Date(after)).phase;
    const unwrappedAfter = afterPhase + (afterPhase < beforePhase ? 1 : 0);
    const target = Math.ceil((beforePhase - 1e-12) * 4) / 4;
    if (target >= beforePhase - 1e-12 && target <= unwrappedAfter) {
      let low = before, high = after;
      if (Math.abs(target - beforePhase) < 1e-12) high = low;
      while (high - low > 1000) {
        const middle = Math.floor((low + high) / 2);
        const raw = SunCalc.getMoonIllumination(new Date(middle)).phase;
        const phase = raw + (raw < beforePhase ? 1 : 0);
        if (phase < target) low = middle;
        else high = middle;
      }
      if (!events.length || high - Date.parse(events.at(-1).instant) > 1000) {
        events.push(Object.freeze({ name: phaseNames[Math.round(target * 4) % 4],
          phase: target % 1, date: tokyoDay.format(new Date(high)), instant: new Date(high).toISOString() }));
      }
    }
    before = after;
    beforePhase = afterPhase;
  }
  if (events.length < 8) throw new RangeError("No complete lunar calendar found within 65 days");
  const result = Object.freeze(events);
  if (calendarCache.size >= 12) calendarCache.delete(calendarCache.keys().next().value);
  calendarCache.set(day, result);
  return result;
}

/** Calendar-day names follow the requested convention, not age thresholds. */
export function moonName(day) {
  const events = lunarEvents(day);
  const onDay = events.find(event => event.date === day);
  if (onDay) return onDay.name;
  const previous = name => events.filter(event => event.name === name && event.date < day).at(-1);
  const next = name => events.find(event => event.name === name && event.date > day);
  const fullBefore = previous("満月"), fullAfter = next("満月"), newBefore = previous("新月");
  if (!fullBefore || !fullAfter || !newBefore) throw new RangeError("Incomplete lunar neighbours");
  const untilFull = dayDifference(day, fullAfter.date);
  if (untilFull === 1) return "小望月";
  if (untilFull === 2) return "十三夜";
  const afterFull = dayDifference(fullBefore.date, day);
  const waningNames = ["満月", "十六夜", "立待月", "居待月", "寝待月"];
  if (afterFull <= 4) return waningNames[afterFull];
  if (newBefore.date > fullBefore.date) {
    const afterNew = dayDifference(newBefore.date, day);
    if (afterNew === 1) return "繊月";
    if (afterNew <= 4) return "三日月";
    const quarter = events.find(event => event.name === "上弦" && event.date > newBefore.date);
    return quarter && dayDifference(quarter.date, day) > 2 ? "十三夜" : "上弦";
  }
  const quarter = events.find(event => event.name === "下弦" && event.date > fullBefore.date);
  return quarter && day <= quarter.date ? "下弦" : "有明月";
}

/** Include an event throughout its Tokyo civil day, even after its instant. */
export function nextMoonMilestone(day) {
  const event = lunarEvents(day).find(event => event.date >= day && (event.name === "新月" || event.name === "満月"));
  if (!event) throw new RangeError("No lunar milestone found within 32 days");
  const days = dayDifference(day, event.date);
  return { ...event, days, label: days === 0 ? `今日は${event.name}` : `${event.name}まであと${days}日` };
}
