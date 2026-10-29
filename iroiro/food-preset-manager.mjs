import { validateFoodPresets } from './food-presets.mjs?v=2026-10-29-08';
import { FOOD_STORAGE_LABELS } from './food-core.mjs';

export function createFoodPresetManager({element:$,getPresets,getOwner,savePresets,escapeHtml:escape,uid,onSaved}){
  let draft=[],base=[],owner='',dirty=false,busy=false,session=0;
  const status=message=>{$('foodPresetManagerStatus').textContent=message;$('foodPresetManagerStatus').dataset.kind=message.startsWith('保存しました')?'success':message.startsWith('保存できません')?'error':'info';$('foodPresetManagerCancelButton').textContent=dirty?'キャンセル':'閉じる'};
  function render(){
    $('foodPresetManagerRows').innerHTML=draft.map((item,index)=>`<div class="food-preset-edit-row" data-preset-id="${escape(item.id)}"><label>食材名<input data-preset-field="name" data-preset-id="${escape(item.id)}" value="${escape(item.name)}" maxlength="120" aria-label="定番${index+1}の食材名"></label><div class="food-preset-edit-values"><label>量（任意）<input data-preset-field="quantity" data-preset-id="${escape(item.id)}" value="${escape(item.quantity)}" maxlength="40" aria-label="定番${index+1}の量"></label><label>単位<input data-preset-field="unit" data-preset-id="${escape(item.id)}" value="${escape(item.unit)}" maxlength="20" placeholder="g、個、パック" aria-label="定番${index+1}の単位"></label><label>保存場所<select data-preset-field="storage" data-preset-id="${escape(item.id)}" aria-label="定番${index+1}の保存場所"><option value="" ${item.storage===''?'selected':''}>未設定</option>${Object.entries(FOOD_STORAGE_LABELS).map(([key,label])=>`<option value="${key}" ${item.storage===key?'selected':''}>${label}</option>`).join('')}</select></label></div><div class="food-preset-edit-actions"><button type="button" class="quiet-button" data-preset-action="up" data-preset-id="${escape(item.id)}" aria-label="定番${index+1}を上へ" ${index===0?'disabled':''}>↑</button><button type="button" class="quiet-button" data-preset-action="down" data-preset-id="${escape(item.id)}" aria-label="定番${index+1}を下へ" ${index===draft.length-1?'disabled':''}>↓</button><button type="button" class="quiet-button" data-preset-action="remove" data-preset-id="${escape(item.id)}" aria-label="定番${index+1}を候補から外す">候補から外す</button></div></div>`).join('')||'<p>「定番を追加」から登録できます。</p>';
    $('foodPresetManagerFields').disabled=busy;
  }
  function open(){if(busy)return false;owner=getOwner();if(!owner)return false;session++;draft=structuredClone(getPresets());base=structuredClone(draft);dirty=false;$('foodPresetManager').hidden=false;status('');render();return true}
  function close(){if(busy)return false;session++;dirty=false;$('foodPresetManager').hidden=true;return true}
  function change(id,field,value){if(busy||!['name','quantity','unit','storage'].includes(field))return;const item=draft.find(item=>item.id===id);if(item){item[field]=value;dirty=true;status('未保存の変更があります。')}}
  function action(id,kind){
    if(busy)return;const at=draft.findIndex(item=>item.id===id);if(at<0)return;
    if(kind==='remove')draft.splice(at,1);
    else{const next=kind==='up'?at-1:kind==='down'?at+1:-1;if(next<0||next>=draft.length)return;[draft[at],draft[next]]=[draft[next],draft[at]]}
    dirty=true;status('未保存の変更があります。');render();
  }
  function add(){if(busy)return;const item={id:uid(),name:'',quantity:'',unit:'g',storage:'chilled'};draft.push(item);dirty=true;render();status('食材名などを入力し、「設定を保存」を押してください。');return item.id}
  async function save(){
    if(busy)return false;const token=session,activeOwner=owner;
    try{
      const next=validateFoodPresets(draft);if(!activeOwner||getOwner()!==activeOwner)throw new Error('アカウントが変わりました。管理画面を開き直してください。');
      busy=true;$('foodPresetManagerFields').disabled=true;status('保存中…');
      await savePresets(next,base,activeOwner);
      if(token!==session||getOwner()!==activeOwner)return false;
      draft=structuredClone(next);base=structuredClone(next);dirty=false;onSaved();status('保存しました。次に追加する食材から適用します。');render();return true;
    }catch(error){if(token===session&&getOwner()===activeOwner)status(`保存できませんでした: ${error.message}`);return false}
    finally{busy=false;if(token===session){$('foodPresetManagerFields').disabled=false}}
  }
  function canClose(){if(busy){status('設定を保存しています。少しお待ちください。');return false}if(!$('foodPresetManager').hidden&&dirty){status('設定を保存するか、キャンセルしてください。');return false}return true}
  function reset(){session++;dirty=false;owner='';$('foodPresetManager').hidden=true}
  function bind(){
    $('foodManagePresetsButton').onclick=open;$('foodPresetManagerAddButton').onclick=add;$('foodPresetManagerSaveButton').onclick=save;$('foodPresetManagerCancelButton').onclick=close;
    $('foodPresetManagerRows').oninput=event=>change(event.target.dataset.presetId,event.target.dataset.presetField,event.target.value);
    $('foodPresetManagerRows').onchange=event=>change(event.target.dataset.presetId,event.target.dataset.presetField,event.target.value);
    $('foodPresetManagerRows').onclick=event=>{const button=event.target.closest('[data-preset-action]');if(button)action(button.dataset.presetId,button.dataset.presetAction)};
  }
  return{bind,open,close,save,canClose,reset,change,action,add};
}
