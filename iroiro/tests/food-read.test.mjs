import test from 'node:test';
import assert from 'node:assert/strict';
import {readFoodInventory} from '../food-read.mjs';
import {foodInventoryId,normalizeFoodList} from '../food-core.mjs';

const root=foodInventoryId('food');
function client(sources=[],categories=[{id:'food',name:'食材'}]){
  const auth={currentUser:{uid:'owner'}},calls=[];
  const api={auth,db:{},firestore:{doc:(_db,...path)=>path.join('/'),collection:(_db,...path)=>path.join('/'),where:(...value)=>value,limit:value=>value,query:(...value)=>value,
    async getDocFromServer(path){calls.push(path);return {exists:()=>true,data:()=>({categories,foodPresets:[{name:'定番だけの食材'}]})};},
    async getDocsFromServer(query){calls.push(query);return {size:sources.length,docs:sources.map(([id,data])=>({id,data:()=>data}))};}
  }};return{...api,calls};
}
test('食材の実在庫だけを読み、チェック済み・使い切り・定番・メモを送らない',async()=>{
  const c=client([[root,{categoryId:'food',content:'送らない本文',foodList:normalizeFoodList({items:[{id:'a',name:'豚こま肉',quantity:'150',unit:'g',memo:'送らないメモ'},{id:'b',name:'卵',quantity:'10',unit:'個',checked:true},{id:'c',name:'魚',quantity:'0',unit:'g'}]})}]]);
  const result=await readFoodInventory(c);assert.equal(result.items.length,1);assert.equal(result.items[0].quantity,'150');assert.equal(result.items[0].id,'a');assert.ok(!JSON.stringify(result).includes('送らない'));assert.ok(!JSON.stringify(result).includes('定番だけ'));
  assert.equal(c.calls[0],'users/owner/iroiroSettings/main');assert.deepEqual(c.calls[1][1],['categoryId','==','food']);
});
test('取り込み済みの旧食材は重複せず、同名の1回分は別項目として保持する',async()=>{
  const c=client([[root,{foodList:normalizeFoodList({items:[{id:'a',name:'豚こま肉',quantity:'150',unit:'g'},{id:'b',name:'豚こま肉',quantity:'150',unit:'g'}],importedSources:{old:true}})}],['old',{title:'豚こま肉',food:{remainingGrams:300}}]]);
  const result=await readFoodInventory(c);assert.equal(result.items.length,2);assert.deepEqual(result.items.map(item=>item.quantity),['150','150']);
});
test('量未設定・分数と冷凍・期限をそのまま渡し、空の在庫は空で返す',async()=>{
  const c=client([[root,{foodList:normalizeFoodList({items:[{id:'a',name:'キャベツ',quantity:'1/2',unit:'玉',storage:'chilled',expiryKind:'bestBefore',expiryDate:'2026-11-01'},{id:'b',name:'ブロッコリー',quantity:'',unit:'g',storage:'frozen'}]})}]]);
  const result=await readFoodInventory(c);assert.equal(result.items[0].quantity,'1/2');assert.equal(result.items[1].quantity,'');assert.equal(result.items[1].storage,'frozen');assert.deepEqual((await readFoodInventory(client())).items,[]);
});
test('未ログイン・カテゴリー重複・アカウント変更・過大な取得を拒否する',async()=>{
  const missing=client();missing.auth.currentUser=null;await assert.rejects(()=>readFoodInventory(missing),/auth-required/);
  await assert.rejects(()=>readFoodInventory(client([],[{id:'a',name:'食材'},{id:'b',name:'食材'}])),/not-unique/);
  const changed=client();changed.firestore.getDocsFromServer=async()=>{changed.auth.currentUser={uid:'other'};return{size:0,docs:[]}};await assert.rejects(()=>readFoodInventory(changed),/invalid-result/);
  const large=client();large.firestore.getDocsFromServer=async()=>({size:501,docs:[]});await assert.rejects(()=>readFoodInventory(large),/invalid-result/);
});
