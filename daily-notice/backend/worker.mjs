import {FirebaseReader} from './firebase-reader.mjs';
import {FirestoreMealStore} from './firestore-store.mjs';
import {AiMealService,mealMessage} from '../lib/ai-meal-service.mjs';
import {MealError} from '../lib/ai-meal-contract.mjs';
import {limitedJson} from './security.mjs';
export const OWNER_UID='hTULUx4EdSUTDej6ZA4EznFwjSC3';
export function createWorker({fetcher=fetch,now=Date.now}={}){return {async fetch(request,env){
 const origin='https://orangemark0808-code.github.io',cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Vary':'Origin','Cache-Control':'private, no-store'};
 const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}});
 const url=new URL(request.url);
 if(request.headers.has('origin')&&request.headers.get('origin')!==origin)return reply({error:'接続元を確認できません。'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(url.pathname==='/health')return reply({ok:true});
 if(url.pathname!=='/api/meals'||!['GET','POST'].includes(request.method))return reply({error:'Not found'},404);
 const match=/^Bearer (\S{1,20000})$/.exec(request.headers.get('Authorization')||'');if(!match)return reply({error:'Googleでログインしてください。'},401);
 if(!env.FIREBASE_API_KEY||!env.FIREBASE_PROJECT_ID||!env.OWNER_EMAIL)return reply({error:'生成サーバーの接続設定を確認してください。'},503);
 const config={projectId:env.FIREBASE_PROJECT_ID,apiKey:env.FIREBASE_API_KEY,expectedEmail:env.OWNER_EMAIL};
 const reader=new FirebaseReader(config,{fetcher,now});
 try{await reader.verify(match[1],{uid:OWNER_UID});}catch{return reply({error:'ご本人のGoogleアカウントでログインしてください。'},401);}
 const store=new FirestoreMealStore({projectId:config.projectId,owner:OWNER_UID,idToken:match[1],fetcher});
 const service=new AiMealService({store,owner:OWNER_UID,apiKey:env.OPENAI_API_KEY||'',model:env.OPENAI_MODEL||'gpt-6.1-sol',readStock:async()=>{const value=await reader.read(match[1],OWNER_UID);if(!value.food)throw new MealError('source');return value.food;},fetcher,now});
 let tool=url.searchParams.get('tool');
 try{
  if(request.method==='GET'){if(!['pan','steamer','rede'].includes(tool))return reply({error:'器具を選んでください。'},400);return reply(await service.status(tool));}
  let body;try{body=await limitedJson(request,2000);}catch{return reply({error:'入力内容を確認してください。'},400);}
  tool=body?.tool;if(!['pan','steamer','rede'].includes(tool))return reply({error:'器具を選んでください。'},400);
  if(body.action==='enable'&&typeof body.enabled==='boolean'){await store.enable(OWNER_UID,body.enabled);return reply(await service.status(tool));}
  if(body.action!=='generate')return reply({error:'入力内容を確認してください。'},400);
  try{return reply(await service.generate(tool,body.requestId));}catch(e){const code=e instanceof MealError?e.code:'network';return reply({...await service.status(tool),error:mealMessage(code),code},code==='invalid'?400:['busy','limit','balance'].includes(code)?429:503);}
 }catch{return reply({error:'献立を取得・保存できませんでした。保存済みの内容は保持しています。'},503);}
}};}
export default createWorker();
