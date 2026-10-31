import test from 'node:test';
import assert from 'node:assert/strict';
import {amount,foodImport,foodKind,makeMeals,acceptedFoodMessage,FOOD_SOURCE_ORIGIN,BASIC_SEASONINGS,seasoningKey} from '../lib/meal-plan.mjs';
const today='2026-10-29',now=Date.parse(today+'T04:00:00Z');
const food=(id,name,quantity,unit='g',extra={})=>({id,name,quantity,unit,storage:'chilled',useSoon:false,expiryKind:'',expiryDate:'',...extra});

test('肉・魚の1項目は分割も合算もせず、野菜だけ必要な分を使う',()=>{
  const stock=[food('p1','豚こま肉','150'),food('p2','豚こま肉','150'),food('fish','鮭中辛','4','個'),food('veg','キャベツ','1/2','玉')],before=structuredClone(stock),meals=makeMeals(stock,today);
  assert.deepEqual(meals.map(meal=>meal.items[0].usedQuantity),['150','150','4']);assert.deepEqual(meals.map(meal=>meal.items[0].id),['p1','p2','fish']);assert.ok(meals.every(meal=>meal.items[1].usedQuantity==='1/4'));assert.deepEqual(stock,before);
});
test('野菜は在庫を超えず、g・本・パック・分数を保って使う',()=>{
  for(const [quantity,unit,want] of [['1/8','玉','1/8'],['1/2','玉','1/4'],['1','本','1/2'],['50','g','50'],['200','g','100'],['1','パック','1']]){
    const meals=makeMeals([food('p','鶏もも肉','250'),food('v','キャベツ',quantity,unit)],today);
    assert.equal(meals[0].items[1].usedQuantity,want);assert.ok(amount(want)<=amount(quantity));
  }
});
test('未入力の量を勝手に決めず、冷凍食材は解凍が必要と表示する',()=>{
  const meal=makeMeals([food('p','豚ミンチ','280'),food('v','ブロッコリー','','g',{storage:'frozen'})],today)[0];
  assert.equal(meal.items[1].usedQuantity,'');assert.equal(meal.unknown,true);assert.equal(meal.needsThaw,true);
});
test('早めに使いたい食材・期限の近い食材を優先し、期限切れを除外する',()=>{
  const meals=makeMeals([food('later','鶏肉','250','g',{expiryDate:'2026-11-01'}),food('soon','豚肉','300','g',{useSoon:true}),food('near','鮭','4','個',{expiryDate:today}),food('expired','牛肉','200','g',{expiryDate:'2026-10-28'})],today);
  assert.deepEqual(meals.map(meal=>meal.items[0].id),['soon','near','later']);assert.match(meals[0].reason,/早め/);
});
test('調味料は肉のg数に応じて変わり、塩味の付いた魚はしょうゆを控えめにする',()=>{
  const a=makeMeals([food('a','豚肉','150')],today).find(meal=>meal.id.endsWith(':koji')),b=makeMeals([food('b','豚肉','300')],today).find(meal=>meal.id.endsWith(':koji'));
  assert.ok(a.seasonings.includes('塩麹 小さじ1.5'));assert.ok(b.seasonings.includes('塩麹 小さじ3'));assert.match(makeMeals([food('f','鮭中辛','4','個')],today)[0].seasonings.join(' '),/味を見て少量/);
});
test('肉や魚だけでも未登録の野菜を要求せず、野菜だけでも候補を作る',()=>{
  const meat=makeMeals([food('a','豚肉','300')],today);assert.ok(meat.every(meal=>!meal.steps.join('').includes('野菜')));
  const veg=makeMeals([food('v','キャベツ','1/2','玉')],today);assert.ok(veg.length>0);assert.equal(veg[0].items[0].usedQuantity,'1/4');assert.deepEqual(makeMeals([],today),[]);
});
test('別候補を出しても元の在庫を変更せず、重複した候補を返さない',()=>{
  const stock=[food('a','豚肉','300'),food('b','鶏もも肉','250'),food('c','鮭','4','個')],before=structuredClone(stock),first=makeMeals(stock,today),next=makeMeals(stock,today,3);
  assert.notDeepEqual(first.map(meal=>meal.id),next.map(meal=>meal.id));assert.equal(new Set(next.map(meal=>meal.id)).size,next.length);assert.deepEqual(stock,before);
});
test('量と魚・肉・野菜を分類し、別オリジンや別フレームのメッセージを拒否する',()=>{
  assert.equal(amount('１／２'),.5);assert.equal(amount('1/0'),null);assert.equal(foodKind('鶏むね肉'),'meat');assert.equal(foodKind('鮭中辛'),'fish');assert.equal(foodKind('まいたけ'),'vegetable');
  const peer={},id='request',event={origin:FOOD_SOURCE_ORIGIN,source:peer,data:{type:'iroiro-foods-result',requestId:id}};assert.ok(acceptedFoodMessage(event,peer,id));assert.ok(!acceptedFoodMessage({...event,source:{}},peer,id));assert.ok(!acceptedFoodMessage({...event,origin:'https://other.invalid'},peer,id));
});
test('受信する食材は形式・量・期限・ID重複・取得日時を検証する',()=>{
  const valid={fetchedAt:new Date(now).toISOString(),items:[food('a','豚こま肉','300')]};assert.ok(foodImport(valid,now));
  for(const patch of [{quantity:'1/0'},{expiryDate:'2026-02-30'},{storage:'constructor'},{name:''}])assert.equal(foodImport({...valid,items:[{...valid.items[0],...patch}]},now),null);
  assert.equal(foodImport({...valid,items:[valid.items[0],valid.items[0]]},now),null);assert.equal(foodImport(valid,now+700000),null);assert.deepEqual(foodImport({...valid,items:[]},now).items,[]);
});

test('基本7品だけで作れ、油・酒・だし・ポン酢を未登録のまま要求しない',()=>{
  assert.deepEqual(BASIC_SEASONINGS,['塩','砂糖','しょうゆ','みりん','塩麹','酢','味噌']);
  const stock=[food('a','豚肉','150'),food('b','鶏もも肉','250'),food('c','鮭中辛','4','個')];
  const meals=makeMeals(stock,today);assert.equal(new Set(meals.map(meal=>meal.flavor)).size,3);assert.ok(meals.some(meal=>meal.seasonings.some(value=>value.startsWith('みそ '))));
  for(let offset=0;offset<12;offset+=3)for(const meal of makeMeals(stock,today,offset)){
    assert.ok(meal.seasonings.every(value=>BASIC_SEASONINGS.map(seasoningKey).includes(seasoningKey(value.split(' ')[0]))));
    assert.doesNotMatch(meal.steps.join(''),/油|酒|だし|ポン酢/);
  }
});

test('登録したクミン・コリアンダーを優先し、削除した調味料の味付けは出さない',()=>{
  const stock=[food('a','豚こま肉','300'),food('b','鶏むね肉','250')],registered=['クミン　粉末','コリンアンダー','ごま油'];
  const before=structuredClone({stock,registered}),meals=makeMeals(stock,today,0,registered);
  assert.match(meals[0].title,/クミン/);assert.match(meals[1].title,/コリアンダー/);
  assert.equal(meals[0].items[0].usedQuantity,'300');assert.equal(meals[1].items[0].usedQuantity,'250');
  assert.doesNotMatch(makeMeals(stock,today,0,[]).map(meal=>meal.title).join(''),/クミン|コリアンダー/);
  assert.deepEqual({stock,registered},before);assert.equal(seasoningKey('醤油'),'しょうゆ');assert.equal(seasoningKey('塩こうじ'),'塩麹');
});

test('調味料の受信で過大・不正な名前を拒否し、旧形式は基本品だけへ互換対応する',()=>{
  const stock={fetchedAt:new Date(now).toISOString(),items:[food('a','豚こま肉','300')]};
  const next=foodImport({...stock,seasonings:['クミン','クミン'],seasoningCategoryFound:true},now);assert.deepEqual(next.seasonings,['クミン']);assert.equal(next.seasoningsLoaded,true);
  assert.equal(foodImport(stock,now).seasoningsLoaded,false);
  for(const seasonings of ['みそ',[null],[''],['a'.repeat(121)],Array(201).fill('塩')])assert.equal(foodImport({...stock,seasonings},now),null);
});
