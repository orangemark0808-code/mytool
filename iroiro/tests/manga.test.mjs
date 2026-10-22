import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeManga, mangaHasContent, mangaTags, buildMangaCsv } from '../manga-core.mjs';
import { harness, tick } from './harness.mjs';

const categories="categories=[{id:'manga',name:'漫画',color:'#FFD400'},{id:'app',name:'アプリ',color:'#FF7F00'},{id:'tasks',name:'タスク',color:'#FFD400'}]";
const setup=()=>{const h=harness();h.run(`${categories};selectCategory('manga');openEditor(createNote())`);return h};

test('漫画のnull・不正なページや区分を安全に正規化する',()=>{
  const manga=normalizeManga({status:'constructor',tags:'日常、制作, 日常',pages:[null,{rows:[null,{actor:'主人公',type:'unknown',detail:'内容'}]}]});
  assert.equal(manga.status,'ネタ作成中');assert.equal(manga.pages.length,1);assert.equal(manga.pages[0].pageNumber,1);
  assert.equal(manga.pages[0].rows[0].type,'');assert.equal(manga.pages[0].rows[0].detail,'内容');
  assert.deepEqual(manga.tags,['日常','制作']);assert.deepEqual(mangaTags([' 同じ ','同じ','']),['同じ']);
  assert.equal(mangaHasContent(normalizeManga()),false);assert.equal(mangaHasContent(manga),true);
});

test('漫画一覧から新規作成すると漫画フォームになり通常形式とタスク欄を隠す',()=>{
  const h=setup();
  assert.equal(h.run('editingNote.categoryId'),'manga');assert.equal(h.element('mangaFields').hidden,false);
  assert.equal(h.element('mangaRowsSection').hidden,false);assert.equal(h.element('typeSwitcher').hidden,true);
  assert.equal(h.element('taskFields').hidden,true);assert.equal(h.element('textEditor').hidden,false);
  assert.equal(h.element('mangaStatusInput').value,'ネタ作成中');assert.equal(h.element('noteContentInput')['aria-label'],'自分用メモ');
});

test('漫画の全項目と複数ページを保存して再読込する',async()=>{
  const h=setup();h.element('noteTitleInput').value='作品案';h.element('noteContentInput').value='制作のメモ';
  h.element('mangaStatusInput').value='漫画未作成';h.element('mangaGenreInput').value='日常';h.element('mangaTagsInput').value='日常, 採用';
  h.run("editingNote.manga.pages=[{pageNumber:1,rows:[{panel:'A',actor:'主人公',type:'(心)',detail:'一行目\\n二行目',reference:'https://example.com/'}]},{pageNumber:2,rows:[{panel:'1',actor:'ナレーション',type:'(状)',detail:'場面転換',reference:''}]}];syncEditingNoteFromForm();scheduleSave()");
  await h.run('closeEditor()');const saved=h.writes[0].data;
  assert.equal(saved.manga.status,'漫画未作成');assert.equal(saved.manga.genre,'日常');assert.equal(saved.manga.pages.length,2);
  assert.equal(saved.manga.pages[0].rows[0].detail,'一行目\n二行目');assert.equal(saved.content,'制作のメモ');assert.equal(saved.urls[0].url,'https://example.com/');
  h.context.saved=saved;h.run("openEditor(normalizeNote('saved',saved))");
  assert.equal(h.element('mangaStatusInput').value,'漫画未作成');assert.equal(h.element('mangaTagsInput').value,'日常, 採用');
  assert.equal(h.run('editingNote.manga.pages[1].rows[0].actor'),'ナレーション');
});

test('漫画・タスク・通常カテゴリーの切替でも内容を失わない',()=>{
  const h=setup();h.element('noteTitleInput').value='制作';h.element('noteContentInput').value='自分用メモ';
  h.element('mangaStatusInput').value='漫画作成済み';h.element('mangaTagsInput').value='採用';
  h.run("editingNote.manga.pages[0].rows[0].detail='コマの内容';syncEditingNoteFromForm()");
  h.element('noteCategorySelect').value='tasks';h.run('handleCategoryChange()');
  h.element('taskPrioritySelect').value='high';h.run('syncEditingNoteFromForm()');
  h.element('noteCategorySelect').value='app';h.run('handleCategoryChange()');assert.equal(h.element('mangaFields').hidden,true);
  h.element('noteCategorySelect').value='manga';h.run('handleCategoryChange()');
  assert.equal(h.element('mangaStatusInput').value,'漫画作成済み');assert.equal(h.run('editingNote.manga.pages[0].rows[0].detail'),'コマの内容');
  assert.equal(h.run('editingNote.task.priority'),'high');assert.equal(h.element('noteContentInput').value,'自分用メモ');
});

test('既存の漫画カテゴリーの箇条書きを開くだけでは元の記録を書き換えない',()=>{
  const h=harness();h.run(`${categories};notes=[normalizeNote('old',{title:'以前の案',type:'bullet',categoryId:'manga',items:[{text:'既存の内容'}]})];openEditor(notes[0])`);
  assert.match(h.run('editingNote.manga.pages[0].rows[0].detail'),/既存の内容/);assert.equal(h.run('notes[0].manga'),null);assert.equal(h.writes.length,0);
  h.element('noteCategorySelect').value='app';h.run('handleCategoryChange()');assert.equal(h.run('editingNote.items[0].text'),'既存の内容');assert.equal(h.run('editingNote.type'),'bullet');
});

test('漫画タイトルなしでは保存せず、空の新規フォームは破棄できる',async()=>{
  const h=setup();await h.run('closeEditor()');assert.equal(h.writes.length,0);assert.equal(h.element('editorDialog').open,false);
  h.run('openEditor(createNote())');h.run("editingNote.manga.pages[0].rows[0].detail='セリフ';scheduleSave()");
  await h.run('closeEditor()');assert.equal(h.element('editorDialog').open,true);assert.equal(h.element('mangaTitleError').hidden,false);assert.equal(h.writes.length,0);
});

test('漫画の保存待ち中に追加したページも閉じる前に保存する',async()=>{
  const h=setup();h.element('noteTitleInput').value='作業中';
  const pending=[];h.context.addDoc=(ref,data)=>new Promise(resolve=>{h.writes.push({ref,data});pending.push(()=>resolve({id:'created'}))});
  h.context.updateDoc=(ref,data)=>new Promise(resolve=>{h.writes.push({ref,data});pending.push(resolve)});
  h.run('syncEditingNoteFromForm();scheduleSave()');const closing=h.run('closeEditor()');
  h.run("editingNote.manga.pages.push({pageNumber:2,rows:[{panel:'1',actor:'',type:'',detail:'追加',reference:''}]});scheduleSave()");
  pending.shift()();await tick();assert.equal(h.writes.length,2);assert.equal(h.writes[1].data.manga.pages.length,2);
  pending.shift()();await closing;assert.equal(h.element('editorDialog').open,false);
});

test('漫画はバックアップと復元で全コマ・タグ・メモを保持する',()=>{
  const h=setup();h.context.backup={app:'iroiro',backupFormatVersion:1,data:{notes:[{id:'manga-1',note:{title:'漫画',categoryId:'manga',content:'メモ',manga:{tags:['タグ'],pages:[{rows:[{actor:'人物',type:'(叫)',detail:'内容',reference:'参照'}]}]}}}],settings:{categories:[{id:'manga',name:'漫画',color:'#FFD400'}]}}};
  h.run('candidate=validateBackup(backup);exported=backupNote(candidate.notes[0].id,candidate.notes[0].data)');
  assert.equal(h.run('exported.note.manga.pages[0].rows[0].actor'),'人物');assert.equal(h.run('exported.note.manga.tags[0]'),'タグ');assert.equal(h.run('exported.note.content'),'メモ');
  h.context.backup.data.notes[0].note.manga='broken';assert.throws(()=>h.run('validateBackup(backup)'));
});

test('人物名・参照・タグから漫画を検索でき、HTMLは表示時にエスケープする',()=>{
  const h=harness();h.run(`${categories};notes=[normalizeNote('manga-1',{title:'<img onerror=bad>',categoryId:'manga',manga:{tags:['旅'],pages:[{rows:[{actor:'主人公',detail:'<script>bad</script>',reference:'参考資料'}]}]}})]`);
  for(const keyword of ['旅','主人公','参考資料']){h.element('searchInput').value=keyword;h.run('renderNotes()');assert.match(h.element('notesGrid').innerHTML,/manga-card/)}
  assert.equal(h.element('notesGrid').innerHTML.includes('<img onerror'),false);assert.equal(h.element('notesGrid').innerHTML.includes('<script>'),false);
});

test('CSVはネタキロクと同じ7列とページ番号の出力順を保ち改行や引用符を扱う',()=>{
  const manga={pages:[{rows:[{panel:'1',actor:'主人公',type:'(心)',detail:'一行目\n"セリフ",続き',reference:'参考'},{panel:'2',detail:'次のコマ'}]},{rows:[{panel:'1',detail:'次のページ'}]}]};
  assert.equal(buildMangaCsv('作品',manga),'作品,1,1,主人公,(心),"一行目\n""セリフ"",続き",参考\r\n,,2,,,次のコマ,\r\n,2,1,,,次のページ,');
});

test('CSVで入力内容が表計算ソフトの数式にならない',()=>{
  const csv=buildMangaCsv('=SUM(A1)',{pages:[{rows:[{actor:'@人物',detail:'+内容',reference:'-参考'}]}]});
  assert.equal(csv,"'=SUM(A1),1,1,'@人物,,'+内容,'-参考");
});
