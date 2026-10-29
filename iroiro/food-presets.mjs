import { parseFoodQuantity, quantityText, FOOD_STORAGE_LABELS } from './food-core.mjs';

const DEFAULT_USUAL_FOODS=[
  ['豚こま肉','300','g','chilled'],['鶏もも肉','250','g','chilled'],['鶏むね肉','250','g','chilled'],['豚ミンチ','280','g','chilled'],
  ['鮭中辛','4','個','chilled'],['ぶなしめじ','1','パック','chilled'],['まいたけ','1','パック','chilled'],['卵','10','個','chilled'],['豆腐','150','g','chilled'],
  ['玉ねぎみじん切り','','g','frozen'],['ブロッコリー','','g','frozen'],['ささがきごぼう','','g','frozen']
];
export function defaultFoodPresets(){return DEFAULT_USUAL_FOODS.map(([name,quantity,unit,storage],index)=>({id:`usual-${index+1}`,name,quantity,unit,storage}))}
export function validateFoodPresets(value){
  if(!Array.isArray(value)||value.length>200)throw new Error('いつもの食材は200件以内で設定してください。');
  const ids=new Set(),names=new Set();
  return value.map((item,index)=>{
    if(!item||typeof item!=='object'||Array.isArray(item)||typeof item.id!=='string'||!/^[A-Za-z0-9_-]{1,150}$/.test(item.id)||ids.has(item.id))throw new Error('いつもの食材のIDが不正です。');
    if(typeof item.name!=='string'||typeof item.quantity!=='string'||typeof item.unit!=='string'||typeof item.storage!=='string')throw new Error('いつもの食材の形式が不正です。');
    const name=item.name.trim(),quantity=quantityText(item.quantity),unit=item.unit.trim(),key=name.normalize('NFKC').toLowerCase();
    if(!name||name.length>120)throw new Error(`${index+1}番目の食材名を120文字以内で入力してください。`);
    if(names.has(key))throw new Error(`「${name}」の名前が重複しています。`);
    if(quantity&&parseFoodQuantity(quantity)===null)throw new Error(`「${name}」の量は正の数値か分数にしてください。`);
    if(!unit||unit.length>20)throw new Error(`「${name}」の単位を20文字以内で入力してください。`);
    if(item.storage!==''&&!Object.hasOwn(FOOD_STORAGE_LABELS,item.storage))throw new Error(`「${name}」の保存場所が不正です。`);
    ids.add(item.id);names.add(key);return{id:item.id,name,quantity,unit,storage:item.storage};
  });
}
export function readFoodPresets(value){return value===undefined?defaultFoodPresets():validateFoodPresets(value)}
