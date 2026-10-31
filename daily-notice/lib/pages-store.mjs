import {validSnapshot} from './snapshot.mjs';
export function mergeSnapshots(current,incoming){
  if(!validSnapshot(incoming))throw Error('予定・タスクの形式を確認できませんでした。');
  if(!current)return incoming;
  const result={...current,date:incoming.date};
  for(const key of ['calendar','tasks'])if(Date.parse(incoming[key].lastAttemptAt)>=Date.parse(current[key].lastAttemptAt))result[key]=incoming[key];
  return result;
}
export function nextMemo(current,value){
  if(!value||typeof value.text!=='string'||value.text.length>20000||!Number.isSafeInteger(value.revision)||value.revision<0)throw Error('メモは20,000文字以内で入力してください。');
  if(value.revision!==(current?.revision??0))throw Error('別の端末でメモが更新されています。入力内容をコピーしてから、保存済みの内容を確認してください。');
  return {text:value.text,revision:value.revision+1,updatedAt:new Date().toISOString()};
}
