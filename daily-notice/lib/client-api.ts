import {getSnapshot,getMemo,putMemo,mealStatus} from './pages-data.mjs';
import {ownerClient,writePrivate} from './firebase-client.mjs';
export async function clientRequest<T>(path:string,init?:RequestInit):Promise<T>{
  if(init?.signal?.aborted)throw new DOMException('Aborted','AbortError');
  const body=init?.body?JSON.parse(String(init.body)):null;
  if(path==='/api/snapshot')return {snapshot:await getSnapshot()} as T;
  if(path==='/api/memo')return (init?.method==='PUT'?await putMemo(body):await getMemo()) as T;
  if(path.startsWith('/api/meals')){
    const tool=body?.tool||new URL(path,'https://local.test').searchParams.get('tool');
    if(!['pan','steamer','rede'].includes(tool))throw Error('器具を選んでください。');
    if(body?.action==='enable')await writePrivate('MealState',{enabled:body.enabled===true});
    if(body?.action==='generate'){
      // The optional backend must verify Firebase ID tokens and keep its key
      // server-side. A static Pages site never receives an OpenAI secret.
      const c=await ownerClient(),origin=(window as any).DAILY_NOTICE_API_ORIGIN;
      if(!origin)throw Error('AI献立の生成サーバーを移行中です。保存済みの献立と通常の候補を使えます。');
      const token=await c.auth.currentUser.getIdToken();
      const response=await fetch(new URL('/api/meals',origin),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:init?.signal});
      const result=await response.json();if(!response.ok)throw Error(result.error||'AI献立を生成できませんでした。');return result as T;
    }
    return await mealStatus(tool) as T;
  }
  throw Error('この操作には対応していません。');
}
export async function clientFetch(path:string,init?:RequestInit){try{return new Response(JSON.stringify(await clientRequest(path,init)),{status:200,headers:{'Content-Type':'application/json'}});}catch(error){if(init?.signal?.aborted)throw error;return new Response(JSON.stringify({error:error instanceof Error?error.message:'処理できませんでした。'}),{status:503,headers:{'Content-Type':'application/json'}});}}
