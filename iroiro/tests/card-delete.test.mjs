import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {harness,tick} from './harness.mjs';
import {foodInventoryId,normalizeFoodList} from '../food-core.mjs';

const path=id=>`users/test-user/iroiroNotes/${id}`,settingsPath='users/test-user/iroiroSettings/main',rootId=foodInventoryId('food');
const categories=[{id:'food',name:'食材',color:'#FF7F00'},{id:'task',name:'タスク',color:'#FFD400'},{id:'manga',name:'漫画',color:'#3A86D4'}];
function setup(entries=[['one',{title:'買物リスト',categoryId:'task',task:{status:'todo',items:[{id:'a',text:'牛乳'}]}}]]){
  const h=harness(entries.map(([id,note])=>[path(id),note]));h.context.entries=entries;h.context.testCategories=categories;
  h.run('categories=testCategories;notes=entries.map(([id,note])=>normalizeNote(id,note));renderNotes()');return h;
}

test('食材カードのラベルに選択したカテゴリー色と文字色を適用する',async()=>{
  const h=setup([['old',{title:'豚こま',categoryId:'food',food:{remainingGrams:300}}]]),css=await readFile(new URL('../style.css',import.meta.url),'utf8');
  assert.match(h.element('notesGrid').innerHTML,/category-pill" style="--category-color:#FF7F00;--category-text:/);
  assert.match(css,/\.food-summary-card \.category-pill\{background:var\(--category-color\);color:var\(--category-text\)\}/);
  h.run("categories[0].color='#3A86D4';renderNotes()");assert.match(h.element('notesGrid').innerHTML,/category-pill" style="--category-color:#3A86D4;/);
});

test('通常・タスク・漫画・食材のカードに文字を表示しない削除アイコンを付ける',()=>{
  const h=setup();for(const categoryId of ['', 'task','manga','food']){
    h.context.categoryId=categoryId;const html=h.run("renderNoteCard(normalizeNote('card',{title:'<img src=x>',categoryId}))");
    assert.match(html,/<button[^>]+class="card-delete"[^>]+aria-label="[^\"]+"[^>]*><svg/);assert.match(html,/aria-hidden="true"/);assert.doesNotMatch(html,/<img src=x>/);
  }
});

test('一覧の削除は編集画面を開かず、確認するまでデータを消さない',()=>{
  const h=setup();assert.equal(h.run("confirmCardDelete('one')"),true);
  assert.equal(h.element('editorDialog').open,false);assert.equal(h.element('confirmDialog').open,true);assert.ok(h.store.has(path('one')));assert.equal(h.writes.length,0);
  assert.match(h.element('deleteConfirmTitle').textContent,/買物リスト/);assert.match(h.element('deleteConfirmMessage').textContent,/元に戻せません/);
});

test('一覧で確認した1枚だけを削除し、他のカードと設定は保持する',async()=>{
  const h=setup([['one',{title:'買物リスト',categoryId:'task'}],['two',{title:'残すメモ'}]]);h.store.set(settingsPath,{categories,foodPresets:[]});
  h.run("confirmCardDelete('one')");assert.equal(await h.run('deleteCardNote()'),true);
  assert.equal(h.store.has(path('one')),false);assert.equal(h.store.has(path('two')),true);assert.deepEqual(h.store.get(settingsPath),{categories,foodPresets:[]});assert.equal(h.run('notes.length'),1);assert.equal(h.element('confirmDialog').open,false);assert.equal(h.element('editorDialog').open,false);
});

test('食材カードの一覧削除では旧取り込み元もまとめて消し、定番設定は残す',async()=>{
  const food={title:'食材',categoryId:'food',foodList:normalizeFoodList({items:[{id:'a',name:'豚こま肉',quantity:'300',unit:'g'}],importedSources:{old:true}})},old={title:'豚こま肉',categoryId:'food',food:{remainingGrams:300}},h=setup([[rootId,food],['old',old],['other',{title:'他のメモ'}]]);
  h.store.set(settingsPath,{categories,foodPresets:[]});assert.equal(h.run(`confirmCardDelete('${rootId}','food')`),true);assert.match(h.element('deleteConfirmMessage').textContent,/食材をすべて削除/);
  assert.equal(await h.run('deleteCardNote()'),true);assert.equal(h.store.has(path(rootId)),false);assert.equal(h.store.has(path('old')),false);assert.ok(h.store.has(path('other')));assert.deepEqual(h.store.get(settingsPath),{categories,foodPresets:[]});assert.doesNotMatch(h.element('notesGrid').innerHTML,/food-summary-card/);
});

test('確認後に別端末で変更されたカードは消さず、エラーと内容を保持する',async()=>{
  const h=setup();h.run("confirmCardDelete('one')");const changed={...h.store.get(path('one')),content:'別端末の追記'};h.store.set(path('one'),changed);
  assert.equal(await h.run('deleteCardNote()'),false);assert.deepEqual(h.store.get(path('one')),changed);assert.equal(h.element('confirmDialog').open,true);assert.match(h.element('deleteConfirmError').textContent,/別の端末/);
});

test('食材の競合ではカードと旧取り込み元を一部だけ削除しない',async()=>{
  const h=setup([[rootId,{title:'食材',categoryId:'food',foodList:normalizeFoodList()}],['old',{title:'卵',categoryId:'food',food:{remainingGrams:10}}]]);
  h.run(`confirmCardDelete('${rootId}','food')`);h.store.set(path('old'),{title:'卵',categoryId:'food',food:{remainingGrams:5}});
  assert.equal(await h.run('deleteCardNote()'),false);assert.ok(h.store.has(path(rootId)));assert.ok(h.store.has(path('old')));
});

test('削除に失敗してもカードを残し、同じ確認から再試行できる',async()=>{
  const h=setup();h.run("confirmCardDelete('one')");h.beforeDelete=()=>{throw Error('offline')};assert.equal(await h.run('deleteCardNote()'),false);assert.ok(h.store.has(path('one')));assert.equal(h.element('confirmDeleteButton').disabled,false);assert.equal(h.element('cancelDeleteButton').disabled,false);
  h.beforeDelete=null;assert.equal(await h.run('deleteCardNote()'),true);assert.equal(h.store.has(path('one')),false);
});

test('削除中の連打を抑止し、確認とキャンセルの操作を一時停止する',async()=>{
  const h=setup();h.run("confirmCardDelete('one')");let release,count=0;h.beforeDelete=()=>{count++;return new Promise(resolve=>release=resolve)};
  const deleting=h.run('deleteCardNote()');await tick();assert.equal(await h.run('deleteCardNote()'),false);assert.equal(h.element('confirmDeleteButton').disabled,true);assert.equal(h.element('cancelDeleteButton').disabled,true);assert.equal(h.run("confirmCardDelete('one')"),false);
  release();assert.equal(await deleting,true);assert.equal(count,1);
});

test('アカウントが変われば削除確認を閉じ、前のアカウントのカードを削除しない',async()=>{
  const h=setup();h.run("confirmCardDelete('one')");await h.run("handleAuth({uid:'other-user'})");assert.equal(h.element('confirmDialog').open,false);assert.equal(await h.run('deleteCardNote()'),false);assert.ok(h.store.has(path('one')));
});

test('保存中のピン留めやタスク状態変更と削除確認を競合させない',()=>{
  const h=setup();h.run("pendingPinWrites.set('test-user:one',{promise:Promise.resolve()})");assert.equal(h.run("confirmCardDelete('one')"),false);assert.match(h.run("cardDeleteButton(notes[0])"),/disabled/);
  h.run("pendingPinWrites.clear();pendingTaskWrites.add('test-user:one')");assert.equal(h.run("confirmCardDelete('one')"),false);
  h.run('pendingTaskWrites.clear()');assert.equal(h.run("confirmCardDelete('one','food')"),false);assert.ok(h.store.has(path('one')));
});

test('削除待ち中にアカウントが変わっても新しい一覧を消さず、操作を再開できる',async()=>{
  const h=setup();h.run("confirmCardDelete('one')");let release;h.beforeDelete=()=>new Promise(resolve=>release=resolve);
  const deleting=h.run('deleteCardNote()');await tick();await h.run("handleAuth({uid:'other-user'});notes=[normalizeNote('new',{title:'別アカウントのメモ'})];renderNotes()");
  release();assert.equal(await deleting,false);assert.equal(h.run('notes[0].id'),'new');assert.equal(h.element('confirmDialog').open,false);assert.doesNotMatch(h.element('notesGrid').innerHTML,/class="card-delete"[^>]*disabled/);
});
