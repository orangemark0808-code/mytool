import test from 'node:test';
import assert from 'node:assert/strict';
import {makeMeals,amount} from '../lib/meal-plan.mjs';
import {normalizeMealTool} from '../lib/meal-tools.mjs';
const day='2026-10-29';
const food=(id,name,quantity,unit='g',extra={})=>({id,name,quantity,unit,storage:'chilled',useSoon:false,expiryKind:'',expiryDate:'',...extra});
const stock=[food('p','豚こま肉','300'),food('c','鶏もも肉','250'),food('v','キャベツ','1/2','玉')];

test('器具ごとに実際の調理手順と料理名が変わり、在庫と調味料の制約は保たれる',()=>{
  const before=structuredClone(stock),results={};
  for(const tool of ['pan','steamer','rede']){
    const meals=makeMeals(stock,day,0,['クミン','コリアンダー'],tool);results[tool]=meals;
    assert.equal(meals.length,3);assert.ok(meals.every(m=>m.tool===tool));
    assert.equal(new Set(meals.map(m=>m.id)).size,3);
    assert.equal(meals[0].items[0].usedQuantity,'300');assert.equal(meals[1].items[0].usedQuantity,'250');
    assert.ok(meals.every(m=>m.items[1].usedQuantity==='1/4'));
    assert.ok(meals.every(m=>!m.seasonings.some(s=>/酒|だし|ポン酢/.test(s))));
  }
  assert.match(results.steamer[0].title,/せいろ蒸し/);
  assert.match(results.steamer[0].steps.join(''),/耐熱皿/);
  assert.doesNotMatch(results.steamer[0].steps.join(''),/フライパン|加圧/);
  assert.match(results.rede[0].title,/Re・De Pot煮込み/);
  assert.match(results.rede[0].timeLabel,/予熱・減圧/);
  assert.match(results.rede[0].steps.join(''),/密封/);
  assert.notDeepEqual(results.pan[0].steps,results.steamer[0].steps);
  assert.notDeepEqual(results.pan[0].steps,results.rede[0].steps);
  assert.deepEqual(stock,before);
});

test('圧力鍋は大きすぎる肉・未計量の肉・卵を避け、一回分を勝手に分割しない',()=>{
  for(const item of [food('x','鶏肉','501'),food('x','豚肉',''),food('x','鮭','4','切れ'),food('x','卵','2','個')]){
    assert.deepEqual(makeMeals([item],day,0,[],'rede'),[]);
    assert.ok(makeMeals([item],day,0,[],'steamer').length);
  }
  assert.ok(makeMeals([food('x','鶏肉','500')],day,0,[],'rede').length);
});

test('圧力鍋の手順は加圧前の水量、量の上限、自然減圧、加圧後の調味を含む',()=>{
  const meal=makeMeals(stock,day,0,[],'rede')[0],steps=meal.steps.join('\n');
  assert.match(meal.water,/300mL/);assert.match(steps,/調理MAX/);
  assert.match(steps,/ピンが下がるまで待/);assert.match(steps,/ピンが上がっている間は弁やふたを操作しません/);
  assert.match(steps,/調味料は加圧後/);assert.match(steps,/中心75℃で1分以上/);
  assert.ok(steps.indexOf('ピンが下がったら')<steps.indexOf('調味料を混ぜて加え'));
});

test('器具を切り替えても期限切れ除外・量・優先順位・別候補を維持する',()=>{
  const items=[...stock,food('soon','鶏むね肉','200','g',{useSoon:true}),food('old','牛肉','200','g',{expiryDate:'2026-10-28'})];
  for(const tool of ['pan','steamer','rede']){
    const first=makeMeals(items,day,0,[],tool),next=makeMeals(items,day,3,[],tool);
    assert.equal(first[0].items[0].id,'soon');
    assert.ok(first.every(m=>m.items.every(i=>i.id!=='old')));
    assert.notDeepEqual(first.map(m=>m.id),next.map(m=>m.id));
    for(const meal of first)for(const item of meal.items)assert.ok(amount(item.usedQuantity)<=amount(item.quantity));
  }
});

test('せいろの卵と豆腐は肉や魚を要求せず、未知の器具はフライパンに戻る',()=>{
  for(const item of [food('egg','卵','2','個'),food('tofu','豆腐','1','丁')]){
    const meals=makeMeals([item],day,0,[],'steamer');
    assert.ok(meals.length);assert.doesNotMatch(meals[0].steps.join(''),/肉|魚|野菜/);
    if(item.id==='egg')assert.match(meals[0].water,/卵と同量/);
  }
  assert.equal(normalizeMealTool('invalid'),'pan');
  assert.deepEqual(makeMeals(stock,day,0,[],'invalid'),makeMeals(stock,day));
});
