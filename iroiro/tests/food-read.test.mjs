import test from 'node:test';
import assert from 'node:assert/strict';
import {readFoodInventory} from '../food-read.mjs';
import {foodInventoryId,normalizeFoodList} from '../food-core.mjs';

const root=foodInventoryId('food');
function client(sources=[],categories=[{id:'food',name:'食材'}]){
  const auth={currentUser:{uid:'owner'}},calls=[];
  const api={auth,db:{},firestore:{doc:(_db,...path)=>path.join('/'),collection:(_db,...path)=>path.join('/'),where:(...value)=>value,limit:value=>value,query:(...value)=>value,
    async getDocFromServer(path){calls.push(path);return {exists:()=>true,data:()=>({categories,foodPresets:[{name:'定番だけの食材'}]})};},
    async getDocsFromServer(query){calls.push(query);const category=query[1][2],rows=sources.filter(([,data])=>data.categoryId===category||category==='food'&&data.categoryId===undefined);return {size:rows.length,docs:rows.map(([id,data])=>({id,data:()=>data}))};}
  }};return{...api,calls};
}
test('食材の実在庫だけを読み、チェック済み・使い切り・定番・メモを送らない',async()=>{
  const c=client([[root,{categoryId:'food',content:'送らない本文',foodList:normalizeFoodList({items:[{id:'a',name:'豚こま肉',quantity:'150',unit:'g',memo:'送らないメモ'},{id:'b',name:'卵',quantity:'10',unit:'個',checked:true},{id:'c',name:'魚',quantity:'0',unit:'g'}]})}]]);
  const result=await readFoodInventory(c);assert.equal(result.items.length,1);assert.equal(result.items[0].quantity,'150');assert.equal(result.items[0].id,'a');assert.ok(!JSON.stringify(result).includes('送らない'));assert.ok(!JSON.stringify(result).includes('定番だけ'));
  assert.equal(c.calls[0],'users/owner/iroiroSettings/main');assert.deepEqual(c.calls[1][1],['categoryId','==','food']);
});

test('調味料カテゴリーの未チェック項目と文章の食材名だけを送り、空行・重複・他カテゴリーを除く',async()=>{
  const c=client([['spices',{categoryId:'spice',title:'調味料',type:'checklist',items:[{text:'クミン　粉末'},{text:'クミン　粉末'},{text:'コリンアンダー'},{text:'使い切った',checked:true},{text:''}],content:'チェックリストの本文は送らない'}],['oil',{categoryId:'spice',title:'ごま油',type:'text',content:'- みそ\n・ポン酢'}],['secret',{categoryId:'app',title:'送らない秘密',content:'送らない本文'}]], [{id:'food',name:'食材'},{id:'spice',name:'調味料'}]);
  const result=await readFoodInventory(c);assert.deepEqual(result.seasonings,['クミン 粉末','コリンアンダー','みそ','ポン酢','ごま油']);assert.equal(result.seasoningCategoryFound,true);assert.ok(!JSON.stringify(result).includes('送らない'));assert.deepEqual(c.calls[2][1],['categoryId','==','spice']);
});

test('調味料カテゴリーがなければ空で返し、重複・取得中のユーザー変更は拒否する',async()=>{
  const noCategory=await readFoodInventory(client());assert.deepEqual(noCategory.seasonings,[]);assert.equal(noCategory.seasoningCategoryFound,false);
  await assert.rejects(()=>readFoodInventory(client([],[{id:'food',name:'食材'},{id:'s1',name:'調味料'},{id:'s2',name:'調味料'}])),/seasoning-category-not-unique/);
  const c=client([], [{id:'food',name:'食材'},{id:'spice',name:'調味料'}]);const read=c.firestore.getDocsFromServer;let calls=0;c.firestore.getDocsFromServer=async query=>{const result=await read(query);if(++calls===2)c.auth.currentUser={uid:'other'};return result};await assert.rejects(()=>readFoodInventory(c),/invalid-result/);
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
