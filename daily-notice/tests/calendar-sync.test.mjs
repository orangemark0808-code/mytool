import test from 'node:test';
import assert from 'node:assert/strict';
import {syncCalendar} from '../backend/calendar-sync.mjs';
import empty from '../data/initial-snapshot.json' with {type:'json'};

const env={GOOGLE_CALENDAR_CLIENT_ID:'client',GOOGLE_CALENDAR_CLIENT_SECRET:'secret',GOOGLE_CALENDAR_REFRESH_TOKEN:'refresh',FIREBASE_API_KEY:'key',FIREBASE_PROJECT_ID:'project',OWNER_EMAIL:'owner@example.com'};
const now=()=>Date.parse('2026-11-01T20:25:00Z');
const ok=data=>new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
function setup({fail=false,wrongOwner=false,conflict=false,newer=false}={}) {
 let commits=0, reads=0, urls=[];
 const old=structuredClone(empty);
 old.calendar.lastAttemptAt='2026-11-01T00:00:00.000Z';
 old.calendar.lastSuccessAt=old.calendar.lastAttemptAt;
 old.tasks.lastAttemptAt='2026-11-01T00:00:00.000Z';
 old.tasks.lastSuccessAt=old.tasks.lastAttemptAt;
 class Reader {async verify(_id,{uid}){assert.equal(uid,'owner');}}
 class Store {async get(){reads++;const snapshot=structuredClone(old);if(newer)snapshot.calendar.lastAttemptAt='2026-11-01T20:26:00.000Z';return {exists:true,data:{snapshot,extra:'preserve'},updateTime:'time'};} write(_key,data,doc){assert.equal(doc.updateTime,'time');return data;} async commit([data]){commits++;assert.equal(data.extra,'preserve');assert.deepEqual(data.snapshot.tasks,old.tasks);assert.equal(data.snapshot.calendar.events.length,2);assert.equal(data.snapshot.date,'2026-11-02');return !conflict||commits>1;}}
 async function fetcher(url,opts){urls.push(String(url));assert.equal(opts.redirect,'manual');if(url.includes('oauth2.googleapis.com'))return ok({access_token:'token'});if(url.includes('identitytoolkit'))return ok({idToken:'firebase',localId:wrongOwner?'wrong':'owner'});if(fail)return new Response('',{status:500});const second=String(url).includes('pageToken=next');return ok({items:[{id:second?'2':'1',summary:'test',start:{date:'2026-11-02'},end:{date:'2026-11-03'}}],...(second?{}:{nextPageToken:'next'})});}
 return {run:()=>syncCalendar(env,{owner:'owner',fetcher,now,Reader,Store}),state:()=>({commits,reads,urls})};
}
test('日本時間の対象期間を全ページ取得し、他のデータを維持して競合時に再試行する',async()=>{const t=setup({conflict:true});assert.deepEqual(await t.run(),{updated:true});const s=t.state();assert.equal(s.commits,2);assert.equal(s.reads,2);assert.equal(s.urls.filter(x=>x.includes('calendar/v3')).length,2);assert.match(s.urls[2],/timeMin=2026-11-02/);});
test('予定取得失敗時は保存しない',async()=>{const t=setup({fail:true});await assert.rejects(t.run());assert.equal(t.state().commits,0);});
test('別のGoogleアカウントは拒否する',async()=>{const t=setup({wrongOwner:true});await assert.rejects(t.run(),/calendar-owner/);assert.equal(t.state().commits,0);});
test('後から開始した更新を古い取得で上書きしない',async()=>{const t=setup({newer:true});assert.deepEqual(await t.run(),{updated:false});assert.equal(t.state().commits,0);});
