import {useEffect,useRef,useState} from 'react';
import {addTask,readTasks,getSnapshot} from '@/lib/pages-data.mjs';
import type {Snapshot} from '@/lib/snapshot-types';
export type TaskAddition={group:string;text:string;operationId:string};
export type RefreshNotice={kind:'loading'|'success'|'error'|'auth';text:string};
export function useTaskRefresh(onUpdated:(v:Snapshot)=>void,onAdded:(v:TaskAddition)=>void,{autoStart=true}={}){
 const [connected,setConnected]=useState(true),[additionError,setAdditionError]=useState(''),[refreshing,setRefreshing]=useState(false),[notice,setNotice]=useState<RefreshNotice|null>(null);
 const active=useRef(false),mounted=useRef(true),callbacks=useRef({onUpdated,onAdded});callbacks.current={onUpdated,onAdded};
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 async function run(addition?:TaskAddition){if(active.current)return false;active.current=true;setRefreshing(true);setAdditionError('');try{await (addition?addTask(addition):readTasks());const snapshot=await getSnapshot();if(!mounted.current)return true;callbacks.current.onUpdated(snapshot);if(addition)callbacks.current.onAdded(addition);setConnected(true);setNotice({kind:'success',text:addition?'タスクを追加しました。':'タスクを更新しました。'});return true;}catch(e){if(mounted.current){const text=e instanceof Error?e.message:'タスクを取得できませんでした。';if(addition)setAdditionError(text);else setNotice({kind:'error',text});}return false;}finally{active.current=false;if(mounted.current)setRefreshing(false);}}
 useEffect(()=>{if(autoStart)void run();},[autoStart]);
 return {connected,additionError,refreshing,notice,add:(v:TaskAddition)=>run(v),addFromWindow:(v:TaskAddition,_email:string)=>run(v),refresh:()=>run(),connect:()=>run(),dismiss:()=>setNotice(null)};
}
