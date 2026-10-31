import { FOOD_UNITS, FOOD_STORAGE_LABELS, FOOD_EXPIRY_LABELS, normalizeFoodItem, normalizeFoodList, parseFoodQuantity, formatFoodQuantity } from './food-core.mjs?v=2026-10-28-03';
import { validTaskDate } from './task-core.mjs';

import { defaultFoodPresets } from './food-presets.mjs?v=2026-10-29-08';
const FOOD_PRESETS={
  '肉・魚・卵':['豚こま','豚バラ肉','豚ロース肉','豚ひき肉','鶏もも肉','鶏むね肉','鶏ささみ','鶏ひき肉','牛こま','牛ひき肉','合いびき肉','鮭','さば','ぶり','たら','えび','卵'],
  '野菜・きのこ':['キャベツ','白菜','レタス','玉ねぎ','にんじん','じゃがいも','大根','長ねぎ','小ねぎ','きゅうり','トマト','なす','ピーマン','ブロッコリー','ほうれん草','小松菜','もやし','かぼちゃ','しめじ','えのき','しいたけ'],
  '豆製品・乳製品など':['豆腐','油揚げ','厚揚げ','納豆','牛乳','チーズ','ヨーグルト','ハム','ベーコン','ウインナー']
};

export function createFoodEditor({element:$,getNote,isFoodNote,onChange,escapeHtml:escape,uid,getPresets=defaultFoodPresets,getActiveElement=()=>null,presetsReady=()=>true}){
  let editingId=null,dirty=false,undoItems=[],selectedPresets=new Set();
  const inlineDrafts=new Map(),inlineErrors=new Map(),presetDefaults=new Map();
  const list=()=>{const note=getNote();return note.foodList||(note.foodList=normalizeFoodList())};
  const error=message=>{$('foodError').textContent=message;$('foodError').hidden=!message};
  function updateCustomUnit(){$('foodCustomUnitField').hidden=$('foodUnitInput').value!=='custom'}
  function setUnit(unit){$('foodUnitInput').value=FOOD_UNITS.includes(unit)?unit:unit?'custom':'g';$('foodCustomUnitInput').value=FOOD_UNITS.includes(unit)?'':unit;updateCustomUnit()}
  function clearDraft(){
    editingId=null;dirty=false;$('foodItemNameInput').value='';$('foodQuantityInput').value='';setUnit('g');
    $('foodStorageInput').value='chilled';$('foodUseSoonInput').checked=false;$('foodExpiryKindInput').value='';$('foodExpiryDateInput').value='';$('foodItemMemoInput').value='';
    $('foodOptions').open=false;$('foodDetails').open=false;$('foodItemSubmitButton').textContent='追加';$('foodDuplicateButton').hidden=false;error('');
  }
  function openDraft(id=null){
    if(dirty){error('入力中の食材を追加・保存するか、キャンセルしてください。');return false}
    if(selectedPresets.size){error('選択中の食材を追加するか、選択を解除してください。');$('foodPresetPicker').open=true;return false}
    if(!flushInline())return false;
    clearDraft();editingId=id;
    if(id){const item=list().items.find(item=>item.id===id);if(!item)return false;
      $('foodItemNameInput').value=item.name;$('foodQuantityInput').value=item.quantity;setUnit(item.unit);
      $('foodStorageInput').value=item.storage;$('foodUseSoonInput').checked=item.useSoon;$('foodExpiryKindInput').value=item.expiryKind;$('foodExpiryDateInput').value=item.expiryDate;$('foodItemMemoInput').value=item.memo;
      $('foodOptions').open=true;
      $('foodItemSubmitButton').textContent='変更を保存';$('foodDuplicateButton').hidden=true;
    }
    $('foodPresetPicker').hidden=Boolean(id);$('foodItemForm').hidden=false;$('foodItemNameInput').focus();return true;
  }
  function readDraft(){
    const unit=$('foodUnitInput').value==='custom'?$('foodCustomUnitInput').value.trim():$('foodUnitInput').value;
    return normalizeFoodItem({id:editingId||uid(),name:$('foodItemNameInput').value.trim(),quantity:$('foodQuantityInput').value,unit,
      storage:$('foodStorageInput').value,useSoon:$('foodUseSoonInput').checked,expiryKind:$('foodExpiryKindInput').value,expiryDate:$('foodExpiryDateInput').value,memo:$('foodItemMemoInput').value});
  }
  function validateDraft(item){
    if(!item.name){error('食材名を入力してください。');$('foodItemNameInput').focus();return false}
    if(item.quantity&&parseFoodQuantity(item.quantity)===null){error('量を入力する場合は0より大きい数値または分数にしてください（例：150、1、1/2）。');$('foodOptions').open=true;$('foodQuantityInput').focus();return false}
    if(!item.unit||item.unit.length>20){error('単位を選ぶか、20文字以内で入力してください。');$('foodOptions').open=true;$('foodCustomUnitInput').focus();return false}
    if($('foodExpiryDateInput').validity?.badInput||($('foodExpiryDateInput').value&&!validTaskDate($('foodExpiryDateInput').value))){error('期限に正しい日付を入力してください。');$('foodOptions').open=true;$('foodDetails').open=true;return false}
    if(item.expiryDate&&!item.expiryKind){error('消費期限または賞味期限を選んでください。');$('foodOptions').open=true;$('foodDetails').open=true;return false}
    return true;
  }
  function commitDraft(copies=1){
    const item=readDraft(),wasEditing=Boolean(editingId);if(!validateDraft(item))return false;
    if(editingId){const at=list().items.findIndex(row=>row.id===editingId);if(at<0){error('この項目は別の端末で削除されています。入力を保持しています。');return false}list().items[at]={...item,checked:list().items[at].checked,order:at}}
    else for(let i=0;i<copies;i++)list().items.push({...item,id:uid(),order:list().items.length});
    clearDraft();$('foodPresetPicker').hidden=false;$('foodItemForm').hidden=wasEditing;render();onChange();if(!wasEditing)$('foodItemNameInput').focus();return true;
  }
  function presetGroups(){
    const usualNames=new Set(getPresets().map(item=>item.name)),presets=new Set([...usualNames,...Object.values(FOOD_PRESETS).flat()]);
    const registered=[...new Set([...list().items.map(item=>item.name),...selectedPresets].filter(name=>name&&!presets.has(name)))];
    return {'いつもの食材':[...usualNames],...Object.fromEntries(Object.entries(FOOD_PRESETS).map(([label,names])=>[label,names.filter(name=>!usualNames.has(name))])),...(registered.length?{'登録済みの食材':registered}:{})};
  }
  function updatePresetControls(){
    $('foodPresetCount').textContent=`${selectedPresets.size}品選択中`;
    $('foodPresetAddButton').textContent=`選んだ食材を追加（${selectedPresets.size}件）`;
    $('foodPresetAddButton').disabled=!selectedPresets.size;$('foodPresetClearButton').disabled=!selectedPresets.size;
  }
  function renderPresetChoices(){
    $('foodPresetChoices').innerHTML=Object.entries(presetGroups()).map(([label,names])=>`<fieldset class="food-preset-group"><legend>${escape(label)}</legend><div class="food-preset-grid">${names.map(name=>`<label class="food-preset-choice"><input type="checkbox" data-food-preset="${escape(name)}" aria-label="${escape(name)}を追加候補に選ぶ" ${selectedPresets.has(name)?'checked':''}><span>${escape(name)}</span></label>`).join('')}</div></fieldset>`).join('');
    updatePresetControls();
  }
  function clearPresetSelection(){selectedPresets.clear();presetDefaults.clear();renderPresetChoices();error('')}
  function addSelectedPresets(){
    if(!presetsReady()){error('定番設定を読み込んでいます。少しお待ちください。');return false}
    const names=Object.values(presetGroups()).flat().filter(name=>selectedPresets.has(name));
    if(!names.length)return false;
    for(const name of names){const defaults=presetDefaults.get(name)||getPresets().find(item=>item.name===name)||{name,quantity:'',unit:'g',storage:'chilled'};list().items.push(normalizeFoodItem({...defaults,id:uid()},list().items.length))}
    selectedPresets.clear();presetDefaults.clear();$('foodPresetPicker').open=false;render();onChange();return true;
  }
  function inlineError(id,message){inlineErrors.set(id,message);const node=$(`food-inline-error-${id}`);if(node){node.textContent=message;node.hidden=!message}$('foodInlineCancelButton').hidden=!message&&!inlineDrafts.size;error(message)}
  function stageInline(id,patch){
    const item=list().items.find(item=>item.id===id);if(!item)return false;
    const draft=inlineDrafts.get(id)||{base:structuredClone(item),patch:{}};
    for(const field of ['quantity','unit','storage'])if(Object.hasOwn(patch,field))draft.patch[field]=String(patch[field]);
    inlineDrafts.set(id,draft);return true;
  }
  function commitInline(id){
    const draft=inlineDrafts.get(id);if(!draft)return true;
    const item=list().items.find(item=>item.id===id);
    if(!item){inlineError(id,`「${draft.base.name}」は別の端末で削除されました。入力を取り消して最新の一覧を確認してください。`);return false}
    if(Object.hasOwn(draft.patch,'storage')&&draft.patch.storage!==''&&!Object.hasOwn(FOOD_STORAGE_LABELS,draft.patch.storage)){inlineError(id,'保存場所を選んでください。');return false}
    const next=normalizeFoodItem({...item,...draft.patch},item.order);
    if(next.quantity&&parseFoodQuantity(next.quantity)===null&&(next.quantity!=='0'||Object.hasOwn(draft.patch,'quantity'))){inlineError(id,'量は正の数値か分数にしてください。空欄にもできます。');return false}
    if((next.quantity&&!next.unit)||next.unit.length>20){inlineError(id,'単位を選んでください。');return false}
    if(next.storage!==''&&!Object.hasOwn(FOOD_STORAGE_LABELS,next.storage)){inlineError(id,'保存場所を選んでください。');return false}
    for(const field of Object.keys(draft.patch))if(item[field]!==draft.base[field]&&item[field]!==next[field]){inlineError(id,`「${item.name}」が別の端末で変更されました。入力を取り消して最新の内容を確認してください。`);return false}
    const changed=['quantity','unit','storage'].some(field=>item[field]!==next[field]);
    for(const field of ['quantity','unit','storage'])item[field]=next[field];
    inlineDrafts.delete(id);inlineErrors.delete(id);const errorNode=$(`food-inline-error-${id}`);if(errorNode)errorNode.hidden=true;$('foodInlineCancelButton').hidden=!inlineDrafts.size;error('');
    for(const field of ['quantity','unit','storage']){const input=$(`food-inline-${field}-${id}`);if(input&&input!==getActiveElement())input.value=item[field]}
    $(`food-inline-details-${id}`)?.setAttribute('aria-label',`${item.name} ${formatFoodQuantity(item)}の詳細`);
    $(`food-inline-delete-${id}`)?.setAttribute('aria-label',`${item.name} ${formatFoodQuantity(item)}を削除`);
    if(changed)onChange();return true;
  }
  function flushInline(){for(const id of inlineDrafts.keys())if(!commitInline(id))return false;return true}
  function cancelInline(){inlineDrafts.clear();inlineErrors.clear();$('foodInlineCancelButton').hidden=true;error('');render()}
  function removeItems(ids){
    const rows=list().items,removed=rows.map((item,index)=>({item:structuredClone(item),index})).filter(({item})=>ids.has(item.id));
    if(!removed.length)return false;
    undoItems=removed;
    for(const {item}of undoItems){inlineDrafts.delete(item.id);inlineErrors.delete(item.id)}
    if(ids.has(editingId)){clearDraft();$('foodPresetPicker').hidden=false;$('foodItemForm').hidden=true}
    list().items=rows.filter(item=>!ids.has(item.id));
    $('foodInlineCancelButton').hidden=!inlineDrafts.size;error(inlineErrors.values().next().value||'');render();onChange();return true;
  }
  function deleteItem(id){
    const rows=list().items,index=rows.findIndex(item=>item.id===id),restoreFocus=getActiveElement()?.dataset?.foodDelete===id;
    if(!removeItems(new Set([id])))return false;
    if(restoreFocus){const next=list().items[Math.min(index,list().items.length-1)];$(next?`food-inline-delete-${next.id}`:'foodUndoDeleteButton')?.focus({preventScroll:true})}
    return true;
  }
  // 食材のチェック（使った印）を切り替える。行は消さずに取り消し線で残す
  function toggleChecked(id,checked){
    const item=list().items.find(item=>item.id===id);if(!item||item.checked===checked)return false;
    item.checked=checked;render();onChange();return true;
  }
  // チェック済みの食材をまとめて削除する（「削除を元に戻す」で復元できる）
  function deleteChecked(){
    const ids=new Set(list().items.filter(item=>item.checked).map(item=>item.id));
    return ids.size?removeItems(ids):false;
  }
  function clearChecked(){
    const rows=list().items;if(!rows.some(item=>item.checked))return false;
    for(const item of rows)item.checked=false;render();onChange();return true;
  }
  function undoDelete(){
    if(!undoItems.length)return false;
    const rows=list().items,ids=new Set(rows.map(item=>item.id));
    for(const {item,index}of undoItems)if(!ids.has(item.id)){rows.splice(Math.min(index,rows.length),0,{...item});ids.add(item.id)}
    undoItems=[];render();onChange();return true;
  }
  function render(){
    if(!isFoodNote(getNote()))return;
    const focused=getActiveElement(),focusId=focused?.dataset?.foodRow,focusField=focused?.dataset?.foodInline,selection=[focused?.selectionStart,focused?.selectionEnd];
    const rows=list().items,checked=rows.filter(item=>item.checked).length;
    $('foodItemCount').textContent=`${rows.length}項目`;
    $('foodItemsList').innerHTML=rows.map(item=>{
      const shown={...item,...inlineDrafts.get(item.id)?.patch},meta=[item.useSoon?'★早めに使いたい':'',item.expiryDate?`${FOOD_EXPIRY_LABELS[item.expiryKind]||'期限'} ${item.expiryDate}`:''].filter(Boolean).join(' · '),units=[...new Set([...FOOD_UNITS,item.unit].filter(Boolean))];
      return `<div class="food-check-row ${item.checked?'is-checked':''}"><input type="checkbox" class="food-item-check" data-food-check="${escape(item.id)}" aria-label="${escape(item.name)}を${item.checked?'未使用に戻す':'使った（チェック）'}" ${item.checked?'checked':''}><div class="food-item-inline"><span class="food-item-name">${escape(item.name)}</span><div class="food-inline-amount"><input id="food-inline-quantity-${escape(item.id)}" data-food-row="${escape(item.id)}" data-food-inline="quantity" value="${escape(shown.quantity)}" placeholder="未設定" maxlength="40" aria-label="${escape(item.name)}の量"><select id="food-inline-unit-${escape(item.id)}" data-food-row="${escape(item.id)}" data-food-inline="unit" aria-label="${escape(item.name)}の単位"><option value="" ${shown.unit===''?'selected':''}>未設定</option>${units.map(unit=>`<option value="${escape(unit)}" ${shown.unit===unit?'selected':''}>${escape(unit)}</option>`).join('')}</select></div><button id="food-inline-delete-${escape(item.id)}" type="button" class="food-item-delete" data-food-delete="${escape(item.id)}" aria-label="${escape(item.name)} ${escape(formatFoodQuantity(item))}を削除" title="この食材を削除">×</button><label class="food-inline-storage">保存場所<select id="food-inline-storage-${escape(item.id)}" data-food-row="${escape(item.id)}" data-food-inline="storage" aria-label="${escape(item.name)}の保存場所"><option value="" ${shown.storage===''?'selected':''}>未設定</option>${Object.entries(FOOD_STORAGE_LABELS).map(([value,label])=>`<option value="${value}" ${shown.storage===value?'selected':''}>${label}</option>`).join('')}</select></label><button id="food-inline-details-${escape(item.id)}" type="button" class="quiet-button food-item-details" data-food-edit="${escape(item.id)}" aria-label="${escape(item.name)} ${escape(formatFoodQuantity(item))}の詳細">詳細</button>${meta?`<span class="food-item-meta">${escape(meta)}</span>`:''}${item.memo?`<span class="food-item-meta food-item-memo">${escape(item.memo)}</span>`:''}<p id="food-inline-error-${escape(item.id)}" class="form-error food-inline-error" ${inlineErrors.has(item.id)?'':'hidden'}>${escape(inlineErrors.get(item.id)||'')}</p></div></div>`;
    }).join('');
    $('foodItemsEmpty').hidden=rows.length>0;$('foodClearCheckedButton').hidden=!checked;$('foodClearCheckedButton').textContent=`チェックをすべて外す（${checked}件）`;$('foodDeleteCheckedButton').hidden=!checked;$('foodDeleteCheckedButton').textContent=`チェック済みを削除（${checked}件）`;$('foodUndoDeleteButton').hidden=!undoItems.length;
    renderPresetChoices();
    if(focusId&&focusField){const input=$(`food-inline-${focusField}-${focusId}`);input?.focus({preventScroll:true});if(focusField==='quantity'&&selection.every(Number.isInteger))input?.setSelectionRange?.(...selection)}
  }
  function validate(note){
    if(!isFoodNote(note))return true;
    if(!note.title.trim()){error('カードの題名を入力してください。');return false}
    if($('foodError').textContent==='カードの題名を入力してください。')error('');
    return true;
  }
  function canClose(){if(isFoodNote(getNote())){if(!flushInline())return false;if(dirty){error('入力中の食材を追加・保存するか、キャンセルしてください。');return false}if(selectedPresets.size){error('選択中の食材を追加するか、選択を解除してください。');$('foodPresetPicker').open=true;return false}}return true}
  function bind(){
    $('foodAddItemButton').onclick=()=>openDraft();$('foodItemSubmitButton').onclick=()=>commitDraft();$('foodDuplicateButton').onclick=()=>commitDraft(2);
    $('foodItemCancelButton').onclick=()=>{clearDraft();clearPresetSelection();$('foodItemForm').hidden=true};$('foodClearCheckedButton').onclick=clearChecked;$('foodDeleteCheckedButton').onclick=deleteChecked;$('foodUndoDeleteButton').onclick=undoDelete;
    $('foodPresetChoices').onchange=event=>{const name=event.target.dataset.foodPreset;if(!Object.values(presetGroups()).flat().includes(name))return;if(event.target.checked){selectedPresets.add(name);presetDefaults.set(name,structuredClone(getPresets().find(item=>item.name===name)||{name,quantity:'',unit:'g',storage:'chilled'}))}else{selectedPresets.delete(name);presetDefaults.delete(name)}updatePresetControls();error('')};
    $('foodPresetAddButton').onclick=addSelectedPresets;$('foodPresetClearButton').onclick=clearPresetSelection;
    $('foodItemNameInput').onkeydown=event=>{if(event.key==='Enter'&&!event.isComposing&&event.keyCode!==229){event.preventDefault();event.stopPropagation();commitDraft()}};
    for(const id of ['foodItemNameInput','foodQuantityInput','foodUnitInput','foodCustomUnitInput','foodStorageInput','foodUseSoonInput','foodExpiryKindInput','foodExpiryDateInput','foodItemMemoInput'])$(id).addEventListener(id==='foodUseSoonInput'?'change':'input',()=>{dirty=true;error('');updateCustomUnit()});
    $('foodUnitInput').addEventListener('change',()=>{dirty=true;updateCustomUnit()});
    $('foodItemsList').onclick=event=>{const removeId=event.target.closest('[data-food-delete]')?.dataset.foodDelete;if(removeId){deleteItem(removeId);return}const id=event.target.closest('[data-food-edit]')?.dataset.foodEdit;if(id)openDraft(id)};
    $('foodItemsList').oninput=event=>{const id=event.target.dataset.foodRow,field=event.target.dataset.foodInline;if(id&&field)stageInline(id,{[field]:event.target.value})};
    $('foodItemsList').onchange=event=>{const checkId=event.target.dataset.foodCheck;if(checkId){toggleChecked(checkId,event.target.checked);return}const inlineId=event.target.dataset.foodRow,field=event.target.dataset.foodInline;if(inlineId&&field){stageInline(inlineId,{[field]:event.target.value});commitInline(inlineId);return}};
    $('foodInlineCancelButton').onclick=cancelInline;
    $('editorForm').addEventListener('submit',event=>{if(isFoodNote(getNote())){event.preventDefault();if(!$('foodItemForm').hidden)commitDraft()}});
  }
  return {bind,render,validate,canClose,openDraft,commitDraft,deleteItem,toggleChecked,deleteChecked,clearChecked,undoDelete,addSelectedPresets,stageInline,commitInline,cancelInline,sync(){},reset(){clearDraft();selectedPresets.clear();presetDefaults.clear();inlineDrafts.clear();inlineErrors.clear();$('foodInlineCancelButton').hidden=true;undoItems=[];$('foodPresetPicker').open=false;$('foodPresetPicker').hidden=false;$('foodItemForm').hidden=false}};
}
