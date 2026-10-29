import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFoodQuantity,normalizeFoodList,foodInventoryFromSources,foodInventoryId,normalizeFoodItem } from '../food-core.mjs';
import { harness,tick } from './harness.mjs';
const cats="categories=[{id:'food',name:'食材',color:'#38A169'},{id:'app',name:'アプリ',color:'#FF7F00'}]";
const rootId=foodInventoryId('food'),path=id=>`users/test-user/iroiroNotes/${id}`;
function start(sources=[]){const h=harness(sources.map(([id,data])=>[path(id),data]));h.context.sources=sources;h.run(`${cats};notes=sources.map(([id,data])=>normalizeNote(id,data));openFoodInventory('food')`);return h}
function add(h,name='豚こま',quantity='150',unit='g',copies=1,extra={}){h.run('foodEditor.openDraft()');h.element('foodItemNameInput').value=name;h.element('foodQuantityInput').value=quantity;h.element('foodUnitInput').value=unit;for(const [id,value]of Object.entries(extra))h.element(id)[typeof value==='boolean'?'checked':'value']=value;return h.run(`foodEditor.commitDraft(${copies})`)}
function reload(h){h.context.saved=h.store.get(path(rootId));h.run(`notes=notes.filter(note=>note.id!=='${rootId}');notes.push(normalizeNote('${rootId}',saved));openFoodInventory('food')`)}
function select(h,id){h.run('foodEditor.bind()');h.element('foodItemsList').onchange({target:{dataset:{foodCheck:id},checked:true}})}
function choosePreset(h,name,checked=true){if(!h.element('foodPresetChoices').onchange)h.run('foodEditor.bind()');h.element('foodPresetChoices').onchange({target:{dataset:{foodPreset:name},checked}})}

 test('量は数値・分数・全角を受け付け、0・負数・0除算・式を拒否する',()=>{
  for(const [value,expected]of [['150',150],['1/2',.5],['１／２',.5],['0.5',.5],['1',1]])assert.equal(parseFoodQuantity(value),expected);
  for(const value of ['','0','-1','1/0','a','1+2','Infinity','1e3','1/2/3'])assert.equal(parseFoodQuantity(value),null,value);
});
 test('同じ豚こま150gを2項目として1枚のカードに保存し、再読込できる',async()=>{
  const h=start();assert.equal(add(h,'豚こま','150','g',2),true);assert.equal(h.run('editingNote.foodList.items.length'),2);
  assert.notEqual(h.run('editingNote.foodList.items[0].id'),h.run('editingNote.foodList.items[1].id'));
  await h.run('closeEditor()');assert.equal(h.writes.length,1);assert.equal(h.writes[0].ref,path(rootId));assert.equal(h.writes[0].data.title,'食材');assert.equal(h.writes[0].data.categoryId,'food');
  reload(h);assert.equal(h.run('editingNote.foodList.items.length'),2);assert.equal(h.run('editingNote.foodList.items[0].quantity'),'150');
});
 test('1/2玉と1本をそのまま保存し、gへ換算しない',async()=>{
  const h=start();add(h,'キャベツ','1/2','玉');add(h,'にんじん','1','本');await h.run('closeEditor()');
  const items=h.store.get(path(rootId)).foodList.items;assert.equal(items[0].quantity,'1/2');assert.equal(items[0].unit,'玉');assert.equal(items[1].unit,'本');assert.equal(Object.hasOwn(items[0],'remainingGrams'),false);
});
 test('保存場所・早めフラグ・期限・メモを項目ごとに保持し、独自の単位も保存する',async()=>{
  const h=start();add(h,'鮭','2','custom',1,{foodCustomUnitInput:'切れ',foodStorageInput:'frozen',foodUseSoonInput:true,foodExpiryKindInput:'useBy',foodExpiryDateInput:'2026-11-01',foodItemMemoInput:'開封済み https://example.com/'});await h.run('closeEditor()');
  const saved=h.store.get(path(rootId)),item=saved.foodList.items[0];assert.equal(item.unit,'切れ');assert.equal(item.storage,'frozen');assert.equal(item.useSoon,true);assert.equal(item.expiryDate,'2026-11-01');assert.match(item.memo,/開封済み/);assert.equal(saved.urls[0].url,'https://example.com/');
});
 test('チェックした150gだけを削除し、もう1項目を残して元に戻せる',async()=>{
  const h=start();add(h,'豚こま','150','g',2);const a=h.run('editingNote.foodList.items[0].id'),b=h.run('editingNote.foodList.items[1].id');select(h,a);
  assert.equal(h.run('foodEditor.deleteChecked()'),true);assert.equal(h.run('editingNote.foodList.items.length'),1);assert.equal(h.run('editingNote.foodList.items[0].id'),b);
  assert.equal(h.run('foodEditor.undoDelete()'),true);assert.equal(h.run('editingNote.foodList.items[0].id'),a);assert.equal(h.run('editingNote.foodList.items[0].checked'),false);await h.run('closeEditor()');assert.equal(h.store.get(path(rootId)).foodList.items.length,2);
});
 test('すべて削除しても食材カードは残り、旧170gが再取込されない',async()=>{
  const original={title:'食材',categoryId:'food',food:{remainingGrams:170,storage:'chilled'}};const h=start([['old',original]]);
  select(h,h.run('editingNote.foodList.items[0].id'));h.run('foodEditor.deleteChecked()');await h.run('closeEditor()');reload(h);
  assert.equal(h.run('editingNote.foodList.items.length'),0);assert.equal(h.run('editingNote.foodList.importedSources.old'),true);
  assert.deepEqual(h.store.get(path('old')),original);h.run("selectCategory('food')");assert.equal((h.element('notesGrid').innerHTML.match(/<article /g)||[]).length,1);
});
 test('旧170gの値・補足・期限を引き継ぎ、原本は変更しない',async()=>{
  const original={title:'にんじん',categoryId:'food',content:'開封済み',food:{remainingGrams:170,storage:'chilled',useSoon:true,expiryKind:'bestBefore',expiryDate:'2026-11-01'}};const h=start([['old',original]]);
  assert.equal(h.run('editingNote.foodList.items[0].quantity'),'170');assert.equal(h.run('editingNote.foodList.items[0].memo'),'開封済み');assert.equal(h.writes.length,0);
  add(h,'キャベツ','1/2','玉');await h.run('closeEditor()');assert.deepEqual(h.store.get(path('old')),original);assert.equal(h.writes.every(x=>x.ref===path(rootId)),true);
  reload(h);assert.equal(h.run('editingNote.foodList.items.length'),2);
});
 test('取り込み前に旧記録が別端末で変わった場合は上書きせず入力を保持する',async()=>{
  const original={title:'豚こま',categoryId:'food',food:{remainingGrams:170}};const h=start([['old',original]]);add(h);h.store.set(path('old'),{...original,food:{remainingGrams:100}});
  assert.equal(await h.run('requestSave()'),false);assert.equal(h.store.has(path(rootId)),false);assert.equal(h.run('editingNote.foodList.items.length'),2);
});
 test('別端末が同時に初回作成しても同じカードへ項目を統合する',async()=>{
  const h=start();add(h);h.store.set(path(rootId),{title:'食材',categoryId:'food',foodList:normalizeFoodList({items:[{id:'remote',name:'卵',quantity:'2',unit:'個'}]})});
  assert.equal(await h.run('requestSave()'),true);const saved=h.store.get(path(rootId));assert.equal(saved.foodList.items.length,2);assert.ok(saved.foodList.items.some(item=>item.id==='remote'));assert.equal(h.writes.every(x=>x.ref===path(rootId)),true);
});
 test('別端末の追記と手元の追記をIDで統合する',async()=>{
  const original={title:'食材',categoryId:'food',foodList:normalizeFoodList({items:[{id:'a',name:'豚こま',quantity:'150',unit:'g'}]})};const h=start([[rootId,original]]);add(h,'キャベツ','1/2','玉');
  h.store.set(path(rootId),{...original,foodList:normalizeFoodList({items:[...original.foodList.items,{id:'remote',name:'卵',quantity:'2',unit:'個'}]})});
  assert.equal(await h.run('requestSave()'),true);assert.equal(h.store.get(path(rootId)).foodList.items.length,3);
});
 test('初回取り込みが同時実行されても、手元で削除した旧項目を復活させない',async()=>{
  const old={title:'豚こま',categoryId:'food',food:{remainingGrams:170}},h=start([['old',old]]);
  select(h,'legacy-old');h.run('foodEditor.deleteChecked()');
  h.store.set(path(rootId),{title:'食材',categoryId:'food',foodList:foodInventoryFromSources('food',[{id:'old',...old}]).foodList});
  assert.equal(await h.run('requestSave()'),true);assert.equal(h.store.get(path(rootId)).foodList.items.length,0);assert.equal(h.store.get(path(rootId)).foodList.importedSources.old,true);
});
 test('同じ項目の異なる量や、削除と編集の競合は保存を止める',async()=>{
  const original={title:'食材',categoryId:'food',foodList:normalizeFoodList({items:[{id:'a',name:'豚こま',quantity:'150',unit:'g'}]})};
  const h=start([[rootId,original]]);h.run("foodEditor.openDraft('a')");h.element('foodQuantityInput').value='100';h.run('foodEditor.commitDraft()');h.store.set(path(rootId),{...original,foodList:normalizeFoodList({items:[{...original.foodList.items[0],quantity:'120'}]})});
  assert.equal(await h.run('requestSave()'),false);assert.equal(h.store.get(path(rootId)).foodList.items[0].quantity,'120');assert.equal(h.run('editingNote.foodList.items[0].quantity'),'100');
  const h2=start([[rootId,original]]);select(h2,'a');h2.run('foodEditor.deleteChecked()');h2.store.set(path(rootId),{...original,foodList:normalizeFoodList({items:[{...original.foodList.items[0],quantity:'120'}]})});assert.equal(await h2.run('requestSave()'),false);
});
 test('保存失敗後の再試行でも同じ内容の項目を増やさない',async()=>{
  const h=start();add(h,'豚こま','150','g',2);h.beforeWrite=()=>{throw Error('offline')};assert.equal(await h.run('requestSave()'),false);h.beforeWrite=null;
  assert.equal(await h.run('requestSave()'),true);assert.equal(h.store.get(path(rootId)).foodList.items.length,2);assert.equal(h.writes.length,1);
});
 test('保存待ち中に追加した項目も閉じる前に保存する',async()=>{
  const h=start();add(h);let release;let first=true;h.beforeWrite=()=>{if(first){first=false;return new Promise(resolve=>release=resolve)}};
  const saving=h.run('requestSave()');await tick();add(h,'にんじん','1','本');const closing=h.run('closeEditor()');release();await saving;await closing;
  assert.equal(h.store.get(path(rootId)).foodList.items.length,2);assert.equal(h.element('editorDialog').open,false);
});
 test('不正な量や空の独自単位を追加せず、入力を保持する',()=>{
  const h=start();for(const amount of ['-1','0','1/0','abc']){assert.equal(add(h,'キャベツ',amount,'玉'),false);assert.equal(h.run('editingNote.foodList.items.length'),0);assert.equal(h.element('foodQuantityInput').value,amount)}
  assert.equal(add(h,'鮭','2','custom',1,{foodCustomUnitInput:''}),false);assert.equal(h.writes.length,0);
});
 test('食材が100件でも全体一覧と食材カテゴリーは1カードだけで原本を変更しない',()=>{
  const sources=Array.from({length:100},(_,i)=>['old'+i,{title:'食材'+i,categoryId:'food',food:{remainingGrams:100+i}}]);const h=start(sources);h.run("selectCategory('all')");assert.equal((h.element('notesGrid').innerHTML.match(/<article /g)||[]).length,1);h.run("selectCategory('food')");assert.equal((h.element('notesGrid').innerHTML.match(/<article /g)||[]).length,1);assert.equal(h.run('editingNote.foodList.items.length'),100);assert.equal(h.writes.length,0);
});
 test('食材名・単位・メモを検索でき、HTMLを実行しない',()=>{
  const h=start();add(h,'<img src=x onerror=alert(1)>','1/2','玉',1,{foodItemMemoInput:'開封済み'});assert.equal(h.element('foodItemsList').innerHTML.includes('<img src=x'),false);assert.match(h.element('foodItemsList').innerHTML,/&lt;img/);
  const note=h.run('structuredClone(editingNote)');h.context.note=note;h.run('notes=[note]');h.element('searchInput').value='開封済み';h.run("selectCategory('all')");assert.match(h.element('notesGrid').innerHTML,/&lt;img/);h.element('searchInput').value='該当なし';h.run('renderNotes()');assert.equal(h.element('notesGrid').innerHTML,'');
});
 test('バックアップに一覧と取込済みIDを含め、重複IDや不正量を復元前に拒否する',()=>{
  const h=start();const data={title:'食材',categoryId:'food',foodList:normalizeFoodList({items:[{id:'a',name:'キャベツ',quantity:'1/2',unit:'玉'}],importedSources:{old:true}})};
  const raw={app:'iroiro',backupFormatVersion:1,data:{notes:[{id:rootId,note:data}],settings:{categories:[{id:'food',name:'食材'}]}}};h.context.raw=raw;h.run('candidate=validateBackup(raw);saved=backupNote(candidate.notes[0].id,candidate.notes[0].data)');assert.equal(h.run('saved.note.foodList.items[0].quantity'),'1/2');assert.equal(h.run('saved.note.foodList.importedSources.old'),true);
  h.context.raw.data.notes[0].note.foodList.items[0].quantity='1/0';assert.throws(()=>h.run('validateBackup(raw)'));
});
 test('量未設定の古いメモも安全に一覧化し、同じ名前の項目を統合しない',()=>{
  const list=foodInventoryFromSources('food',[{id:'a',title:'豚こま',food:{remainingGrams:150}},{id:'b',title:'豚こま',food:{remainingGrams:150}},{id:'c',title:'古いメモ'}]).foodList;
  assert.equal(list.items.length,3);assert.equal(list.items[2].quantity,'');assert.notEqual(list.items[0].id,list.items[1].id);
  assert.equal(normalizeFoodItem({storage:'constructor'}).storage,'');
});

 test('共通の＋から空のメモを作って食材を選んでも、実際の題名が入り空のまま閉じられる',async()=>{
  const h=harness();h.run(`${cats};selectCategory('app');openEditor(createNote())`);
  h.element('noteCategorySelect').value='food';h.run('handleCategoryChange()');
  assert.equal(h.element('noteTitleInput').value,'食材');assert.equal(h.run('editingNote.title'),'食材');
  assert.equal(h.run('editingNote.id'),rootId);assert.equal(h.element('noteTitleInput').readOnly,true);
  assert.equal(h.element('saveStatus').textContent,'未保存（空の食材カード）');
  await h.run('closeEditor()');assert.equal(h.element('editorDialog').open,false);assert.equal(h.writes.length,0);
});

 test('共通の＋→食材→170gを追加した経路でも、保存済みになり戻るで一覧へ戻れる',async()=>{
  const h=harness();h.run(`${cats};selectCategory('app');openEditor(createNote())`);
  h.element('noteCategorySelect').value='food';h.run('handleCategoryChange()');add(h,'豚こま','170','g');
  assert.equal(await h.run('requestSave()'),true);assert.equal(h.element('saveStatus').textContent,'保存済み');
  await h.run('closeEditor()');assert.equal(h.element('editorDialog').open,false);
  assert.equal(h.store.get(path(rootId)).foodList.items[0].quantity,'170');assert.equal(h.writes.length,1);
});

 test('共通の＋から食材を選んでも既存の食材カードと項目を引き継ぎ、新しいカードを増やさない',async()=>{
  const original={title:'食材',categoryId:'food',foodList:normalizeFoodList({items:[{id:'existing',name:'キャベツ',quantity:'1/2',unit:'玉'}]})};
  const h=harness([[path(rootId),original]]);h.context.original=original;
  h.run(`${cats};notes=[normalizeNote('${rootId}',original)];selectCategory('app');openEditor(createNote())`);
  h.element('noteCategorySelect').value='food';h.run('handleCategoryChange()');
  assert.equal(h.run('editingNote.foodList.items[0].id'),'existing');add(h,'豚こま','170','g');await h.run('closeEditor()');
  assert.equal(h.element('editorDialog').open,false);assert.equal(h.store.get(path(rootId)).foodList.items.length,2);assert.equal(h.writes.every(write=>write.ref===path(rootId)),true);
});

 test('題名の検証で保存が止まった場合は保存中表示を残さず、修正して再保存できる',async()=>{
  const h=start();add(h,'豚こま','170','g');h.element('noteTitleInput').value='';
  assert.equal(await h.run('requestSave()'),false);assert.equal(h.run('saveInProgress'),false);
  assert.equal(h.element('saveStatus').textContent,'未保存（入力内容を確認）');assert.equal(h.writes.length,0);
  h.element('noteTitleInput').value='食材';h.run('syncEditingNoteFromForm();scheduleSave()');
  assert.equal(await h.run('requestSave()'),true);assert.equal(h.element('foodError').hidden,true);
  assert.equal(h.element('saveStatus').textContent,'保存済み');await h.run('closeEditor()');assert.equal(h.element('editorDialog').open,false);
});

 test('入力済みの新規メモは食材への切り替えで既存カードに置き換えず、本文を保持する',()=>{
  const h=harness();h.run(`${cats};selectCategory('app');openEditor(createNote())`);
  h.element('noteContentInput').value='入力済みの本文';h.run('syncEditingNoteFromForm();scheduleSave()');
  h.element('noteCategorySelect').value='food';h.run('handleCategoryChange()');
  assert.equal(h.run('editingNote.id'),'');assert.equal(h.run('editingNote.content'),'入力済みの本文');assert.equal(h.element('noteTitleInput').value,'食材');
});

 test('新規作成でも食材以外のカテゴリーには題名を自動入力しない',()=>{
  const h=harness();h.run(`${cats};openEditor(createNote())`);
  h.element('noteCategorySelect').value='app';h.run('handleCategoryChange()');
  assert.equal(h.element('noteTitleInput').value,'');assert.equal(h.run('editingNote.title'),'');
  assert.equal(h.element('noteTitleInput').readOnly,false);
});

 test('新規メモに入力した題名は食材を選んでも上書きしない',()=>{
  const h=harness();h.run(`${cats};selectCategory('app');openEditor(createNote())`);
  h.element('noteTitleInput').value='買ってきた食材';
  h.element('noteCategorySelect').value='food';h.run('handleCategoryChange()');
  assert.equal(h.element('noteTitleInput').value,'買ってきた食材');assert.equal(h.run('editingNote.title'),'買ってきた食材');
});

 test('既存メモを食材へ変更しても空の題名に自動入力せず、手動で題名を補って保存できる',async()=>{
  const original={title:'',categoryId:'app',content:'保存済みの本文'};
  const h=harness([[path('existing'),original]]);h.context.original=original;
  h.run(`${cats};openEditor(normalizeNote('existing',original))`);
  h.element('noteCategorySelect').value='food';h.run('handleCategoryChange()');
  assert.equal(h.element('noteTitleInput').value,'');assert.equal(h.run('editingNote.title'),'');assert.equal(h.element('noteTitleInput').readOnly,false);
  assert.equal(await h.run('requestSave()'),false);assert.equal(h.element('saveStatus').textContent,'未保存（入力内容を確認）');
  h.element('noteTitleInput').value='冷蔵庫の食材';h.run('syncEditingNoteFromForm();scheduleSave()');
  assert.equal(await h.run('requestSave()'),true);await h.run('closeEditor()');
  assert.equal(h.store.get(path('existing')).title,'冷蔵庫の食材');assert.equal(h.store.get(path('existing')).content,original.content);assert.equal(h.element('editorDialog').open,false);
});

 test('既存メモを食材へ変更しても保存済みの題名を保持する',()=>{
  const h=harness();h.run(`${cats};openEditor(normalizeNote('existing',{title:'元の題名',categoryId:'app'}))`);
  h.element('noteCategorySelect').value='food';h.run('handleCategoryChange()');
  assert.equal(h.element('noteTitleInput').value,'元の題名');assert.equal(h.run('editingNote.title'),'元の題名');
});

 test('食材にも削除ボタンを表示し、確認を開くだけでは内容を削除しない',()=>{
  const original={title:'豚こま',categoryId:'food',food:{remainingGrams:170}},h=start([['old',original]]);
  assert.equal(h.element('deleteNoteButton').hidden,false);h.run('confirmDelete()');
  assert.equal(h.element('confirmDialog').open,true);assert.match(h.element('deleteConfirmMessage').textContent,/すべて削除/);
  h.element('confirmDialog').close();assert.equal(h.store.has(path('old')),true);assert.equal(h.run('editingNote.foodList.items.length'),1);
});

 test('旧形式だけの食材カードも削除でき、一覧と再読込から消え、＋で空のカードを作り直せる',async()=>{
  const h=start([['old',{title:'豚こま',categoryId:'food',food:{remainingGrams:170}}],['other',{title:'通常のメモ',categoryId:'app',content:'残す'}]]);
  await h.run('deleteCurrentNote()');assert.equal(h.store.has(path('old')),false);assert.equal(h.store.has(path(rootId)),false);assert.equal(h.store.has(path('other')),true);
  assert.equal(h.element('editorDialog').open,false);h.run("selectCategory('food')");assert.equal(h.element('notesGrid').innerHTML,'');
  h.run("notes=notes.filter(note=>note.categoryId!=='food');openEditor(createNote())");assert.equal(h.run('editingNote.title'),'食材');assert.equal(h.run('editingNote.foodList.items.length'),0);
  add(h,'にんじん','1','本');await h.run('closeEditor()');reload(h);assert.equal(h.run('editingNote.foodList.items.length'),1);assert.equal(h.run('editingNote.foodList.items[0].name'),'にんじん');
});

 test('固定食材カードと取込済み・未取込の旧食材をまとめて削除し、他カテゴリーは残す',async()=>{
  const original={title:'食材',categoryId:'food',foodList:normalizeFoodList({items:[{id:'a',name:'卵',quantity:'2',unit:'個'}],importedSources:{old:true}})};
  const h=start([[rootId,original],['old',{title:'豚こま',categoryId:'food',food:{remainingGrams:170}}],['new-old',{title:'キャベツ',categoryId:'food',food:{remainingGrams:300}}],['other',{title:'残す',categoryId:'app'}]]);
  await h.run('deleteCurrentNote()');assert.equal(h.store.has(path(rootId)),false);assert.equal(h.store.has(path('old')),false);assert.equal(h.store.has(path('new-old')),false);assert.equal(h.store.has(path('other')),true);
  h.run("selectCategory('all')");assert.equal(h.element('notesGrid').innerHTML.includes('data-food-category'),false);
});

 test('削除の通信失敗では一部だけ削除せず、確認画面と食材を保持して再試行できる',async()=>{
  const h=start([['a',{title:'豚こま',categoryId:'food',food:{remainingGrams:170}}],['b',{title:'卵',categoryId:'food',food:{remainingGrams:100}}]]);
  h.run('confirmDelete()');h.beforeDelete=ref=>{if(ref===path('b'))throw Error('offline')};await h.run('deleteCurrentNote()');
  assert.equal(h.store.has(path('a')),true);assert.equal(h.store.has(path('b')),true);assert.equal(h.element('editorDialog').open,true);assert.equal(h.element('confirmDialog').open,true);assert.equal(h.element('confirmDeleteButton').disabled,false);
  h.beforeDelete=null;await h.run('deleteCurrentNote()');assert.equal(h.store.has(path('a')),false);assert.equal(h.store.has(path('b')),false);
});

 test('別端末で食材カードが編集されたら削除を止め、追記を消さない',async()=>{
  const original={title:'食材',categoryId:'food',foodList:normalizeFoodList({items:[{id:'a',name:'卵',quantity:'2',unit:'個'}]})},h=start([[rootId,original]]);
  h.store.set(path(rootId),{...original,foodList:normalizeFoodList({items:[...original.foodList.items,{id:'remote',name:'キャベツ',quantity:'1/2',unit:'玉'}]})});
  await h.run('deleteCurrentNote()');assert.equal(h.store.get(path(rootId)).foodList.items.length,2);assert.equal(h.element('editorDialog').open,true);assert.match(h.element('syncStatus').textContent,/別の端末/);
});

 test('旧食材が編集・移動されたら削除を止め、他カテゴリーに移ったメモを消さない',async()=>{
  const old={title:'豚こま',categoryId:'food',food:{remainingGrams:170}},h=start([['old',old]]);h.store.set(path('old'),{...old,categoryId:'app'});
  await h.run('deleteCurrentNote()');assert.equal(h.store.get(path('old')).categoryId,'app');assert.equal(h.element('editorDialog').open,true);
});

 test('別端末で同じ食材カードが新規作成された場合も未確認の内容を削除しない',async()=>{
  const h=start();h.store.set(path(rootId),{title:'食材',categoryId:'food',foodList:normalizeFoodList({items:[{id:'remote',name:'卵',quantity:'2',unit:'個'}]})});
  await h.run('deleteCurrentNote()');assert.equal(h.store.get(path(rootId)).foodList.items.length,1);assert.equal(h.element('editorDialog').open,true);
});

 test('保存待ち中の削除は保存完了を待ち、戻るや連打で処理を重ねない',async()=>{
  const h=start();add(h);let release;h.beforeWrite=()=>new Promise(resolve=>release=resolve);
  const saving=h.run('requestSave()');await tick();const removing=h.run('deleteCurrentNote()');await h.run('closeEditor()');await h.run('deleteCurrentNote()');
  assert.equal(h.element('editorDialog').open,true);assert.equal(h.element('confirmDeleteButton').disabled,true);
  release();await saving;await removing;assert.equal(h.store.has(path(rootId)),false);assert.equal(h.element('editorDialog').open,false);
});

 test('削除待ち中にアカウントが変わった場合は次のアカウントのメモを削除しない',async()=>{
  const h=start();add(h);let release;h.beforeWrite=()=>new Promise(resolve=>release=resolve);
  const saving=h.run('requestSave()');await tick();const removing=h.run('deleteCurrentNote()');h.run("currentUser={uid:'other-user'}");release();await saving;await removing;
  assert.equal(h.store.has(path(rootId)),true);assert.equal(h.element('editorDialog').open,true);
});

 test('通常メモの削除ボタン・確認文・削除動作を維持する',async()=>{
  const original={title:'通常メモ',categoryId:'app',content:'本文'},h=harness([[path('ordinary'),original]]);h.context.original=original;
  h.run(`${cats};notes=[normalizeNote('ordinary',original)];openEditor(notes[0]);confirmDelete()`);
  assert.equal(h.element('deleteNoteButton').hidden,false);assert.equal(h.element('deleteConfirmTitle').textContent,'このメモを削除しますか？');
  await h.run('deleteCurrentNote()');assert.equal(h.store.has(path('ordinary')),false);assert.equal(h.element('editorDialog').open,false);
});

 test('通常候補のまとめ追加は名前だけ・冷蔵で登録し、手入力の内容を上書きしない',()=>{
  const h=start();h.run('foodEditor.bind();foodEditor.openDraft()');
  for(const name of ['豚こま','鶏もも肉','鶏むね肉','キャベツ','にんじん','豆腐'])assert.ok(h.element('foodPresetChoices').innerHTML.includes(`data-food-preset="${name}"`));
  h.element('foodItemNameInput').value='手入力';h.element('foodQuantityInput').value='150';h.element('foodUnitInput').value='g';h.element('foodStorageInput').value='frozen';choosePreset(h,'鮭');
  assert.equal(h.run('foodEditor.canClose()'),false);assert.equal(h.run('foodEditor.addSelectedPresets()'),true);
  assert.equal(h.element('foodItemNameInput').value,'手入力');assert.equal(h.element('foodQuantityInput').value,'150');assert.equal(h.element('foodStorageInput').value,'frozen');
  assert.equal(h.run('editingNote.foodList.items[0].name'),'鮭');assert.equal(h.run('editingNote.foodList.items[0].quantity'),'');assert.equal(h.run('editingNote.foodList.items[0].storage'),'chilled');
});

 test('定番以外の自由入力名も次の候補に追加し、HTMLを実行せずに表示する',()=>{
  const h=start();add(h,'<自家製つくね>','150');
  assert.match(h.element('foodPresetChoices').innerHTML,/登録済みの食材/);assert.match(h.element('foodPresetChoices').innerHTML,/&lt;自家製つくね&gt;/);assert.equal(h.element('foodPresetChoices').innerHTML.includes('<自家製つくね>'),false);
});

 test('新しい食材は冷蔵が初期値で、既存の冷凍・常温・未設定は編集しても保持する',()=>{
  const h=start();h.run('foodEditor.openDraft()');assert.equal(h.element('foodStorageInput').value,'chilled');
  add(h,'冷蔵の卵','2','個');assert.equal(h.run('editingNote.foodList.items[0].storage'),'chilled');
  for(const storage of ['frozen','ambient','']){
    add(h,'既存の食材','1','個',1,{foodStorageInput:storage});const id=h.run('editingNote.foodList.items.at(-1).id');h.context.itemId=id;
    h.run('foodEditor.openDraft(itemId)');assert.equal(h.element('foodStorageInput').value,storage);h.run('foodEditor.commitDraft()');
    h.run('foodEditor.openDraft()');assert.equal(h.element('foodStorageInput').value,'chilled');
  }
});

 test('一覧は3項目と3行目の省略記号・星を表示し、開いて編集の案内は出さない',()=>{
  const h=start();for(let i=0;i<5;i++)add(h,'豚こま'+i,'150');const html=h.run('renderFoodSummaryCard(editingNote)');
  assert.equal((html.match(/class="card-list-item /g)||[]).length,3);assert.ok(html.includes('150g…</div>'));assert.ok(!html.includes('豚こま3'));assert.ok(!html.includes('開いて編集'));
  assert.match(html,/data-pin-note="food-inventory-food"[^>]*>☆<\/button>/);
});

 test('既存の食材カードの星を切り替えても食材・本文・更新日を変更しない',async()=>{
  const original={title:'食材',categoryId:'food',content:'補足',updatedAt:'2026-01-01',isPinned:false,foodList:normalizeFoodList({items:[{id:'a',name:'卵',quantity:'2',unit:'個'}]})},h=start([[rootId,original]]);
  assert.equal(await h.run(`toggleNotePin('${rootId}')`),true);assert.deepEqual(h.store.get(path(rootId)),{...original,isPinned:true});assert.equal(h.element('editorDialog').open,true);
  assert.equal(await h.run(`toggleNotePin('${rootId}')`),true);assert.deepEqual(h.store.get(path(rootId)),original);
});

 test('旧形式だけの食材も星を押すと1枚のカードへ保存し、最新の量と元データを保持する',async()=>{
  const old={title:'豚こま',categoryId:'food',updatedAt:'2026-01-01',food:{remainingGrams:170}},h=start([['old',old]]);
  h.store.set(path('old'),{...old,food:{remainingGrams:150}});
  assert.equal(await h.run(`toggleNotePin('${rootId}')`),true);const saved=h.store.get(path(rootId));assert.equal(saved.isPinned,true);assert.equal(saved.foodList.items[0].quantity,'150');assert.equal(h.store.get(path('old')).food.remainingGrams,150);
  h.run("selectCategory('food')");assert.equal((h.element('notesGrid').innerHTML.match(/<article /g)||[]).length,1);assert.equal(await h.run(`toggleNotePin('${rootId}')`),true);assert.equal(h.store.get(path(rootId)).isPinned,false);
});

 test('食材のピン留め保存中は連打を防ぎ、カードを開くときに保存結果を待つ',async()=>{
  const original={title:'食材',categoryId:'food',isPinned:false,foodList:normalizeFoodList()},h=start([[rootId,original]]);h.element('editorDialog').close();h.run('editingNote=null');
  let release;h.beforeWrite=()=>new Promise(resolve=>release=resolve);const pin=h.run(`toggleNotePin('${rootId}')`);await tick();const opening=h.run("openFoodInventory('food')");
  assert.equal(await h.run(`toggleNotePin('${rootId}')`),false);assert.match(h.element('notesGrid').innerHTML,/aria-pressed="true"[^>]*disabled/);assert.equal(h.element('editorDialog').open,false);
  release();await pin;await opening;assert.equal(h.run('editingNote.isPinned'),true);
});

 test('食材のピン留め失敗は表示を戻し、アカウント変更後の表示に干渉しない',async()=>{
  const original={title:'食材',categoryId:'food',isPinned:false,foodList:normalizeFoodList()},h=start([[rootId,original]]);h.beforeWrite=()=>{throw Error('offline')};
  assert.equal(await h.run(`toggleNotePin('${rootId}')`),false);assert.match(h.element('notesGrid').innerHTML,/aria-pressed="false"/);assert.equal(h.store.get(path(rootId)).isPinned,false);
  let fail;h.beforeWrite=()=>new Promise((resolve,reject)=>fail=reject);const pending=h.run(`toggleNotePin('${rootId}')`);await tick();const opening=h.run("openFoodInventory('food')");
  h.run("currentUser={uid:'other-user'};notes=[];editingNote=null");h.element('editorDialog').close();h.element('syncStatus').textContent='同期済み';fail(Error('offline'));await pending;await opening;
  assert.equal(h.element('syncStatus').textContent,'同期済み');assert.equal(h.element('editorDialog').open,false);
});

 test('別端末で削除された食材を星の操作で復活させない',async()=>{
  const original={title:'食材',categoryId:'food',foodList:normalizeFoodList()},h=start([[rootId,original]]);h.store.delete(path(rootId));
  assert.equal(await h.run(`toggleNotePin('${rootId}')`),false);assert.equal(h.store.has(path(rootId)),false);
});

 test('名前だけで連続追加でき、入力欄を開き直さずに保存・再読込できる',async()=>{
  const h=start();assert.equal(h.element('foodItemForm').hidden,false);assert.equal(h.element('foodOptions').open,false);
  for(const name of ['豚こま','キャベツ','にんじん']){
    h.element('foodItemNameInput').value=name;assert.equal(h.run('foodEditor.commitDraft()'),true);
    assert.equal(h.element('foodItemForm').hidden,false);assert.equal(h.element('foodItemNameInput').value,'');assert.equal(h.element('foodOptions').open,false);assert.equal(h.run('foodEditor.canClose()'),true);
  }
  await h.run('closeEditor()');reload(h);const items=h.run('editingNote.foodList.items');assert.equal(items.length,3);assert.equal(new Set(items.map(item=>item.id)).size,3);
  for(const item of items){assert.equal(item.quantity,'');assert.equal(item.storage,'chilled')}
  assert.match(h.element('foodItemsList').innerHTML,/量未設定/);
});

 test('自由入力のEnterで名前だけ追加でき、日本語の変換確定Enterでは追加しない',()=>{
  const h=start();h.run('foodEditor.bind()');h.element('foodItemNameInput').value='キャベツ';
  let prevented=0;const event={key:'Enter',preventDefault(){prevented++},stopPropagation(){}};
  h.element('foodItemNameInput').onkeydown({...event,isComposing:true});h.element('foodItemNameInput').onkeydown({...event,keyCode:229});assert.equal(h.run('editingNote.foodList.items.length'),0);
  h.element('foodItemNameInput').onkeydown(event);assert.equal(prevented,1);assert.equal(h.run('editingNote.foodList.items[0].name'),'キャベツ');assert.equal(h.run('editingNote.foodList.items[0].quantity'),'');
});

 test('名前だけで追加した項目を開いて量・単位・保存場所・期限・メモを同じIDで追記できる',async()=>{
  const h=start();h.element('foodItemNameInput').value='キャベツ';h.run('foodEditor.commitDraft()');await h.run('requestSave()');
  const id=h.run('editingNote.foodList.items[0].id');h.context.itemId=id;h.run('foodEditor.openDraft(itemId)');assert.equal(h.element('foodOptions').open,true);
  h.element('foodQuantityInput').value='1/2';h.element('foodUnitInput').value='玉';h.element('foodStorageInput').value='frozen';h.element('foodExpiryKindInput').value='bestBefore';h.element('foodExpiryDateInput').value='2026-11-01';h.element('foodItemMemoInput').value='カット済み';
  assert.equal(h.run('foodEditor.commitDraft()'),true);assert.equal(h.element('foodItemForm').hidden,true);await h.run('closeEditor()');reload(h);
  const items=h.run('editingNote.foodList.items');assert.equal(items.length,1);assert.equal(items[0].id,id);assert.equal(items[0].quantity,'1/2');assert.equal(items[0].unit,'玉');assert.equal(items[0].storage,'frozen');assert.equal(items[0].expiryDate,'2026-11-01');assert.equal(items[0].memo,'カット済み');
});

 test('既存の食材の量を空欄にして量未設定へ戻せるが、不正な数値は保存しない',()=>{
  const h=start();add(h);const id=h.run('editingNote.foodList.items[0].id');h.context.itemId=id;h.run('foodEditor.openDraft(itemId)');h.element('foodQuantityInput').value='';assert.equal(h.run('foodEditor.commitDraft()'),true);assert.equal(h.run('editingNote.foodList.items[0].quantity'),'');
  h.run('foodEditor.openDraft(itemId)');h.element('foodQuantityInput').value='1/0';h.element('foodOptions').open=false;
  assert.equal(h.run('foodEditor.commitDraft()'),false);assert.equal(h.element('foodOptions').open,true);assert.equal(h.run('editingNote.foodList.items[0].quantity'),'');
});

 test('名前だけの項目をバックアップして復元でき、量の空欄を0に変えない',()=>{
  const h=start();h.element('foodItemNameInput').value='なすび';h.run('foodEditor.commitDraft()');h.context.savedNote=h.run('backupNote(editingNote.id,editingNote)');
  h.run("restored=validateBackup({app:'iroiro',backupFormatVersion:1,data:{notes:[savedNote],settings:{categories:[{id:'food',name:'食材'}]}}})");
  assert.equal(h.run('restored.notes[0].data.foodList.items[0].quantity'),'');assert.equal(h.run('restored.notes[0].data.foodList.items[0].name'),'なすび');
});

 test('名前が空なら追加せず、追加前の入力中は項目切り替えで捨てない',()=>{
  const h=start();assert.equal(h.run('foodEditor.commitDraft()'),false);assert.equal(h.run('editingNote.foodList.items.length'),0);
  choosePreset(h,'卵');assert.equal(h.run('foodEditor.openDraft()'),false);assert.equal(h.element('foodPresetCount').textContent,'1品選択中');assert.equal(h.run('foodEditor.canClose()'),false);
  h.element('foodItemCancelButton').onclick();assert.equal(h.run('foodEditor.canClose()'),true);
});

const usualFoods=[
  ['豚こま肉','300','g','chilled'],['鶏もも肉','250','g','chilled'],['鶏むね肉','250','g','chilled'],['豚ミンチ','280','g','chilled'],
  ['鮭中辛','4','個','chilled'],['ぶなしめじ','1','パック','chilled'],['まいたけ','1','パック','chilled'],['卵','10','個','chilled'],['豆腐','150','g','chilled'],
  ['玉ねぎみじん切り','','g','frozen'],['ブロッコリー','','g','frozen'],['ささがきごぼう','','g','frozen']
];

 test('いつもの12品を指定順で先頭に表示し、候補の表示は名前だけで重複しない',()=>{
  const h=start(),html=h.element('foodPresetChoices').innerHTML;
  assert.equal(html.match(/<legend>([^<]+)<\/legend>/)[1],'いつもの食材');
  const firstGroup=html.match(/<legend>いつもの食材<\/legend>(.*?)<\/fieldset>/)[1];
  assert.deepEqual([...firstGroup.matchAll(/<span>([^<]+)<\/span>/g)].map(match=>match[1]),usualFoods.map(item=>item[0]));
  assert.ok(!firstGroup.includes('冷蔵'));assert.ok(!firstGroup.includes('300g'));
  for(const [name]of usualFoods)assert.equal(html.split(`data-food-preset="${name}"`).length-1,1);
});

 test('いつもの12品をまとめて追加すると指定の量・単位・保存場所を保持する',async()=>{
  const h=start();h.run('foodEditor.bind()');
  for(const [name]of usualFoods)choosePreset(h,name);
  assert.equal(h.run('editingNote.foodList.items.length'),0);assert.equal(h.element('foodPresetCount').textContent,'12品選択中');
  assert.equal(h.run('foodEditor.addSelectedPresets()'),true);assert.equal(h.element('foodItemForm').hidden,false);
  await h.run('closeEditor()');reload(h);
  assert.deepEqual(Array.from(h.run('editingNote.foodList.items'),item=>[item.name,item.quantity,item.unit,item.storage]),usualFoods);
});

 test('候補の選択解除を反映し、冷凍品は他の食材の量・単位を引き継がない',()=>{
  const h=start();choosePreset(h,'まいたけ');choosePreset(h,'まいたけ',false);choosePreset(h,'ブロッコリー');
  h.element('foodQuantityInput').value='1';h.element('foodUnitInput').value='パック';
  assert.equal(h.run('foodEditor.addSelectedPresets()'),true);
  assert.equal(h.run('editingNote.foodList.items.length'),1);assert.equal(h.run('editingNote.foodList.items[0].quantity'),'');assert.equal(h.run('editingNote.foodList.items[0].unit'),'g');assert.equal(h.run('editingNote.foodList.items[0].storage'),'frozen');
});

 test('いつもの食材で入った値も手動変更でき、再描画で戻らずメモや期限を消さない',()=>{
  const h=start();choosePreset(h,'豚こま肉');h.run('foodEditor.addSelectedPresets();foodEditor.openDraft(editingNote.foodList.items[0].id)');h.element('foodItemMemoInput').value='開封済み';h.element('foodExpiryKindInput').value='useBy';h.element('foodExpiryDateInput').value='2026-11-01';
  h.element('foodQuantityInput').value='150';h.element('foodStorageInput').value='frozen';h.run('foodEditor.render()');
  assert.equal(h.element('foodQuantityInput').value,'150');assert.equal(h.element('foodStorageInput').value,'frozen');assert.equal(h.element('foodItemMemoInput').value,'開封済み');
  assert.equal(h.run('foodEditor.commitDraft()'),true);assert.equal(h.run('editingNote.foodList.items[0].quantity'),'150');assert.equal(h.run('editingNote.foodList.items[0].memo'),'開封済み');assert.equal(h.run('editingNote.foodList.items[0].expiryDate'),'2026-11-01');
});

 test('いつもの食材と同じ名前でも自由入力なら名前だけで登録できる',()=>{
  const h=start();h.element('foodItemNameInput').value='卵';assert.equal(h.run('foodEditor.commitDraft()'),true);assert.equal(h.run('editingNote.foodList.items[0].quantity'),'');
});

 test('いつもの食材と通常候補を混ぜてまとめて追加し、既存項目を変更しない',async()=>{
  const original={title:'食材',categoryId:'food',foodList:normalizeFoodList({items:[{id:'existing',name:'豚こま肉',quantity:'150',unit:'g',storage:'frozen'}]})},h=start([[rootId,original]]);
  for(const name of ['にんじん','ブロッコリー','豚こま肉','卵'])choosePreset(h,name);
  assert.equal(h.run('foodEditor.addSelectedPresets()'),true);assert.equal(h.element('foodPresetCount').textContent,'0品選択中');assert.equal(h.element('foodPresetPicker').open,false);
  await h.run('closeEditor()');const items=h.store.get(path(rootId)).foodList.items;
  assert.equal(items.length,5);assert.equal(new Set(items.map(item=>item.id)).size,5);assert.deepEqual(items[0],original.foodList.items[0]);
  const pork=items.find(item=>item.name==='豚こま肉'&&item.id!=='existing');assert.equal(pork.quantity,'300');assert.equal(pork.storage,'chilled');
  assert.equal(items.find(item=>item.name==='卵').quantity,'10');assert.equal(items.find(item=>item.name==='ブロッコリー').storage,'frozen');assert.equal(items.find(item=>item.name==='にんじん').quantity,'');
});

 test('複数候補のチェックを再描画で保持し、選択解除では追加せずに閉じられる',async()=>{
  const h=start();choosePreset(h,'卵');choosePreset(h,'キャベツ');h.run('foodEditor.render()');
  assert.match(h.element('foodPresetChoices').innerHTML,/data-food-preset="卵"[^>]* checked/);assert.equal(h.element('foodPresetCount').textContent,'2品選択中');assert.equal(h.run('foodEditor.canClose()'),false);
  choosePreset(h,'卵',false);assert.equal(h.element('foodPresetCount').textContent,'1品選択中');h.element('foodPresetClearButton').onclick();
  assert.equal(h.element('foodPresetAddButton').disabled,true);assert.equal(h.run('foodEditor.addSelectedPresets()'),false);assert.equal(h.run('editingNote.foodList.items.length'),0);
  await h.run('closeEditor()');assert.equal(h.element('editorDialog').open,false);assert.equal(h.writes.length,0);
});

 test('チェックの重複や追加ボタンの連打では増えず、次の一回分は別IDで追加できる',()=>{
  const h=start();choosePreset(h,'卵');choosePreset(h,'卵');assert.equal(h.element('foodPresetCount').textContent,'1品選択中');
  assert.equal(h.run('foodEditor.addSelectedPresets()'),true);assert.equal(h.run('foodEditor.addSelectedPresets()'),false);assert.equal(h.run('editingNote.foodList.items.length'),1);
  choosePreset(h,'卵');h.run('foodEditor.addSelectedPresets()');assert.equal(h.run('editingNote.foodList.items.length'),2);assert.notEqual(h.run('editingNote.foodList.items[0].id'),h.run('editingNote.foodList.items[1].id'));
});

 test('まとめ追加後の保存失敗でも全項目を保持し、再試行で同じ項目を重複させない',async()=>{
  const h=start();choosePreset(h,'豚こま肉');choosePreset(h,'卵');choosePreset(h,'まいたけ');h.run('foodEditor.addSelectedPresets()');
  const ids=Array.from(h.run('editingNote.foodList.items'),item=>item.id);h.beforeWrite=()=>{throw Error('offline')};assert.equal(await h.run('requestSave()'),false);assert.equal(h.run('editingNote.foodList.items.length'),3);
  h.beforeWrite=null;assert.equal(await h.run('requestSave()'),true);assert.deepEqual(h.store.get(path(rootId)).foodList.items.map(item=>item.id),ids);assert.equal(h.writes.length,1);
});
