import { FOOD_UNITS, FOOD_STORAGE_LABELS, FOOD_EXPIRY_LABELS, normalizeFoodItem, normalizeFoodList, parseFoodQuantity, formatFoodQuantity } from './food-core.mjs?v=2026-10-28-03';
import { validTaskDate } from './task-core.mjs';

export function createFoodEditor({element:$,getNote,isFoodNote,onChange,escapeHtml:escape,uid}){
  let editingId=null,dirty=false,undoItems=[];
  const list=()=>{const note=getNote();return note.foodList||(note.foodList=normalizeFoodList())};
  const error=message=>{$('foodError').textContent=message;$('foodError').hidden=!message};
  function updateCustomUnit(){$('foodCustomUnitField').hidden=$('foodUnitInput').value!=='custom'}
  function setUnit(unit){$('foodUnitInput').value=FOOD_UNITS.includes(unit)?unit:unit?'custom':'g';$('foodCustomUnitInput').value=FOOD_UNITS.includes(unit)?'':unit;updateCustomUnit()}
  function clearDraft(){
    editingId=null;dirty=false;$('foodItemNameInput').value='';$('foodQuantityInput').value='';setUnit('g');
    $('foodStorageInput').value='';$('foodUseSoonInput').checked=false;$('foodExpiryKindInput').value='';$('foodExpiryDateInput').value='';$('foodItemMemoInput').value='';
    $('foodDetails').open=false;$('foodItemSubmitButton').textContent='追加';$('foodDuplicateButton').hidden=false;error('');
  }
  function openDraft(id=null){
    if(dirty){error('入力中の食材を追加・保存するか、キャンセルしてください。');return false}
    clearDraft();editingId=id;
    if(id){const item=list().items.find(item=>item.id===id);if(!item)return false;
      $('foodItemNameInput').value=item.name;$('foodQuantityInput').value=item.quantity;setUnit(item.unit);
      $('foodStorageInput').value=item.storage;$('foodUseSoonInput').checked=item.useSoon;$('foodExpiryKindInput').value=item.expiryKind;$('foodExpiryDateInput').value=item.expiryDate;$('foodItemMemoInput').value=item.memo;
      $('foodItemSubmitButton').textContent='変更を保存';$('foodDuplicateButton').hidden=true;
    }
    $('foodItemForm').hidden=false;$('foodItemNameInput').focus();return true;
  }
  function readDraft(){
    const unit=$('foodUnitInput').value==='custom'?$('foodCustomUnitInput').value.trim():$('foodUnitInput').value;
    return normalizeFoodItem({id:editingId||uid(),name:$('foodItemNameInput').value.trim(),quantity:$('foodQuantityInput').value,unit,
      storage:$('foodStorageInput').value,useSoon:$('foodUseSoonInput').checked,expiryKind:$('foodExpiryKindInput').value,expiryDate:$('foodExpiryDateInput').value,memo:$('foodItemMemoInput').value});
  }
  function validateDraft(item){
    if(!item.name){error('食材名を入力してください。');$('foodItemNameInput').focus();return false}
    if(parseFoodQuantity(item.quantity)===null){error('量は0より大きい数値または分数で入力してください（例：150、1、1/2）。');$('foodQuantityInput').focus();return false}
    if(!item.unit||item.unit.length>20){error('単位を選ぶか、20文字以内で入力してください。');$('foodCustomUnitInput').focus();return false}
    if($('foodExpiryDateInput').validity?.badInput||($('foodExpiryDateInput').value&&!validTaskDate($('foodExpiryDateInput').value))){error('期限に正しい日付を入力してください。');$('foodDetails').open=true;return false}
    if(item.expiryDate&&!item.expiryKind){error('消費期限または賞味期限を選んでください。');$('foodDetails').open=true;return false}
    return true;
  }
  function commitDraft(copies=1){
    const item=readDraft();if(!validateDraft(item))return false;
    if(editingId){const at=list().items.findIndex(row=>row.id===editingId);if(at<0){error('この項目は別の端末で削除されています。入力を保持しています。');return false}list().items[at]={...item,checked:list().items[at].checked,order:at}}
    else for(let i=0;i<copies;i++)list().items.push({...item,id:uid(),order:list().items.length});
    clearDraft();$('foodItemForm').hidden=true;render();onChange();return true;
  }
  function deleteChecked(){
    const rows=list().items;undoItems=rows.map((item,index)=>({item:structuredClone(item),index})).filter(({item})=>item.checked);
    if(!undoItems.length)return false;
    list().items=rows.filter(item=>!item.checked);render();onChange();return true;
  }
  function undoDelete(){
    if(!undoItems.length)return false;
    const rows=list().items,ids=new Set(rows.map(item=>item.id));
    for(const {item,index}of undoItems)if(!ids.has(item.id)){rows.splice(Math.min(index,rows.length),0,{...item,checked:false});ids.add(item.id)}
    undoItems=[];render();onChange();return true;
  }
  function render(){
    if(!isFoodNote(getNote()))return;
    const rows=list().items,checked=rows.filter(item=>item.checked).length;
    $('foodItemCount').textContent=`${rows.length}項目${checked?`（選択中 ${checked}項目）`:''}`;
    $('foodItemsList').innerHTML=rows.map(item=>{
      const meta=[FOOD_STORAGE_LABELS[item.storage],item.useSoon?'★早めに使いたい':'',item.expiryDate?`${FOOD_EXPIRY_LABELS[item.expiryKind]||'期限'} ${item.expiryDate}`:''].filter(Boolean).join(' · ');
      return `<div class="food-check-row ${item.checked?'is-checked':''}"><label class="food-check-control"><input type="checkbox" data-food-check="${escape(item.id)}" aria-label="${escape(item.name)} ${escape(formatFoodQuantity(item))}を選択" ${item.checked?'checked':''}></label><button type="button" class="food-item-open" data-food-edit="${escape(item.id)}" aria-label="${escape(item.name)} ${escape(formatFoodQuantity(item))}を編集"><span class="food-item-name">${escape(item.name)}</span><span class="food-item-quantity">${escape(formatFoodQuantity(item))}</span>${meta?`<span class="food-item-meta">${escape(meta)}</span>`:''}${item.memo?`<span class="food-item-meta food-item-memo">${escape(item.memo)}</span>`:''}</button></div>`;
    }).join('');
    $('foodItemsEmpty').hidden=rows.length>0;$('foodDeleteCheckedButton').disabled=!checked;$('foodUndoDeleteButton').hidden=!undoItems.length;
    $('foodNameSuggestions').innerHTML=[...new Set(rows.map(item=>item.name))].map(name=>`<option value="${escape(name)}"></option>`).join('');
  }
  function validate(note){
    if(!isFoodNote(note))return true;
    if(!note.title.trim()){error('カードの題名を入力してください。');return false}
    if($('foodError').textContent==='カードの題名を入力してください。')error('');
    return true;
  }
  function canClose(){if(isFoodNote(getNote())&&dirty){error('入力中の食材を追加・保存するか、キャンセルしてください。');return false}return true}
  function bind(){
    $('foodAddItemButton').onclick=()=>openDraft();$('foodItemSubmitButton').onclick=()=>commitDraft();$('foodDuplicateButton').onclick=()=>commitDraft(2);
    $('foodItemCancelButton').onclick=()=>{clearDraft();$('foodItemForm').hidden=true};$('foodDeleteCheckedButton').onclick=deleteChecked;$('foodUndoDeleteButton').onclick=undoDelete;
    for(const id of ['foodItemNameInput','foodQuantityInput','foodUnitInput','foodCustomUnitInput','foodStorageInput','foodUseSoonInput','foodExpiryKindInput','foodExpiryDateInput','foodItemMemoInput'])$(id).addEventListener(id==='foodUseSoonInput'?'change':'input',()=>{dirty=true;error('');updateCustomUnit()});
    $('foodUnitInput').addEventListener('change',()=>{dirty=true;updateCustomUnit()});
    $('foodItemsList').onclick=event=>{const id=event.target.closest('[data-food-edit]')?.dataset.foodEdit;if(id)openDraft(id)};
    $('foodItemsList').onchange=event=>{const id=event.target.dataset.foodCheck,item=list().items.find(item=>item.id===id);if(item){item.checked=event.target.checked;render();onChange()}};
    $('editorForm').addEventListener('submit',event=>{if(isFoodNote(getNote())){event.preventDefault();if(!$('foodItemForm').hidden)commitDraft()}});
  }
  return {bind,render,validate,canClose,openDraft,commitDraft,deleteChecked,undoDelete,sync(){},reset(){clearDraft();undoItems=[];$('foodItemForm').hidden=true}};
}
