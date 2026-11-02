import {FirestoreMealStore} from './firestore-store.mjs';
import {FirebaseReader} from './firebase-reader.mjs';
import {mergeSnapshots} from '../lib/pages-store.mjs';
import {japanDate} from '../lib/snapshot.mjs';
import {limitedJson} from './security.mjs';

// Tokens and calendar details must never be written to logs.
export async function syncCalendar(env, {owner, fetcher = (...args) => fetch(...args), now = Date.now, Reader = FirebaseReader, Store = FirestoreMealStore} = {}) {
  for (const key of ['GOOGLE_CALENDAR_CLIENT_ID','GOOGLE_CALENDAR_CLIENT_SECRET','GOOGLE_CALENDAR_REFRESH_TOKEN','FIREBASE_API_KEY','FIREBASE_PROJECT_ID','OWNER_EMAIL']) {
    if (!env[key]) throw Error('calendar-config');
  }
  async function json(url, options) {
    const response = await fetcher(url, {...options, redirect:'manual', signal:AbortSignal.timeout(30000)});
    if (!response.ok) { await response.body?.cancel(); throw Error('calendar-upstream'); }
    return limitedJson(response, 1000000);
  }
  const token = await json('https://oauth2.googleapis.com/token', {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({client_id:env.GOOGLE_CALENDAR_CLIENT_ID,client_secret:env.GOOGLE_CALENDAR_CLIENT_SECRET,refresh_token:env.GOOGLE_CALENDAR_REFRESH_TOKEN,grant_type:'refresh_token'})});
  if (typeof token.access_token !== 'string' || !token.access_token) throw Error('calendar-auth');
  const firebase = await json('https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key='+encodeURIComponent(env.FIREBASE_API_KEY), {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postBody:new URLSearchParams({access_token:token.access_token,providerId:'google.com'}).toString(),requestUri:'https://orangemark0808-code.github.io/mytool/daily-notice/',returnSecureToken:true})});
  if (typeof firebase.idToken !== 'string' || firebase.localId !== owner) throw Error('calendar-owner');
  const reader = new Reader({projectId:env.FIREBASE_PROJECT_ID,apiKey:env.FIREBASE_API_KEY,expectedEmail:env.OWNER_EMAIL},{fetcher,now});
  await reader.verify(firebase.idToken,{uid:owner});
  const started = now(), day = japanDate(started), min = day+'T00:00:00+09:00', max = new Date(Date.parse(min)+7*86400000).toISOString();
  const events=[]; let page=''; let pages=0;
  do {
    if (++pages>10) throw Error('calendar-limit');
    const params=new URLSearchParams({timeMin:min,timeMax:max,singleEvents:'true',orderBy:'startTime',maxResults:'250',timeZone:'Asia/Tokyo'}); if(page)params.set('pageToken',page);
    const data=await json('https://www.googleapis.com/calendar/v3/calendars/primary/events?'+params,{headers:{Authorization:'Bearer '+token.access_token}});
    if(!Array.isArray(data.items))throw Error('calendar-response');
    for(const e of data.items) if(e.status!=='cancelled') events.push({id:e.id,title:e.summary||'（タイトルなし）',url:e.htmlLink||'https://calendar.google.com/',start:e.start?.dateTime||e.start?.date,end:e.end?.dateTime||e.end?.date,allDay:!!e.start?.date});
    if(events.length>500)throw Error('calendar-limit'); page=data.nextPageToken||'';
  } while(page);
  const at=new Date(now()).toISOString();
  const store=new Store({projectId:env.FIREBASE_PROJECT_ID,owner,idToken:firebase.idToken,fetcher});
  for(let attempt=0;attempt<4;attempt++){
    const doc=await store.get('Snapshot');
    if(!doc.exists||!doc.data?.snapshot)throw Error('calendar-snapshot');
    const current=doc.data.snapshot;
    // Compare the start time so an older in-flight fetch cannot replace a newer one.
    if(Date.parse(current.calendar?.lastAttemptAt)>started)return {updated:false};
    const snapshot=mergeSnapshots(current,{...current,date:day,calendar:{...current.calendar,date:day,lastSuccessAt:at,lastAttemptAt:at,error:null,events}});
    if(await store.commit([store.write('Snapshot',{...doc.data,snapshot,importedAt:at},doc)]))return {updated:true};
  }
  throw Error('calendar-conflict');
}
