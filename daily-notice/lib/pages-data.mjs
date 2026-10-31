import {ownerClient,privateRef,readPrivate} from './firebase-client.mjs';
import {taskImport} from './task-refresh.mjs';
import {foodImport} from './meal-plan.mjs';
import {appendTask} from '../integrations/iroiro/task-add.mjs';
import * as taskModule from '../integrations/iroiro/task-core.mjs';
import {readFoodInventory} from '../integrations/iroiro/food-read.mjs';
import {mergeSnapshots,nextMemo} from './pages-store.mjs';
import empty from '../data/initial-snapshot.json';
export async function getSnapshot(){const value=await readPrivate('Snapshot');return value?.snapshot??empty;}
export async function putSnapshot(incoming){const c=await ownerClient();return c.f.runTransaction(c.db,async tx=>{const ref=privateRef(c,'Snapshot'),doc=await tx.get(ref);const snapshot=mergeSnapshots(doc.data()?.snapshot,incoming);tx.set(ref,{snapshot,importedAt:new Date().toISOString()});return snapshot;});}
export async function getMemo(){return await readPrivate('Memo')??{text:'',revision:0,updatedAt:new Date().toISOString()};}
export async function putMemo(value){const c=await ownerClient();return c.f.runTransaction(c.db,async tx=>{const ref=privateRef(c,'Memo'),doc=await tx.get(ref),next=nextMemo(doc.data(),value);tx.set(ref,next);return next;});}
export async function readTasks(){
  const c=await ownerClient(),f=c.f,uid=c.auth.currentUser.uid;
  const settings=await f.getDocFromServer(f.doc(c.db,'users',uid,'iroiroSettings','main'));
  const matches=(settings.data()?.categories||[]).filter(item=>item?.name?.trim()==='タスク'&&typeof item.id==='string');
  if(matches.length!==1)throw Error('イロイロキロクの「タスク」カテゴリーを確認してください。');
  const result=await f.getDocsFromServer(f.query(f.collection(c.db,'users',uid,'iroiroNotes'),f.where('categoryId','==',matches[0].id),f.limit(501)));
  if(result.size>500)throw Error('タスクが取得上限を超えています。');
  const notes=result.docs.map(doc=>{const d=doc.data(),task=taskModule.normalizeTask(d.task||{items:d.type==='text'?[]:d.items});return {title:String(d.title||''),status:task.status,priority:task.priority,dueDate:task.dueDate,updatedAt:d.updatedAt?.toDate?.()?.toISOString()??null,items:task.items.map(item=>({text:item.text,checked:item.checked}))};});
  await ownerClient();
  const tasks=taskImport({fetchedAt:new Date().toISOString(),notes});if(!tasks)throw Error('タスクの形式を確認できませんでした。');
  await putSnapshot({...await getSnapshot(),date:tasks.date,tasks});return tasks;
}
export async function addTask(value){const c=await ownerClient();await appendTask({...c,taskModule},value);return readTasks();}
export async function readFoods(){const c=await ownerClient(),raw=await readFoodInventory(c),stock=foodImport(raw);if(!stock)throw Error('食材の形式を確認できませんでした。');return stock;}
export async function mealStatus(tool){const state=await readPrivate('MealState'),saved=await readPrivate('Meal'+tool);return {configured:false,enabled:Boolean(state?.enabled??1),blocked:state?.blocked??null,limitPerDay:10,saved:saved?.plan??null};}

export async function setMealEnabled(enabled){const c=await ownerClient();await c.f.runTransaction(c.db,async tx=>{const ref=privateRef(c,'MealState'),doc=await tx.get(ref),state=doc.data()||{};tx.set(ref,{...state,enabled:enabled?1:0,blocked:enabled?null:state.blocked??null,epoch:(state.epoch||0)+1,lease_id:null,lease_until:0});});}
