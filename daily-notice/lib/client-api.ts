import {getSnapshot,getMemo,putMemo,mealStatus,setMealEnabled} from './pages-data.mjs';
import {ownerClient} from './firebase-client.mjs';
export async function clientRequest<T>(path:string,init?:RequestInit):Promise<T>{
  if(init?.signal?.aborted)throw new DOMException('Aborted','AbortError');
  const body=init?.body?JSON.parse(String(init.body)):null;
  if(path==='/api/snapshot')return {snapshot:await getSnapshot()} as T;
  if(path==='/api/memo')return (init?.method==='PUT'?await putMemo(body):await getMemo()) as T;
  if(path.startsWith('/api/meals')){
    const tool=body?.tool||new URL(path,'https://local.test').searchParams.get('tool');
    if(!['pan','steamer','rede'].includes(tool))throw Error('器具を選んでください。');
    const origin=(window as any).DAILY_NOTICE_API_ORIGIN;
    if(origin){
      const target=new URL(origin);
      if(target.protocol!=='https:'||target.username||target.password)throw Error('生成サーバーの接続設定を確認してください。');
      const c=await ownerClient(),token=await c.auth.currentUser.getIdToken();
      const endpoint=new URL('/api/meals',target);if(!body)endpoint.searchParams.set('tool',tool);
      const response=await fetch(endpoint,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:init?.signal,redirect:'error'});
      const result=await response.json();if(!response.ok)throw Error(result.error||'AI献立を取得できませんでした。');return result as T;
    }
    if(body?.action==='enable')await setMealEnabled(body.enabled===true);
    if(body?.action==='generate')throw Error('AI献立の生成サーバーを移行中です。保存済みの献立と通常の候補を使えます。');
    return await mealStatus(tool) as T;
  }
  throw Error('この操作には対応していません。');
}
export async function clientFetch(path:string,init?:RequestInit){try{return new Response(JSON.stringify(await clientRequest(path,init)),{status:200,headers:{'Content-Type':'application/json'}});}catch(error){if(init?.signal?.aborted)throw error;return new Response(JSON.stringify({error:error instanceof Error?error.message:'処理できませんでした。'}),{status:503,headers:{'Content-Type':'application/json'}});}}
