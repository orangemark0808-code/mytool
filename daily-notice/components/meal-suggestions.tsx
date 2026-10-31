"use client";
import {useEffect,useMemo,useState} from 'react';
import {CookingPot,RefreshCw,Shuffle} from 'lucide-react';
import {useFoodRefresh} from '@/hooks/use-food-refresh';
import {makeMeals,foodKind,BASIC_SEASONINGS} from '@/lib/meal-plan.mjs';
import {COOKING_TOOLS,normalizeMealTool,REDE_MANUAL} from '@/lib/meal-tools.mjs';
import {useAiMeals} from '@/hooks/use-ai-meals';
import {savedMealWarnings} from '@/lib/ai-meal-contract.mjs';

const SOURCE='https://orangemark0808-code.github.io/mytool/iroiro/';
export function MealSuggestions({today,externalFood}:{today:string;externalFood?:ReturnType<typeof useFoodRefresh>}){
  const legacyFood=useFoodRefresh({autoStart:!externalFood}),food=externalFood||legacyFood,[offset,setOffset]=useState(0);
  const [tool,setTool]=useState('pan');
  const ai=useAiMeals(tool),[view,setView]=useState('saved');
  useEffect(()=>setView('saved'),[tool]);
  useEffect(()=>{try{setTool(normalizeMealTool(window.localStorage.getItem('daily-notice:meal-tool:v1')));}catch{/* Use the default if local preferences are unavailable. */}},[]);
  function selectTool(value:string){const next=normalizeMealTool(value);setTool(next);setOffset(0);try{window.localStorage.setItem('daily-notice:meal-tool:v1',next);}catch{/* Selection still works without storage. */}}
  const legacyMeals=useMemo(()=>makeMeals(food.stock?.items||[],today,offset,food.stock?.seasonings||[],tool),[food.stock,today,offset,tool]);
  const showingSaved=Boolean(ai.saved&&view==='saved'),meals=showingSaved?ai.saved!.meals:legacyMeals;
  const warnings=showingSaved?savedMealWarnings(ai.saved,food.stock,today):[];
  const selected=COOKING_TOOLS.find(value=>value.id===tool)||COOKING_TOOLS[0];
  const excluded=food.stock?.items.filter(item=>item.expiryDate&&item.expiryDate<today).length||0;
  const fetched=food.stock?new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(food.stock.fetchedAt)):'';
  return <section className="panel meal-panel" id="meals" aria-labelledby="meals-title">
    <div className="panel-title"><h2 className="section-label" id="meals-title"><CookingPot className="card-icon" size={18} color="currentColor" strokeWidth={2} aria-hidden="true"/><span>今日のメニュー<small>MENU</small></span></h2><div className="task-source-actions"><a className="source-label" href={SOURCE} target="_blank" rel="noopener noreferrer">食材リスト ↗</a><button className="task-refresh-button" type="button" disabled={food.busy} aria-label="イロイロキロクから食材と調味料を更新" aria-busy={food.busy} onClick={()=>void food.refresh()}><RefreshCw size={13} aria-hidden="true"/>{food.busy?'更新中…':'更新'}</button></div></div>
    <div className="meal-intro"><h3>家にある食材で、今日のメニュー</h3><p className="muted">肉・魚は1項目を1回分として使用。野菜は必要な分だけ使います。</p></div>
    <fieldset className="meal-tool-picker" aria-describedby="meal-tool-help"><legend>今日は、どの器具で作りますか？</legend><div className="meal-tool-options">{COOKING_TOOLS.map(value=><label key={value.id} className={tool===value.id?'selected':''}><input type="radio" name="meal-tool" value={value.id} checked={tool===value.id} disabled={ai.busy} onChange={()=>selectTool(value.id)}/><span>{value.label}</span></label>)}</div><p id="meal-tool-help">{selected.description}</p></fieldset>
    {tool==='rede'&&<p className="meal-help">肉・魚はgで登録された500g以下の1回分が対象です。卵は、せいろかフライパンで提案します。<a href={REDE_MANUAL} target="_blank" rel="noopener noreferrer">PCH-20Lの公式説明書 ↗</a></p>}
    <div className="ai-meal-controls" aria-busy={ai.busy}>
      <button type="button" className="ai-meal-generate" disabled={!ai.loaded||!ai.configured||!ai.enabled||Boolean(ai.blocked)||ai.busy||!food.stock||food.busy} onClick={()=>{void ai.generate().then(ok=>{if(ok)setView('saved');});}}>{ai.busy?'AIが献立を考えています…':'AIで新しい献立を作る'}</button>
      <p className="meal-help">食材・残量・調味料・器具をOpenAIに送り、3案を生成します（1日10回まで）。ページを開き直しても自動生成しません。</p>
      {ai.loaded&&!ai.configured&&<p className="meal-help">AIの接続設定待ちです。保存済みの献立と従来候補を利用できます。</p>}
      {ai.blocked==='balance'&&<p className="notice" role="status">APIの利用残高・上限により生成を停止しています。保存済みの献立はそのまま利用できます。API側の設定を確認した後に再開してください。</p>}
      {!ai.enabled&&ai.loaded&&ai.configured&&<p className="meal-help">AI生成は停止中です。保存済みの献立は表示できます。</p>}
      {ai.configured&&<button type="button" className="text-button" disabled={ai.busy} onClick={()=>void ai.enable(!ai.enabled||Boolean(ai.blocked))}>{!ai.enabled||ai.blocked?'AI生成を再開する':'AI生成を停止する'}</button>}
      {ai.error&&!ai.blocked&&<p className="notice" role="alert">{ai.error}</p>}
      {ai.saved&&<div className="ai-meal-views" aria-label="献立の表示方法"><button type="button" aria-pressed={showingSaved} onClick={()=>setView('saved')}>保存済みAI献立</button><button type="button" aria-pressed={!showingSaved} onClick={()=>setView('legacy')}>従来の候補を見る</button></div>}
      {showingSaved&&<p className="meal-stock-meta">AI生成・保存：{new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',dateStyle:'medium',timeStyle:'short'}).format(new Date(ai.saved!.generatedAt))} · {selected.label}用。ほかの端末でも同じ3案を表示します。</p>}
      {warnings.map((warning:string)=><p key={warning} className="notice" role="status">{warning}</p>)}
    </div>
    {food.error&&<p className="notice" role="status">{food.error}{food.stock?' 前回取得した在庫での候補を表示しています。':''}</p>}
    {(food.authNeeded||food.error||food.manualMode&&!food.stock)&&<button type="button" className="meal-connect" disabled={food.busy} onClick={()=>void food.connect()}>食材を取得してメニューを表示</button>}
    {food.manualMode&&<p className="meal-help">食材・調味料を変更したときは「更新」で最新の在庫を取得できます。</p>}
    {food.stock||showingSaved?<>
      {food.stock&&<><p className="meal-stock-meta">現在の在庫 {food.stock.items.length}項目 · 取得 {fetched}{excluded>0?` · 期限を過ぎた${excluded}項目は新しい候補から除外`:''}</p>
      <p className="meal-help">調味料：常備{BASIC_SEASONINGS.length}品＋登録{food.stock.seasonings.length}品を参照。{!food.stock.seasoningsLoaded?'調味料は未取得です。「更新」で読み込めます。':''}</p>
      <details className="meal-recipe"><summary>現在の調味料</summary><div><p>常備品：{BASIC_SEASONINGS.join('、')}</p><p>登録分：{food.stock.seasonings.length?food.stock.seasonings.join('、'):'なし'}</p></div></details></>}
      {meals.length?<><p className="meal-help" role="status">{showingSaved?'保存済みのAI献立':selected.label+'で作る従来の3候補'}です。選んでも在庫は変わりません。</p><div className="meal-grid">{meals.map(meal=><article className="meal-card" key={meal.id}>
        <p className="meal-reason">{meal.reason} · {meal.flavor}</p><h3>{meal.title}</h3><p className="meal-time">{meal.timeLabel}</p>
        <ul className="meal-ingredients">{meal.items.map(item=><li key={item.id}><span>{item.name}<small>{item.usageLabel}</small></span><strong>{item.usedQuantity?item.usedQuantity+item.unit:'量未設定'}</strong></li>)}</ul>
        <p className="meal-water">{meal.water}</p>
        {meal.needsThaw&&<p className="meal-note">冷凍の食材は、調理前に解凍してください。</p>}
        {meal.unknown&&<p className="meal-note">量未設定の食材があります。使用量を確認し、調味料を調整してください。</p>}
        <details className="meal-recipe"><summary>作り方を見る</summary><div><h4 className="meal-seasonings-heading">使う調味料（常備品・登録分から／目安）</h4><ul className="meal-seasonings" aria-label="使う調味料">{meal.seasonings.map((seasoning,index)=><li key={index}>{seasoning}</li>)}</ul><p className="muted">小さじ1＝5mL。{meal.items[0]?.unit==='g'&&meal.items[0]?.quantity&&['meat','fish'].includes(foodKind(meal.items[0].name))?'肉・魚のg数に応じた目安です。':''}味を見て調整してください。</p>{meal.salted&&<p className="meal-note">塩味の付いた魚なので、塩気のある調味料は控えめに加えてください。</p>}<h4>作り方</h4><ol>{meal.steps.map((step:string,index:number)=><li key={index}>{step}</li>)}</ol></div></details>
      </article>)}</div>{!showingSaved&&<button type="button" className="meal-more" onClick={()=>setOffset(value=>value+3)}><Shuffle size={15} aria-hidden="true"/>別の候補を出す（従来方式）</button>}</>:<p className="empty">{!food.stock?.items.length?'食材がありません。イロイロキロクに食材を追加して「更新」を押してください。':tool==='rede'?'今の在庫にはRe・De Pot向けの候補がありません。肉・魚のg数と期限を確認するか、ほかの器具を選んでください。':'今の在庫に合う候補がありません。食材名と期限をご確認ください。'}</p>}
      <p className="meal-help">使い終わった食材の削除や、野菜の残量変更は食材リストで行えます。</p>
    </>:!food.authNeeded&&<p className="empty" role="status">{food.busy?'イロイロキロクの食材を読み込んでいます…':'食材は未取得です。「更新」から再試行できます。'}</p>}
  </section>;
}
