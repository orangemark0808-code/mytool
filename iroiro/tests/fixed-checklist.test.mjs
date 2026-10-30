import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './harness.mjs';

const fixed=['やること','アプリ関連','買物リスト','食材','調味料'];
function setup(){
  const h=harness();
  h.context.fixtures=[{id:'recent',title:'新しいメモ',isPinned:true,updatedAt:'2099-01-01'},...fixed.toReversed().map((title,index)=>({id:`n${index}`,title,categoryId:title==='食材'?'food':'tasks',updatedAt:'2020-01-01',task:{status:title==='やること'?'done':'todo'}}))];
  h.run("categories=[{id:'tasks',name:'タスク'},{id:'food',name:'食材'}];notes=fixtures.map(n=>normalizeNote(n.id,n))");
  return h;
}
function titles(h){return [...h.element('notesGrid').innerHTML.matchAll(/(?:task-card-title\">|の詳細を開く\">|aria-label=\"食材カードを開く\">)([^<]+)/g)].map(x=>x[1]);}

test('指定の5カードは星・完了状態・各並べ替えに左右されず指定順で先頭へ表示する',()=>{
  const h=setup();
  for(const sort of ['updated-desc','updated-asc','created-desc','created-asc','title-asc']){
    h.element('sortSelect').value=sort;h.run('renderNotes()');
    assert.deepEqual(titles(h),[...fixed,'新しいメモ']);
  }
  assert.equal(h.writes.length,0);
});
test('カテゴリー・検索の条件を守り、固定の完了カードは折り畳みに隠れない',()=>{
  const h=setup();h.run("selectCategory('tasks')");
  assert.deepEqual(titles(h),fixed.filter(x=>x!=='食材'));
  assert.doesNotMatch(h.element('completedTasksGrid').innerHTML,/やること/);
  h.element('searchInput').value='アプリ';h.run('renderNotes()');
  assert.deepEqual(titles(h),['アプリ関連']);
});
test('固定は題名の完全一致で決まり、星の状態と本文・更新日は独立して保持する',()=>{
  const h=setup();
  assert.equal(h.run("isFixedCard(normalizeNote('x',{title:' やること '}))"),true);
  assert.equal(h.run("isFixedCard(normalizeNote('x',{title:'やることの続き'}))"),false);
  h.run("openEditor(normalizeNote('x',{title:'アプリ関連',isPinned:false}))");
  assert.equal(h.element('fixedNoteBadge').hidden,false);
  const html=h.run('renderNoteCard(editingNote)');
  assert.match(html,/aria-label="上部固定"/);assert.match(html,/aria-pressed="false"[^>]*>☆/);
  assert.equal(h.run('noteData(editingNote).isPinned'),false);
  h.element('noteTitleInput').value='別のカード';h.run('syncEditingNoteFromForm();updateFixedCardBadge()');
  assert.equal(h.element('fixedNoteBadge').hidden,true);
});
for(const task of [false,true])test(`${task?'タスク':'通常'}の長文・改行・HTML文字を失わず複数行で表示し保存する`,()=>{
  const h=harness(),text='長い文章を折り返して最後まで確認する。'.repeat(12)+'\n末尾 <script> & 確認';
  h.context.text=text;
  h.run(`categories=[{id:'tasks',name:'タスク'}];openEditor(normalizeNote('x',{title:'アプリ関連',type:'checklist',categoryId:'${task?'tasks':''}',items:[{id:'a',text}]}))`);
  const html=h.element(task?'taskItemsList':'itemsList').innerHTML;
  assert.match(html,/<textarea class="checklist-text" rows="1"/);
  assert.match(html,/&lt;script&gt; &amp; 確認<\/textarea>/);
  assert.equal(h.run(task?'noteData(editingNote).task.items[0].text':'noteData(editingNote).items[0].text'),text);
});
test('自動高さは長文から短文への変更でも縮み、マウスで文章を選択できる',()=>{
  const h=harness(),input={style:{},scrollHeight:160};h.context.input=input;
  h.run('resizeChecklistInput(input)');assert.equal(input.style.height,'162px');
  input.scrollHeight=44;h.run('resizeChecklistInput(input)');assert.equal(input.style.height,'46px');
  h.context.target={closest:selector=>selector==='input,textarea,button'};
  assert.equal(h.run('itemDragAllowedTarget(target)'),false);
});
