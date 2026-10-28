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
