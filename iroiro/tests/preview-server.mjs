// 実アカウントを使わずに、公開用UIの保存・再読込・完了操作を確認するプレビュー。
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root=new URL('../',import.meta.url);
const sdk=String.raw`
const key='iroiro-neta-import-preview-v1';
const date=new Date(),today=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
const initial={
  'users/preview-user/iroiroSettings/main':{categories:[{id:'app',name:'アプリ',color:'#FF7F00',order:0},{id:'tasks',name:'タスク',color:'#FFD400',order:1},{id:'blog',name:'ブログ',color:'#3A86D4',order:2},{id:'manga',name:'漫画',color:'#FFD400',order:3},{id:'food',name:'食材',color:'#38A169',order:4}]},
  'users/preview-user/iroiroNotes/sample-food':{title:'キャベツ',type:'text',categoryId:'food',content:'カット済み',items:[],food:{remainingGrams:500,storage:'chilled',useSoon:true},createdAt:date.toISOString(),updatedAt:date.toISOString()},
  'users/preview-user/iroiroNotes/sample-pork':{title:'豚こま',type:'text',categoryId:'food',content:'',items:[],food:{remainingGrams:250,storage:'frozen',useSoon:false},createdAt:date.toISOString(),updatedAt:date.toISOString()},
  'users/preview-user/iroiroNotes/sample-task':{title:'記事の下書きを作る',type:'text',categoryId:'tasks',content:'先週の出来事をテーマにする。',items:[],task:{status:'doing',priority:'normal',dueDate:today,items:[{id:'x',text:'見出しを考える',checked:true},{id:'y',text:'本文を書く',checked:false}]},createdAt:date.toISOString(),updatedAt:date.toISOString()},
  'users/preview-user/iroiroNotes/done-task':{title:'資料を整理する',type:'text',categoryId:'tasks',content:'確認済みの作業。',items:[],task:{status:'done',priority:'low',dueDate:'',items:[]},createdAt:date.toISOString(),updatedAt:date.toISOString()},
  'users/preview-user/netakiroku/old-record':{title:'【架空】以前の漫画案',status:'完成',category:'仕事',tags:['旧データ'],memo:'自分用のメモ',rows:[{pageNumber:1,panel:'1',actor:'主人公',type:'(心)',detail:'架空のセリフ',reference:'https://example.com/'},{pageNumber:2,panel:'1',actor:'ナレーション',type:'(状)',detail:'場面転換',reference:''}],createdAt:'2025-01-02T03:04:05.000Z',updatedAt:'2026-05-06T07:08:09.000Z'},
  'users/preview-user/netakiroku/new-record':{title:'【架空】新形式の漫画案',status:'ネタ作成中',category:'日常',tags:['新形式'],memo:'補足',pages:[{rows:[{panel:'1',actor:'主人公',type:'(叫)',detail:'もう一つの案',reference:''}]}],createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-02-02T00:00:00.000Z'},
  'users/preview-user/iroiroNotes/normal-note':{title:'通常のメモ',type:'text',categoryId:'blog',content:'架空のプレビューデータです。',items:[],createdAt:date.toISOString(),updatedAt:date.toISOString()},
};
let store=JSON.parse(localStorage.getItem(key)||'null')||initial;
let user={uid:'preview-user'};
const listeners=new Set();
const copy=value=>structuredClone(value);
const snapshot=ref=>({exists:()=>Object.hasOwn(store,ref.path),data:()=>copy(store[ref.path]),docs:Object.keys(store).filter(path=>path.startsWith(ref.path+'/')&&!path.slice(ref.path.length+1).includes('/')).map(path=>({id:path.split('/').at(-1),data:()=>copy(store[path])}))});
function notify(){localStorage.setItem(key,JSON.stringify(store));for(const listener of listeners)queueMicrotask(()=>listener.callback(snapshot(listener.ref)))}
function write(ref,data,options){
  const next=options?.merge?copy(store[ref.path]||{}):{};
  for(const [key,value]of Object.entries(data)){
    const parts=key.split('.');let object=next;
    for(const part of parts.slice(0,-1))object=object[part]??={};
    object[parts.at(-1)]=copy(value);
  }
  store[ref.path]=next;
}
export const initializeApp=()=>({});
export const getAuth=()=>({});
export const getFirestore=()=>({});
export class GoogleAuthProvider{}
export const onAuthStateChanged=(auth,callback)=>{queueMicrotask(()=>callback(user));return()=>{}};
export const signInWithPopup=async()=>({user});
export const signOut=async()=>{};
export function collection(db,...parts){return{path:parts.join('/')}}
export function doc(db,...parts){return{path:(db?.path?[db.path,...parts]:parts).join('/')}}
export const query=ref=>ref;
export const orderBy=()=>({});
export const serverTimestamp=()=>new Date();
export const Timestamp={fromDate:date=>date};
export const getDoc=async ref=>snapshot(ref);
export const getDocs=async ref=>snapshot(ref);
export function onSnapshot(ref,callback){const listener={ref,callback};listeners.add(listener);queueMicrotask(()=>callback(snapshot(ref)));return()=>listeners.delete(listener)}
export async function setDoc(ref,data,options){write(ref,data,options);notify()}
export async function updateDoc(ref,data){write(ref,data,{merge:true});notify()}
export async function addDoc(ref,data){const id=crypto.randomUUID();write(doc(ref,id),data);notify();return{id}}
export async function deleteDoc(ref){delete store[ref.path];notify()}
export async function runTransaction(db,callback){const pending=[],removed=[];const result=await callback({get:getDoc,set:(...args)=>pending.push(args),update:(ref,data)=>pending.push([ref,data,{merge:true}]),delete:ref=>removed.push(ref)});for(const args of pending)write(...args);for(const ref of removed)delete store[ref.path];notify();return result}
export function writeBatch(){const pending=[];return{set:(...args)=>pending.push(args),update:(ref,data)=>pending.push([ref,data,{merge:true}]),commit:async()=>{for(const args of pending)write(...args);notify()}}}
`;

const server=http.createServer(async(req,res)=>{
  try{
    const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
    if(name==='mobile-preview.html'){
      res.setHeader('Content-Type','text/html; charset=utf-8');
      res.end('<!doctype html><html lang="ja"><meta charset="utf-8"><title>スマートフォン幅の検証</title><style>body{margin:24px;background:#e8e5e1;font:14px sans-serif}iframe{display:block;width:390px;height:844px;border:1px solid #aaa;background:white}</style><p>架空データ・画面幅390pxでの表示</p><iframe title="イロイロキロクのモバイル表示" src="/"></iframe></html>');return;
    }
    if(name==='mock-firebase.mjs'){res.setHeader('Content-Type','text/javascript');res.end(sdk);return}
    if(name==='firebase-config.js'||name==='firebase-config.local.js'){
      res.setHeader('Content-Type','text/javascript');res.end(name==='firebase-config.js'?"window.IROIRO_FIREBASE_CONFIG={apiKey:'preview',projectId:'preview',appId:'preview'};":'');return;
    }
    if(!['index.html','script.js','style.css','task-core.mjs','manga-core.mjs','manga-editor.mjs','note-concurrency.mjs','food-core.mjs','food-editor.mjs'].includes(name)){res.writeHead(404);res.end('Not found');return}
    let content=await readFile(new URL(name,root),'utf8');
    if(name==='script.js')content=content.replace(/from 'https:\/\/www\.gstatic\.com\/firebasejs\/[^']+'/g,"from './mock-firebase.mjs'");
    res.setHeader('Content-Type',name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.css')?'text/css':'text/javascript');
    res.setHeader('Cache-Control','no-store');res.end(content);
  }catch(error){res.writeHead(500);res.end('Preview error')}
});
server.listen(4177,'127.0.0.1',()=>console.log(`Iroiro offline preview: http://127.0.0.1:4177/ (${fileURLToPath(root)})`));
