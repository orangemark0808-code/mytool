import { normalizeMealTool, pressureAnchorAllowed, toolCookingPlan } from './meal-tools.mjs';
export const FOOD_SYNC_URL='https://orangemark0808-code.github.io/mytool/iroiro/dashboard-sync.html?v=2026-10-29-13';
export const FOOD_SOURCE_ORIGIN='https://orangemark0808-code.github.io';
export function amount(value){
  const text=String(value??'').normalize('NFKC').trim();
  if(!/^\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?$/.test(text))return null;
  const [a,b=1]=text.split('/').map(Number),n=a/b;return b>0&&Number.isFinite(n)&&n>0&&n<=99999999?n:null;
}
export function foodImport(value,now=Date.now()){
  if(!value||typeof value.fetchedAt!=='string'||!Array.isArray(value.items)||value.items.length>1000)return null;
  const time=Date.parse(value.fetchedAt),ids=new Set();
  if(!Number.isFinite(time)||time>now+300000||time<now-600000)return null;
  const items=[];
  for(const row of value.items){
    if(!row||typeof row.id!=='string'||!row.id||row.id.length>1500||ids.has(row.id)||typeof row.name!=='string'||!row.name.trim()||row.name.length>120||typeof row.quantity!=='string'||row.quantity.length>40||row.quantity&&amount(row.quantity)===null||typeof row.unit!=='string'||row.unit.length>20||!['','chilled','frozen','ambient'].includes(row.storage)||typeof row.useSoon!=='boolean'||!['','useBy','bestBefore'].includes(row.expiryKind)||typeof row.expiryDate!=='string')return null;
    if(row.expiryDate){if(!/^\d{4}-\d{2}-\d{2}$/.test(row.expiryDate))return null;const date=new Date(row.expiryDate+'T12:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==row.expiryDate)return null;}
    ids.add(row.id);items.push({id:row.id,name:row.name,quantity:row.quantity.normalize('NFKC').trim(),unit:row.unit,storage:row.storage,useSoon:row.useSoon,expiryKind:row.expiryKind,expiryDate:row.expiryDate});
  }
  const seasoningsLoaded=Array.isArray(value.seasonings);
  if(value.seasonings!==undefined&&(!seasoningsLoaded||value.seasonings.length>200||value.seasonings.some(name=>typeof name!=='string'||!name.trim()||name.length>120)))return null;
  const seasonings=seasoningsLoaded?[...new Set(value.seasonings.map(name=>name.normalize('NFKC').trim()))]:[];
  return {fetchedAt:value.fetchedAt,items,seasonings,seasoningsLoaded,seasoningCategoryFound:value.seasoningCategoryFound===true};
}
export function acceptedFoodMessage(event,peer,requestId){return Boolean(peer&&event.source===peer&&event.origin===FOOD_SOURCE_ORIGIN&&event.data?.type==='iroiro-foods-result'&&event.data.requestId===requestId)}
export function foodKind(name){
  if(/豚|鶏|とり肉|牛|合[い挽]|ミンチ|ひき肉|挽[き肉]|ベーコン|ハム|ウインナー|ソーセージ|ラム|羊|鹿肉|肉/.test(name))return 'meat';
  if(/鮭|さけ|サーモン|さば|サバ|鯖|ぶり|ブリ|鰤|たら|タラ|鱈|あじ|アジ|鯵|いわし|イワシ|鰯|さんま|サンマ|まぐろ|マグロ|かつお|カツオ|ほっけ|ホッケ|たい|タイ|鯛|魚|えび|エビ|海老|いか|イカ|ほたて|ホタテ|あさり|アサリ/.test(name))return 'fish';
  if(/卵|たまご|玉子/.test(name))return 'egg';if(/豆腐|厚揚げ|油揚げ/.test(name))return 'tofu';
  if(/キャベツ|白菜|レタス|玉ねぎ|たまねぎ|タマネギ|にんじん|人参|じゃがいも|ジャガイモ|大根|ねぎ|ネギ|きゅうり|キュウリ|トマト|なす|ナス|ピーマン|ブロッコリー|ほうれん草|小松菜|もやし|かぼちゃ|ごぼう|しめじ|まいたけ|舞茸|えのき|しいたけ|きのこ|キノコ|エリンギ|豆苗|ニラ|にら|れんこん|レンコン|オクラ/.test(name))return 'vegetable';return 'other';
}
function fraction(n){for(const d of [1,2,4,8,16])if(Math.abs(n*d-Math.round(n*d))<1e-8)return d===1?String(Math.round(n)):String(Math.round(n*d))+'/'+d;return String(Math.round(n*100)/100)}
function usage(item){
  const kind=foodKind(item.name),stock=amount(item.quantity);
  if(kind==='meat'||kind==='fish')return {...item,usedQuantity:item.quantity,usageLabel:'1回分をすべて使用',unknown:stock===null};
  const target=kind==='egg'?2:kind==='tofu'?(item.unit==='g'?150:1):item.unit==='g'?100:['玉','株'].includes(item.unit)?1/4:['本','個','束'].includes(item.unit)?1/2:1;
  return {...item,usedQuantity:stock===null?'':fraction(Math.min(stock,target)),usageLabel:stock===null?'使用量を確認':stock>target?'一部を使用':'登録量を使用',unknown:stock===null};
}

export const BASIC_SEASONINGS=['塩','砂糖','しょうゆ','みりん','塩麹','酢','味噌'];
export function seasoningKey(value){
  const name=String(value).normalize('NFKC').toLowerCase().replace(/[\s　・･()（）]/g,'');
  if(/^(?:しょうゆ|しょう油|醤油|正油)$/.test(name))return 'しょうゆ';
  if(/^(?:塩こうじ|塩麹|しおこうじ)$/.test(name))return '塩麹';
  if(/^(?:穀物酢|米酢|酢)$/.test(name))return '酢';
  if(/^クミン(?:粉末|パウダー|粒|ホール|シード)?$/.test(name))return 'クミン';
  if(/^(?:コリアンダー|コリンアンダー)(?:粉末|パウダー|粒|ホール|シード)?$/.test(name))return 'コリアンダー';
  if(/^(?:味噌|みそ)$/.test(name))return 'みそ';
  if(/^(?:カレー粉|カレーパウダー)$/.test(name))return 'カレー粉';
  if(/^(?:ぽん酢|ポン酢|ポン酢しょうゆ)$/.test(name))return 'ポン酢';
  if(/^(?:黒こしょう|黒胡椒|ブラックペッパー|こしょう|胡椒)$/.test(name))return 'こしょう';
  return name;
}
const FLAVORS=[
  {id:'cumin',label:'クミン風味',seasonings:[['クミン',.25],['塩',.25]]},
  {id:'coriander',label:'コリアンダー風味',seasonings:[['コリアンダー',.25],['塩',.25],['酢',1]]},
  {id:'curry',label:'カレー風味',seasonings:[['カレー粉',.5],['塩',.25]]},
  {id:'ponzu',label:'ポン酢風味',seasonings:[['ポン酢',2]]},
  {id:'pepper',label:'こしょう風味',seasonings:[['こしょう',.25],['塩',.25]]},
  {id:'miso',label:'みそ風味',seasonings:[['みそ',2],['みりん',1]]},
  {id:'butter',label:'バターしょうゆ',seasonings:[['バター',2],['しょうゆ',1]]},
  {id:'koji',label:'塩麹',seasonings:[['塩麹',2]]},
  {id:'vinegar',label:'さっぱり酢しょうゆ',seasonings:[['酢',2],['しょうゆ',1]]},
  {id:'salt',label:'塩味',seasonings:[['塩',.25]]},
  {id:'sweet',label:'甘辛しょうゆ',seasonings:[['しょうゆ',2],['みりん',2],['砂糖',1]]}
];
export function cookingSteps(flavor,kind,hasVegetables){
  const steps=[];
  if(kind==='egg')steps.push('卵を溶きほぐし、調味料を混ぜます。');
  else if(kind==='tofu')steps.push('豆腐類の水気を切り、食べやすい大きさに切ります。');
  else if(kind==='fish')steps.push('魚の水気を拭きます。');
  else if(kind==='meat')steps.push('肉を食べやすい大きさに切ります。');
  if(hasVegetables||kind==='vegetable')steps.push('野菜を食べやすく切り、フライパンへ広げます。');
  if(kind==='egg'){
    steps.push(hasVegetables?'水少量を加えてふたをし、野菜がやわらかくなるまで蒸します。':'フライパンに水少量を入れ、温めます。','溶き卵を回し入れ、ふたをして卵の中心まで十分に火を通します。');
  }else{
    if(kind!=='vegetable')steps.push((kind==='fish'?'魚':kind==='meat'?'肉':'豆腐類')+'と調味料を入れ、水少量を加えます。');
    else steps.push('調味料と水少量を加えます。');
    steps.push(kind==='meat'?'ふたをして蒸し、肉の中心まで十分に火を通します。':kind==='fish'?'ふたをして蒸し、魚の中心まで十分に火を通します。':'ふたをして蒸し、食材全体に十分に火を通します。');
  }
  if(['cumin','coriander'].includes(flavor.id))steps.unshift('粒のスパイスは軽くつぶして使います。粉末はそのまま使えます。');
  steps.push('水分が足りなければ少しずつ水を足し、味を確認して盛り付けます。');
  return steps;
}
export function makeMeals(items,today,offset=0,registeredSeasonings=[],selectedTool='pan'){
  const tool=normalizeMealTool(selectedTool);
  const available=new Set([...BASIC_SEASONINGS,...registeredSeasonings].map(seasoningKey));
  const flavors=FLAVORS.filter(flavor=>flavor.seasonings.every(([name])=>available.has(seasoningKey(name))));
  const eligible=items.filter(item=>(!item.expiryDate||item.expiryDate>=today)&&(tool!=='rede'||pressureAnchorAllowed(item,foodKind(item.name),amount(item.quantity)))).sort((a,b)=>Number(b.useSoon)-Number(a.useSoon)||(a.expiryDate||'9999').localeCompare(b.expiryDate||'9999')||Number(a.storage==='frozen')-Number(b.storage==='frozen'));
  const vegetables=eligible.filter(item=>foodKind(item.name)==='vegetable'),proteins=eligible.filter(item=>['meat','fish','egg','tofu'].includes(foodKind(item.name)));
  const anchors=proteins.length?proteins:vegetables,recipes=[];
  // Vary flavor across the first stock entries without losing stock priority.
  for(let round=0;round<flavors.length;round++)for(let at=0;at<anchors.length;at++){
    const anchor=anchors[at],kind=foodKind(anchor.name),flavor=flavors[(round+at)%flavors.length];
    const pool=vegetables.filter(item=>item.id!==anchor.id),priority=pool.find(item=>item.useSoon||item.expiryDate);
    const sides=kind==='vegetable'?pool.slice(0,2):pool.length?[priority||pool[(at+round)%pool.length]]:[],used=[anchor,...sides].map(usage);
    const grams=anchor.unit==='g'?amount(anchor.quantity):null,scale=grams&&['meat','fish'].includes(kind)?grams/200:1;
    const salted=kind==='fish'&&/塩|中辛|甘塩|辛口/.test(anchor.name);
    const seasonings=flavor.seasonings.map(([name,spoons])=>String(name)+' '+(salted&&['塩','塩麹','しょうゆ','みそ','ポン酢'].includes(String(name))?'味を見て少量':name==='バター'?Math.max(1,Math.round(Number(spoons)*5*scale))+'g':'小さじ'+Math.max(.125,Math.round(Number(spoons)*scale*8)/8)));
    const plan=toolCookingPlan(tool,kind,sides.length>0,used.some(item=>/にんじん|人参|じゃがいも|ジャガイモ|大根|かぼちゃ|ごぼう|れんこん|レンコン/.test(item.name)));
    const method=plan?.method||(kind==='egg'?'卵とじ':'蒸し煮');
    const steps=plan?.steps||cookingSteps(flavor,kind,sides.length>0);
    recipes.push({id:(tool==='pan'?'':tool+':')+anchor.id+':'+flavor.id,tool,flavor:flavor.label,title:[anchor.name,...sides.map(item=>item.name)].join('と')+'の'+flavor.label+method,items:used,seasonings,steps,water:plan?.water||'水少量（蒸し煮用）',timeLabel:plan?.timeLabel||'火の通りを見ながら調理',reason:used.some(item=>item.useSoon)?'「早めに使いたい」食材を使用':anchor.expiryDate?'期限 '+anchor.expiryDate+' の食材を使用':anchor.storage==='chilled'?'冷蔵の食材を使用':'登録された食材で作れる候補',needsThaw:used.some(item=>item.storage==='frozen'),unknown:used.some(item=>item.unknown),salted});
  }
  if(!recipes.length)return [];
  const start=((offset%recipes.length)+recipes.length)%recipes.length;
  const rotated=[...recipes.slice(start),...recipes.slice(0,start)],selected=[],seenFlavors=new Set();
  for(const recipe of rotated){if(seenFlavors.has(recipe.flavor))continue;selected.push(recipe);seenFlavors.add(recipe.flavor);if(selected.length===3)break;}
  return selected;
}
