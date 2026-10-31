import {ownerClient} from './firebase-client.mjs';
import {getSnapshot,putSnapshot} from './pages-data.mjs';
import {japanDate} from './snapshot.mjs';
let accessToken='',expiresAt=0;
export async function connectCalendar(){
 const c=await ownerClient(),provider=new c.a.GoogleAuthProvider();provider.addScope('https://www.googleapis.com/auth/calendar.events.readonly');provider.setCustomParameters({login_hint:c.auth.currentUser.email});
 const result=await c.a.reauthenticateWithPopup(c.auth.currentUser,provider),credential=c.a.GoogleAuthProvider.credentialFromResult(result);
 if(!credential?.accessToken)throw Error('カレンダーへの接続を確認できませんでした。');accessToken=credential.accessToken;expiresAt=Date.now()+3300000;return refreshCalendar();
}
export async function refreshCalendar(){
 if(!accessToken||Date.now()>=expiresAt)throw Error('予定を更新するには「Googleカレンダーに接続」を押してください。');
 const c=await ownerClient(),day=japanDate(),min=day+'T00:00:00+09:00',max=new Date(Date.parse(min)+7*86400000).toISOString();
 const events=[];let page='';
 do {const params=new URLSearchParams({timeMin:min,timeMax:max,singleEvents:'true',orderBy:'startTime',maxResults:'250',timeZone:'Asia/Tokyo'});if(page)params.set('pageToken',page);
 const response=await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?'+params,{headers:{Authorization:'Bearer '+accessToken},redirect:'error',signal:AbortSignal.timeout(30000)});
 if(!response.ok){if(response.status===401){accessToken='';expiresAt=0;}throw Error('Googleカレンダーを取得できませんでした。再接続してください。');}
 const raw=await response.json();events.push(...(raw.items||[]).filter(e=>e.status!=='cancelled').map(e=>({id:e.id,title:e.summary||'（タイトルなし）',url:e.htmlLink||'https://calendar.google.com/',start:e.start?.dateTime||e.start?.date,end:e.end?.dateTime||e.end?.date,allDay:!!e.start?.date})));if(events.length>500)throw Error('予定が取得上限を超えています。');page=raw.nextPageToken||'';
 }while(page);
 await ownerClient();const at=new Date().toISOString(),snapshot=await getSnapshot();await putSnapshot({...snapshot,date:day,calendar:{...snapshot.calendar,date:day,lastSuccessAt:at,lastAttemptAt:at,error:null,events}});return events.length;
}
