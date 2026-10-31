import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { nextMoonMilestone, lunarEvents, moonName } from '../lib/moon-widget.mjs';

// National Astronomical Observatory of Japan: 2026 almanac, JST.
// https://eco.mtk.nao.ac.jp/koyomi/yoko/2026/rekiyou263.html
const almanac = [
 ['01-03','満月','19:03'], ['01-19','新月','04:52'], ['02-02','満月','07:09'], ['02-17','新月','21:01'],
 ['03-03','満月','20:38'], ['03-19','新月','10:23'], ['04-02','満月','11:12'], ['04-17','新月','20:52'],
 ['05-02','満月','02:23'], ['05-17','新月','05:01'], ['05-31','満月','17:45'], ['06-15','新月','11:54'],
 ['06-30','満月','08:57'], ['07-14','新月','18:44'], ['07-29','満月','23:36'], ['08-13','新月','02:37'],
 ['08-28','満月','13:19'], ['09-11','新月','12:27'], ['09-27','満月','01:49'], ['10-11','新月','00:50'],
 ['10-26','満月','13:12'], ['11-09','新月','16:02'], ['11-24','満月','23:54'], ['12-09','新月','09:52'], ['12-24','満月','10:28'],
];

const quarters = [
 ['01-11','下弦','00:48'],['01-26','上弦','13:47'],['02-09','下弦','21:43'],['02-24','上弦','21:28'],
 ['03-11','下弦','18:39'],['03-26','上弦','04:18'],['04-10','下弦','13:52'],['04-24','上弦','11:32'],
 ['05-10','下弦','06:10'],['05-23','上弦','20:11'],['06-08','下弦','19:01'],['06-22','上弦','06:55'],
 ['07-08','下弦','04:29'],['07-21','上弦','20:06'],['08-06','下弦','11:21'],['08-20','上弦','11:46'],
 ['09-04','下弦','16:51'],['09-19','上弦','05:44'],['10-03','下弦','22:25'],['10-19','上弦','01:13'],
 ['11-02','下弦','05:28'],['11-17','上弦','20:48'],['12-01','下弦','15:09'],['12-17','上弦','14:43'],['12-31','下弦','03:59'],
];

test('all 50 new, quarter and full moon dates agree with the 2026 NAOJ almanac', () => {
 let maxError=0;
 for(const [suffix,name,time] of [...almanac,...quarters]) {
  const day=`2026-${suffix}`;
  const event=lunarEvents(day).find(event=>event.date===day&&event.name===name);
  assert(event,`${day} ${name}`);
  assert.equal(moonName(day),name);
  const error=Math.abs(Date.parse(event.instant)-Date.parse(`${day}T${time}:00+09:00`));
  maxError=Math.max(maxError,error);
  assert(error<120000,`${day} ${name}: ${error/1000}s`);
 }
 console.log(`NAOJ comparison: 50/50 dates; max instant difference ${(maxError/1000).toFixed(1)} seconds`);
});

test('names and countdowns never claim full/new moon before or after its civil day', () => {
 for(let offset=0;offset<365;offset++) {
  const day=new Date(Date.UTC(2026,0,1+offset)).toISOString().slice(0,10);
  const next=nextMoonMilestone(day), name=moonName(day);
  if(name==='満月'||name==='新月') assert.equal(next.label,`今日は${name}`,day);
  if(next.days===0) assert.equal(name,next.name,day);
  if(next.name==='満月'&&next.days===1) assert.equal(name,'小望月',day);
  if(next.name==='満月'&&next.days===2) assert.equal(name,'十三夜',day);
 }
});

test('new and full moon calendar dates match all 25 NAOJ events in 2026', () => {
 for (const [suffix,name,time] of almanac) {
  const day = `2026-${suffix}`;
  const event = nextMoonMilestone(day);
  assert.equal(event.date, day, day);
  assert.equal(event.name, name, day);
  assert.equal(event.days, 0, day);
  assert.equal(event.label, `今日は${name}`, day);
  assert(Math.abs(Date.parse(event.instant) - Date.parse(`${day}T${time}:00+09:00`)) < 120000, `${day} within two minutes`);
  const previousDay = new Date(Date.parse(`${day}T00:00:00Z`) - 86400000).toISOString().slice(0,10);
  assert.equal(nextMoonMilestone(previousDay).days, 1, previousDay);
 }
});

test('Tokyo civil-day countdown switches after event day, including late afternoon events', () => {
 assert.equal(nextMoonMilestone('2026-10-23').label, '満月まであと3日');
 assert.equal(nextMoonMilestone('2026-10-25').label, '満月まであと1日');
 assert.equal(nextMoonMilestone('2026-10-27').label, '新月まであと13日');
 assert.equal(nextMoonMilestone('2026-11-08').label, '新月まであと1日');
 assert.equal(nextMoonMilestone('2026-11-09').label, '今日は新月');
 assert.equal(nextMoonMilestone('2026-11-10').label, '満月まであと14日');
});

test('countdown is independent of device timezone', () => {
 for (const TZ of ['Asia/Tokyo','America/Los_Angeles','Pacific/Honolulu','Europe/London']) {
  const run = spawnSync(process.execPath, ['--input-type=module','-e',`import {nextMoonMilestone} from './lib/moon-widget.mjs';console.log(nextMoonMilestone('2026-10-23').label)`], {env:{...process.env,TZ},encoding:'utf8'});
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout.trim(), '満月まであと3日', TZ);
 }
});

test('invalid days fail with bounded validation', () => {
 for (const day of ['invalid','2026-02-30','2026-13-01','2026-1-01']) assert.throws(() => nextMoonMilestone(day), RangeError);
});
