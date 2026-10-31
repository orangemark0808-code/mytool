import {createRoot} from 'react-dom/client';
import {useEffect,useState} from 'react';
import Dashboard from '@/app/dashboard';
import {firebaseClient,login,logout,OWNER_UID} from '@/lib/firebase-client.mjs';
import {connectCalendar} from '@/lib/calendar.mjs';
import {importMigration,exportMigration} from '@/lib/migrate.mjs';
import '@/app/globals.css';
import './pages.css';
function App(){
 const [user,setUser]=useState<any>(undefined),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[version,setVersion]=useState(0),[settings,setSettings]=useState(false),[migrationText,setMigrationText]=useState('');
 useEffect(()=>{let stop:any,active=true;void firebaseClient().then(c=>{if(active)stop=c.a.onAuthStateChanged(c.auth,(u:any)=>setUser(u?.uid===OWNER_UID?u:null));}).catch(e=>{if(active){setError(e.message);setUser(null);}});return()=>{active=false;stop?.();};},[]);
 async function run(fn:()=>Promise<any>){if(busy)return;setBusy(true);setError('');setMessage('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'処理できませんでした。');}finally{setBusy(false);}}
 async function importRaw(raw:unknown){const result=await importMigration(raw);setMessage(result.memoImported?'予定・タスク・メモ・保存済み献立を引き継ぎました。':'予定と保存済み献立を確認しました。移行先のメモは保存済みの内容を保持しています。');setVersion(v=>v+1);}
 async function importFile(file:File){if(file.size>2000000)throw Error('移行ファイルが大きすぎます。');await importRaw(JSON.parse(await file.text()));}
 async function download(){const data=await exportMigration(),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='daily-notice-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 if(user===undefined)return <main className="login-card"><h1>今日のお知らせ</h1><p>ログイン状態を確認しています…</p>{error&&<p role="alert">{error}</p>}</main>;
 if(!user)return <main className="login-card"><img src={import.meta.env.BASE_URL+'home-icon-192.png'} width="72" height="72" alt=""/><h1>今日のお知らせ</h1><p>予定・タスク・食材・メモを、いつもの場所に。</p><p>ご本人のGoogleアカウントでログインしてください。</p><button disabled={busy} onClick={()=>void run(login)}>{busy?'接続中…':'Googleでログイン'}</button>{error&&<p role="alert">{error}</p>}</main>;
 return <><div className="account-bar"><button type="button" onClick={()=>setSettings(v=>!v)}>設定・データ移行</button></div>{settings&&<section className="account-panel"><h2>設定とデータ</h2><p>{user.email}</p><div className="account-actions"><button disabled={busy} onClick={()=>void run(async()=>{const count=await connectCalendar();setMessage(`予定を${count}件更新しました。`);setVersion(v=>v+1);})}>Googleカレンダーに接続</button><label className="file-button">旧サイトのデータを読み込む<input type="file" accept=".json,application/json" disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void run(()=>importFile(file));}}/></label><button disabled={busy} onClick={()=>void run(download)}>バックアップを書き出す</button><button disabled={busy} onClick={()=>void run(logout)}>ログアウト</button></div><details className="migration-paste"><summary>移行データを貼り付ける</summary><label htmlFor="migration-data">移行データ（JSON）</label><textarea id="migration-data" rows={4} maxLength={2000000} value={migrationText} onChange={e=>setMigrationText(e.target.value)}/><button type="button" disabled={busy||!migrationText.trim()} onClick={()=>void run(async()=>{await importRaw(JSON.parse(migrationText));setMigrationText('');})}>貼り付けたデータを読み込む</button></details><p className="muted">メモと保存済みデータはGoogleアカウントの本人専用領域へ保存します。予定の接続はこの画面を開いている間だけ有効です。</p></section>}{(message||error)&&<div className={'account-message'+(error?' error':'')} role={error?'alert':'status'}>{error||message}</div>}<Dashboard key={version} serverLinkMode={{available:true,enabled:true,canManage:true,sourceEmail:user.email||''}}/></>;
}
createRoot(document.getElementById('root')!).render(<App/>);
