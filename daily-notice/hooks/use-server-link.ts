import {useEffect,useRef,useState} from 'react';
import {readTasks,readFoods} from '@/lib/pages-data.mjs';
import type {RefreshNotice} from './use-task-refresh';
export type ServerLinkMode={available:boolean;enabled:boolean;canManage:boolean;sourceEmail:string};
export function useServerLink(mode:ServerLinkMode,onTasks:(v:any)=>void,paused=false){
 const [stock,setStock]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[connected,setConnected]=useState(false),[notice,setNotice]=useState<RefreshNotice|null>(null);
 const active=useRef(false),mounted=useRef(true),callback=useRef(onTasks);callback.current=onTasks;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 async function refresh(_force=true){if(active.current||paused)return false;active.current=true;setBusy(true);setError('');try{const result=await Promise.allSettled([readTasks(),readFoods()]);if(!mounted.current)return false;let ok=true;if(result[0].status==='fulfilled'){callback.current(result[0].value);setConnected(true);}else{ok=false;setError(result[0].reason.message);}if(result[1].status==='fulfilled')setStock(result[1].value);else{ok=false;setError(result[1].reason.message);}setNotice({kind:ok?'success':'error',text:ok?'タスク・食材を更新しました。':'一部の情報を取得できませんでした。前回の情報を残しています。'});return ok;}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'取得できませんでした。');return false;}finally{active.current=false;if(mounted.current)setBusy(false);}}
 useEffect(()=>{if(!mode.enabled)return;void refresh(false);const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh(false);},60000);return()=>clearInterval(timer);},[mode.enabled]);
 return {result:null,busy,notice,refresh,connect:()=>refresh(),disconnect:async()=>false,connected,stock,error,needsConnection:false,dismiss:()=>setNotice(null)};
}
