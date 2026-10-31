import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { calculateSky, previousNewMoon, millisecondsUntilTokyoMidnight, moonName, moonLitPath, watchSky } from "../lib/sky.mjs";

const almanac = [
  ["2026-10-11", "06:00", "17:29", "0.5"],
  ["2026-10-23", "06:10", "17:14", "12.5"],
  ["2026-10-24", "06:11", "17:13", "13.5"],
  ["2026-10-31", "06:17", "17:06", "20.5"],
];

test("Osaka agrees with NAOJ's sunrise, sunset and noon lunar age", () => {
  // https://eco.mtk.nao.ac.jp/koyomi/dni/2026/s2810.html
  // https://eco.mtk.nao.ac.jp/koyomi/dni/2026/m2810.html
  // NAOJ uses 34.6833 N, 135.4833 E; the requested Osaka point is nearby.
  for (const [day, sunrise, sunset, ageLabel] of almanac) {
    const sky = calculateSky(new Date(`${day}T12:00:00+09:00`));
    assert.equal(sky.sunrise, sunrise, day);
    assert.equal(sky.sunset, sunset, day);
    assert.equal(sky.ageLabel, ageLabel, day);
    assert(sky.fraction >= 0 && sky.fraction <= 1);
  }
  assert.equal(calculateSky(new Date("2026-10-23T21:00:00+09:00")).name, "十三夜");
});

test("daily values are identical at 07:00, 21:00 and 23:59, including on new-moon day", () => {
  for (const [day, sunrise, sunset, ageLabel] of almanac) {
    for (const time of ["07:00:00", "21:00:00", "23:59:59"]) {
      const sky = calculateSky(new Date(`${day}T${time}+09:00`));
      assert.deepEqual([sky.day, sky.sunrise, sky.sunset, sky.ageLabel], [day, sunrise, sunset, ageLabel]);
    }
  }
});

test("device timezones cannot change Tokyo's daily values", () => {
  const moduleUrl = new URL("../lib/sky.mjs", import.meta.url).href;
  const script = `import { calculateSky } from ${JSON.stringify(moduleUrl)};
    console.log(JSON.stringify(['07:00:00','21:00:00','23:59:59'].map(time => {
      const sky=calculateSky(new Date('2026-10-23T'+time+'+09:00'));
      return [sky.day,sky.sunrise,sky.sunset,sky.ageLabel];
    })));`;
  for (const TZ of ["Asia/Tokyo", "America/Los_Angeles", "Pacific/Honolulu", "Europe/London"]) {
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {env: {...process.env, TZ}, encoding: "utf8"});
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), Array.from({length: 3}, () => ["2026-10-23", "06:10", "17:14", "12.5"]), TZ);
  }
});

test("new-moon search resolves the last wrap, including noon before a same-day new moon", () => {
  // https://eco.mtk.nao.ac.jp/koyomi/yoko/2026/rekiyou263.html
  const october = previousNewMoon(new Date("2026-10-23T12:00:00+09:00"));
  assert(Math.abs(october.getTime() - Date.parse("2026-10-11T00:50:00+09:00")) < 120000);
  const before = previousNewMoon(new Date(october.getTime() - 2000));
  const after = previousNewMoon(new Date(october.getTime() + 2000));
  assert(Math.abs(before.getTime() - Date.parse("2026-09-11T12:27:00+09:00")) < 120000);
  assert(Math.abs(after.getTime() - october.getTime()) < 1000);
  const novemberNoon = previousNewMoon(new Date("2026-11-09T12:00:00+09:00"));
  assert.equal(novemberNoon.getTime(), october.getTime());
  const novemberAfter = previousNewMoon(new Date("2026-11-10T12:00:00+09:00"));
  assert(Math.abs(novemberAfter.getTime() - Date.parse("2026-11-09T16:02:00+09:00")) < 120000);
  assert.throws(() => previousNewMoon(new Date(NaN)), RangeError);
});

test("sunrise and sunset use the Tokyo calendar day even near midnight abroad", () => {
  const midnight = calculateSky(new Date("2026-10-22T08:00:00-07:00"));
  const evening = calculateSky(new Date("2026-10-23T14:59:59Z"));
  assert.equal(midnight.day, "2026-10-23");
  assert.equal(evening.day, midnight.day);
  assert.equal(evening.sunrise, midnight.sunrise);
  assert.equal(evening.sunset, midnight.sunset);
  assert.equal(calculateSky(new Date("2026-10-23T15:00:00Z")).day, "2026-10-24");
  assert.equal(millisecondsUntilTokyoMidnight(new Date("2026-10-23T14:59:59Z")), 1000);
  assert.equal(millisecondsUntilTokyoMidnight(new Date("2026-10-23T15:00:00Z")), 86400000);
});

test("moon names follow Tokyo phase dates at every time of day", () => {
  const names = [["10-11","新月"],["10-12","繊月"],["10-13","三日月"],["10-19","上弦"],
    ["10-24","十三夜"],["10-25","小望月"],["10-26","満月"],["10-27","十六夜"],
    ["10-28","立待月"],["10-29","居待月"],["10-30","寝待月"],["11-02","下弦"],["11-05","有明月"]];
  for (const [suffix, name] of names) {
    const day=`2026-${suffix}`;
    assert.equal(moonName(day),name);
    for(const time of ["00:00:00","12:00:00","23:59:59"]) assert.equal(calculateSky(new Date(`${day}T${time}+09:00`)).name,name);
  }
});

test("a polar day or night displays unavailable sun events without a runtime error", () => {
  const sky = calculateSky(new Date("2026-06-21T12:00:00+09:00"), { name: "Pole", lat: 90, lng: 0 });
  assert.equal(sky.sunrise, "—");
  assert.equal(sky.sunset, "—");
});

test("moon rendering handles new, full and quarter disks without invalid geometry", () => {
  assert.equal(moonLitPath(0, 0), "");
  assert.equal(moonLitPath(1, 0), "");
  assert.equal(moonLitPath(NaN, .5), "");
  assert.equal(moonLitPath(.5, NaN), "");
  assert(moonLitPath(.5, 1).endsWith(" Z"));
  for (const [phase, fraction] of [[.25,.5],[.75,.5],[.1,.1],[.9,.1],[.4,.9],[.6,.9],[.5,1]]) {
    const path = moonLitPath(phase, fraction);
    assert(!/NaN|Infinity/.test(path));
    assert(path.startsWith("M 12 2"));
  }
  assert.notEqual(moonLitPath(.25, .5), moonLitPath(.75, .5));
});

test("the SKY clock refreshes on Tokyo midnight and visibility, and fully cleans up", () => {
  let instant = new Date("2026-10-23T23:59:59+09:00"), nextId = 0;
  const timers = new Map(), listeners = new Map(), updates = [];
  const visibility = {
    visibilityState: "visible",
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name, callback) => { assert.equal(listeners.get(name), callback); listeners.delete(name); },
  };
  const stop = watchSky(value => updates.push(value), {
    now: () => instant, visibility,
    setTimer: (callback, delay) => { timers.set(++nextId, {callback, delay}); return nextId; },
    clearTimer: id => timers.delete(id),
  });
  assert.equal(updates.length, 1);
  assert.equal(updates[0].day, "2026-10-23");
  assert.equal(timers.size, 1);
  assert.equal([...timers.values()][0].delay, 1025);
  instant = new Date("2026-10-24T00:00:00.025+09:00");
  [...timers.values()][0].callback();
  assert.equal(updates.at(-1).day, "2026-10-24");
  assert.equal(timers.size, 1);
  visibility.visibilityState = "hidden";
  listeners.get("visibilitychange")();
  assert.equal(updates.length, 2);
  visibility.visibilityState = "visible";
  instant = new Date("2026-10-25T09:00:00+09:00");
  listeners.get("visibilitychange")();
  assert.equal(updates.at(-1).day, "2026-10-25");
  assert.equal(timers.size, 1);
  stop();
  assert.equal(timers.size, 0);
  assert.equal(listeners.size, 0);
});
