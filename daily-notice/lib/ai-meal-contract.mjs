import {amount,foodKind,seasoningKey,BASIC_SEASONINGS,cookingSteps} from './meal-plan.mjs';
import {normalizeMealTool,pressureAnchorAllowed,toolCookingPlan} from './meal-tools.mjs';

export class MealError extends Error {constructor(code){super(code);this.code=code;}}
const check=(value,code='invalid-result')=>{if(!value)throw new MealError(code);};
const text=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
const ACTIONS={slice:'薄く切ります。',cut:'一口大に切ります。',tear:'食べやすく手で分けます。',drain:'水気を切ります。',loosen:'重なりや塊をほぐします。',beat:'よく溶きほぐします。'};
const allowedActions={meat:['slice','cut','loosen'],fish:['cut'],egg:['beat'],tofu:['cut','drain'],vegetable:['slice','cut','tear']};
const quantityPattern='^[0-9]+(?:\\.[0-9]+)?(?:\\s*/\\s*[0-9]+(?:\\.[0-9]+)?)?$';
function ingredientQuantity(value,item){
  if(typeof value!=='string'||value.length>40)return null;
  let quantity=value.normalize('NFKC').trim();
  const unit=String(item.unit||'').normalize('NFKC').trim();
  // The model may append the registered unit. Never convert or guess another unit.
  if(unit&&quantity.endsWith(unit))quantity=quantity.slice(0,-unit.length).trim();
  return amount(quantity)===null?null:quantity;
}
function preparationActions(item){
  const kind=foodKind(item.name),actions=allowedActions[kind]||[];
  return kind==='vegetable'&&/しめじ|まいたけ|舞茸|えのき|しいたけ|きのこ|キノコ|エリンギ/.test(item.name)?[...actions,'loosen']:actions;
}

export function mealInputs(stock,tool,today){
  check(normalizeMealTool(tool)===tool,'invalid');
  check(stock&&Array.isArray(stock.items)&&Array.isArray(stock.seasonings),'source');
  const items=stock.items.filter(item=>amount(item.quantity)!==null&&(!item.expiryDate||item.expiryDate>=today)&&foodKind(item.name)!=='other'&&(tool!=='rede'||pressureAnchorAllowed(item,foodKind(item.name),amount(item.quantity))))
    .map(({id,name,quantity,unit,storage,useSoon,expiryDate})=>({id,name,quantity,unit,storage,useSoon,expiryDate}));
  check(items.length>0&&items.length<=100,'source');
  const names=new Map();for(const name of [...BASIC_SEASONINGS,...stock.seasonings])if(text(name,120))names.set(seasoningKey(name),name);
  check(names.size<=60,'source');
  check(JSON.stringify({items,seasonings:[...names.values()]}).length<=30000,'source');
  return {items,seasonings:[...names.values()],tool,today,sourceFetchedAt:stock.fetchedAt};
}

export function mealSchema(input){
  const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
  const id={type:'string',enum:input.items.map(i=>i.id)};
  return object({meals:{type:'array',minItems:3,maxItems:3,items:object({
    title:{type:'string',maxLength:120},reason:{type:'string',maxLength:200},flavor:{type:'string',maxLength:60},
    ingredients:{type:'array',minItems:1,maxItems:3,items:object({id,quantity:{type:'string',maxLength:40,pattern:quantityPattern,description:'数値または分数だけ。例: 170、1/4。g・玉・パックなどの単位は付けない。'}})},
    seasonings:{type:'array',minItems:1,maxItems:8,items:object({name:{type:'string',enum:input.seasonings},amount:{type:'number',minimum:0.125,maximum:50},unit:{type:'string',enum:['小さじ','g']}})},
    preparation:{type:'array',minItems:1,maxItems:3,items:{anyOf:input.items.map(item=>object({id:{type:'string',enum:[item.id]},action:{type:'string',enum:preparationActions(item)}}))}},
  })}});
}

export function buildAiMealPlan(raw,input,requestId,now){
  check(Array.isArray(raw?.meals)&&raw.meals.length===3);
  const byId=new Map(input.items.map(item=>[item.id,item])),available=new Map(input.seasonings.map(name=>[seasoningKey(name),name]));
  const signatures=new Set(),titles=new Set();
  const meals=raw.meals.map((meal,index)=>{
    check(text(meal?.title,120)&&text(meal.reason,200)&&text(meal.flavor,60));
    check(!titles.has(meal.title.trim()));titles.add(meal.title.trim());
    check(Array.isArray(meal.ingredients)&&meal.ingredients.length>=1&&meal.ingredients.length<=3);
    const ids=new Set();
    const used=meal.ingredients.map((entry,at)=>{
      const source=byId.get(entry?.id);check(source&&!ids.has(source.id));
      const usedQuantity=ingredientQuantity(entry?.quantity,source),quantity=amount(usedQuantity);check(quantity!==null);ids.add(source.id);
      const kind=foodKind(source.name);check(at===0||kind==='vegetable');check(quantity<=amount(source.quantity));
      if(kind==='meat'||kind==='fish')check(quantity===amount(source.quantity));
      return {...source,usedQuantity,usageLabel:kind==='meat'||kind==='fish'?'1回分をすべて使用':quantity===amount(source.quantity)?'登録量を使用':'一部を使用',unknown:false};
    });
    const kind=foodKind(used[0].name),salted=kind==='fish'&&/塩|中辛|甘塩|辛口/.test(used[0].name);
    check(Array.isArray(meal.seasonings)&&meal.seasonings.length>0&&meal.seasonings.length<=8);
    const seasoningIds=new Set();
    const seasonings=meal.seasonings.map(s=>{
      const key=seasoningKey(s?.name),name=available.get(key);check(name&&!seasoningIds.has(key));seasoningIds.add(key);
      check(Number.isFinite(s.amount)&&s.amount>=0.125&&s.amount<=(key==='バター'?50:key==='塩'?2:12));
      check(s.unit===(key==='バター'?'g':'小さじ'));
      return name+' '+(salted&&['塩','塩麹','しょうゆ','みそ','ポン酢'].includes(key)?'味を見て少量':s.unit+s.amount);
    });
    check(Array.isArray(meal.preparation)&&meal.preparation.length===used.length);
    const prepared=new Set(),preparation=meal.preparation.map(p=>{
      const item=used.find(i=>i.id===p?.id);check(item&&!prepared.has(item.id)&&preparationActions(item).includes(p.action));prepared.add(item.id);
      return item.name+(p.action==='loosen'?'の':'を')+ACTIONS[p.action];
    });
    const signature=JSON.stringify({items:used.map(i=>[i.id,amount(i.usedQuantity)]).sort(),seasonings:meal.seasonings.map(s=>[seasoningKey(s.name),s.amount,s.unit]).sort()});
    check(!signatures.has(signature));signatures.add(signature);
    const plan=toolCookingPlan(input.tool,kind,used.length>1,used.some(i=>/にんじん|人参|じゃがいも|ジャガイモ|大根|かぼちゃ|ごぼう|れんこん|レンコン/.test(i.name)));
    const steps=plan?.steps||cookingSteps({id:seasoningIds.has('クミン')?'cumin':seasoningIds.has('コリアンダー')?'coriander':''},kind,used.length>1);
    return {id:`ai:${requestId}:${index}`,tool:input.tool,title:meal.title.trim(),reason:meal.reason.trim(),flavor:meal.flavor.trim(),items:used,seasonings,steps:[...preparation,...steps],water:plan?.water||'水少量（蒸し煮用）',timeLabel:plan?.timeLabel||'火の通りを見ながら調理',needsThaw:used.some(i=>i.storage==='frozen'),unknown:false,salted,signature};
  });
  return {version:1,id:requestId,tool:input.tool,generatedAt:new Date(now).toISOString(),sourceFetchedAt:input.sourceFetchedAt,meals};
}

export function parseSavedMealPlan(value){
  if(!value||value.version!==1||!text(value.id,100)||normalizeMealTool(value.tool)!==value.tool||!Number.isFinite(Date.parse(value.generatedAt))||!Number.isFinite(Date.parse(value.sourceFetchedAt))||!Array.isArray(value.meals)||value.meals.length!==3)return null;
  for(const m of value.meals)if(!text(m?.id,150)||m.tool!==value.tool||!text(m.title,120)||!text(m.reason,200)||!text(m.flavor,60)||!Array.isArray(m.items)||m.items.length<1||m.items.length>3||m.items.some(i=>!text(i?.id,1500)||!text(i.name,120)||amount(i.usedQuantity)===null||typeof i.unit!=='string')||!Array.isArray(m.seasonings)||m.seasonings.length<1||m.seasonings.length>8||m.seasonings.some(s=>!text(s,180))||!Array.isArray(m.steps)||m.steps.length<1||m.steps.length>20||m.steps.some(s=>!text(s,800))||!text(m.water,120)||!text(m.timeLabel,100))return null;
  return value;
}

export function savedMealWarnings(plan,stock,today){
  if(!plan)return [];
  if(!stock)return ['現在の在庫は未取得です。生成時の献立を表示しています。'];
  const current=new Map(stock.items.map(i=>[i.id,i])),issues=new Set();
  for(const meal of plan.meals)for(const used of meal.items){const item=current.get(used.id);if(!item||item.name!==used.name||item.unit!==used.unit||amount(item.quantity)===null||amount(item.quantity)<amount(used.usedQuantity))issues.add('生成時から在庫が変わっています。材料と残量を確認してください。');if(item?.expiryDate&&item.expiryDate<today)issues.add('期限を過ぎた食材が含まれています。使う前に食材を確認してください。');}
  return [...issues];
}
