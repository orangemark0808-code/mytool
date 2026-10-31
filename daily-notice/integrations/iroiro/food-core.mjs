import { validTaskDate } from './task-core.mjs';

export const FOOD_STORAGE_LABELS={chilled:'冷蔵',frozen:'冷凍',ambient:'常温'};
export const FOOD_EXPIRY_LABELS={useBy:'消費期限',bestBefore:'賞味期限'};
// 台所で量りやすい0.1g単位。未入力は0g（使い切り）と区別する。
export function validGrams(value){
  return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=99999999.9&&Math.abs(value*10-Math.round(value*10))<0.000001;
}
export function normalizeFood(value={}){
  const food=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  return {remainingGrams:validGrams(food.remainingGrams)?food.remainingGrams:null,
    storage:Object.hasOwn(FOOD_STORAGE_LABELS,food.storage)?food.storage:'',useSoon:food.useSoon===true,
    expiryKind:Object.hasOwn(FOOD_EXPIRY_LABELS,food.expiryKind)?food.expiryKind:'',
    expiryDate:validTaskDate(food.expiryDate)?food.expiryDate:'',
    restoreGrams:validGrams(food.restoreGrams)&&food.restoreGrams>0?food.restoreGrams:null};
}
export function consumeFood(value,grams){
  const food=normalizeFood(value);
  if(food.remainingGrams===null||!validGrams(grams)||grams<=0||grams>food.remainingGrams)throw new Error('今回使う量は、残量以下の0より大きいg数を入力してください。');
  return {...food,remainingGrams:(Math.round(food.remainingGrams*10)-Math.round(grams*10))/10,restoreGrams:food.remainingGrams};
}
export function foodAvailable(value){const grams=normalizeFood(value).remainingGrams;return grams!==null&&grams>0}
export function foodSearchText(value){const food=normalizeFood(value);return [FOOD_STORAGE_LABELS[food.storage],food.useSoon?'早めに使いたい':'',food.expiryDate,FOOD_EXPIRY_LABELS[food.expiryKind]].filter(Boolean).join(' ')}

export const FOOD_UNITS=['g','個','本','玉','枚','束','袋','パック'];
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export function quantityText(value){return String(value??'').normalize('NFKC').trim()}
export function parseFoodQuantity(value){
  const text=quantityText(value);
  if(!/^\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?$/.test(text))return null;
  const [numerator,denominator=1]=text.split('/').map(Number),amount=numerator/denominator;
  return denominator>0&&Number.isFinite(amount)&&amount>0&&amount<=99999999?amount:null;
}
export function normalizeFoodItem(value={},index=0){
  const item=record(value)?value:{},food=normalizeFood(item);
  return {id:String(item.id||`row-${index}`),name:String(item.name||''),quantity:quantityText(item.quantity),unit:String(item.unit||'').trim(),
    storage:food.storage,useSoon:food.useSoon,expiryKind:food.expiryKind,expiryDate:food.expiryDate,memo:String(item.memo||''),checked:item.checked===true,order:index};
}
export function normalizeFoodList(value={}){
  const list=record(value)?value:{},seen=new Set();
  const items=(Array.isArray(list.items)?list.items:[]).filter(record).map(normalizeFoodItem).filter(item=>{if(seen.has(item.id))return false;seen.add(item.id);return true});
  return {items,importedSources:Object.fromEntries(Object.entries(record(list.importedSources)?list.importedSources:{}).filter(([,v])=>v===true))};
}
export function formatFoodQuantity(item){return item.quantity?`${item.quantity}${item.unit}`:'量未設定'}
export function foodListSearchText(value){return normalizeFoodList(value).items.map(item=>[item.name,formatFoodQuantity(item),foodSearchText(item),item.memo].join(' ')).join('\n')}
export function foodInventoryId(categoryId){return `food-inventory-${categoryId}`}
// 旧1食材1メモの原本は残す。取込済みIDを保持し、削除済みの項目を再取込しない。
export function foodInventoryFromSources(categoryId,sources=[]){
  const id=foodInventoryId(categoryId),stored=sources.find(note=>note.id===id),list=normalizeFoodList(stored?.foodList);
  const ids=new Set(list.items.map(item=>item.id));
  for(const source of sources){
    if(source.id===id||Object.hasOwn(list.importedSources,source.id))continue;
    let incoming;
    if(record(source.foodList))incoming=normalizeFoodList(source.foodList).items.map(item=>({...item,id:`legacy-${source.id}-${item.id}`}));
    else if(record(source.food)){
      const food=normalizeFood(source.food);
      incoming=[{...food,id:`legacy-${source.id}`,name:source.title||'食材',quantity:food.remainingGrams===null?'':String(food.remainingGrams),unit:food.remainingGrams===null?'':'g',memo:source.content||'',checked:food.remainingGrams===0}];
    }else if(Array.isArray(source.items)&&source.items.length)incoming=source.items.map((item,index)=>({id:`legacy-${source.id}-${item.id||index}`,name:String(item.text||''),checked:Boolean(item.checked)}));
    else incoming=[{id:`legacy-${source.id}`,name:source.title||'食材',memo:source.content||''}];
    for(const item of incoming)if(!ids.has(item.id)){ids.add(item.id);list.items.push(normalizeFoodItem(item,list.items.length))}
    Object.defineProperty(list.importedSources,source.id,{value:true,writable:true,enumerable:true,configurable:true});
  }
  return {id,title:'食材',categoryId,foodList:normalizeFoodList(list),isPinned:stored?Boolean(stored.isPinned):sources.some(note=>note.isPinned),
    createdAt:stored?.createdAt??sources[0]?.createdAt??null,updatedAt:stored?.updatedAt??sources[0]?.updatedAt??null};
}
