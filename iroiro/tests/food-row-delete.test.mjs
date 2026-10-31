import test from 'node:test';
import assert from 'node:assert/strict';
import { harness,tick } from './harness.mjs';
import { normalizeFoodList,foodInventoryId } from '../food-core.mjs';
import { defaultFoodPresets } from '../food-presets.mjs';

const rootId=foodInventoryId('food'),path=`users/test-user/iroiroNotes/${rootId}`,settingsPath='users/test-user/iroiroSettings/main';
function setup(){
  const rows=['a','b','c'].map(id=>({id,name:'豚こま肉',quantity:'150',unit:'g',storage:'chilled',memo:id,expiryKind:'useBy',expiryDate:'2026-11-01',useSoon:true}));
  const original={title:'食材',categoryId:'food',foodList:normalizeFoodList({items:rows,importedSources:{legacy:true}})};
  const h=harness([[path,original],[settingsPath,{foodPresets:defaultFoodPresets()}]]);
  h.context.original=original;h.run(`categories=[{id:'food',name:'食材'}];notes=[normalizeNote('${rootId}',original)];openFoodInventory('food');foodEditor.bind()`);return h;
}
function remove(h,id){return h.run(`foodEditor.deleteItem('${id}')`)}
const ids=h=>Array.from(h.run('editingNote.foodList.items.map(item=>item.id)'));

test('×を直接押すとチェックせず同名の1項目だけを削除する',()=>{
  const h=setup();assert.match(h.element('foodItemsList').innerHTML,/data-food-delete="b"/);
  h.element('foodItemsList').onclick({target:{closest:selector=>selector==='[data-food-delete]'?{dataset:{foodDelete:'b'}}:null}});
  assert.deepEqual(ids(h),['a','c']);assert.equal(h.element('foodItemNameInput').value,'');assert.equal(h.element('foodUndoDeleteButton').hidden,false);
});

test('×の取り消しでID・順序・期限・メモを戻し、二重取り消しでは増やさない',()=>{
  const h=setup(),before=JSON.parse(h.run('JSON.stringify(editingNote.foodList.items)'));remove(h,'b');
  assert.equal(h.run('foodEditor.undoDelete()'),true);assert.deepEqual(JSON.parse(h.run('JSON.stringify(editingNote.foodList.items)')),before);
  assert.equal(h.run('foodEditor.undoDelete()'),false);assert.deepEqual(ids(h),['a','b','c']);
});

test('存在しない行を削除しても直前の取り消しを失わず、連続削除は直前の1件を戻す',()=>{
  const h=setup();remove(h,'a');remove(h,'b');assert.equal(remove(h,'missing'),false);h.run('foodEditor.undoDelete()');assert.deepEqual(ids(h),['b','c']);
});

test('削除する行の不正な入力は捨て、他の行の未確定入力を保つ',()=>{
  const h=setup();h.run("foodEditor.stageInline('a',{quantity:'1/0'});foodEditor.commitInline('a');foodEditor.stageInline('b',{quantity:'280'})");remove(h,'a');
  assert.equal(h.element('foodError').textContent,'');assert.match(h.element('foodItemsList').innerHTML,/value="280"/);
  assert.equal(h.run('foodEditor.canClose()'),true);assert.equal(h.run('editingNote.foodList.items[0].quantity'),'280');
});

test('削除した行の詳細編集中なら閉じ、別の食材の追加入力は保持する',()=>{
  const h=setup();h.run("foodEditor.openDraft('b')");h.element('foodItemNameInput').value='編集中';remove(h,'b');assert.equal(h.element('foodItemForm').hidden,true);assert.equal(h.run('foodEditor.canClose()'),true);
  h.run('foodEditor.openDraft()');h.element('foodItemNameInput').value='キャベツ';remove(h,'a');assert.equal(h.element('foodItemNameInput').value,'キャベツ');assert.equal(h.run('foodEditor.commitDraft()'),true);assert.equal(h.run('editingNote.foodList.items.at(-1).name'),'キャベツ');
});

test('全行を×で削除しても空の食材カードと定番設定・取り込み履歴を保存する',async()=>{
  const h=setup(),presets=structuredClone(h.store.get(settingsPath));for(const id of ['a','b','c'])remove(h,id);await h.run('closeEditor()');
  assert.ok(h.store.has(path));assert.equal(h.store.get(path).title,'食材');assert.equal(h.store.get(path).foodList.items.length,0);assert.deepEqual(h.store.get(settingsPath),presets);assert.deepEqual(h.store.get(path).foodList.importedSources,h.context.original.foodList.importedSources);
  h.context.saved=h.store.get(path);h.run(`notes=[normalizeNote('${rootId}',saved),normalizeNote('legacy',{title:'旧食材',categoryId:'food',food:{remainingGrams:170}})];openFoodInventory('food')`);assert.deepEqual(ids(h),[]);
});

test('保存中の×削除と取り消しも閉じる前に保存する',async()=>{
  const h=setup();h.run("foodEditor.stageInline('a',{quantity:'200'});foodEditor.commitInline('a')");let release,first=true;h.beforeWrite=()=>{if(first){first=false;return new Promise(resolve=>release=resolve)}};
  const saving=h.run('requestSave()');await tick();remove(h,'b');h.run('foodEditor.undoDelete()');remove(h,'c');const closing=h.run('closeEditor()');release();await saving;await closing;
  assert.deepEqual(h.store.get(path).foodList.items.map(item=>item.id),['a','b']);assert.equal(h.store.get(path).foodList.items[0].quantity,'200');assert.equal(h.element('editorDialog').open,false);
});

test('キーボードで×を操作した後は隣の×へ、空になったら取り消しへフォーカスを移す',()=>{
  const h=setup();let focused='';for(const id of ['b','c'])h.element(`food-inline-delete-${id}`).focus=()=>{focused=id};h.element('foodUndoDeleteButton').focus=()=>{focused='undo'};
  h.context.document.activeElement={dataset:{foodDelete:'a'}};remove(h,'a');assert.equal(focused,'b');
  h.context.document.activeElement={dataset:{foodDelete:'b'}};remove(h,'b');assert.equal(focused,'c');
  h.context.document.activeElement={dataset:{foodDelete:'c'}};remove(h,'c');assert.equal(focused,'undo');
});

test('食材行のチェック欄と×削除・定番の複数選択を併用できる',()=>{
  const h=setup();assert.match(h.element('foodItemsList').innerHTML,/type="checkbox" class="food-item-check" data-food-check="a"/);
  assert.match(h.element('foodPresetChoices').innerHTML,/type="checkbox" data-food-preset=/);assert.equal(h.element('foodClearCheckedButton').hidden,true);assert.equal(h.element('foodDeleteCheckedButton').hidden,true);
  remove(h,'b');assert.deepEqual(ids(h),['a','c']);h.run('foodEditor.undoDelete()');assert.deepEqual(ids(h),['a','b','c']);
});

test('食材にチェックすると取り消し線で残り、チェック済みをまとめて削除・復元できる',()=>{
  const h=setup();h.run(`foodEditor.toggleChecked('b',true)`);assert.deepEqual(ids(h),['a','b','c']);
  assert.match(h.element('foodItemsList').innerHTML,/food-check-row is-checked"><input type="checkbox" class="food-item-check" data-food-check="b"[^>]*checked>/);
  assert.equal(h.element('foodDeleteCheckedButton').hidden,false);assert.match(h.element('foodDeleteCheckedButton').textContent,/1件/);
  h.run('foodEditor.deleteChecked()');assert.deepEqual(ids(h),['a','c']);
  h.run('foodEditor.undoDelete()');assert.deepEqual(ids(h),['a','b','c']);assert.match(h.element('foodItemsList').innerHTML,/data-food-check="b"[^>]*checked>/);
  h.run(`foodEditor.toggleChecked('b',false)`);assert.equal(h.element('foodDeleteCheckedButton').hidden,true);
});

test('旧チェック済みの項目は開くだけでは変更せず、明示的に解除して在庫に戻せる',async()=>{
  const h=setup();const original=structuredClone(h.store.get(path));original.foodList.items[0].checked=true;h.store.set(path,original);h.context.checkedOriginal=original;
  h.run(`notes=[normalizeNote('${rootId}',checkedOriginal)];openFoodInventory('food');foodEditor.bind()`);
  assert.equal(h.writes.length,0);assert.equal(h.element('foodClearCheckedButton').hidden,false);assert.match(h.element('foodClearCheckedButton').textContent,/1件/);
  h.element('foodClearCheckedButton').onclick();assert.equal(h.element('foodClearCheckedButton').hidden,true);assert.deepEqual(ids(h),['a','b','c']);
  await h.run('closeEditor()');assert.equal(h.store.get(path).foodList.items[0].checked,false);assert.equal(h.store.get(path).foodList.items[0].quantity,'150');
});
