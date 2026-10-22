import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTask, validTaskDate, localDateKey, taskIsOverdue, compareTaskDue, taskProgress } from '../task-core.mjs';
import { harness, tick } from './harness.mjs';

const taskCategory="categories=[{id:'tasks',name:'タスク',color:'#FFD400'},{id:'app',name:'アプリ',color:'#FF7F00'}]";
const notePath=id=>`users/test-user/iroiroNotes/${id}`;
const backup=note=>({app:'iroiro',backupFormatVersion:1,data:{notes:[{id:'task-1',note}],settings:{categories:[{id:'tasks',name:'タスク',color:'#FFD400'}]}}});

test('タスクの日付は実在する日付だけを受け付ける',()=>{
  for(const date of ['2026-10-22','2028-02-29','0001-01-01'])assert.equal(validTaskDate(date),true,date);
  for(const date of ['2026-02-29','2026-13-01','2026-04-31','2026-1-1','0000-01-01','2026-10-22T00:00:00Z',null])assert.equal(validTaskDate(date),false,String(date));
});

test('期限は端末の暦日で判定し、完了済みを期限切れにしない',()=>{
  assert.equal(localDateKey(new Date(2026,9,22,0,1)),'2026-10-22');
  assert.equal(taskIsOverdue({status:'todo',dueDate:'2026-10-21'},'2026-10-22'),true);
  assert.equal(taskIsOverdue({status:'doing',dueDate:'2026-10-22'},'2026-10-22'),false);
  assert.equal(taskIsOverdue({status:'done',dueDate:'2026-10-21'},'2026-10-22'),false);
});

test('期限順は期限なしと完了を後へ送り、同じ期限では優先度を使う',()=>{
  const items=[{id:'done',status:'done',dueDate:'2026-10-01'},
    {id:'none',status:'todo'},
    {id:'low',dueDate:'2026-10-23',priority:'low'},
    {id:'high',dueDate:'2026-10-23',priority:'high'},
    {id:'overdue',dueDate:'2026-10-20'}];
  assert.deepEqual(items.sort(compareTaskDue).map(x=>x.id),['overdue','high','low','none','done']);
});

test('壊れたタスク状態やnullのチェック項目を安全に正規化する',()=>{
  const task=normalizeTask({status:'constructor',priority:'__proto__',dueDate:'bad',items:[null,{text:'作業',checked:true},{text:''}]});
  assert.equal(task.status,'todo');assert.equal(task.priority,'normal');assert.equal(task.dueDate,'');
  assert.deepEqual(taskProgress(task),{total:1,done:1});
});

test('タスク一覧からの新規作成では専用フォームを最初から開く',()=>{
  const h=harness();h.run(`${taskCategory};selectCategory('tasks');openEditor(createNote())`);
  assert.equal(h.run('editingNote.categoryId'),'tasks');
  assert.equal(h.element('taskFields').hidden,false);
  assert.equal(h.element('typeSwitcher').hidden,true);
  assert.equal(h.element('itemsEditor').hidden,true);
  assert.equal(h.element('textEditor').hidden,false);
  assert.equal(h.element('taskStatusSelect').value,'todo');
  assert.equal(h.element('taskPrioritySelect').value,'normal');
  assert.equal(h.element('sortSelect').value,'task-due');
});

test('カテゴリーをタスクへ切り替え、元へ戻しても入力を失わない',()=>{
  const h=harness();h.run(`${taskCategory};openEditor(createNote())`);
  h.element('noteTitleInput').value='記事を書く';h.element('noteContentInput').value='補足を残す';
  h.element('noteCategorySelect').value='tasks';h.run('handleCategoryChange()');
  h.element('taskDueDateInput').value='2026-10-25';h.element('taskStatusSelect').value='doing';h.element('taskPrioritySelect').value='high';
  h.run("syncEditingNoteFromForm();editingNote.task.items=[{id:'item-1',text:'見出し',checked:true}]");
  h.element('noteCategorySelect').value='app';h.run('handleCategoryChange()');
  assert.equal(h.element('taskFields').hidden,true);
  assert.equal(h.element('noteContentInput').value,'補足を残す');
  h.element('noteCategorySelect').value='tasks';h.run('handleCategoryChange()');
  assert.equal(h.element('taskDueDateInput').value,'2026-10-25');
  assert.equal(h.element('taskStatusSelect').value,'doing');
  assert.equal(h.element('taskPrioritySelect').value,'high');
  assert.equal(h.run('editingNote.task.items[0].text'),'見出し');
});

test('既存の箇条書きやチェックリストを読み込んでも保存前に変換しない',()=>{
  const h=harness();h.run(`${taskCategory};notes=[normalizeNote('old',{categoryId:'tasks',title:'以前のメモ',type:'checklist',items:[{id:'x',text:'既存の作業',checked:true}]})];openEditor(notes[0])`);
  assert.equal(h.run('editingNote.task.items[0].text'),'既存の作業');
  assert.equal(h.run('notes[0].task'),null);
  assert.equal(h.writes.length,0);
  h.element('noteCategorySelect').value='app';h.run('handleCategoryChange()');
  assert.equal(h.run('editingNote.type'),'checklist');
  assert.equal(h.run('editingNote.items[0].checked'),true);
});

test('専用フォームの全項目を保存して再読込できる',async()=>{
  const h=harness();h.run(`${taskCategory};selectCategory('tasks');openEditor(createNote())`);
  h.element('noteTitleInput').value='記事を書く';h.element('noteContentInput').value='参考 https://example.com/';
  h.element('taskDueDateInput').value='2026-10-25';h.element('taskStatusSelect').value='doing';h.element('taskPrioritySelect').value='high';
  h.run("editingNote.task.items=[{id:'x',text:'見出し',checked:true},{id:'y',text:'本文',checked:false}];syncEditingNoteFromForm();scheduleSave()");
  await h.run('closeEditor()');
  const saved=h.writes[0].data;
  assert.equal(saved.task.status,'doing');assert.equal(saved.task.dueDate,'2026-10-25');assert.equal(saved.task.priority,'high');
  assert.equal(saved.task.items.length,2);assert.equal(saved.content,'参考 https://example.com/');
  h.context.saved=saved;h.run("openEditor(normalizeNote('stored',saved))");
  assert.equal(h.element('taskStatusSelect').value,'doing');assert.equal(h.element('taskDueDateInput').value,'2026-10-25');
});

test('タスク名がない作業は保存せず、空の新規タスクは閉じられる',async()=>{
  const h=harness();h.run(`${taskCategory};selectCategory('tasks');openEditor(createNote())`);
  await h.run('closeEditor()');assert.equal(h.writes.length,0);assert.equal(h.element('editorDialog').open,false);
  h.run('openEditor(createNote())');h.element('noteContentInput').value='名前のない作業';h.run('syncEditingNoteFromForm();scheduleSave()');
  await h.run('closeEditor()');assert.equal(h.writes.length,0);assert.equal(h.element('editorDialog').open,true);
  assert.equal(h.element('taskTitleError').hidden,false);
});

test('保存待ち中のタスク設定変更も閉じる前に保存する',async()=>{
  const h=harness();h.run(`${taskCategory};openEditor(normalizeNote('task-1',{categoryId:'tasks',title:'作業',task:{}}))`);
  const pending=[];h.context.updateDoc=(ref,data)=>new Promise(resolve=>{h.writes.push({ref,data});pending.push(resolve)});
  h.element('taskStatusSelect').value='doing';h.run('syncEditingNoteFromForm();scheduleSave()');
  const closing=h.run('closeEditor()');h.element('taskPrioritySelect').value='high';h.run('syncEditingNoteFromForm();scheduleSave()');
  pending.shift()();await tick();assert.equal(h.writes.length,2);assert.equal(h.writes[1].data.task.priority,'high');
  pending.shift()();await closing;assert.equal(h.element('editorDialog').open,false);
});

test('カードからの完了操作はタスク状態だけを書き換え、完了欄へ移す',async()=>{
  const original={categoryId:'tasks',title:'作業',content:'補足',task:{status:'doing',priority:'high',dueDate:'2026-10-25',items:[{id:'x',text:'作業1'}]}};
  const h=harness([[notePath('task-1'),original]]);h.context.original=original;
  h.run(`${taskCategory};notes=[normalizeNote('task-1',original)];selectCategory('tasks')`);
  assert.equal(await h.run("toggleTaskComplete('task-1',true)"),true);
  const saved=h.store.get(notePath('task-1'));
  assert.equal(saved.task.status,'done');assert.equal(saved.task.priority,'high');assert.equal(saved.task.items[0].text,'作業1');assert.equal(saved.content,'補足');
  assert.equal(h.element('notesGrid').innerHTML,'');assert.equal(h.element('completedTasks').hidden,false);
  assert.match(h.element('completedTasksGrid').innerHTML,/作業/);
  assert.equal(await h.run("toggleTaskComplete('task-1',false)"),true);
  assert.equal(h.store.get(notePath('task-1')).task.status,'todo');assert.equal(h.element('completedTasks').hidden,true);
});

test('完了状態の保存に失敗したら表示を戻し、連打も抑止する',async()=>{
  const h=harness();h.run(`${taskCategory};notes=[normalizeNote('task-1',{categoryId:'tasks',title:'作業',task:{status:'doing'}})]`);
  let fail;h.context.updateDoc=()=>new Promise((resolve,reject)=>fail=reject);
  const first=h.run("toggleTaskComplete('task-1',true)");assert.equal(await h.run("toggleTaskComplete('task-1',false)"),false);
  fail(new Error('offline'));assert.equal(await first,false);assert.equal(h.run('notes[0].task.status'),'doing');
  assert.match(h.element('syncStatus').textContent,/保存できませんでした/);
});

test('タスクのバックアップは期限・状態・チェック項目を保持する',()=>{
  const h=harness();h.run(taskCategory);
  h.context.input=backup({title:'復元する作業',categoryId:'tasks',content:'補足',task:{dueDate:'2026-10-25',status:'doing',priority:'high',items:[{id:'x',text:'https://example.com/',checked:true}]}});
  h.run('candidate=validateBackup(input);roundTrip=backupNote(candidate.notes[0].id,candidate.notes[0].data)');
  assert.equal(h.run('roundTrip.note.task.status'),'doing');assert.equal(h.run('roundTrip.note.task.items[0].checked'),true);
  assert.equal(h.run('roundTrip.note.task.dueDate'),'2026-10-25');assert.equal(h.run('roundTrip.note.urls[0].url'),'https://example.com/');
  h.context.input.data.notes[0].note.task.dueDate='2026-02-29';assert.throws(()=>h.run('validateBackup(input)'));
});

test('タスクカードでも題名・項目のHTMLをエスケープする',()=>{
  const h=harness();h.run(`${taskCategory};notes=[normalizeNote('task-1',{title:'<img src=x onerror=alert(1)>',categoryId:'tasks',task:{items:[{text:'<script>bad</script>'}]}})];renderNotes()`);
  assert.equal(h.element('notesGrid').innerHTML.includes('<img src=x'),false);
  assert.equal(h.element('notesGrid').innerHTML.includes('<script>bad'),false);
  assert.match(h.element('notesGrid').innerHTML,/&lt;img/);
});

test('タスクのチェック項目も検索でき、通常カテゴリーの並び順は維持する',()=>{
  const h=harness();h.run(`${taskCategory};notes=[normalizeNote('task-1',{title:'記事',categoryId:'tasks',task:{items:[{text:'誤字を確認する'}]}})];selectCategory('tasks')`);
  h.element('searchInput').value='誤字';h.run('renderNotes()');assert.match(h.element('notesGrid').innerHTML,/記事/);
  h.run("selectCategory('app')");assert.equal(h.element('sortSelect').value,'updated-desc');assert.equal(h.element('taskDueSortOption').hidden,true);
});
