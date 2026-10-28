import { normalizeFood, validGrams, consumeFood } from './food-core.mjs';
import { validTaskDate } from './task-core.mjs';

export function createFoodEditor({element:$,getNote,isFoodNote,onChange,save,saveAndNext}){
  let busy=false;
  const error=message=>{$('foodError').textContent=message;$('foodError').hidden=!message};
  function sync(){
    const note=getNote();if(!isFoodNote(note))return;
    const previous=note.food||normalizeFood(),raw=$('foodGramsInput').value;
    const remainingGrams=raw===''?null:Number(raw);
    note.food={...previous,remainingGrams,storage:$('foodStorageInput').value,useSoon:$('foodUseSoonInput').checked,
      expiryKind:$('foodExpiryKindInput').value,expiryDate:$('foodExpiryDateInput').value,
      restoreGrams:previous.remainingGrams===remainingGrams?previous.restoreGrams:null};
  }
  function renderStatus(){
    const note=getNote();if(!isFoodNote(note))return;
    const food=note.food||(note.food=normalizeFood());
    $('foodUndoButton').hidden=food.restoreGrams===null;
    $('foodUseAllButton').disabled=busy||!validGrams(food.remainingGrams)||food.remainingGrams<=0;
    $('foodConsumeButton').disabled=busy;$('foodUndoButton').disabled=busy;$('foodNextButton').disabled=busy;
    $('foodRemainingLabel').textContent=food.remainingGrams===null?'残量を入力してください':`現在の残量 ${food.remainingGrams}g`;
  }
  function render(){
    const note=getNote();if(!isFoodNote(note))return;
    const food=note.food||(note.food=normalizeFood());
    $('foodGramsInput').value=food.remainingGrams??'';$('foodStorageInput').value=food.storage;
    $('foodUseSoonInput').checked=food.useSoon;$('foodExpiryKindInput').value=food.expiryKind;$('foodExpiryDateInput').value=food.expiryDate;
    renderStatus();
  }
  function validate(note){
    if(!isFoodNote(note))return true;
    const food=note.food||normalizeFood();
    const meaningful=note.title.trim()||note.content.trim()||note.items.some(item=>item.text?.trim())||food.remainingGrams!==null||food.storage||food.useSoon||food.expiryKind||food.expiryDate;
    if(!meaningful)return true;
    if(!note.title.trim()){error('食材名を入力してください。');$('noteTitleInput').focus();return false}
    if(!validGrams(food.remainingGrams)){error('残っている量を0以上のg数で入力してください（小数第1位まで）。');$('foodGramsInput').focus();return false}
    if((food.expiryDate&&!validTaskDate(food.expiryDate))||$('foodExpiryDateInput').validity?.badInput){error('期限に正しい日付を入力してください。');$('foodDetails').open=true;$('foodExpiryDateInput').focus();return false}
    if(food.expiryDate&&!food.expiryKind){error('日付に対応する「消費期限」または「賞味期限」を選んでください。');$('foodDetails').open=true;$('foodExpiryKindInput').focus();return false}
    error('');return true;
  }
  async function applyUsage(kind){
    if(busy)return false;
    sync();const note=getNote();if(!isFoodNote(note)||!validate(note))return false;
    try{
      const food=note.food;
      if(kind==='undo'){
        if(food.restoreGrams===null)return false;
        note.food={...food,remainingGrams:food.restoreGrams,restoreGrams:null};
      }else note.food=consumeFood(food,kind==='all'?food.remainingGrams:Number($('foodUseGramsInput').value));
    }catch(e){error(e.message);return false}
    busy=true;$('foodUseGramsInput').value='';render();onChange();
    try{return await save()}
    finally{busy=false;render()}
  }
  function bind(){
    $('editorForm').addEventListener('submit',event=>{if(isFoodNote(getNote())){event.preventDefault();sync();if(validate(getNote()))save()}});
    for(const id of ['foodGramsInput','foodStorageInput','foodUseSoonInput','foodExpiryKindInput','foodExpiryDateInput']){
      $(id).addEventListener(id==='foodGramsInput'?'input':'change',()=>{sync();error('');renderStatus();onChange()});
    }
    $('foodConsumeButton').onclick=()=>applyUsage('partial');$('foodUseAllButton').onclick=()=>applyUsage('all');$('foodUndoButton').onclick=()=>applyUsage('undo');
    $('foodNextButton').onclick=async()=>{if(busy)return;busy=true;render();try{await saveAndNext()}finally{busy=false;render()}};
  }
  return {bind,sync,render,validate,reset(){error('');$('foodUseGramsInput').value='';$('foodDetails').open=false}};
}
