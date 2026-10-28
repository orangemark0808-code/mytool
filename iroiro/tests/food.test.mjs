import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFood, validGrams, consumeFood, foodAvailable } from '../food-core.mjs';
import { harness } from './harness.mjs';

const categories="categories=[{id:'food',name:'食材',color:'#38A169'},{id:'app',name:'アプリ',color:'#FF7F00'}]";
const path=id=>`users/test-user/iroiroNotes/${id}`;
function start(h){h.run(`${categories};selectCategory('food');openEditor(createNote())`)}
function fill(h,grams=250){h.element('noteTitleInput').value='豚こま';h.element('foodGramsInput').value=String(grams);h.run('syncEditingNoteFromForm();scheduleSave()')}

test('未計量と0gを区別し、負数・文字列・非有限値・過剰な小数を量として扱わない',()=>{
  for(const value of [0,0.1,1,250,99999999.9])assert.equal(validGrams(value),true);
  for(const value of [-1,'250',null,Infinity,NaN,0.01,1e9])assert.equal(validGrams(value),false);
  assert.equal(normalizeFood().remainingGrams,null);assert.equal(normalizeFood({remainingGrams:0}).remainingGrams,0);
  assert.equal(foodAvailable({remainingGrams:0}),false);assert.equal(foodAvailable({remainingGrams:1}),true);
  assert.equal(normalizeFood({storage:'constructor'}).storage,'');
});

test('0.1g単位の引き算は誤差を残さず、使用前の量を保持する',()=>{
  assert.deepEqual(consumeFood({remainingGrams:0.3},0.1),{...normalizeFood(),remainingGrams:0.2,restoreGrams:0.3});
  for(const value of [0,-1,251,NaN,0.01])assert.throws(()=>consumeFood({remainingGrams:250},value));
  assert.throws(()=>consumeFood({},10));
});

test('食材一覧から専用フォームを開き、人数欄を必要としない',()=>{
  const h=harness();start(h);
  assert.equal(h.run('editingNote.categoryId'),'food');assert.equal(h.element('foodFields').hidden,false);
  assert.equal(h.element('typeSwitcher').hidden,true);assert.equal(h.element('itemsEditor').hidden,true);
  assert.equal(h.element('noteTitleInput')['aria-label'],'食材名');
});

test('残量・保存場所・早めフラグ・期限・メモを保存して再読込できる',async()=>{
  const h=harness();start(h);fill(h,250.5);
  h.element('foodStorageInput').value='frozen';h.element('foodUseSoonInput').checked=true;
  h.element('foodExpiryKindInput').value='bestBefore';h.element('foodExpiryDateInput').value='2026-11-01';h.element('noteContentInput').value='開封済み';
  h.run('syncEditingNoteFromForm();scheduleSave()');await h.run('closeEditor()');
  const saved=h.writes[0].data;assert.equal(saved.food.remainingGrams,250.5);assert.equal(saved.food.storage,'frozen');
  assert.equal(saved.food.useSoon,true);assert.equal(saved.food.expiryDate,'2026-11-01');assert.equal(saved.content,'開封済み');
  h.context.saved=saved;h.run("openEditor(normalizeNote('stored',saved))");assert.equal(h.element('foodGramsInput').value,250.5);
});

test('空の新規フォームは保存しない。名前・残量不足や負数では入力を保持する',async()=>{
  const h=harness();start(h);await h.run('closeEditor()');assert.equal(h.writes.length,0);assert.equal(h.element('editorDialog').open,false);
  start(h);h.element('foodGramsInput').value='250';h.run('syncEditingNoteFromForm();scheduleSave()');await h.run('closeEditor()');
  assert.equal(h.writes.length,0);assert.equal(h.element('editorDialog').open,true);assert.match(h.element('foodError').textContent,/食材名/);
  h.element('noteTitleInput').value='豚こま';
  for(const grams of ['', '-1', '1.25']){h.element('foodGramsInput').value=grams;h.run('syncEditingNoteFromForm();scheduleSave()');await h.run('closeEditor()');assert.equal(h.writes.length,0);assert.equal(h.element('editorDialog').open,true)}
});

test('食材と通常メモを切り替えても元のチェックリストと食材設定を保持する',()=>{
  const h=harness();h.run(`${categories};openEditor(normalizeNote('old',{categoryId:'app',title:'食材メモ',type:'checklist',items:[{id:'a',text:'昔の項目',checked:true}],content:'元の本文'}))`);
  h.element('noteCategorySelect').value='food';h.run('handleCategoryChange()');h.element('foodGramsInput').value='200';h.run('syncEditingNoteFromForm()');
  h.element('noteCategorySelect').value='app';h.run('handleCategoryChange()');assert.equal(h.run('editingNote.items[0].checked'),true);assert.equal(h.run('editingNote.type'),'checklist');
  h.element('noteCategorySelect').value='food';h.run('handleCategoryChange()');assert.equal(h.element('foodGramsInput').value,200);assert.equal(h.element('noteContentInput').value,'元の本文');
});

test('今回使う量は入力だけで残量を減らさず、確定時に減らして取り消せる',async()=>{
  const h=harness();start(h);fill(h,500);h.run('foodEditor.bind()');
  h.element('foodUseGramsInput').value='200';assert.equal(h.run('editingNote.food.remainingGrams'),500);
  assert.equal(await h.element('foodConsumeButton').onclick(),true);assert.equal(h.writes.at(-1).data.food.remainingGrams,300);
  assert.equal(await h.element('foodUndoButton').onclick(),true);assert.equal(h.writes.at(-1).data.food.remainingGrams,500);
  h.element('foodUseGramsInput').value='600';assert.equal(await h.element('foodConsumeButton').onclick(),false);assert.equal(h.run('editingNote.food.remainingGrams'),500);
});

test('使用量の保存に失敗しても編集を保持し、再試行で二重に差し引かない',async()=>{
  const original={title:'豚こま',categoryId:'food',food:{remainingGrams:250}};
  const h=harness([[path('pork'),original]]);h.context.original=original;h.run(`${categories};openEditor(normalizeNote('pork',original));foodEditor.bind()`);
  h.element('foodUseGramsInput').value='100';h.beforeWrite=()=>{throw new Error('offline')};
  assert.equal(await h.element('foodConsumeButton').onclick(),false);assert.equal(h.run('editingNote.food.remainingGrams'),150);
  assert.equal(h.store.get(path('pork')).food.remainingGrams,250);
  h.beforeWrite=null;assert.equal(await h.run('requestSave()'),true);assert.equal(h.store.get(path('pork')).food.remainingGrams,150);
});

test('一覧で使い切りにすると0gになり、元の量へ戻せる。他の項目を上書きしない',async()=>{
  const original={title:'キャベツ',categoryId:'food',content:'元のメモ',food:{remainingGrams:500,storage:'chilled',useSoon:true}};
  const h=harness([[path('cabbage'),original]]);h.context.original=original;h.run(`${categories};notes=[normalizeNote('cabbage',original)];selectCategory('food')`);
  assert.equal(await h.run("changeFoodStock('cabbage')"),true);assert.equal(h.store.get(path('cabbage')).food.remainingGrams,0);
  assert.equal(h.store.get(path('cabbage')).food.storage,'chilled');assert.equal(h.store.get(path('cabbage')).content,'元のメモ');
  assert.equal(h.element('completedFoods').hidden,false);assert.equal(h.element('notesGrid').innerHTML,'');
  assert.equal(await h.run("changeFoodStock('cabbage',true)"),true);assert.equal(h.store.get(path('cabbage')).food.remainingGrams,500);
});

test('一覧の使い切り操作で残量の同時変更を検知し、古い値を強制保存しない',async()=>{
  const h=harness([[path('pork'),{title:'豚こま',categoryId:'food',food:{remainingGrams:100}}]]);
  h.run(`${categories};notes=[normalizeNote('pork',{title:'豚こま',categoryId:'food',food:{remainingGrams:250}})]`);
  assert.equal(await h.run("changeFoodStock('pork')"),false);assert.equal(h.store.get(path('pork')).food.remainingGrams,100);assert.equal(h.writes.length,0);
});

test('編集保存も別端末の残量変更と競合したら止め、同時メモ編集は統合する',async()=>{
  const original={title:'豚こま',categoryId:'food',content:'',food:{remainingGrams:250}};
  const h=harness([[path('pork'),original]]);h.context.original=original;h.run(`${categories};openEditor(normalizeNote('pork',original))`);
  h.element('foodGramsInput').value='150';h.run('syncEditingNoteFromForm();scheduleSave()');h.store.set(path('pork'),{...original,food:{remainingGrams:200}});
  assert.equal(await h.run('requestSave()'),false);assert.equal(h.store.get(path('pork')).food.remainingGrams,200);
  const h2=harness([[path('pork'),original]]);h2.context.original=original;h2.run(`${categories};openEditor(normalizeNote('pork',original))`);
  h2.element('foodGramsInput').value='150';h2.run('syncEditingNoteFromForm();scheduleSave()');h2.store.set(path('pork'),{...original,content:'別端末の追記'});
  assert.equal(await h2.run('requestSave()'),true);assert.equal(h2.store.get(path('pork')).food.remainingGrams,150);assert.equal(h2.store.get(path('pork')).content,'別端末の追記');
});

test('食材のバックアップは残量を保持し、不正な量は復元前に拒否する',()=>{
  const h=harness();h.run(categories);
  const backup={app:'iroiro',backupFormatVersion:1,data:{notes:[{id:'pork',note:{title:'豚こま',categoryId:'food',food:{remainingGrams:250,storage:'frozen'}}}],settings:{categories:[{id:'food',name:'食材'}]}}};
  h.context.input=backup;h.run('candidate=validateBackup(input);roundTrip=backupNote(candidate.notes[0].id,candidate.notes[0].data)');assert.equal(h.run('roundTrip.note.food.remainingGrams'),250);
  h.context.input.data.notes[0].note.food.remainingGrams=-1;assert.throws(()=>h.run('validateBackup(input)'));
});

test('早めの食材を先頭に表示し、保存場所を検索でき、HTMLを実行しない',()=>{
  const h=harness();h.run(`${categories};notes=[normalizeNote('a',{title:'<img src=x onerror=alert(1)>',categoryId:'food',food:{remainingGrams:250,storage:'frozen'}}),normalizeNote('b',{title:'キャベツ',categoryId:'food',food:{remainingGrams:500,useSoon:true}})];selectCategory('food')`);
  const html=h.element('notesGrid').innerHTML;assert.ok(html.indexOf('キャベツ')<html.indexOf('&lt;img'));assert.equal(html.includes('<img src=x'),false);
  h.element('searchInput').value='冷凍';h.run('renderNotes()');assert.equal(h.element('notesGrid').innerHTML.includes('キャベツ'),false);assert.match(h.element('notesGrid').innerHTML,/250/);
});

test('保存して次の食材へ進むと前の食材を保存し、新しい空欄を開く',async()=>{
  const h=harness();start(h);fill(h);h.run('foodEditor.bind()');await h.element('foodNextButton').onclick();
  assert.equal(h.writes.length,1);assert.equal(h.writes[0].data.food.remainingGrams,250);assert.equal(h.run('editingNote.title'),'');assert.equal(h.run('editingNote.categoryId'),'food');assert.equal(h.element('editorDialog').open,true);
});

test('食材が100件あっても全体一覧では1枚にまとまり、他のメモと登録データを保持する',()=>{
  const h=harness();h.run(`${categories};notes=Array.from({length:100},(_,i)=>normalizeNote('food-'+i,{title:'食材'+i,categoryId:'food',food:{remainingGrams:100+i}}));notes.push(normalizeNote('memo',{title:'通常のメモ',categoryId:'app'}));selectCategory('all')`);
  const html=h.element('notesGrid').innerHTML;
  assert.equal((html.match(/<article /g)||[]).length,2);
  assert.equal((html.match(/data-open-food-list=/g)||[]).length,1);
  assert.match(html,/在庫 100件/);assert.match(html,/通常のメモ/);
  assert.match(h.element('noteCount').textContent,/2件/);
  assert.equal(h.run('notes.length'),101);assert.equal(h.writes.length,0);
  h.run("selectCategory('food')");
  assert.equal((h.element('notesGrid').innerHTML.match(/class="food-row /g)||[]).length,100);
  assert.equal(h.element('notesGrid').innerHTML.includes('class="note-card'),false);
  assert.equal(h.run('notes[99].food.remainingGrams'),199);assert.equal(h.writes.length,0);
});

test('全体検索も一致した食材を1枚にまとめ、食材一覧へ検索条件を引き継ぐ',()=>{
  const h=harness();h.run(`${categories};notes=[normalizeNote('a',{title:'豚こま',categoryId:'food',food:{remainingGrams:250,storage:'frozen'}}),normalizeNote('b',{title:'キャベツ',categoryId:'food',food:{remainingGrams:500,storage:'chilled'}})]`);
  h.element('searchInput').value='冷凍';h.run("selectCategory('all')");
  assert.equal((h.element('notesGrid').innerHTML.match(/<article /g)||[]).length,1);
  assert.match(h.element('notesGrid').innerHTML,/豚こま/);assert.equal(h.element('notesGrid').innerHTML.includes('キャベツ'),false);
  h.run("selectCategory('food')");assert.equal(h.element('searchInput').value,'冷凍');
  assert.match(h.element('notesGrid').innerHTML,/豚こま/);assert.equal(h.element('notesGrid').innerHTML.includes('キャベツ'),false);
  h.element('searchInput').value='該当なし';h.run('renderNotes()');assert.equal(h.element('notesGrid').innerHTML,'');assert.equal(h.element('emptyState').hidden,false);
});

test('集約カードの在庫数とプレビューは使い切った食材を除き、未計量を区別する',()=>{
  const h=harness();h.run(`${categories};notes=[normalizeNote('done',{title:'使い切り',categoryId:'food',food:{remainingGrams:0,useSoon:true}}),normalizeNote('unknown',{title:'未計量の豆腐',categoryId:'food'})];selectCategory('all')`);
  const html=h.element('notesGrid').innerHTML;assert.match(html,/在庫 1件/);assert.match(html,/未計量/);assert.equal(html.includes('使い切り'),false);assert.equal(html.includes('早めに使いたい'),false);
  h.run("selectCategory('food')");assert.match(h.element('completedFoodsGrid').innerHTML,/使い切り/);assert.match(h.element('notesGrid').innerHTML,/未計量/);
});
