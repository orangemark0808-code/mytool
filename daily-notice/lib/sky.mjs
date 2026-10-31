import * as SunCalc from "../vendor/suncalc/suncalc.js";
import { moonName } from "./moon-widget.mjs";
export { moonName } from "./moon-widget.mjs";

// Change this fixed location here. No device location or external API is used.
export const SKY_LOCATION = Object.freeze({ name: "Osaka", lat: 34.6937, lng: 135.5023 });
export const SKY_TIME_ZONE = "Asia/Tokyo";
const DAY_MS = 86400000;
const HOUR_MS = 3600000;
const TOKYO_OFFSET_MS = 9 * 3600000;
const dateFormat = new Intl.DateTimeFormat("sv-SE", { timeZone: SKY_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { timeZone: SKY_TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function timeLabel(date) {
  if (!date || !Number.isFinite(date.getTime())) return "—";
  // Whole-minute almanacs round their published times to the nearest minute.
  return timeFormat.format(new Date(Math.round(date.getTime() / 60000) * 60000));
}

/** Find the most recent phase wrap (1 → 0), with a bounded hourly search. */
export function previousNewMoon(date) {
  let after = date.getTime();
  let afterPhase = SunCalc.getMoonIllumination(date).phase;
  if (!Number.isFinite(after) || !Number.isFinite(afterPhase)) throw new RangeError("Invalid lunar reference date");
  if (afterPhase === 0) return new Date(after);

  // A lunation is under 32 days. Searching backwards selects the latest wrap,
  // including when the reference noon falls on the new-moon calendar date.
  for (let hour = 0; hour < 32 * 24; hour++) {
    let before = after - HOUR_MS;
    const beforePhase = SunCalc.getMoonIllumination(new Date(before)).phase;
    if (beforePhase > 0.5 && afterPhase < 0.5) {
      while (after - before > 1000) {
        const middle = Math.floor((before + after) / 2);
        if (SunCalc.getMoonIllumination(new Date(middle)).phase > 0.5) before = middle;
        else after = middle;
      }
      return new Date(after);
    }
    after = before;
    afterPhase = beforePhase;
  }
  throw new RangeError("No new moon found within 32 days");
}

export function calculateSky(now = new Date(), location = SKY_LOCATION) {
  const day = dateFormat.format(now);
  // Explicit JST noon and civil-day offset are independent of device timezone
  // and prevent evening requests from selecting the next solar day.
  const noon = new Date(`${day}T12:00:00+09:00`);
  const { sunrise, sunset } = SunCalc.getTimes(noon, location.lat, location.lng, 0, 540);
  const { phase, fraction } = SunCalc.getMoonIllumination(now);
  const age = Number(((noon.getTime() - previousNewMoon(noon).getTime()) / DAY_MS).toFixed(1));
  return { day, phase, fraction, age, ageLabel: age.toFixed(1), name: moonName(day), sunrise: timeLabel(sunrise), sunset: timeLabel(sunset) };
}

export function millisecondsUntilTokyoMidnight(now) {
  const time = now.getTime();
  return Math.floor((time + TOKYO_OFFSET_MS) / DAY_MS + 1) * DAY_MS - TOKYO_OFFSET_MS - time;
}

/** A 20px lunar disk inside a 24px viewBox, lit on the waxing/waning side. */
export function moonLitPath(phase, fraction) {
  const lit = Math.max(0, Math.min(1, fraction));
  if (!Number.isFinite(phase) || !Number.isFinite(lit) || lit <= 1e-6) return "";
  if (lit >= 1 - 1e-6) return "M 12 2 A 10 10 0 0 1 12 22 A 10 10 0 0 1 12 2 Z";
  const waxing = phase < 0.5;
  const curve = 1 - 2 * lit;
  const radius = Math.abs(curve) * 10;
  const limbSweep = waxing ? 1 : 0;
  const boundarySweep = waxing ? (curve >= 0 ? 0 : 1) : (curve >= 0 ? 1 : 0);
  const boundary = radius < 1e-6 ? "L 12 2" : `A ${radius.toFixed(6)} 10 0 0 ${boundarySweep} 12 2`;
  return `M 12 2 A 10 10 0 0 ${limbSweep} 12 22 ${boundary} Z`;
}

/** Clock independent of snapshot polling and task-refresh controls. */
export function watchSky(onUpdate, {
  now = () => new Date(), setTimer = setTimeout, clearTimer = clearTimeout, visibility = document,
} = {}) {
  let timer;
  const update = () => {
    clearTimer(timer);
    const instant = now();
    onUpdate(calculateSky(instant));
    timer = setTimer(update, millisecondsUntilTokyoMidnight(instant) + 25);
  };
  const onVisible = () => { if (visibility.visibilityState === "visible") update(); };
  update();
  visibility.addEventListener("visibilitychange", onVisible);
  return () => { clearTimer(timer); visibility.removeEventListener("visibilitychange", onVisible); };
}
