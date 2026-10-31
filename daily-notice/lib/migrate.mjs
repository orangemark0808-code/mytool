import {ownerClient,privateRef,readPrivate} from './firebase-client.mjs';
import {mergeSnapshots} from './pages-store.mjs';
import {validSnapshot} from './snapshot.mjs';
import {parseSavedMealPlan} from './ai-meal-contract.mjs';
export function validateMigration(value){
 if(!value||value.format!=='daily-notice-export-v1'||!validSnapshot(value.snapshot))throw Error('今日のお知らせの移行ファイルを選んでください。');
 const memo=value.memo;if(!memo||typeof memo.text!=='string'||memo.text.length>20000||!Number.isSafeInteger(memo.revision)||memo.revision<0||!Number.isFinite(Date.parse(memo.updatedAt)))throw Error('メモの形式を確認できませんでした。');
 const meals={};for(const tool of ['pan','steamer','rede'])if(value.meals?.[tool]){const plan=parseSavedMealPlan(value.meals[tool]);if(!plan||plan.tool!==tool)throw Error('献立の形式を確認できませんでした。');meals[tool]=plan;}
 return {snapshot:value.snapshot,memo:{text:memo.text,revision:memo.revision,updatedAt:memo.updatedAt},meals};
}
export async function importMigration(raw){const value=validateMigration(raw),c=await ownerClient();return c.f.runTransaction(c.db,async tx=>{
 const memoRef=privateRef(c,'Memo'),snapshotRef=privateRef(c,'Snapshot'),mealRefs=['pan','steamer','rede'].map(tool=>[tool,privateRef(c,'Meal'+tool)]);
 const [memo,snapshot,...plans]=await Promise.all([tx.get(memoRef),tx.get(snapshotRef),...mealRefs.map(([,ref])=>tx.get(ref))]);
 if(!memo.exists())tx.set(memoRef,value.memo);
 tx.set(snapshotRef,{snapshot:mergeSnapshots(snapshot.data()?.snapshot,value.snapshot),importedAt:new Date().toISOString()});
 mealRefs.forEach(([tool,ref],i)=>{if(!plans[i].exists()&&value.meals[tool])tx.set(ref,{plan:value.meals[tool]});});
 return {memoImported:!memo.exists(),mealCount:Object.keys(value.meals).length};
 });}
export async function exportMigration(){const c=await ownerClient();const [snapshot,memo,...plans]=await Promise.all(['Snapshot','Memo','Mealpan','Mealsteamer','Mealrede'].map(readPrivate));if(!snapshot?.snapshot||!memo)throw Error('データを読み込んでから書き出してください。');return {format:'daily-notice-export-v1',exportedAt:new Date().toISOString(),snapshot:snapshot.snapshot,memo,meals:Object.fromEntries(['pan','steamer','rede'].map((tool,i)=>[tool,plans[i]?.plan??null]))};}
