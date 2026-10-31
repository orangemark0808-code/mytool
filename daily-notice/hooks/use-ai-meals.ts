"use client";
import {useEffect,useRef,useState} from 'react';
import { clientFetch } from "@/lib/client-api";
import {parseSavedMealPlan} from '@/lib/ai-meal-contract.mjs';
import type {makeMeals} from '@/lib/meal-plan.mjs';
export type SavedMealPlan={id:string;tool:string;generatedAt:string;sourceFetchedAt:string;meals:ReturnType<typeof makeMeals>};
type State={configured:boolean;enabled:boolean;blocked:string|null;limitPerDay:number;saved:SavedMealPlan|null};
const EMPTY:State={configured:false,enabled:false,blocked:null,limitPerDay:10,saved:null};

export function useAiMeals(tool:string){
  const [states,setStates]=useState<Record<string,State>>({}),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const active=useRef(false),mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  function apply(value:unknown,target:string){
    const raw=value as Partial<State>;
    if(!raw||typeof raw.configured!=='boolean'||typeof raw.enabled!=='boolean'||!(raw.blocked===null||raw.blocked==='balance')||raw.limitPerDay!==10)throw Error('献立の応答を確認できませんでした。');
    const saved=raw.saved===null?null:parseSavedMealPlan(raw.saved);
    if(raw.saved!==null&&(!saved||saved.tool!==target))throw Error('保存された献立を確認できませんでした。');
    if(mounted.current)setStates(current=>({...current,[target]:{configured:raw.configured!,enabled:raw.enabled!,blocked:raw.blocked!,limitPerDay:10,saved}}));
  }
  async function request(action?:string,enabled?:boolean,signal?:AbortSignal){
    const target=tool;
    const response=await clientFetch('/api/meals'+(action?'':'?tool='+encodeURIComponent(target)),{method:action?'POST':'GET',cache:'no-store',credentials:'same-origin',signal,headers:action?{'Content-Type':'application/json'}:undefined,body:action?JSON.stringify({action,tool:target,enabled,requestId:action==='generate'?crypto.randomUUID():undefined}):undefined});
    let raw:Record<string,unknown>;try{const value=await response.json();if(!value||typeof value!=='object'||Array.isArray(value))throw Error();raw=value as Record<string,unknown>;}catch{throw Error('献立の応答を確認できませんでした。');}
    if(typeof raw.configured==='boolean')apply(raw,target);
    if(!response.ok)throw Error(typeof raw.error==='string'?raw.error:'献立を取得できませんでした。');
    apply(raw,target);return true;
  }
  useEffect(()=>{
    const controller=new AbortController();setError('');
    void request(undefined,undefined,controller.signal).catch(e=>{if(mounted.current&&!controller.signal.aborted)setError(e instanceof Error?e.message:'保存済みの献立を取得できませんでした。');});
    return()=>controller.abort();
  },[tool]);
  async function mutate(action:string,enabled?:boolean){
    if(active.current)return false;active.current=true;setBusy(true);setError('');
    const controller=new AbortController(),timer=window.setTimeout(()=>controller.abort(),120000);
    try{return await request(action,enabled,controller.signal);}
    catch(e){if(mounted.current)setError(e instanceof Error&&e.name!=='AbortError'?e.message:'応答を確認できませんでした。保存済みの献立は残っています。少し待って再読み込みしてください。');return false;}
    finally{window.clearTimeout(timer);active.current=false;if(mounted.current)setBusy(false);}
  }
  return {...(states[tool]||EMPTY),loaded:Boolean(states[tool]),busy,error,generate:()=>mutate('generate'),enable:(value:boolean)=>mutate('enable',value)};
}
