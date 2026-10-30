/* イロイロキロク: Firestoreを正式保存先にする画面ロジック。 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { Timestamp, addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, validTaskDate, localDateKey, normalizeTask, taskIsOverdue, compareTaskDue, taskProgress } from './task-core.mjs?v=2026.10.23-1';
import { normalizeManga, mangaSearchText, mangaHasContent, mangaFromNeta } from './manga-core.mjs?v=2026.10.23-1';
import { mergeNoteData } from './note-concurrency.mjs?v=2026-10-25-03';
import { FOOD_STORAGE_LABELS, FOOD_EXPIRY_LABELS, normalizeFood, validGrams, normalizeFoodList, foodInventoryFromSources, foodInventoryId, foodListSearchText, formatFoodQuantity, parseFoodQuantity } from './food-core.mjs?v=2026-10-29-08';
import { createFoodEditor } from './food-editor.mjs?v=2026-10-29-12';
import { defaultFoodPresets, readFoodPresets, validateFoodPresets } from './food-presets.mjs?v=2026-10-29-08';
import { createFoodPresetManager } from './food-preset-manager.mjs?v=2026-10-29-08';
import { createMangaEditor } from './manga-editor.mjs?v=2026.10.23-1';

const VERSION='2026-10-30-01'; const LEGACY_KEY='orangememo-notes-v1'; const SCHEMA_VERSION=3; const BACKUP_FORMAT_VERSION=1;
// 指定されたカードを、星のピン留めとは独立して常に上部へ表示する。
const FIXED_CARD_TITLES=['やること','アプリ関連','買物リスト','食材','調味料'];
const FIXED_CARD_ICON='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16M12 20V8m-5 5 5-5 5 5"/></svg>';
function fixedCardRank(note){const index=FIXED_CARD_TITLES.indexOf(String(note?.title||'').trim());return index<0?Infinity:index}
function isFixedCard(note){return Number.isFinite(fixedCardRank(note))}
function fixedCardBadge(note){return isFixedCard(note)?`<span class="card-fixed-badge" title="上部固定" aria-label="上部固定">${FIXED_CARD_ICON}</span>`:''}
const CATEGORY_COLOR_PALETTE=['#FF7F00','#3A86D4','#D94F8A','#38A169','#7E5FC4','#E25555','#1E9A8A','#FFD400'];
const LEGACY_DEFAULT_CATEGORY_COLORS={app:['#fff0e8','#FF7F00'],manga:['#fff8d8','#FFD400'],blog:['#eaf5ff','#3A86D4'],cooking:['#ecf8ed','#38A169'],shopping:['#f5edff','#7E5FC4'],research:['#e9f7f5','#1E9A8A']};
const STANDARD_CATEGORY_COLOR_MIGRATIONS={manga:['#e0aa16','#FFD400']};
const DEFAULT_CATEGORIES=[['app','アプリ','#FF7F00'],['manga','漫画','#FFD400'],['blog','ブログ','#3A86D4'],['cooking','料理','#38A169'],['shopping','買い物','#7E5FC4'],['research','あとで調べる','#1E9A8A']].map(([id,name,color],order)=>({id,name,color,order}));
const $=id=>document.getElementById(id); const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`; const config=window.IROIRO_FIREBASE_CONFIG||{};
let editorBaseData=null;
let app,auth,db,currentUser=null,notes=[],categories=[],selectedCategory='all',editingNote=null,saveTimer=null,unsubscribeNotes=null,unsubscribeSettings=null,settingsCreatingForUid='',closingEditor=false,deletingNote=false,pendingCategoryId='',pendingType='',categoryDragState=null,itemDragState=null,editRevision=0,savedRevision=0,requestedRevision=0,saveInProgress=false,savePromise=Promise.resolve(true),editorSession='',backupBusy=false,pendingBackup=null,migrationBusy=false,regularSort='updated-desc';
const pendingTaskWrites=new Set();
let pendingCardDelete=null,cardDeleteInProgress=false;
let foodPresets=defaultFoodPresets(),foodPresetsReady=false;
const foodEditor=createFoodEditor({element:$,getNote:()=>editingNote,isFoodNote,onChange:()=>{refreshRelatedLinks();scheduleSave()},escapeHtml,uid,getPresets:()=>foodPresets,presetsReady:()=>foodPresetsReady,getActiveElement:()=>document.activeElement});
const foodPresetManager=createFoodPresetManager({element:$,getPresets:()=>foodPresets,getOwner:()=>foodPresetsReady?currentUser?.uid:null,savePresets:saveFoodPresets,escapeHtml,uid,onSaved:()=>foodEditor.render()});
function applyRemoteFoodPresets(settings={}){
  try{foodPresets=readFoodPresets(settings.foodPresets);foodPresetsReady=true;$('foodManagePresetsButton').disabled=false;if(isFoodNote(editingNote))foodEditor.render()}
  catch(error){foodPresetsReady=false;$('foodManagePresetsButton').disabled=true;setStatus(`定番設定を読み込めませんでした: ${error.message}`)}
}
async function saveFoodPresets(next,base,activeUid){
  if(!foodPresetsReady)throw new Error('定番設定の読み込み完了をお待ちください。');
  const validated=validateFoodPresets(next),expected=validateFoodPresets(base),target=doc(db,'users',activeUid,'iroiroSettings','main');
  requireActiveUser(activeUid);
  await runTransaction(db,async transaction=>{
    const latest=await transaction.get(target);requireActiveUser(activeUid);
    const remote=readFoodPresets(latest.exists()?latest.data().foodPresets:undefined);
    if(!sameNoteContent(expected,remote))throw new Error('別の端末で定番設定が変更されました。入力内容を控え、管理画面を開き直してください。');
    transaction.set(target,{foodPresets:validated},{merge:true});
  });
  requireActiveUser(activeUid);foodPresets=validated;
}
const pendingPinWrites=new Map();
let pendingNetaImport=null,netaImportBusy=false;
const mangaEditor=createMangaEditor({element:$,getNote:()=>editingNote,isMangaNote,ensureManga,onChange:()=>{syncEditingNoteFromForm();renderLinks();scheduleSave()},syncNote:()=>syncEditingNoteFromForm(),escapeHtml});
function scheduleTaskDayRefresh(){
  const now=new Date(),next=new Date(now);next.setHours(24,0,0,500);
  setTimeout(()=>{renderNotes();scheduleTaskDayRefresh()},next.getTime()-now.getTime());
}
function configured(){return Boolean(config.apiKey&&config.projectId&&config.appId)}
function refs(){return{notes:collection(db,'users',currentUser.uid,'iroiroNotes'),settings:doc(db,'users',currentUser.uid,'iroiroSettings','main'),migration:doc(db,'users',currentUser.uid,'iroiroMigrations','localStorageV1')}}
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function categoryColor(value,fallback='#6b7280'){return/^#[0-9a-f]{6}$/i.test(String(value||''))?String(value).toUpperCase():fallback}
function categoryTextColor(value){const hex=categoryColor(value).slice(1),red=parseInt(hex.slice(0,2),16),green=parseInt(hex.slice(2,4),16),blue=parseInt(hex.slice(4,6),16);return(red*299+green*587+blue*114)/1000>=160?'#2D2926':'#FFFFFF'}
function categoryStyle(value){const color=categoryColor(value);return`style="--category-color:${color};--category-text:${categoryTextColor(color)}"`}
function colorChoices(selected){const current=categoryColor(selected);return CATEGORY_COLOR_PALETTE.map(color=>`<button type="button" class="category-color-choice ${current===color?'selected':''}" data-color-choice="${color}" style="--choice-color:${color}" aria-label="${color}を選択" aria-pressed="${current===color}"></button>`).join('')}
/* Timestamp、Date、旧ISO文字列、serverTimestamp反映前のnullを同じ経路で扱う。 */
function toDate(value){if(!value)return null;let date=null;if(value instanceof Date)date=new Date(value);else if(typeof value.toDate==='function')date=value.toDate();else if(typeof value.toMillis==='function')date=new Date(value.toMillis());else if(typeof value==='object'&&typeof value.seconds==='number')date=new Date(value.seconds*1000+(value.nanoseconds||0)/1e6);else if(typeof value==='number'||typeof value==='string')date=new Date(value);return date&&!Number.isNaN(date.getTime())?date:null}
function dateMillis(value,fallback=0){return toDate(value)?.getTime()??fallback}
function formatDate(value){const date=toDate(value);return date?new Intl.DateTimeFormat('ja-JP',{dateStyle:'medium',timeStyle:'short'}).format(date):'日時不明'}
function shortDate(value){const date=toDate(value);return date?new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric'}).format(date):'日時不明'}
function orderedCategories(list){return list.map((category,index)=>({...category,order:Number.isFinite(Number(category.order))?Number(category.order):index})).sort((a,b)=>a.order-b.order)}
function getCategory(id){return categories.find(c=>c.id===id)}
function displayTitle(n){return n.title.trim()||((n.type==='text'?n.content:n.items.map(i=>i.text).join(' ')).trim().slice(0,48)||'無題のメモ')}
function isRecord(value){return value!==null&&typeof value==='object'&&!Array.isArray(value)}
function validRecordId(value){return typeof value==='string'&&/^[A-Za-z0-9_-]{1,1500}$/.test(value)&&!/^__.*__$/.test(value)}
function requireActiveUser(activeUid){if(currentUser?.uid!==activeUid)throw new Error('ログイン中のアカウントが変わりました。もう一度操作してください。')}
function copyItems(items=[]){return(Array.isArray(items)?items:[]).filter(isRecord).map((item,index)=>({id:String(item.id||uid()),text:String(item.text||''),checked:Boolean(item.checked),order:Number.isFinite(item.order)?item.order:index}))}
function ensureFormatStores(note){if(!note)return;note.contentByType=isRecord(note.contentByType)?note.contentByType:{};note.itemsByType=isRecord(note.itemsByType)?note.itemsByType:{};if(typeof note.contentByType.text!=='string')note.contentByType.text=note.type==='text'?String(note.content||''):'';['bullet','checklist'].forEach(type=>{if(!Array.isArray(note.itemsByType[type]))note.itemsByType[type]=note.type===type?copyItems(note.items):[]})}
function rememberCurrentFormat(note){ensureFormatStores(note);if(note.type==='text')note.contentByType.text=String(note.content||'');else note.itemsByType[note.type]=copyItems(note.items)}
function normalizeNote(id,data={}){
  if(!isRecord(data))data={};
  const note={id,title:String(data.title||''),type:['text','bullet','checklist'].includes(data.type)?data.type:'text',content:String(data.content||''),items:copyItems(data.items),categoryId:String(data.categoryId||''),task:isRecord(data.task)?normalizeTask(data.task):null,manga:isRecord(data.manga)?normalizeManga(data.manga):null,food:isRecord(data.food)?normalizeFood(data.food):null,foodList:isRecord(data.foodList)?normalizeFoodList(data.foodList):null,urls:[],isPinned:Boolean(data.isPinned),createdAt:data.createdAt??null,updatedAt:data.updatedAt??null,contentByType:{text:typeof data.contentByType?.text==='string'?data.contentByType.text:(data.type==='text'||!data.type?String(data.content||''):'')},itemsByType:isRecord(data.itemsByType)?{bullet:data.itemsByType.bullet,checklist:data.itemsByType.checklist}:{},schemaVersion:Number(data.schemaVersion??SCHEMA_VERSION)||SCHEMA_VERSION};
  ensureFormatStores(note);
  ['bullet','checklist'].forEach(type=>note.itemsByType[type]=copyItems(note.itemsByType[type]));
  // URLは本文から導けるため、バックアップやFirestore内のキャッシュは信用しない。
  note.urls=extractUrls(note);
  return note;
}
function createNote(){if(isFoodCategory(selectedCategory))return getFoodInventory(selectedCategory);const now=new Date(),categoryId=getCategory(selectedCategory)?selectedCategory:'';return{id:'',title:'',type:'text',content:'',items:[],categoryId,task:isTaskCategory(categoryId)?normalizeTask():null,manga:isMangaCategory(categoryId)?normalizeManga():null,food:isFoodCategory(categoryId)?normalizeFood():null,urls:[],isPinned:false,createdAt:now,updatedAt:now,contentByType:{text:''},itemsByType:{bullet:[],checklist:[]}}}
function isFoodCategory(id){return getCategory(id)?.name.trim()==='食材'}
function isFoodNote(note){return Boolean(note&&isFoodCategory(note.categoryId))}
function ensureFoodList(note){if(!note.foodList)note.foodList=normalizeFoodList();return note.foodList}
function getFoodInventory(categoryId){
  const sources=notes.filter(note=>note.categoryId===categoryId),projection=foodInventoryFromSources(categoryId,sources),stored=sources.find(note=>note.id===projection.id);
  const result=normalizeNote(projection.id,{...stored,...projection});
  result.inventoryDraft=!stored;
  result.inventoryImportSources=sources.filter(note=>note.id!==projection.id&&!Object.hasOwn(stored?.foodList?.importedSources||{},note.id)).map(note=>({id:note.id,data:noteData(structuredClone(note))}));
  result.inventoryDeleteSources=sources.map(note=>({id:note.id,data:noteData(structuredClone(note))}));
  const pin=pendingPinWrites.get(`${currentUser?.uid}:${result.id}`);if(pin)result.isPinned=pin.next;
  return result;
}
async function openFoodInventory(categoryId){
  if(!currentUser||!isFoodCategory(categoryId))return;
  const activeUid=currentUser.uid,pending=pendingPinWrites.get(`${activeUid}:${foodInventoryId(categoryId)}`);
  if(pending)await pending.promise;
  if(currentUser?.uid!==activeUid)return;
  openEditor(getFoodInventory(categoryId));
}
function isTaskCategory(id){return getCategory(id)?.name.trim()==='タスク'}
function isTaskNote(note){return Boolean(note&&isTaskCategory(note.categoryId))}
function isMangaCategory(id){return getCategory(id)?.name.trim()==='漫画'}
function isMangaNote(note){return Boolean(note&&isMangaCategory(note.categoryId))}
function mangaForNote(note){return note.manga||normalizeManga({pages:[{rows:[{panel:'1',detail:note.type==='text'?'':note.items.map(item=>`${note.type==='checklist'?(item.checked?'☑':'□'):'•'} ${item.text}`).join('\n')}]}]})}
function ensureManga(note){if(!note.manga)note.manga=mangaForNote(note);return note.manga}
function taskForNote(note){return note.task||normalizeTask({items:note.type==='text'?[]:note.items})}
function ensureTask(note){if(!note.task)note.task=taskForNote(note);return note.task}
function selectCategory(id){
  const wasTask=isTaskCategory(selectedCategory);selectedCategory=id;
  if(isTaskCategory(id)&&!wasTask){regularSort=$('sortSelect').value;$('sortSelect').value='task-due'}
  else if(!isTaskCategory(id)&&wasTask)$('sortSelect').value=regularSort;
  renderAll();
}
function handleCategoryChange(){
  if(!editingNote)return;
  const next=$('noteCategorySelect').value;
  // 共通の＋から食材へ切り替えた場合も、固定の食材カードを開く。
  // 入力済みの本文や項目がある新規メモは、この経路で置き換えない。
  if(isFoodCategory(next)&&!editingNote.id&&!saveInProgress&&!hasMeaningfulContent(editingNote)&&!$('noteTitleInput').value.trim()&&!$('noteContentInput').value.trim()){
    clearTimeout(saveTimer);saveTimer=null;openFoodInventory(next);return;
  }
  syncEditingNoteFromForm(false);
  if(!editingNote.id&&isFoodNote(editingNote)&&!editingNote.title.trim()){editingNote.title='食材';$('noteTitleInput').value='食材'}
  updateEditor();scheduleSave();
}
function updateEditorMode(){
  const note=editingNote;if(!note)return;
  const taskMode=isTaskNote(note),mangaMode=isMangaNote(note),foodMode=isFoodNote(note);
  $('editorDialog').classList.toggle('manga-mode',mangaMode);
  $('editorDialog').classList.toggle('food-mode',foodMode);$('foodFields').hidden=!foodMode;
  if(foodMode){ensureFoodList(note);foodEditor.render()}else $('foodError').hidden=true;
  const inventory=foodMode&&note.id===foodInventoryId(note.categoryId);
  $('noteTitleInput').readOnly=inventory;$('noteCategorySelect').disabled=inventory;$('deleteNoteButton').hidden=false;$('noteCategoryLabelText').textContent=foodMode?'タグ':'カテゴリー';
  $('noteTitleInput').removeAttribute('list');
  $('taskFields').hidden=!taskMode;$('taskItemsSection').hidden=!taskMode;$('typeSwitcher').hidden=taskMode||mangaMode||foodMode;
  $('mangaFields').hidden=!mangaMode;$('mangaRowsSection').hidden=!mangaMode;
  $('textEditor').hidden=foodMode||(!taskMode&&!mangaMode&&note.type!=='text');$('itemsEditor').hidden=taskMode||mangaMode||foodMode||note.type==='text';
  $('noteContentLabel').hidden=!taskMode&&!mangaMode&&!foodMode;$('noteContentLabel').textContent=mangaMode?'自分用メモ（任意）':'補足メモ（任意）';
  $('noteTitleInput').placeholder=taskMode?'タスク名（必須）':mangaMode?'漫画ネタのタイトル（必須）':foodMode?'食材':'題名（任意）';
  $('noteTitleInput').setAttribute('aria-label',taskMode?'タスク名':mangaMode?'漫画タイトル':foodMode?'カードの題名':'題名');
  $('noteTitleInput').setAttribute('aria-required',String(taskMode||mangaMode||foodMode));
  $('noteContentInput').placeholder=taskMode?'詳細、関連URL、注意事項など…':mangaMode?'制作時の注意や補足…':foodMode?'開封済み、カット済みなど…':'ここにメモを入力…';
  $('noteContentInput').setAttribute('aria-label',taskMode?'補足メモ':mangaMode?'自分用メモ':foodMode?'食材メモ':'本文');
  $('taskTitleError').hidden=true;$('mangaTitleError').hidden=true;
  if(mangaMode)mangaEditor.render();
  if(taskMode){
    const task=ensureTask(note);
    $('taskDueDateInput').value=task.dueDate;$('taskStatusSelect').value=task.status;$('taskPrioritySelect').value=task.priority;
    renderTaskItems();
  }
}
function renderTaskItems(){
  if(!editingNote||!isTaskNote(editingNote))return;
  const task=ensureTask(editingNote),progress=taskProgress(task);
  $('taskChecklistProgress').textContent=progress.total?`${progress.done}/${progress.total}完了`:'';
  $('taskItemsList').innerHTML=task.items.map((item,index)=>`<div class="task-item-row ${item.checked?'checked':''}"><input type="checkbox" data-task-check="${index}" aria-label="${index+1}番目のチェック項目を完了" ${item.checked?'checked':''}><textarea class="checklist-text" rows="1" data-task-item="${index}" aria-label="チェック項目${index+1}" placeholder="作業を入力">${escapeHtml(item.text)}</textarea><button type="button" class="remove-item" data-task-remove="${index}" aria-label="チェック項目${index+1}を削除">×</button></div>`).join('');
  $('taskItemsList').querySelectorAll('.checklist-text').forEach(resizeChecklistInput);
}
function resizeChecklistInput(input){
  if(!input?.style)return;
  input.style.height='auto';
  if(input.scrollHeight)input.style.height=`${input.scrollHeight+2}px`;
}
function resizeChecklistInputs(){document.querySelectorAll('.checklist-text').forEach(resizeChecklistInput)}
function observeChecklistWidths(){
  if(typeof ResizeObserver==='undefined')return;
  const widths=new WeakMap();
  const observer=new ResizeObserver(entries=>{for(const entry of entries){if(widths.get(entry.target)===entry.contentRect.width)continue;widths.set(entry.target,entry.contentRect.width);entry.target.querySelectorAll('.checklist-text').forEach(resizeChecklistInput)}});
  observer.observe($('itemsList'));observer.observe($('taskItemsList'));
}
const composingInputs=new WeakSet();
function trackComposition(container){
  container.oncompositionstart=event=>composingInputs.add(event.target);
  container.oncompositionend=event=>composingInputs.delete(event.target);
}
function isImeConfirm(event){return event.isComposing||event.keyCode===229||event.which===229||composingInputs.has(event.target)}
function bindTaskEvents(){
  trackComposition($('taskItemsList'));
  ['taskDueDateInput','taskStatusSelect','taskPrioritySelect'].forEach(id=>$(id).onchange=()=>{syncEditingNoteFromForm();scheduleSave()});
  $('taskDueDateInput').oninput=()=>{syncEditingNoteFromForm();scheduleSave()};
  $('clearTaskDueDateButton').onclick=()=>{$('taskDueDateInput').value='';syncEditingNoteFromForm();scheduleSave()};
  $('addTaskItemButton').onclick=()=>{
    if(!editingNote)return;
    const task=ensureTask(editingNote);task.items.push({id:uid(),text:'',checked:false,order:task.items.length});
    renderTaskItems();scheduleSave();$('taskItemsList').querySelector(`[data-task-item="${task.items.length-1}"]`)?.focus();
  };
  $('taskItemsList').oninput=e=>{
    const index=e.target.dataset.taskItem;
    if(index===undefined||!editingNote)return;
    resizeChecklistInput(e.target);ensureTask(editingNote).items[Number(index)].text=e.target.value;const progress=taskProgress(editingNote.task);$('taskChecklistProgress').textContent=progress.total?`${progress.done}/${progress.total}完了`:'';refreshRelatedLinks();scheduleSave();
  };
  $('taskItemsList').onchange=e=>{
    const index=e.target.dataset.taskCheck;
    if(index===undefined||!editingNote)return;
    ensureTask(editingNote).items[Number(index)].checked=e.target.checked;renderTaskItems();scheduleSave();
  };
  $('taskItemsList').onclick=e=>{
    const index=e.target.closest('[data-task-remove]')?.dataset.taskRemove;
    if(index===undefined||!editingNote)return;
    const task=ensureTask(editingNote);task.items.splice(Number(index),1);task.items.forEach((item,order)=>item.order=order);
    renderTaskItems();refreshRelatedLinks();scheduleSave();
  };
  $('taskItemsList').onkeydown=e=>{
    const index=e.target.dataset.taskItem;
    if(index===undefined||e.key!=='Enter'||e.shiftKey||isImeConfirm(e)||!editingNote)return;
    e.preventDefault();const at=Number(index)+1,task=ensureTask(editingNote);
    task.items.splice(at,0,{id:uid(),text:'',checked:false,order:at});task.items.forEach((item,order)=>item.order=order);
    renderTaskItems();refreshRelatedLinks();scheduleSave();$('taskItemsList').querySelector(`[data-task-item="${at}"]`)?.focus();
  };
}
function noteTitleValid(note){
  if(!foodEditor.validate(note)){$('saveStatus').textContent='未保存（入力内容を確認）';return false}
  if(isMangaNote(note)&&!note.title.trim()&&hasMeaningfulContent(note)){$('mangaTitleError').hidden=false;$('saveStatus').textContent='漫画タイトルを入力してください。';$('noteTitleInput').focus();return false}
  if(!isTaskNote(note)||note.title.trim()||!hasMeaningfulContent(note))return true;
  $('taskTitleError').hidden=false;$('saveStatus').textContent='タスク名を入力してください。';$('noteTitleInput').focus();return false;
}
function hasMeaningfulContent(note){return Boolean((isFoodNote(note)&&ensureFoodList(note).items.length)||note.title.trim()||note.content.trim()||note.items.some(item=>String(item.text||'').trim())||(isTaskNote(note)&&taskForNote(note).items.some(item=>item.text.trim()))||(isMangaNote(note)&&mangaHasContent(mangaForNote(note)))||extractUrls(note).length)}
function setStatus(message){$('syncStatus').textContent=message}
function initialize(){document.body.dataset.appVersion=VERSION;bindEvents();scheduleTaskDayRefresh();if(!configured()){$('syncStatus').textContent='Firebase設定が未設定です';$('loginButton').disabled=true;renderAll();return}app=initializeApp(config);auth=getAuth(app);db=getFirestore(app);onAuthStateChanged(auth,handleAuth)}
function bindEvents(){
  observeChecklistWidths();
  $('prepareNetaImportButton').onclick=prepareNetaImport;$('confirmNetaImportButton').onclick=importNetaRecords;
  mangaEditor.bind();
  bindTaskEvents();foodEditor.bind();foodPresetManager.bind();
  $('createNoteButton').onclick=()=>{if(!currentUser)return;if(isFoodCategory(selectedCategory))return openFoodInventory(selectedCategory);openEditor(createNote())}; $('loginButton').onclick=()=>signInWithPopup(auth,new GoogleAuthProvider()).catch(e=>setStatus(`ログイン失敗: ${e.message}`)); $('logoutButton').onclick=()=>signOut(auth);
  $('searchInput').oninput=renderNotes;$('sortSelect').onchange=()=>{if(!isTaskCategory(selectedCategory))regularSort=$('sortSelect').value;renderNotes()};$('noteTitleInput').oninput=()=>{syncEditingNoteFromForm();updateFixedCardBadge();scheduleSave()};$('noteContentInput').oninput=()=>{syncEditingNoteFromForm();renderLinks();scheduleSave()};$('noteCategorySelect').onchange=handleCategoryChange;
  $('closeEditorButton').onclick=e=>{e.preventDefault();closeEditor()}; $('editorDialog').addEventListener('cancel',e=>{e.preventDefault();closeEditor()});$('editorDialog').addEventListener('close',cancelItemDrag);
  $('pinButton').onclick=()=>{editingNote.isPinned=!editingNote.isPinned;updateEditor();scheduleSave()}; $('deleteNoteButton').onclick=confirmDelete;$('confirmDeleteButton').onclick=e=>{e.preventDefault();if(pendingCardDelete)deleteCardNote();else deleteCurrentNote()};
  $('confirmDialog').addEventListener('close',()=>{if(!$('confirmDialog').open)pendingCardDelete=null});
  $('confirmDialog').addEventListener('cancel',e=>{if(cardDeleteInProgress||deletingNote)e.preventDefault()});
  $('addItemButton').onclick=()=>{editingNote.items.push({id:uid(),text:'',checked:false,order:editingNote.items.length});renderItems();scheduleSave()}; $('typeSwitcher').onclick=e=>{const type=e.target.dataset.type;if(type&&!isTaskNote(editingNote)&&!isMangaNote(editingNote)&&!isFoodNote(editingNote))requestTypeChange(type)};
  ['manageCategoriesButton','mobileManageCategoriesButton'].forEach(id=>$(id).onclick=openCategoryManager);$('categoryDialog').addEventListener('close',cancelCategoryDrag);$('categoryDialog').addEventListener('cancel',cancelCategoryDrag);$('addCategoryButton').onclick=addCategory;$('confirmCategoryDeleteButton').onclick=e=>{e.preventDefault();deletePendingCategory()};$('showPreviousTypeButton').onclick=e=>{e.preventDefault();applyTypeChange(pendingType,'previous');$('typeConfirmDialog').close()};$('replaceTypeContentButton').onclick=e=>{e.preventDefault();applyTypeChange(pendingType,'replace');$('typeConfirmDialog').close()};$('typeConfirmDialog').addEventListener('close',()=>{pendingType=''});
  $('migrateLocalButton').onclick=migrateLegacy; $('exportBackupButton').onclick=exportBackup; $('importBackupButton').onclick=()=>{if(requireBackupUser())$('backupFileInput').click()}; $('backupFileInput').onchange=readBackupFile; $('confirmBackupRestoreButton').onclick=restorePendingBackup; $('backupConfirmDialog').addEventListener('close',()=>{pendingBackup=null});
}
function clearRealtimeListeners(){if(unsubscribeNotes){unsubscribeNotes();unsubscribeNotes=null}if(unsubscribeSettings){unsubscribeSettings();unsubscribeSettings=null}}
async function handleAuth(user){clearRealtimeListeners();if(currentUser?.uid!==user?.uid){if(pendingCardDelete){pendingCardDelete=null;$('confirmDialog').close()}foodPresetManager.reset();foodPresets=defaultFoodPresets();foodPresetsReady=false;$('foodManagePresetsButton').disabled=true}settingsCreatingForUid='';currentUser=user;if(!user){notes=[];categories=[];$('loginButton').hidden=false;$('logoutButton').hidden=true;setStatus(configured()?'ログインすると同期できます':'Firebase設定が未設定です');renderAll();return}const activeUid=user.uid;$('loginButton').hidden=true;$('logoutButton').hidden=false;setStatus('同期中…');const activeSettings=doc(db,'users',activeUid,'iroiroSettings','main');const activeNotes=collection(db,'users',activeUid,'iroiroNotes');unsubscribeSettings=onSnapshot(activeSettings,snap=>{if(currentUser?.uid!==activeUid)return;applyRemoteFoodPresets(snap.exists()?snap.data():{});if(snap.exists()&&Array.isArray(snap.data().categories)){applyRemoteCategories(snap.data().categories);return}if(settingsCreatingForUid!==activeUid){settingsCreatingForUid=activeUid;setDoc(activeSettings,{categories:structuredClone(DEFAULT_CATEGORIES),schemaVersion:SCHEMA_VERSION,updatedAt:serverTimestamp()},{merge:true}).catch(e=>setStatus(`カテゴリー初期化失敗: ${e.message}`)).finally(()=>{if(settingsCreatingForUid===activeUid)settingsCreatingForUid=''})}},err=>setStatus(`カテゴリー同期失敗: ${err.message}`));unsubscribeNotes=onSnapshot(query(activeNotes,orderBy('updatedAt','desc')),snap=>{if(currentUser?.uid!==activeUid)return;notes=snap.docs.map(x=>normalizeNote(x.id,x.data()));setStatus('同期済み');renderAll()},err=>setStatus(`同期失敗: ${err.message}`));try{await checkLegacy()}catch(e){setStatus(`移行状態の確認失敗: ${e.message}`)}}
function applyRemoteCategories(nextCategories){let migrated=false;const prepared=nextCategories.map(category=>{const legacy=LEGACY_DEFAULT_CATEGORY_COLORS[category.id],standard=STANDARD_CATEGORY_COLOR_MIGRATIONS[category.id],savedColor=String(category.color||'').toLowerCase();if(legacy&&(savedColor===legacy[0]||standard&&savedColor===standard[0])){migrated=true;return{...category,color:standard?.[1]||legacy[1]}}return category});categories=orderedCategories(prepared);notes.forEach(note=>note.urls=extractUrls(note));renderAll();refreshEditorCategoryOptions();if(migrated)saveCategories(categories)}
function refreshEditorCategoryOptions(){if(!editingNote||!$('editorDialog').open)return;const select=$('noteCategorySelect');const current=editingNote.categoryId;select.innerHTML=`<option value="">未分類</option>${categories.map(c=>`<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('')}`;if(current===''||categories.some(c=>c.id===current)){select.value=current;updateEditorMode();return}editingNote.categoryId='';select.value='';updateEditorMode();scheduleSave()}
function openEditor(note){foodPresetManager.reset();foodEditor.reset();editingNote=structuredClone(note);ensureFormatStores(editingNote);editorBaseData=editorNoteData(note);editorSession=uid();editRevision=0;savedRevision=0;requestedRevision=0;saveInProgress=false;savePromise=Promise.resolve(true);updateEditor();$('editorDialog').showModal();resizeChecklistInputs();setTimeout(()=>{if(!editingNote)return;if(isFoodNote(editingNote))($('foodItemForm').hidden?$('foodAddItemButton'):$('foodItemNameInput')).focus({preventScroll:true});else $('noteTitleInput').focus()},40)}
function syncEditingNoteFromForm(readSpecialFields=true){
  if(!editingNote)return;
  const note=editingNote;
  note.title=$('noteTitleInput').value;note.content=$('noteContentInput').value;note.categoryId=$('noteCategorySelect').value;
  if(isTaskNote(note)){
    ensureTask(note);
    if(readSpecialFields)note.task=normalizeTask({...note.task,dueDate:$('taskDueDateInput').value,status:$('taskStatusSelect').value,priority:$('taskPrioritySelect').value});
    if(note.title.trim())$('taskTitleError').hidden=true;
  }
  if(isMangaNote(note)){ensureManga(note);if(readSpecialFields)mangaEditor.sync();if(note.title.trim())$('mangaTitleError').hidden=true}
  if(isFoodNote(note))ensureFoodList(note)
  rememberCurrentFormat(note);note.urls=extractUrls(note);
}
function updateFixedCardBadge(){$('fixedNoteBadge').hidden=!isFixedCard(editingNote);$('fixedNoteBadge').innerHTML=`${FIXED_CARD_ICON} 上部固定`}
function updateEditor(){
  updateFixedCardBadge();
  const n=editingNote;
  $('noteTitleInput').value=n.title;$('noteContentInput').value=n.content;
  $('noteCategorySelect').innerHTML=`<option value="">未分類</option>${categories.map(c=>`<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('')}`;
  $('noteCategorySelect').value=n.categoryId;
  document.querySelectorAll('#typeSwitcher button').forEach(b=>b.classList.toggle('active',b.dataset.type===n.type));
  $('pinButton').classList.toggle('active',n.isPinned);$('pinButton').textContent=`${n.isPinned?'★':'♧'} ピン留め`;
  $('createdAt').textContent=formatDate(n.createdAt);$('updatedAt').textContent=formatDate(n.updatedAt);
  renderItems();updateEditorMode();resizeChecklistInputs();renderLinks();$('saveStatus').textContent=saveInProgress||editRevision>savedRevision?'保存中…':isFoodNote(n)&&n.inventoryDraft&&!ensureFoodList(n).items.length&&!n.isPinned?'未保存（空の食材カード）':n.id?'保存済み':'未保存';
}
function refreshRelatedLinks(){if(!editingNote)return;rememberCurrentFormat(editingNote);editingNote.urls=extractUrls(editingNote);renderLinks()}
function renderItems(){cancelItemDrag();trackComposition($('itemsList'));$('itemsList').innerHTML=editingNote.items.map((item,index)=>`<div class="item-row draggable-item-row ${item.checked?'checked':''}" data-item-id="${escapeHtml(item.id)}"><input type="${editingNote.type==='checklist'?'checkbox':'button'}" ${editingNote.type==='checklist'&&item.checked?'checked':''} ${editingNote.type==='bullet'?'value="•" tabindex="-1"':''} data-check="${index}"/><textarea class="checklist-text" rows="1" placeholder="項目を入力" aria-label="項目${index+1}" data-item="${index}">${escapeHtml(item.text)}</textarea><button type="button" class="remove-item" data-remove="${index}" aria-label="項目を削除">×</button></div>`).join('');document.querySelectorAll('[data-item]').forEach(el=>{resizeChecklistInput(el);el.oninput=e=>{resizeChecklistInput(e.target);editingNote.items[e.target.dataset.item].text=e.target.value;refreshRelatedLinks();scheduleSave()};el.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!isImeConfirm(e)){e.preventDefault();const at=+e.target.dataset.item+1;editingNote.items.splice(at,0,{id:uid(),text:'',checked:false,order:at});editingNote.items.forEach((x,i)=>x.order=i);renderItems();refreshRelatedLinks();scheduleSave();document.querySelector(`[data-item="${at}"]`)?.focus()}}});document.querySelectorAll('[data-check]').forEach(el=>el.onchange=e=>{if(editingNote.type==='checklist'){editingNote.items[e.target.dataset.check].checked=e.target.checked;renderItems();refreshRelatedLinks();scheduleSave()}});document.querySelectorAll('[data-remove]').forEach(el=>el.onclick=e=>{editingNote.items.splice(+e.currentTarget.dataset.remove,1);editingNote.items.forEach((x,i)=>x.order=i);renderItems();refreshRelatedLinks();scheduleSave()});document.querySelectorAll('.draggable-item-row').forEach(bindItemDrag)}
function itemDragAllowedTarget(target,touch=false){if(target.closest('input[type="checkbox"],.remove-item'))return false;return touch||!target.closest('input,textarea,button')}
function bindItemDrag(row){row.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse'||itemDragState||!itemDragAllowedTarget(event.target))return;const state={row,kind:'pointer',pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,started:false,timer:null};itemDragState=state;startItemDrag(state)});row.addEventListener('pointermove',event=>{const state=itemDragState;if(!state||state.kind!=='pointer'||state.pointerId!==event.pointerId||!state.started)return;event.preventDefault();event.stopPropagation();autoScrollItemEditor(event.clientY);updateItemDragTarget(event.clientX,event.clientY,state)});row.addEventListener('pointerup',event=>{const state=itemDragState;if(state?.kind==='pointer'&&state.pointerId===event.pointerId)finishItemDrag()});row.addEventListener('pointercancel',event=>{if(itemDragState?.kind==='pointer'&&itemDragState.pointerId===event.pointerId)cancelItemDrag()});row.addEventListener('touchstart',event=>{if(itemDragState||!itemDragAllowedTarget(event.target,true))return;const touch=event.changedTouches[0];if(!touch)return;const state={row,kind:'touch',touchId:touch.identifier,startX:touch.clientX,startY:touch.clientY,started:false,timer:null,scrollTop:document.querySelector('.editor-content')?.scrollTop||0};itemDragState=state;state.timer=setTimeout(()=>startItemDrag(state),450);document.addEventListener('touchmove',handleItemTouchMove,{passive:false});document.addEventListener('touchend',finishItemTouch,{passive:false});document.addEventListener('touchcancel',cancelItemTouch,{passive:false})},{passive:true})}
function startItemDrag(state){if(itemDragState!==state)return;state.started=true;document.activeElement?.blur();state.row.classList.add('dragging');document.body.classList.add('item-drag-active');if(state.kind==='pointer')state.row.setPointerCapture?.(state.pointerId);navigator.vibrate?.(12)}
function autoScrollItemEditor(y){const scroller=document.querySelector('.editor-content');if(!scroller)return;const rect=scroller.getBoundingClientRect(),edge=48;if(y<rect.top+edge)scroller.scrollTop-=14;else if(y>rect.bottom-edge)scroller.scrollTop+=14}
function updateItemDragTarget(x,y,state){document.querySelectorAll('.draggable-item-row').forEach(row=>row.classList.remove('drop-before','drop-after'));const target=document.elementFromPoint(x,y)?.closest('.draggable-item-row');if(!target||target===state.row)return;const before=y<target.getBoundingClientRect().top+target.getBoundingClientRect().height/2;target.classList.add(before?'drop-before':'drop-after');state.targetId=target.dataset.itemId;state.before=before}
function handleItemTouchMove(event){const state=itemDragState;if(!state||state.kind!=='touch')return;const touch=[...event.touches].find(item=>item.identifier===state.touchId);if(!touch)return;if(!state.started){if(Math.hypot(touch.clientX-state.startX,touch.clientY-state.startY)>10)cancelItemDrag();return}event.preventDefault();event.stopPropagation();autoScrollItemEditor(touch.clientY);updateItemDragTarget(touch.clientX,touch.clientY,state)}
function finishItemTouch(event){const state=itemDragState;if(!state||state.kind!=='touch'||![...event.changedTouches].some(touch=>touch.identifier===state.touchId))return;if(state.started){event.preventDefault();event.stopPropagation()}finishItemDrag()}
function cancelItemTouch(event){const state=itemDragState;if(!state||state.kind!=='touch')return;if(state.started){event.preventDefault();event.stopPropagation()}cancelItemDrag()}
function finishItemDrag(){const state=itemDragState;if(!state)return;const sourceId=state.row.dataset.itemId,targetId=state.targetId,before=state.before,started=state.started;cancelItemDrag();if(!started||!targetId||targetId===sourceId||!editingNote)return;const sourceIndex=editingNote.items.findIndex(item=>item.id===sourceId),targetIndex=editingNote.items.findIndex(item=>item.id===targetId);if(sourceIndex>=0&&targetIndex>=0)moveDraggedItem(sourceIndex,targetIndex,before)}
function cancelItemDrag(){const state=itemDragState;if(!state)return;clearTimeout(state.timer);if(state.kind==='touch'){document.removeEventListener('touchmove',handleItemTouchMove);document.removeEventListener('touchend',finishItemTouch);document.removeEventListener('touchcancel',cancelItemTouch)}state.row.classList.remove('dragging');document.querySelectorAll('.draggable-item-row').forEach(row=>row.classList.remove('drop-before','drop-after'));document.body.classList.remove('item-drag-active');itemDragState=null}
function moveDraggedItem(sourceIndex,targetIndex,before){if(!editingNote||sourceIndex===targetIndex)return;const [source]=editingNote.items.splice(sourceIndex,1);let insertAt=targetIndex;if(sourceIndex<targetIndex)insertAt--;if(!before)insertAt++;editingNote.items.splice(insertAt,0,source);editingNote.items.forEach((item,index)=>item.order=index);refreshRelatedLinks();renderItems();scheduleSave()}
function trimUrlEnding(value){return value.replace(/[。、，．！？）】」』〉》;:,.]+$/u,'')}
function extractUrls(note){const text=note.foodList?[note.content,foodListSearchText(note.foodList)].join('\n'):isMangaNote(note)?[note.content,mangaSearchText(mangaForNote(note))].join('\n'):isTaskNote(note)?[note.content,...taskForNote(note).items.map(item=>item.text)].join('\n'):note.type==='text'?note.content:note.items.map(i=>i.text).join('\n');const found=text.match(/https?:\/\/[^\s<>"']+/g)||[];const links=[];for(const raw of found){const url=trimUrlEnding(raw);try{const parsed=new URL(url);if((parsed.protocol==='http:'||parsed.protocol==='https:')&&!links.some(link=>link.url===parsed.href))links.push({url:parsed.href,title:'',domain:parsed.hostname.replace(/^www\./,'')})}catch{}}return links}
function hasStoredTypeContent(note,type){ensureFormatStores(note);return type==='text'?Boolean(note.contentByType.text.trim()):note.itemsByType[type].some(item=>String(item.text||'').trim())}
function itemsFromText(content,checked=false){return String(content||'').split(/\r?\n/).map(text=>text.trim()).filter(Boolean).map((text,order)=>({id:uid(),text,checked,order}))}
function convertCurrentContent(note,targetType){if(targetType==='text'){if(note.type==='text')return String(note.content||'');return note.items.map(item=>note.type==='checklist'?`${item.checked?'☑':'☐'} ${item.text}`:item.text).filter(text=>text.trim()).join('\n')}if(note.type==='text')return itemsFromText(note.content);return note.items.filter(item=>String(item.text||'').trim()).map((item,order)=>({id:uid(),text:String(item.text||''),checked:false,order}))}
function showStoredTypeContent(note,type){ensureFormatStores(note);note.type=type;if(type==='text')note.content=note.contentByType.text||'';else note.items=copyItems(note.itemsByType[type])}
function requestTypeChange(type){if(!editingNote||deletingNote||isTaskNote(editingNote)||isMangaNote(editingNote)||isFoodNote(editingNote)||type===editingNote.type)return;syncEditingNoteFromForm();if(hasStoredTypeContent(editingNote,type)){pendingType=type;$('typeConfirmDialog').showModal();return}applyTypeChange(type,'replace')}
function applyTypeChange(type,mode='replace'){if(!type||!editingNote)return;syncEditingNoteFromForm();if(mode==='previous')showStoredTypeContent(editingNote,type);else{const converted=convertCurrentContent(editingNote,type);editingNote.type=type;if(type==='text'){editingNote.content=converted;editingNote.contentByType.text=converted}else{editingNote.items=converted;editingNote.itemsByType[type]=copyItems(converted)}}editingNote.urls=extractUrls(editingNote);pendingType='';updateEditor();scheduleSave()}
function scheduleSave(){if(deletingNote||!editingNote)return;editRevision++;$('saveStatus').textContent='保存中…';clearTimeout(saveTimer);saveTimer=setTimeout(()=>requestSave(),550)}
function noteData(note){rememberCurrentFormat(note);return{title:note.title,type:note.type,content:note.content,items:note.items,contentByType:note.contentByType,itemsByType:note.itemsByType,categoryId:note.categoryId,task:note.task?normalizeTask(note.task):null,manga:note.manga?normalizeManga(note.manga):null,food:note.food?normalizeFood(note.food):null,foodList:note.foodList?normalizeFoodList(note.foodList):null,urls:extractUrls(note),isPinned:note.isPinned,schemaVersion:SCHEMA_VERSION}}
function editorNoteData(note){const copy=structuredClone(note);if(isTaskNote(copy))ensureTask(copy);if(isFoodNote(copy))ensureFoodList(copy);return noteData(copy)}
function captureSaveSnapshot(){syncEditingNoteFromForm();return{note:structuredClone(editingNote),base:structuredClone(editorBaseData),uid:currentUser?.uid,session:editorSession,revision:editRevision}}
function requestSave(){requestedRevision=Math.max(requestedRevision,editRevision);if(saveInProgress)return savePromise;if(requestedRevision<=savedRevision)return Promise.resolve(true);savePromise=drainSaveQueue();return savePromise}
async function drainSaveQueue(){saveInProgress=true;try{while(savedRevision<requestedRevision){const revision=requestedRevision;const snapshot=captureSaveSnapshot();const result=await persistSnapshot(snapshot);if(!result.ok)return false;savedRevision=revision}return true}finally{saveInProgress=false}}
async function persistSnapshot(snapshot){
  if(!currentUser||currentUser.uid!==snapshot.uid||!snapshot.note)return{ok:false};
  if(!noteTitleValid(snapshot.note))return{ok:false};
  const isNew=!snapshot.note.id;
  if(isNew&&!hasMeaningfulContent(snapshot.note)){$('saveStatus').textContent='未保存（空のメモ）';return{ok:true,skipped:true}}
  $('saveStatus').textContent='保存中…';
  try{
    let savedData=noteData(snapshot.note);
    if(isFoodNote(snapshot.note)&&snapshot.note.id===foodInventoryId(snapshot.note.categoryId)){
      const target=doc(db,'users',snapshot.uid,'iroiroNotes',snapshot.note.id);
      savedData=await runTransaction(db,async transaction=>{
        const latest=await transaction.get(target);
        requireActiveUser(snapshot.uid);
        if(!latest.exists()&&!snapshot.note.inventoryDraft)throw new Error('別の端末で食材カードが削除されました。入力を保持しています。');
        const importSources=[];
        for(const source of snapshot.note.inventoryImportSources||[]){
          const current=await transaction.get(doc(db,'users',snapshot.uid,'iroiroNotes',source.id));
          if(!current.exists()||JSON.stringify(noteData(normalizeNote(source.id,current.data())))!==JSON.stringify(source.data))throw new Error('以前の食材が別の端末で変更されました。入力を保持しています。一覧を開き直して確認してください。');
          importSources.push(normalizeNote(source.id,current.data()));
        }
        requireActiveUser(snapshot.uid);
        const remote=latest.exists()?editorNoteData(normalizeNote(snapshot.note.id,latest.data())):structuredClone(snapshot.base);
        if(latest.exists()&&importSources.length)remote.foodList=foodInventoryFromSources(snapshot.note.categoryId,[{...remote,id:snapshot.note.id},...importSources]).foodList;
        const merged=mergeNoteData(snapshot.base,noteData(snapshot.note),remote);merged.urls=extractUrls(merged);
        if(latest.exists())transaction.update(target,{...merged,updatedAt:serverTimestamp()});
        else transaction.set(target,{...merged,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
        return merged;
      });
      if(editingNote&&editorSession===snapshot.session){
        editingNote.inventoryDraft=false;editingNote.inventoryImportSources=[];
        editingNote.inventoryDeleteSources=[...(editingNote.inventoryDeleteSources||[]).filter(source=>source.id!==snapshot.note.id),{id:snapshot.note.id,data:structuredClone(savedData)}];
      }
    }else if(isNew){
      const created=await addDoc(refs().notes,{...noteData(snapshot.note),createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
      if(editingNote&&editorSession===snapshot.session&&!editingNote.id)editingNote.id=created.id;
    }else {
      const target=doc(db,'users',snapshot.uid,'iroiroNotes',snapshot.note.id);
      savedData=await runTransaction(db,async transaction=>{
        const latest=await transaction.get(target);
        requireActiveUser(snapshot.uid);
        if(!latest.exists())throw new Error('別の端末で削除されたメモです。入力は保持しています。');
        const remote=editorNoteData(normalizeNote(snapshot.note.id,latest.data()));
        const merged=mergeNoteData(snapshot.base,noteData(snapshot.note),remote);
        merged.urls=extractUrls(merged);
        transaction.update(target,{...merged,updatedAt:serverTimestamp()});
        return merged;
      });
    }
    requireActiveUser(snapshot.uid);
    if(editingNote&&editorSession===snapshot.session){
      // Rebase any typing that happened while this transaction was in flight.
      syncEditingNoteFromForm();
      const current=noteData(structuredClone(editingNote));
      try {
        const rebased=mergeNoteData(noteData(snapshot.note),current,savedData);
        const changed=Object.keys(rebased).some(key=>JSON.stringify(rebased[key])!==JSON.stringify(current[key]));
        const focused=document.activeElement,fieldId=focused?.id;
        const taskItemId=focused?.dataset?.taskItem!==undefined?current.task?.items[Number(focused.dataset.taskItem)]?.id:null;
        const itemId=focused?.dataset?.item!==undefined?current.items[Number(focused.dataset.item)]?.id:null;
        const selection=[focused?.selectionStart,focused?.selectionEnd];
        editingNote={...editingNote,...rebased};
        editorBaseData=structuredClone(savedData);
        if(changed){
          updateEditor();
          const input=taskItemId?$('taskItemsList').querySelector(`[data-task-item="${editingNote.task.items.findIndex(item=>item.id===taskItemId)}"]`)
            :itemId?$('itemsList').querySelector(`[data-item="${editingNote.items.findIndex(item=>item.id===itemId)}"]`):fieldId?$(fieldId):null;
          input?.focus();
          if(selection.every(Number.isInteger)&&input&&['text','textarea','search','url','tel','password',undefined].includes(input.type))input.setSelectionRange?.(...selection);
        }
      } catch(error) {
        // The remote save succeeded, but newer local typing conflicts: keep it.
        editorBaseData=structuredClone(noteData(snapshot.note));
        throw error;
      }
      $('saveStatus').textContent=editRevision>snapshot.revision?'保存中…':'保存済み';
      editingNote.urls=extractUrls(editingNote);
      renderLinks();
    }
    return{ok:true};
  }catch(e){$('saveStatus').textContent=e.code==='edit-conflict'?e.message:'保存できませんでした';setStatus(`保存失敗: ${e.message}`);return{ok:false,error:e}}
}
async function closeEditor(){
  if(closingEditor||deletingNote||!editingNote)return;
  if(!foodPresetManager.canClose()||!foodEditor.canClose())return;
  syncEditingNoteFromForm();if(!noteTitleValid(editingNote))return;
  closingEditor=true;
  try{
    // 保存を待つ間の入力も含め、最新の変更まで保存してから閉じる。
    do{
      clearTimeout(saveTimer);saveTimer=null;
      if(!await requestSave()){
        $('saveStatus').textContent='保存できませんでした。内容を確認してもう一度お試しください。';
        return;
      }
    }while(savedRevision<editRevision||saveInProgress);
    clearTimeout(saveTimer);saveTimer=null;
    $('editorDialog').close();editingNote=null;editorSession='';
  }catch(e){$('saveStatus').textContent='保存できませんでした。内容を確認してもう一度お試しください。';setStatus(`保存失敗: ${e.message}`)}
  finally{closingEditor=false}
}
function renderAll(){renderCategories();renderNotes()}
function renderCategories(){const list=[{id:'all',name:'すべて',color:'#FFFFFF'},...categories,{id:'',name:'未分類',color:'#6B7280'}];const nav=c=>`<button class="category-nav-item ${selectedCategory===c.id?'active':''}" data-category="${escapeHtml(c.id)}"><span class="category-dot" style="background:${categoryColor(c.color)}"></span>${escapeHtml(c.name)}</button>`;$('sidebarCategories').innerHTML=list.map(nav).join('');$('categoryTabs').innerHTML=list.map(c=>`<button class="category-tab ${selectedCategory===c.id?'active':''}" data-category="${escapeHtml(c.id)}" ${categoryStyle(c.color)}>${escapeHtml(c.name)}</button>`).join('');document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{selectCategory(b.dataset.category)})}
function cardPreviewHtml(note){if(note.type==='text')return`<p class="card-preview">${escapeHtml(note.content||'内容を入力…')}</p>`;const items=note.items.filter(item=>String(item.text||'').trim());if(!items.length)return'<p class="card-preview">内容を入力…</p>';const visible=items.slice(0,3),hasMore=items.length>3;return`<div class="card-preview card-list-preview">${visible.map((item,index)=>{const marker=note.type==='checklist'?(item.checked?'☑':'□'):'•',suffix=hasMore&&index===visible.length-1?'…':'';return`<div class="card-list-item ${note.type==='checklist'&&item.checked?'completed':''}">${marker} ${escapeHtml(String(item.text).trim())}${suffix}</div>`}).join('')}</div>`}
function taskDueLabel(task){
  if(!task.dueDate)return'期限なし';
  const today=localDateKey();
  if(task.dueDate===today)return task.status==='done'?'期限：今日':'今日が期限';
  const [year,month,day]=task.dueDate.split('-').map(Number),date=new Date(0);
  date.setFullYear(year,month-1,day);date.setHours(0,0,0,0);
  const formatted=new Intl.DateTimeFormat('ja-JP',{year:year!==new Date().getFullYear()?'numeric':undefined,month:'numeric',day:'numeric'}).format(date);
  return`${taskIsOverdue(task,today)?'期限切れ：':'期限：'}${formatted}`;
}
function cardPinButton(note){
  const action=note.isPinned?'ピン留めを解除':'ピン留めする',busy=pendingPinWrites.has(`${currentUser?.uid}:${note.id}`);
  const label=`${displayTitle(note)}${note.isPinned?'のピン留めを解除':'をピン留め'}`;
  return`<button type="button" class="card-pin ${note.isPinned?'is-pinned':''}" data-pin-note="${escapeHtml(note.id)}" aria-label="${escapeHtml(label)}" aria-pressed="${Boolean(note.isPinned)}" title="${action}" ${busy?'disabled':''}>${note.isPinned?'★':'☆'}</button>`;
}
function cardDeleteButton(note){
  const food=isFoodNote(note),key=`${currentUser?.uid}:${note.id}`,busy=cardDeleteInProgress||pendingPinWrites.has(key)||pendingTaskWrites.has(key);
  const label=food?'食材カード全体を削除':`${displayTitle(note)}のカードを削除`;
  return`<button type="button" class="card-delete" data-delete-card="${escapeHtml(note.id)}" ${food?`data-delete-food-category="${escapeHtml(note.categoryId)}"`:''} aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" ${busy?'disabled':''}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button>`;
}
function confirmCardDelete(id,foodCategoryId=''){
  if(!currentUser||cardDeleteInProgress||deletingNote||$('editorDialog').open||$('confirmDialog').open)return false;
  if(foodCategoryId&&(!isFoodCategory(foodCategoryId)||foodInventoryId(foodCategoryId)!==id))return false;
  const key=`${currentUser.uid}:${id}`;
  if(pendingPinWrites.has(key)||pendingTaskWrites.has(key))return false;
  const note=foodCategoryId&&isFoodCategory(foodCategoryId)&&foodInventoryId(foodCategoryId)===id?getFoodInventory(foodCategoryId):notes.find(item=>item.id===id);
  if(!note)return false;
  pendingCardDelete={uid:currentUser.uid,note:structuredClone(note),food:Boolean(foodCategoryId)};
  $('deleteConfirmTitle').textContent=foodCategoryId?'この食材カードを削除しますか？':`「${displayTitle(note)}」を削除しますか？`;
  $('deleteConfirmMessage').textContent=foodCategoryId?'カード内の食材をすべて削除します。削除した内容は元に戻せません。カテゴリー「食材」と「いつもの食材」の設定は残ります。':'このカードと内容を削除します。削除したメモは元に戻せません。';
  $('deleteConfirmError').textContent='';$('deleteConfirmError').hidden=true;$('confirmDialog').showModal();return true;
}
async function deleteCardNote(){
  if(cardDeleteInProgress||!pendingCardDelete)return false;
  const request=pendingCardDelete,{uid:activeUid,note,food}=request,key=`${activeUid}:${note.id}`;
  cardDeleteInProgress=true;$('confirmDeleteButton').disabled=true;$('cancelDeleteButton').disabled=true;renderNotes();
  try{
    requireActiveUser(activeUid);
    if(pendingPinWrites.has(key)||pendingTaskWrites.has(key))throw new Error('このカードを保存中です。保存後にもう一度確認してください。');
    let deletedIds;
    if(food)deletedIds=await deleteFoodInventory(activeUid,note);
    else{
      const target=doc(db,'users',activeUid,'iroiroNotes',note.id),expected=noteData(note);
      await runTransaction(db,async transaction=>{
        const latest=await transaction.get(target);requireActiveUser(activeUid);
        if(latest.exists()&&!sameNoteContent(noteData(normalizeNote(note.id,latest.data())),expected))throw new Error('このカードは別の端末で変更されました。キャンセルして最新の内容を確認してください。');
        if(latest.exists())transaction.delete(target);
      });
      deletedIds=new Set([note.id]);
    }
    requireActiveUser(activeUid);
    notes=notes.filter(item=>!deletedIds.has(item.id));renderAll();
    if(pendingCardDelete===request){$('confirmDialog').close();pendingCardDelete=null}
    return true;
  }catch(error){
    if(currentUser?.uid===activeUid&&pendingCardDelete===request){$('deleteConfirmError').textContent=`削除できませんでした: ${error.message}`;$('deleteConfirmError').hidden=false;setStatus(`削除失敗: ${error.message}`)}
    return false;
  }finally{cardDeleteInProgress=false;$('confirmDeleteButton').disabled=false;$('cancelDeleteButton').disabled=false;if(currentUser)renderNotes()}
}
async function openCardNote(id){
  const activeUid=currentUser?.uid;
  const pending=pendingPinWrites.get(`${activeUid}:${id}`);
  if(pending)await pending.promise;
  if(currentUser?.uid!==activeUid)return;
  const note=notes.find(item=>item.id===id);if(note)openEditor(note);
}
function toggleNotePin(id){
  const foodCategory=categories.find(category=>isFoodCategory(category.id)&&foodInventoryId(category.id)===id);
  if(foodCategory)return toggleFoodInventoryPin(foodCategory.id);
  const note=notes.find(item=>item.id===id);
  if(!currentUser||!note)return Promise.resolve(false);
  const activeUid=currentUser.uid,key=`${activeUid}:${id}`;
  if(pendingPinWrites.has(key))return Promise.resolve(false);
  const previous=note.isPinned,next=!previous,target=doc(refs().notes,id),operation={promise:null};
  pendingPinWrites.set(key,operation);note.isPinned=next;renderAll();
  operation.promise=(async()=>{
    try{
      // 本文や更新日を上書きせず、ピン留めの状態だけを保存する。
      await updateDoc(target,{isPinned:next});
      if(currentUser?.uid===activeUid){const current=notes.find(item=>item.id===id);if(current)current.isPinned=next}
      return true;
    }catch(error){
      if(currentUser?.uid===activeUid){
        const current=notes.find(item=>item.id===id);if(current?.isPinned===next)current.isPinned=previous;
        setStatus(`ピン留めの状態を保存できませんでした: ${error.message}`);
      }
      return false;
    }finally{pendingPinWrites.delete(key);if(currentUser?.uid===activeUid)renderAll()}
  })();
  return operation.promise;
}
function toggleFoodInventoryPin(categoryId){
  if(!currentUser)return Promise.resolve(false);
  const activeUid=currentUser.uid,id=foodInventoryId(categoryId),key=`${activeUid}:${id}`;
  if(pendingPinWrites.has(key))return Promise.resolve(false);
  const next=!getFoodInventory(categoryId).isPinned,sources=notes.filter(note=>note.categoryId===categoryId).map(note=>note.id),operation={promise:null,next};
  pendingPinWrites.set(key,operation);renderAll();
  operation.promise=(async()=>{
    try{
      const saved=await runTransaction(db,async transaction=>{
        const target=doc(db,'users',activeUid,'iroiroNotes',id),latest=await transaction.get(target);
        requireActiveUser(activeUid);
        if(latest.exists()){
          if(latest.data().categoryId!==categoryId)throw new Error('食材カードのカテゴリーが変更されました。');
          transaction.update(target,{isPinned:next});return {...latest.data(),isPinned:next};
        }
        // 旧形式だけの一覧も、最新の食材を保持した固定カードにピン留めする。
        const current=await Promise.all(sources.filter(sourceId=>sourceId!==id).map(async sourceId=>({id:sourceId,snapshot:await transaction.get(doc(db,'users',activeUid,'iroiroNotes',sourceId))})));
        requireActiveUser(activeUid);
        const existing=current.filter(source=>source.snapshot.exists()&&source.snapshot.data().categoryId===categoryId).map(source=>normalizeNote(source.id,source.snapshot.data()));
        if(!existing.length)throw new Error('食材カードが削除されました。一覧を確認してください。');
        const projection=foodInventoryFromSources(categoryId,existing),data={...noteData(normalizeNote(id,projection)),isPinned:next,createdAt:Timestamp.fromDate(toDate(projection.createdAt)||new Date()),updatedAt:Timestamp.fromDate(toDate(projection.updatedAt)||new Date())};
        transaction.set(target,data);return data;
      });
      if(currentUser?.uid===activeUid){const current=notes.find(note=>note.id===id);if(current)current.isPinned=next;else notes.push(normalizeNote(id,saved))}
      return true;
    }catch(error){if(currentUser?.uid===activeUid)setStatus(`ピン留めの状態を保存できませんでした: ${error.message}`);return false}
    finally{pendingPinWrites.delete(key);if(currentUser?.uid===activeUid)renderAll()}
  })();
  return operation.promise;
}
function renderTaskCard(note){
  const task=taskForNote(note),category=getCategory(note.categoryId)||{name:'未分類',color:'#6B7280'},title=displayTitle(note),progress=taskProgress(task);
  const description=note.content.trim()||task.items.filter(item=>item.text.trim()).slice(0,3).map(item=>`${item.checked?'☑':'□'} ${item.text}`).join(' / ');
  const busy=pendingTaskWrites.has(`${currentUser?.uid}:${note.id}`);
  return`<article class="note-card task-card ${task.status==='done'?'task-done':''}" data-id="${escapeHtml(note.id)}">${cardDeleteButton(note)}<div class="task-card-main"><label class="task-complete-control"><input type="checkbox" class="task-card-checkbox" data-task-complete="${escapeHtml(note.id)}" aria-label="${escapeHtml(title)}を${task.status==='done'?'未着手に戻す':'完了にする'}" ${task.status==='done'?'checked':''} ${busy?'disabled':''}></label><button type="button" class="task-card-open" data-open-note="${escapeHtml(note.id)}" aria-label="${escapeHtml(title)}の詳細を開く"><span class="task-card-title">${escapeHtml(title)}</span>${description?`<span class="task-card-description">${escapeHtml(description)}</span>`:''}</button></div><div class="task-card-badges"><span class="task-status-badge status-${task.status}">${TASK_STATUS_LABELS[task.status]}</span><span class="task-priority priority-${task.priority}">優先度：${TASK_PRIORITY_LABELS[task.priority]}</span>${fixedCardBadge(note)}</div><footer class="task-card-footer"><span class="category-pill" ${categoryStyle(category.color)}>${escapeHtml(category.name)}</span><span class="task-due ${taskIsOverdue(task)?'overdue':''}" title="${escapeHtml(taskDueLabel(task))}">${escapeHtml(taskDueLabel(task))}</span><div class="card-footer-right">${progress.total?`<span class="task-card-progress">${progress.done}/${progress.total}完了</span>`:''}${cardPinButton(note)}</div></footer></article>`;
}
function renderMangaCard(note){
  const manga=mangaForNote(note),category=getCategory(note.categoryId)||{name:'漫画',color:'#FFD400'};
  const preview=note.content.trim()||manga.pages.flatMap(page=>page.rows).map(row=>[row.actor,row.detail,row.reference].filter(Boolean).join('：')).find(text=>text.trim())||'ページ・コマごとにネタを記録できます。';
  return`<article class="note-card manga-card" data-id="${escapeHtml(note.id)}">${cardDeleteButton(note)}<div class="card-top">${fixedCardBadge(note)||'<span class="type-icon">▦</span>'}<h3 class="card-title"><button type="button" class="card-open" data-open-note="${escapeHtml(note.id)}" aria-label="${escapeHtml(displayTitle(note))}の詳細を開く">${escapeHtml(displayTitle(note))}</button></h3></div><div class="manga-card-summary"><span>${escapeHtml(manga.status)} · ${escapeHtml(manga.genre)}</span><p class="card-preview">${escapeHtml(preview)}</p></div><footer class="card-footer"><div class="card-footer-left"><span class="category-pill" ${categoryStyle(category.color)}>${escapeHtml(category.name)}</span><span>更新 ${shortDate(note.updatedAt)}</span></div><div class="card-footer-right"><span>${manga.pages.length}ページ</span>${cardPinButton(note)}</div></footer></article>`;
}
function renderNoteCard(n){
  if(isTaskNote(n))return renderTaskCard(n);
  if(isMangaNote(n))return renderMangaCard(n);
  if(isFoodNote(n))return renderFoodSummaryCard(n);
  const c=getCategory(n.categoryId)||{name:'未分類',color:'#6B7280'},color=categoryColor(c.color),progress=n.type==='checklist'?`${n.items.filter(i=>i.checked).length}/${n.items.length}完了`:'',linkInfo=n.urls.length?`🔗 ${n.urls.length}件`:'';
  return`<article class="note-card" data-id="${escapeHtml(n.id)}">${cardDeleteButton(n)}<div class="card-top">${fixedCardBadge(n)||`<span class="type-icon">${n.type==='text'?'▤':n.type==='bullet'?'☷':'☑'}</span>`}<h3 class="card-title"><button type="button" class="card-open" data-open-note="${escapeHtml(n.id)}" aria-label="${escapeHtml(displayTitle(n))}の詳細を開く">${escapeHtml(displayTitle(n))}</button></h3></div>${cardPreviewHtml(n)}<footer class="card-footer"><div class="card-footer-left"><span class="category-pill" style="background:${color};color:${categoryTextColor(color)}">${escapeHtml(c.name)}</span><span>更新 ${shortDate(n.updatedAt)}</span>${linkInfo?`<span>${linkInfo}</span>`:''}</div><div class="card-footer-right">${progress?`<span class="card-progress">${progress}</span>`:''}${cardPinButton(n)}</div></footer></article>`;
}
function renderFoodSummaryCard(note){
  const rows=ensureFoodList(note).items,available=rows.filter(item=>!item.checked),category=getCategory(note.categoryId)||{name:'食材',color:'#38A169'};
  const preview=rows.slice(0,3).map((item,index)=>`<div class="card-list-item ${item.checked?'completed':''}">${item.checked?'☑':'□'} ${escapeHtml(item.name)}　${escapeHtml(formatFoodQuantity(item))}${rows.length>3&&index===2?'…':''}</div>`).join('');
  return `<article class="note-card food-summary-card" data-food-category="${escapeHtml(note.categoryId)}">${cardDeleteButton(note)}<div class="card-top">${fixedCardBadge(note)||'<span class="type-icon" aria-hidden="true">☑</span>'}<h3 class="card-title"><button type="button" class="card-open" data-open-food-list="${escapeHtml(note.categoryId)}" aria-label="食材カードを開く">食材</button></h3></div><div class="card-preview card-list-preview">${preview||'＋から食材を追加できます。'}</div><footer class="card-footer"><div class="card-footer-left"><span class="category-pill" ${categoryStyle(category.color)}>${escapeHtml(category.name)}</span><span>${available.length}項目${rows.length!==available.length?`（選択中${rows.length-available.length}項目）`:''}</span></div><div class="card-footer-right">${cardPinButton(note)}</div></footer></article>`;
}
function renderNotes(){
  const term=$('searchInput').value.trim().toLowerCase(),taskView=isTaskCategory(selectedCategory),mangaView=isMangaCategory(selectedCategory),foodView=isFoodCategory(selectedCategory);
  $('notesGrid').classList.remove('food-list');
  $('taskDueSortOption').hidden=!taskView;
  if(!taskView&&$('sortSelect').value==='task-due')$('sortSelect').value='updated-desc';
  const displayNotes=[...notes.filter(note=>!isFoodNote(note)),...categories.filter(category=>isFoodCategory(category.id)&&notes.some(note=>note.categoryId===category.id)).map(category=>getFoodInventory(category.id))];
  const shown=displayNotes.filter(note=>{
    const category=getCategory(note.categoryId)?.name||'未分類',task=isTaskNote(note)?taskForNote(note):null;
    return(selectedCategory==='all'||(selectedCategory===''?!getCategory(note.categoryId):note.categoryId===selectedCategory))&&[note.title,note.content,category,...note.items.map(item=>item.text),...(task?task.items.map(item=>item.text):[]),...(isMangaNote(note)?[mangaSearchText(mangaForNote(note))]:[]),...(isFoodNote(note)?[foodListSearchText(ensureFoodList(note))]:[]),...extractUrls(note).map(link=>link.url)].join(' ').toLowerCase().includes(term);
  });
  const sort=$('sortSelect').value;
  shown.sort((a,b)=>{
    const fixedA=fixedCardRank(a),fixedB=fixedCardRank(b);
    if(fixedA!==fixedB)return fixedA<fixedB?-1:1;
    const done=Number(isTaskNote(a)&&taskForNote(a).status==='done')-Number(isTaskNote(b)&&taskForNote(b).status==='done');
    if(done)return done;
    if(a.isPinned!==b.isPinned)return a.isPinned?-1:1;
    if(sort==='task-due'){const taskOrder=compareTaskDue(taskForNote(a),taskForNote(b));if(taskOrder)return taskOrder}
    if(sort==='title-asc')return displayTitle(a).localeCompare(displayTitle(b),'ja');
    const key=sort.startsWith('created')?'createdAt':'updatedAt';
    return sort.endsWith('asc')?dateMillis(a[key])-dateMillis(b[key]):dateMillis(b[key])-dateMillis(a[key]);
  });
  const complete=taskView?shown.filter(note=>!isFixedCard(note)&&taskForNote(note).status==='done'):[],active=taskView?shown.filter(note=>isFixedCard(note)||taskForNote(note).status!=='done'):shown;
  $('listTitle').textContent=selectedCategory==='all'?'すべてのメモ':selectedCategory===''?'未分類':getCategory(selectedCategory)?.name||'カテゴリー';
  $('completedFoods').hidden=true;$('completedFoodsGrid').innerHTML='';$('foodListHint').hidden=!foodView;$('foodEmptyState').hidden=true;
  $('noteCount').textContent=taskView?`${shown.length}件（未完了${active.length}件）`:`${shown.length}件`;
  $('notesGrid').innerHTML=active.map(renderNoteCard).join('');$('completedTasksGrid').innerHTML=complete.map(renderTaskCard).join('');
  $('completedTasks').hidden=!complete.length;$('completedTasksSummary').textContent=`完了したタスク（${complete.length}件）`;
  $('taskEmptyState').hidden=!taskView||active.length>0||shown.length===0;
  $('emptyState').hidden=shown.length>0;
  $('emptyStateTitle').textContent=term?'検索条件に合うメモがありません':taskView?'まだタスクがありません':mangaView?'まだ漫画ネタがありません':foodView?'家にある食材を登録しましょう':'まだメモがありません';
  $('emptyStateMessage').textContent=term?'検索語やカテゴリーを変更してください。':taskView?'右下の＋から、タスクを追加できます。':mangaView?'右下の＋から、漫画ネタを追加できます。':foodView?'右下の＋から、食材カードを作成できます。':'右下の＋から、思いつきをすぐ残せます。';
  const createLabel=taskView?'新しいタスク':mangaView?'新しい漫画ネタ':foodView?'食材を追加':'新しいメモ';$('createNoteButton').setAttribute('aria-label',foodView?'食材を追加':`${createLabel}を作成`);$('createNoteButton').title=createLabel;
  document.querySelectorAll('.note-card').forEach(card=>card.onclick=e=>{
    // 個別の操作ボタンから詳細画面を開かない。
    if(e.target.closest('.task-complete-control,[data-open-note],[data-pin-note],[data-food-action],[data-open-food-list],[data-delete-card]'))return;
    if(card.dataset.foodCategory)return openFoodInventory(card.dataset.foodCategory);
    return openCardNote(card.dataset.id);
  });
  document.querySelectorAll('[data-open-food-list]').forEach(button=>button.onclick=()=>openFoodInventory(button.dataset.openFoodList));
  document.querySelectorAll('[data-open-note]').forEach(button=>button.onclick=()=>openCardNote(button.dataset.openNote));
  document.querySelectorAll('[data-pin-note]').forEach(button=>button.onclick=e=>{e.stopPropagation();return toggleNotePin(button.dataset.pinNote)});
  document.querySelectorAll('[data-delete-card]').forEach(button=>button.onclick=e=>{e.stopPropagation();return confirmCardDelete(button.dataset.deleteCard,button.dataset.deleteFoodCategory||'')});
  document.querySelectorAll('[data-task-complete]').forEach(input=>input.onchange=()=>toggleTaskComplete(input.dataset.taskComplete,input.checked));
}
async function toggleTaskComplete(id,completed){
  const note=notes.find(item=>item.id===id);
  if(!currentUser||!note||!isTaskNote(note))return false;
  const activeUid=currentUser.uid,key=`${activeUid}:${id}`;
  if(pendingTaskWrites.has(key))return false;
  const hadTask=Boolean(note.task),previous=taskForNote(note),status=completed?'done':'todo',target=doc(refs().notes,id);
  pendingTaskWrites.add(key);note.task={...previous,status};renderAll();
  try{
    await updateDoc(target,{...(hadTask?{'task.status':status}:{task:note.task}),updatedAt:serverTimestamp(),schemaVersion:SCHEMA_VERSION});
    return true;
  }catch(e){
    const current=notes.find(item=>item.id===id);
    if(currentUser?.uid===activeUid&&current?.task?.status===status)current.task={...current.task,status:previous.status};
    setStatus(`タスクの完了状態を保存できませんでした: ${e.message}`);return false;
  }finally{pendingTaskWrites.delete(key);if(currentUser?.uid===activeUid)renderAll()}
}
function renderLinks(){$('relatedLinks').innerHTML=editingNote.urls.length?editingNote.urls.map(link=>`<a class="link-card" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer"><span>🌐</span><div><strong>${escapeHtml(link.title||link.domain||link.url)}</strong><small>${escapeHtml(link.domain||link.url)}</small></div><span>↗</span></a>`).join(''):'<p class="form-error">本文内のURLがここに表示されます。</p>'}
function openCategoryManager(){$('categoryError').textContent='';renderCategoryManagement();$('categoryDialog').showModal()}
function setNetaImportStatus(message){$('netaImportStatus').textContent=message}
async function netakirokuTargetId(sourceId){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(sourceId));
  return`netakiroku-${Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('')}`;
}
function importedNetaData(id,raw,categoryId){
  const note=normalizeNote(id,{title:String(raw.title||'無題のネタ'),type:'text',content:String(raw.memo||''),items:[],categoryId,manga:mangaFromNeta(raw)});
  const timestamp=value=>{const date=toDate(value);return date?(typeof value?.toDate==='function'?value:Timestamp.fromDate(date)):Timestamp.fromDate(new Date())};
  return{...noteData(note),createdAt:timestamp(raw.createdAt),updatedAt:timestamp(raw.updatedAt)};
}
async function prepareNetaImport(){
  if(!currentUser){setNetaImportStatus('ログイン後に利用できます。');return}
  if(netaImportBusy)return;
  const activeUid=currentUser.uid;netaImportBusy=true;pendingNetaImport=null;
  $('prepareNetaImportButton').disabled=true;$('confirmNetaImportButton').hidden=true;
  setNetaImportStatus('ネタキロクの保存済み記録を確認中…');
  try{
    const [source,targets]=await Promise.all([getDocs(collection(db,'users',activeUid,'netakiroku')),getDocs(collection(db,'users',activeUid,'iroiroNotes'))]);
    requireActiveUser(activeUid);
    const existingIds=new Set(targets.docs.map(item=>item.id)),entries=[];let existing=0,pages=0,rows=0;
    for(const item of source.docs){
      const id=await netakirokuTargetId(item.id),manga=mangaFromNeta(item.data());
      entries.push({sourceId:item.id,id});if(existingIds.has(id))existing++;
      pages+=manga.pages.length;rows+=manga.pages.reduce((total,page)=>total+page.rows.length,0);
    }
    requireActiveUser(activeUid);pendingNetaImport={uid:activeUid,entries};
    setNetaImportStatus(`保存済み${entries.length}件（${pages}ページ・${rows}コマ行）。未取り込み${entries.length-existing}件、取り込み済み${existing}件。元の記録と既存メモはそのまま残します。`);
    $('confirmNetaImportButton').textContent=`${entries.length-existing}件を「漫画」に取り込む`;
    $('confirmNetaImportButton').hidden=entries.length===existing;
  }catch(error){pendingNetaImport=null;setNetaImportStatus(`確認できませんでした: ${error.message}`)}
  finally{netaImportBusy=false;$('prepareNetaImportButton').disabled=false}
}
async function importNetaRecords(){
  if(netaImportBusy||!pendingNetaImport||!currentUser)return;
  const plan=pendingNetaImport,activeUid=plan.uid;if(currentUser.uid!==activeUid){pendingNetaImport=null;$('confirmNetaImportButton').hidden=true;setNetaImportStatus('ログイン中のアカウントが変わりました。取り込み内容を再確認してください。');return}
  netaImportBusy=true;$('prepareNetaImportButton').disabled=true;$('confirmNetaImportButton').disabled=true;
  const noteRefs=collection(db,'users',activeUid,'iroiroNotes'),sourceRefs=collection(db,'users',activeUid,'netakiroku'),settingsRef=doc(db,'users',activeUid,'iroiroSettings','main'),newCategoryId=uid();
  let imported=0,skipped=0,verified=0,verificationFailed=0;const errors=[];
  try{
    for(const entry of plan.entries){
      requireActiveUser(activeUid);setNetaImportStatus(`取り込み中… ${imported+skipped}/${plan.entries.length}件`);
      const target=doc(noteRefs,entry.id);
      try{
        const result=await runTransaction(db,async transaction=>{
          const existing=await transaction.get(target);requireActiveUser(activeUid);
          if(existing.exists())return null;
          const [source,settings]=await Promise.all([transaction.get(doc(sourceRefs,entry.sourceId)),transaction.get(settingsRef)]);
          requireActiveUser(activeUid);if(!source.exists())throw new Error('確認後に移行元の記録が削除されています。');
          const list=orderedCategories(Array.isArray(settings.data()?.categories)?settings.data().categories:[]),category=list.find(item=>String(item.name).trim()==='漫画');
          const categoryId=category?.id||newCategoryId,data=importedNetaData(entry.id,source.data(),categoryId);
          if(!category)transaction.set(settingsRef,{categories:[...list,{id:categoryId,name:'漫画',color:'#FFD400',order:list.length}],schemaVersion:SCHEMA_VERSION,updatedAt:serverTimestamp()},{merge:true});
          transaction.set(target,data);return data;
        });
        requireActiveUser(activeUid);
        if(!result){skipped++;continue}
        imported++;
        const saved=await getDoc(target);requireActiveUser(activeUid);const actual=saved.data();
        if(saved.exists()&&actual.title===result.title&&actual.content===result.content&&actual.categoryId===result.categoryId&&JSON.stringify(normalizeManga(actual.manga))===JSON.stringify(normalizeManga(result.manga))&&dateMillis(actual.createdAt)===dateMillis(result.createdAt)&&dateMillis(actual.updatedAt)===dateMillis(result.updatedAt))verified++;
        else{verificationFailed++;errors.push('保存後の内容照合が一致しませんでした。')}
      }catch(error){errors.push(error.message)}
    }
    const settings=await getDoc(settingsRef);requireActiveUser(activeUid);
    if(settings.exists()&&Array.isArray(settings.data().categories)){categories=orderedCategories(settings.data().categories);renderAll();renderCategoryManagement()}
    setNetaImportStatus(`${imported}件を取り込み、${verified}件の内容を照合しました。取り込み済み${skipped}件、失敗${errors.length}件。${errors.length?` ${errors.join(' / ')} 再確認して再試行できます。`:' 元のネタキロクの記録は残っています。'}`);
    $('confirmNetaImportButton').hidden=true;pendingNetaImport=null;
    return{imported,skipped,verified,failed:errors.length,verificationFailed};
  }catch(error){setNetaImportStatus(`取り込みを中断しました（新規${imported}件、照合${verified}件）: ${error.message} 再確認して再試行できます。`);return{imported,skipped,verified,failed:errors.length+1,verificationFailed}}
  finally{netaImportBusy=false;$('prepareNetaImportButton').disabled=false;$('confirmNetaImportButton').disabled=false}
}
function bindNewCategoryColorPalette(){const color=$('newCategoryColor'),palette=$('newCategoryColorPalette'),render=()=>{palette.innerHTML=colorChoices(color.value);palette.querySelectorAll('[data-color-choice]').forEach(button=>button.onclick=()=>{color.value=button.dataset.colorChoice;render()})};color.oninput=render;render()}
function renderCategoryManagement(){$('categoryManagementList').innerHTML=categories.map(c=>`<div class="manage-category-row draggable-category-row" data-id="${escapeHtml(c.id)}"><input type="color" value="${categoryColor(c.color)}"/><input type="text" value="${escapeHtml(c.name)}"/><span class="drag-handle" aria-hidden="true">≡</span><button type="button" data-delete aria-label="${escapeHtml(c.name)}を削除">削除</button><div class="category-color-palette" aria-label="${escapeHtml(c.name)}の色候補">${colorChoices(c.color)}</div></div>`).join('');document.querySelectorAll('.manage-category-row').forEach(row=>{const category=getCategory(row.dataset.id),color=row.querySelector('input[type=color]'),name=row.querySelector('input[type=text]'),del=row.querySelector('[data-delete]'),setColor=value=>{category.color=categoryColor(value);color.value=category.color;saveCategories().then(ok=>ok&&renderCategoryManagement())};color.oninput=()=>setColor(color.value);row.querySelectorAll('[data-color-choice]').forEach(button=>button.onclick=()=>setColor(button.dataset.colorChoice));name.onchange=()=>renameCategory(category,name.value);del.onclick=()=>confirmCategoryDelete(category);bindCategoryDrag(row)});bindNewCategoryColorPalette()}
function categoryDragAllowedTarget(target){return!target.closest('input[type="color"],button')}
function bindCategoryDrag(row){row.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse'||categoryDragState||!categoryDragAllowedTarget(event.target))return;const state={row,kind:'pointer',pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,started:false,timer:null};categoryDragState=state;startCategoryDrag(state)});row.addEventListener('pointermove',event=>{const state=categoryDragState;if(!state||state.kind!=='pointer'||state.pointerId!==event.pointerId||!state.started)return;event.preventDefault();event.stopPropagation();restoreCategoryDragScroll(state);updateCategoryDragTarget(event.clientX,event.clientY,state)});row.addEventListener('pointerup',event=>{if(categoryDragState?.kind==='pointer'&&categoryDragState.pointerId===event.pointerId)finishCategoryDrag()});row.addEventListener('pointercancel',event=>{if(categoryDragState?.kind==='pointer'&&categoryDragState.pointerId===event.pointerId)cancelCategoryDrag()});row.addEventListener('touchstart',event=>{if(categoryDragState||!categoryDragAllowedTarget(event.target))return;const touch=event.changedTouches[0];if(!touch)return;const state={row,kind:'touch',touchId:touch.identifier,startX:touch.clientX,startY:touch.clientY,started:false,timer:null,scrollY:window.scrollY,dialogScrollTop:$('categoryDialog').querySelector('form')?.scrollTop||0};categoryDragState=state;state.timer=setTimeout(()=>startCategoryDrag(state),450);document.addEventListener('touchmove',handleCategoryTouchMove,{capture:true,passive:false});document.addEventListener('touchend',finishCategoryTouch,{capture:true,passive:false});document.addEventListener('touchcancel',cancelCategoryTouch,{capture:true,passive:false})},{passive:true})}
function startCategoryDrag(state){if(categoryDragState!==state)return;state.started=true;document.activeElement?.blur();state.row.classList.add('dragging');document.body.classList.add('category-drag-active');$('categoryDialog').classList.add('category-drag-active');if(state.kind==='pointer')state.row.setPointerCapture?.(state.pointerId);navigator.vibrate?.(12)}
function restoreCategoryDragScroll(state){if(!state?.started)return;if(window.scrollY!==state.scrollY)window.scrollTo(0,state.scrollY);const form=$('categoryDialog').querySelector('form');if(form&&form.scrollTop!==state.dialogScrollTop)form.scrollTop=state.dialogScrollTop}
function updateCategoryDragTarget(x,y,state){document.querySelectorAll('.draggable-category-row').forEach(row=>row.classList.remove('drop-before','drop-after'));state.targetId='';state.before=false;const target=document.elementFromPoint(x,y)?.closest('.draggable-category-row');if(!target||target===state.row)return;const before=y<target.getBoundingClientRect().top+target.getBoundingClientRect().height/2;target.classList.add(before?'drop-before':'drop-after');state.targetId=target.dataset.id;state.before=before}
function handleCategoryTouchMove(event){const state=categoryDragState;if(!state||state.kind!=='touch')return;const touch=[...event.touches].find(item=>item.identifier===state.touchId);if(!touch)return;if(!state.started){if(Math.hypot(touch.clientX-state.startX,touch.clientY-state.startY)>10)cancelCategoryDrag();return}event.preventDefault();event.stopPropagation();restoreCategoryDragScroll(state);updateCategoryDragTarget(touch.clientX,touch.clientY,state)}
function finishCategoryTouch(event){const state=categoryDragState;if(!state||state.kind!=='touch'||![...event.changedTouches].some(touch=>touch.identifier===state.touchId))return;if(state.started){event.preventDefault();event.stopPropagation()}finishCategoryDrag()}
function cancelCategoryTouch(event){const state=categoryDragState;if(!state||state.kind!=='touch')return;if(state.started){event.preventDefault();event.stopPropagation()}cancelCategoryDrag()}
function finishCategoryDrag(){const state=categoryDragState;if(!state)return;const sourceId=state.row.dataset.id,targetId=state.targetId,before=state.before,started=state.started;cancelCategoryDrag();if(started&&targetId&&targetId!==sourceId)moveDraggedCategory(sourceId,targetId,before)}
function cancelCategoryDrag(){const state=categoryDragState;if(state){clearTimeout(state.timer);if(state.kind==='touch'){document.removeEventListener('touchmove',handleCategoryTouchMove,{capture:true});document.removeEventListener('touchend',finishCategoryTouch,{capture:true});document.removeEventListener('touchcancel',cancelCategoryTouch,{capture:true})}state.row.classList.remove('dragging')}document.querySelectorAll('.draggable-category-row').forEach(row=>row.classList.remove('drop-before','drop-after'));document.body.classList.remove('category-drag-active');$('categoryDialog').classList.remove('category-drag-active');categoryDragState=null}
async function moveDraggedCategory(sourceId,targetId,before){const previous=categories.map(category=>({...category})),next=categories.map(category=>({...category})),sourceIndex=next.findIndex(category=>category.id===sourceId);if(sourceIndex<0)return;const [source]=next.splice(sourceIndex,1);let targetIndex=next.findIndex(category=>category.id===targetId);if(targetIndex<0)return;if(!before)targetIndex++;next.splice(targetIndex,0,source);next.forEach((category,order)=>category.order=order);categories=next;renderCategoryManagement();const saved=await saveCategories(next);if(!saved){categories=previous;renderCategoryManagement()}}
async function saveCategories(next=categories){const ordered=orderedCategories(next).map((category,order)=>({...category,order}));try{await setDoc(refs().settings,{categories:ordered,schemaVersion:SCHEMA_VERSION,updatedAt:serverTimestamp()},{merge:true});categories=ordered;renderAll();return true}catch(e){$('categoryError').textContent=`保存失敗: ${e.message}`;return false}}
function renameCategory(category,name){name=name.trim();if(!name||categories.some(c=>c.id!==category.id&&c.name.toLowerCase()===name.toLowerCase())){$('categoryError').textContent='空欄または重複するカテゴリー名は使えません。';renderCategoryManagement();return}const next=categories.map(c=>c.id===category.id?{...c,name}:c);saveCategories(next)}
function addCategory(){const name=$('newCategoryName').value.trim();if(!name||categories.some(c=>c.name.toLowerCase()===name.toLowerCase())){$('categoryError').textContent='空欄または重複するカテゴリー名は追加できません。';return}const next=[...categories,{id:uid(),name,color:$('newCategoryColor').value,order:categories.length}];$('newCategoryName').value='';saveCategories(next).then(ok=>ok&&renderCategoryManagement())}
function confirmCategoryDelete(category){if(!category||category.id===''||category.name==='未分類'){ $('categoryError').textContent='未分類は削除できません。';return }pendingCategoryId=category.id;$('categoryConfirmTitle').textContent=`カテゴリー「${category.name}」を削除しますか？`;$('categoryConfirmDialog').showModal()}
async function deletePendingCategory(){const category=getCategory(pendingCategoryId);if(!category)return;const used=notes.filter(note=>note.categoryId===category.id);try{if(used.length){const batch=writeBatch(db);used.forEach(note=>batch.update(doc(refs().notes,note.id),{categoryId:'',updatedAt:serverTimestamp()}));await batch.commit()}const next=categories.filter(c=>c.id!==category.id);const saved=await saveCategories(next);if(!saved)throw new Error('カテゴリー設定を保存できませんでした');$('categoryConfirmDialog').close();pendingCategoryId='';renderCategoryManagement()}catch(e){$('categoryError').textContent=`削除に失敗しました: ${e.message}`}}
function confirmDelete(){
  if(closingEditor||deletingNote||cardDeleteInProgress||!editingNote)return;
  if(!foodPresetManager.canClose()||!foodEditor.canClose())return;
  const food=isFoodNote(editingNote);
  pendingCardDelete=null;$('deleteConfirmError').textContent='';$('deleteConfirmError').hidden=true;
  $('deleteConfirmTitle').textContent=food?'この食材カードを削除しますか？':'このメモを削除しますか？';
  $('deleteConfirmMessage').textContent=food?'カード内の食材をすべて削除します。削除した内容は元に戻せません。カテゴリー「食材」は残ります。':'削除したメモは元に戻せません。';
  $('confirmDialog').showModal();
}
// 比較するのは正規化済みのメモ内容。Firestore内のMapのキー順には依存しない。
function sameNoteContent(a,b){
  if(a===b)return true;
  if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((value,index)=>sameNoteContent(value,b[index]));
  return isRecord(a)&&isRecord(b)&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(key=>Object.hasOwn(b,key)&&sameNoteContent(a[key],b[key]));
}
async function deleteFoodInventory(activeUid,note=editingNote){
  const targetId=note.id,targets=new Map((note.inventoryDeleteSources||[]).map(source=>[source.id,source.data]));
  // 仮の一覧は元メモからの表示のみで、固定IDのカードはまだ存在しない。
  targets.set(targetId,targets.get(targetId)||null);
  await runTransaction(db,async transaction=>{
    const current=await Promise.all([...targets].map(async([id,expected])=>({id,expected,latest:await transaction.get(doc(db,'users',activeUid,'iroiroNotes',id))})));
    requireActiveUser(activeUid);
    for(const {id,expected,latest}of current){
      if(expected===null?!latest.exists():latest.exists()&&sameNoteContent(noteData(normalizeNote(id,latest.data())),expected))continue;
      throw new Error('食材が別の端末で変更されました。一覧を開き直して確認してから削除してください。');
    }
    for(const [id,expected]of targets)if(expected!==null)transaction.delete(doc(db,'users',activeUid,'iroiroNotes',id));
  });
  return new Set(targets.keys());
}
async function deleteCurrentNote(){
  if(closingEditor||deletingNote||!editingNote||!currentUser)return;
  const activeUid=currentUser.uid,session=editorSession;
  deletingNote=true;$('deleteNoteButton').disabled=true;$('confirmDeleteButton').disabled=true;clearTimeout(saveTimer);saveTimer=null;
  try{
    if(saveInProgress||requestedRevision>savedRevision){if(!await requestSave())throw new Error('保存中の変更を完了できませんでした')}
    requireActiveUser(activeUid);
    if(editorSession!==session)throw new Error('編集中のカードが変わりました。もう一度確認してください。');
    const noteId=editingNote.id;
    let deletedIds=new Set(noteId?[noteId]:[]);
    if(isFoodNote(editingNote)&&noteId===foodInventoryId(editingNote.categoryId))deletedIds=await deleteFoodInventory(activeUid);
    else if(noteId)await deleteDoc(doc(db,'users',activeUid,'iroiroNotes',noteId));
    requireActiveUser(activeUid);
    notes=notes.filter(note=>!deletedIds.has(note.id));renderAll();
    $('confirmDialog').close();$('editorDialog').close();editingNote=null;editorSession='';editRevision=0;savedRevision=0;requestedRevision=0;savePromise=Promise.resolve(true);
  }catch(e){setStatus(`削除失敗: ${e.message}`);$('saveStatus').textContent='削除できませんでした。内容を確認してもう一度お試しください。'}
  finally{deletingNote=false;$('deleteNoteButton').disabled=false;$('confirmDeleteButton').disabled=false}
}
async function checkLegacy(){let legacy=[];try{legacy=JSON.parse(localStorage.getItem(LEGACY_KEY)||'[]')}catch{}const marker=await getDoc(refs().migration);$('migrationPanel').hidden=!(legacy.length&&!marker.exists())}
async function legacyNoteId(raw,index){
  const original=raw.id==null?'':String(raw.id);
  if(validRecordId(original))return original;
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(raw)));
  const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  return`legacy-v1-${hash}-${index}`;
}
async function migrateLegacy(){
  if(!currentUser||migrationBusy)return;
  migrationBusy=true;$('migrateLocalButton').disabled=true;
  const activeUid=currentUser.uid,migrationRefs=refs();
  try{
    const legacy=JSON.parse(localStorage.getItem(LEGACY_KEY)||'[]');
    if(!Array.isArray(legacy)||!legacy.every(isRecord))throw new Error('以前のローカルメモの形式が不正です。');
    if(!legacy.length)return;
    const marker=await getDoc(migrationRefs.migration);
    if(marker.exists())return;
    for(const [index,raw] of legacy.entries()){
      requireActiveUser(activeUid);
      const id=await legacyNoteId(raw,index),target=doc(migrationRefs.notes,id),note=normalizeNote(id,raw);
      const data={...noteData(note),createdAt:raw.createdAt||serverTimestamp(),updatedAt:raw.updatedAt||serverTimestamp()};
      // 再試行・別タブの同時移行でも、移行済みのメモやその後の編集を上書きしない。
      await runTransaction(db,async transaction=>{
        const existing=await transaction.get(target);
        requireActiveUser(activeUid);
        if(!existing.exists())transaction.set(target,data);
      });
    }
    requireActiveUser(activeUid);
    await setDoc(migrationRefs.migration,{completedAt:serverTimestamp(),source:LEGACY_KEY,count:legacy.length});
    $('migrationPanel').hidden=true;setStatus(`${legacy.length}件の移行を完了しました`);
  }catch(e){setStatus(`移行に失敗しました。再試行できます: ${e.message}`)}
  finally{migrationBusy=false;$('migrateLocalButton').disabled=false}
}
function setBackupStatus(message){$('backupStatus').textContent=message}
function requireBackupUser(){if(currentUser)return true;setBackupStatus('バックアップはログイン後に利用できます。');return false}
function backupDate(value){const date=toDate(value);return date?date.toISOString():null}
function backupNote(id,data){const note=normalizeNote(id,data);return{id,note:{...noteData(note),createdAt:backupDate(data.createdAt),updatedAt:backupDate(data.updatedAt)}}}
function timestampFromBackup(value){if(value===null||value===undefined||value==='')return null;const date=toDate(value);if(!date)throw new Error('日時の形式が不正です。');return Timestamp.fromDate(date)}
function downloadJson(filename,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),0)}
async function exportBackup(){if(!requireBackupUser()||backupBusy)return;backupBusy=true;$('exportBackupButton').disabled=true;setBackupStatus('バックアップを書き出し中…');try{const [noteSnap,settingsSnap]=await Promise.all([getDocs(refs().notes),getDoc(refs().settings)]),settings=settingsSnap.exists()?settingsSnap.data():{categories:[],schemaVersion:SCHEMA_VERSION},exportedAt=new Date(),backup={app:'iroiro',backupFormatVersion:BACKUP_FORMAT_VERSION,exportedAt:exportedAt.toISOString(),userUid:currentUser.uid,data:{notes:noteSnap.docs.map(item=>backupNote(item.id,item.data())),settings:{categories:orderedCategories(Array.isArray(settings.categories)?settings.categories:[]),schemaVersion:Number(settings.schemaVersion??SCHEMA_VERSION)||SCHEMA_VERSION,...(Object.hasOwn(settings,'foodPresets')?{foodPresets:validateFoodPresets(settings.foodPresets)}:{}),updatedAt:backupDate(settings.updatedAt)}}},stamp=exportedAt.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'');downloadJson(`iroiro-backup-${stamp}.json`,backup);setBackupStatus(`バックアップを書き出しました（メモ${backup.data.notes.length}件）。`)}catch(e){setBackupStatus(`バックアップの書き出しに失敗しました: ${e.message}`)}finally{backupBusy=false;$('exportBackupButton').disabled=false}}
function validateBackup(raw){
  if(!isRecord(raw)||raw.app!=='iroiro'||raw.backupFormatVersion!==BACKUP_FORMAT_VERSION||!isRecord(raw.data)||!Array.isArray(raw.data.notes)||!isRecord(raw.data.settings))throw new Error('イロイロキロクの対応バックアップ形式ではありません。');
  const ids=new Set(),notes=raw.data.notes.map(entry=>{
    if(!isRecord(entry)||!validRecordId(entry.id)||!isRecord(entry.note)||ids.has(entry.id))throw new Error('メモのIDまたは内容が不正です。');
    if(entry.note.categoryId!==undefined&&entry.note.categoryId!==''&&(!validRecordId(entry.note.categoryId)||entry.note.categoryId==='all'))throw new Error('メモのカテゴリーIDが不正です。');
    if(entry.note.task!==undefined&&entry.note.task!==null){
      if(!isRecord(entry.note.task)||entry.note.task.dueDate&& !validTaskDate(entry.note.task.dueDate))throw new Error('タスクの設定または期限が不正です。');
    }
    if(entry.note.manga!==undefined&&entry.note.manga!==null&&!isRecord(entry.note.manga))throw new Error('漫画の設定が不正です。');
    if(entry.note.food!==undefined&&entry.note.food!==null){
      const food=entry.note.food;
      if(!isRecord(food)||(food.remainingGrams!==null&&!validGrams(food.remainingGrams))||(food.restoreGrams!=null&&!validGrams(food.restoreGrams))||(food.expiryDate&&!validTaskDate(food.expiryDate)))throw new Error('食材の残量または期限が不正です。');
    }
    if(entry.note.foodList!==undefined&&entry.note.foodList!==null){
      const list=entry.note.foodList,seen=new Set();
      if(!isRecord(list)||!Array.isArray(list.items)||!isRecord(list.importedSources||{}))throw new Error('食材リストの形式が不正です。');
      for(const item of list.items){
        if(!isRecord(item)||typeof item.id!=='string'||!item.id||seen.has(item.id)||typeof item.name!=='string'||typeof item.quantity!=='string'||(item.quantity!==''&&item.quantity!=='0'&&parseFoodQuantity(item.quantity)===null)||typeof item.unit!=='string'||item.unit.length>20||(item.expiryDate&&!validTaskDate(item.expiryDate)))throw new Error('食材の量・単位・IDが不正です。');
        seen.add(item.id);
      }
    }
    ids.add(entry.id);
    const note=normalizeNote(entry.id,entry.note);
    return{id:entry.id,data:{...noteData(note),createdAt:timestampFromBackup(entry.note.createdAt),updatedAt:timestampFromBackup(entry.note.updatedAt)}};
  }),settings=raw.data.settings;
  if(!Array.isArray(settings.categories))throw new Error('カテゴリー設定が不正です。');
  const categoryIds=new Set(),categories=orderedCategories(settings.categories.map((category,index)=>{
    if(!isRecord(category)||!validRecordId(category.id)||category.id==='all'||typeof category.name!=='string'||!category.name.trim()||categoryIds.has(category.id))throw new Error('カテゴリー設定が不正です。');
    categoryIds.add(category.id);
    return{id:category.id,name:category.name,color:categoryColor(category.color),order:Number.isFinite(Number(category.order))?Number(category.order):index};
  }));
  return{notes,settings:{categories,schemaVersion:SCHEMA_VERSION,...(Object.hasOwn(settings,'foodPresets')?{foodPresets:validateFoodPresets(settings.foodPresets)}:{}),updatedAt:timestampFromBackup(settings.updatedAt)},exportedAt:typeof raw.exportedAt==='string'?raw.exportedAt:'不明',userUid:typeof raw.userUid==='string'?raw.userUid:''};
}
function mergeBackupCategories(existing,incoming){
  const merged=new Map(orderedCategories(Array.isArray(existing)?existing.filter(isRecord):[]).map(category=>[category.id,category]));
  orderedCategories(incoming).forEach(category=>merged.set(category.id,category));
  return Array.from(merged.values(),(category,order)=>({...category,order}));
}
async function readBackupFile(event){const file=event.target.files?.[0];event.target.value='';if(!file||!requireBackupUser())return;setBackupStatus('バックアップを確認中…');try{const candidate=validateBackup(JSON.parse(await file.text()));pendingBackup=candidate;const warning=candidate.userUid&&candidate.userUid!==currentUser.uid?'別のGoogleアカウントで作成されたバックアップです。内容を確認のうえ、復元を続行してください。':'';$('backupRestoreSummary').textContent=`復元するメモ：${candidate.notes.length}件\nカテゴリー：${candidate.settings.categories.length}件\n書き出し日時：${formatDate(candidate.exportedAt)}\n復元方式：メモをマージし、カテゴリーをID単位で統合`;$('backupRestoreWarning').textContent=warning;$('backupConfirmDialog').showModal();setBackupStatus('バックアップを確認しました。最終確認をしてください。')}catch(e){pendingBackup=null;setBackupStatus(`バックアップを読み込めませんでした: ${e.message}`)}}
async function restorePendingBackup(){
  if(!pendingBackup||!requireBackupUser()||backupBusy)return;
  backupBusy=true;$('confirmBackupRestoreButton').disabled=true;setBackupStatus('バックアップを復元中…');
  const backup=pendingBackup,activeUid=currentUser.uid,restoreRefs=refs();
  let completed=0;const failed=[];
  try{
    // 最新の設定と原子的に統合する。分類を先に保存し、メモの参照先を確保する。
    await runTransaction(db,async transaction=>{
      const saved=await transaction.get(restoreRefs.settings);
      requireActiveUser(activeUid);
      const existing=saved.exists()?saved.data().categories:[];
      transaction.set(restoreRefs.settings,{...backup.settings,categories:mergeBackupCategories(existing,backup.settings.categories),updatedAt:serverTimestamp()},{merge:true});
    });
    completed++;
    for(let start=0;start<backup.notes.length;start+=400){
      requireActiveUser(activeUid);
      const group=backup.notes.slice(start,start+400),batch=writeBatch(db);
      group.forEach(note=>batch.set(doc(restoreRefs.notes,note.id),note.data,{merge:true}));
      try{await batch.commit();completed+=group.length}
      catch(e){
        for(const note of group){
          requireActiveUser(activeUid);
          try{await setDoc(doc(restoreRefs.notes,note.id),note.data,{merge:true});completed++}
          catch(itemError){failed.push(`メモ ${note.id}: ${itemError.message}`)}
        }
      }
    }
    $('backupConfirmDialog').close();
    setBackupStatus(failed.length?`${completed}件を復元しました。${failed.length}件失敗: ${failed.join(' / ')}`:`${completed}件を復元しました。Firestore同期で反映されます。`);
  }catch(e){setBackupStatus(`復元に失敗しました（${completed}件完了）: ${e.message}`)}
  finally{backupBusy=false;$('confirmBackupRestoreButton').disabled=false}
}
initialize();
