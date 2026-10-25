import test from 'node:test';
import assert from 'node:assert/strict';
import { harness, tick } from './harness.mjs';

const notePath = id => `users/test-user/iroiroNotes/${id}`;
const settingsPath = 'users/test-user/iroiroSettings/main';
const backup = (notes = [], categories = []) => ({ app: 'iroiro', backupFormatVersion: 1,
  data: { notes, settings: { categories } } });
const category = (id, name = id) => ({ id, name, color: '#FF7F00', order: 0 });

test('どのカテゴリーのカードでも、未設定の星と詳細ボタンを別々に操作できる', () => {
  const h=harness();
  h.run("categories=[{id:'tasks',name:'タスク'},{id:'manga',name:'漫画'}]");
  for(const categoryId of ['', 'tasks', 'manga']){
    h.context.categoryId=categoryId;
    const html=h.run("renderNoteCard(normalizeNote('pin-1',{title:'作業 <確認>',categoryId}))");
    assert.match(html, /<button[^>]+data-pin-note="pin-1"[^>]+aria-pressed="false"[^>]*>☆<\/button>/);
    assert.match(html, /data-open-note="pin-1"/);
    assert.doesNotMatch(html, /<article[^>]+role="button"/);
    assert.doesNotMatch(html, /作業 <確認>/);
  }
});

test('一覧からピン留めと解除を保存し、本文・タスク・更新日を保持する', async () => {
  const original={title:'作業',content:'残す本文',isPinned:false,updatedAt:'2026-01-01',task:{status:'doing',priority:'high'}};
  const h=harness([[notePath('pin-1'),original]]);h.context.original=original;
  h.run("notes=[normalizeNote('pin-1',original)]");
  const update=h.context.updateDoc,patches=[];
  h.context.updateDoc=(ref,patch)=>{patches.push(structuredClone(patch));return update(ref,patch)};
  assert.equal(await h.run("toggleNotePin('pin-1')"),true);
  assert.equal(h.store.get(notePath('pin-1')).isPinned,true);
  assert.equal(h.run('notes[0].isPinned'),true);
  assert.match(h.element('notesGrid').innerHTML,/aria-pressed="true"/);
  assert.equal(h.element('editorDialog').open,false);
  assert.equal(await h.run("toggleNotePin('pin-1')"),true);
  assert.deepEqual(patches,[{isPinned:true},{isPinned:false}]);
  assert.deepEqual(h.store.get(notePath('pin-1')),original);
});

test('ピン留めの保存中は連打を防ぎ、失敗したら元の表示へ戻す', async () => {
  const h=harness();h.run("notes=[normalizeNote('pin-1',{title:'作業'})]");
  let reject;h.context.updateDoc=()=>new Promise((resolve,fail)=>{reject=fail});
  const pending=h.run("toggleNotePin('pin-1')");
  assert.match(h.element('notesGrid').innerHTML, /data-pin-note="pin-1"[^>]+disabled/);
  assert.equal(await h.run("toggleNotePin('pin-1')"),false);
  reject(new Error('offline'));assert.equal(await pending,false);
  assert.equal(h.run('notes[0].isPinned'),false);
  assert.match(h.element('syncStatus').textContent,/ピン留めの状態を保存できませんでした/);
  assert.doesNotMatch(h.element('notesGrid').innerHTML,/data-pin-note="pin-1"[^>]+disabled/);
});

test('ピン留めの保存中に詳細を開いても、保存後の状態を引き継ぐ', async () => {
  const h=harness();h.run("notes=[normalizeNote('pin-1',{title:'作業'})]");
  let resolve;h.context.updateDoc=()=>new Promise(done=>{resolve=done});
  const pending=h.run("toggleNotePin('pin-1')"),opening=h.run("openCardNote('pin-1')");
  assert.equal(h.element('editorDialog').open,false);
  resolve();await pending;await opening;
  assert.equal(h.element('editorDialog').open,true);
  assert.equal(h.run('editingNote.isPinned'),true);
});

test('保存途中にアカウントが変わっても別ユーザーのカードや状態を変更しない', async () => {
  const h=harness();h.run("notes=[normalizeNote('pin-1',{title:'以前の作業'})]");
  let reject;h.context.updateDoc=()=>new Promise((resolve,fail)=>{reject=fail});
  const pending=h.run("toggleNotePin('pin-1')"),opening=h.run("openCardNote('pin-1')");
  h.run("currentUser={uid:'another-user'};notes=[normalizeNote('pin-1',{title:'別ユーザーの作業',isPinned:true})]");
  h.element('syncStatus').textContent='同期済み';
  reject(new Error('offline'));await pending;await opening;
  assert.equal(h.run('notes[0].isPinned'),true);
  assert.equal(h.element('syncStatus').textContent,'同期済み');
  assert.equal(h.element('editorDialog').open,false);
});

test('閉じる途中の追加入力も保存完了まで待つ', async () => {
  const h = harness();
  const pending = [];
  h.context.updateDoc = (ref, data) => new Promise(resolve => {
    h.writes.push({ ref, data }); pending.push(()=>{h.store.set(ref,{...h.store.get(ref),...structuredClone(data)});resolve();});
  });
  h.store.set(notePath('note-1'),{content:'初期値'});
  h.run("openEditor(normalizeNote('note-1',{content:'初期値'}))");
  h.element('noteContentInput').value = '最初の変更';
  h.run('syncEditingNoteFromForm();scheduleSave()');
  const closing = h.run('closeEditor()');
  await tick();
  h.element('noteContentInput').value = '保存待ち中の追加変更';
  h.run('syncEditingNoteFromForm();scheduleSave()');
  pending.shift()();
  await tick();
  assert.equal(h.writes.length, 2);
  assert.equal(h.element('editorDialog').open, true);
  assert.equal(h.writes[1].data.content, '保存待ち中の追加変更');
  pending.shift()();
  await closing;
  assert.equal(h.element('editorDialog').open, false);
  assert.equal(h.timers.size, 1); // 初回フォーカス用タイマーのみ残る
});

test('保存失敗時は編集内容を残し、再試行で保存できる', async () => {
  const h = harness();
  h.store.set(notePath('note-1'),{content:'初期値'});
  h.run("openEditor(normalizeNote('note-1',{content:'初期値'}))");
  h.element('noteContentInput').value = '未保存の内容';
  h.run('syncEditingNoteFromForm();scheduleSave()');
  h.context.updateDoc = async () => { throw new Error('offline'); };
  await h.run('closeEditor()');
  assert.equal(h.element('editorDialog').open, true);
  assert.equal(h.run('editingNote.content'), '未保存の内容');
  assert.equal(h.run('closingEditor'), false);
  h.context.updateDoc = async (ref, data) => h.writes.push({ ref, data });
  await h.run('closeEditor()');
  assert.equal(h.writes[0].data.content, '未保存の内容');
  assert.equal(h.element('editorDialog').open, false);
});

test('新規メモの保存待ち中に編集してもメモを重複作成しない', async () => {
  const h = harness();
  let release;
  h.context.addDoc = (ref, data) => new Promise(resolve => {
    h.writes.push({ ref, data }); release = () => {h.store.set(`${ref}/new-id`,structuredClone(data));resolve({ id: 'new-id' });};
  });
  h.run('openEditor(createNote())');
  h.element('noteContentInput').value = '最初の本文';
  h.run('syncEditingNoteFromForm();scheduleSave()');
  const closing = h.run('closeEditor()');
  h.element('noteContentInput').value = '追加した本文';
  h.run('syncEditingNoteFromForm();scheduleSave()');
  release();
  await closing;
  assert.equal(h.writes.length, 2);
  assert.equal(h.writes[1].ref, notePath('new-id'));
  assert.equal(h.writes[1].data.content, '追加した本文');
});

test('HTMLを含むIDと不正なFirestoreパスを復元前に拒否する', () => {
  const h = harness();
  for (const id of ['x"><img src=x onerror="void(0)">', 'parent/child', '.', '..', '']) {
    h.context.input = backup([{ id, note: { content: '本文' } }]);
    assert.throws(() => h.run('validateBackup(input)'));
    h.context.input = backup([], [category(id)]);
    assert.throws(() => h.run('validateBackup(input)'));
  }
  h.context.input = backup([], [category('all')]);
  assert.throws(() => h.run('validateBackup(input)'));
  h.context.input = backup([], [category('same'), category('same')]);
  assert.throws(() => h.run('validateBackup(input)'));
});

test('既存データにHTMLを含むIDがあっても属性をエスケープする', () => {
  const h = harness();
  h.context.badId = 'x"><img src=x onerror="void(0)">';
  h.run("categories=[{id:badId,name:'分類',color:'#FF7F00'}];notes=[normalizeNote(badId,{content:'本文',categoryId:badId})];renderAll();openEditor(notes[0]);renderCategoryManagement()");
  for (const id of ['sidebarCategories', 'categoryTabs', 'notesGrid', 'noteCategorySelect', 'categoryManagementList']) {
    assert.equal(h.element(id).innerHTML.includes('<img src=x'), false, id);
    assert.equal(h.element(id).innerHTML.includes('&quot;&gt;&lt;img'), true, id);
  }
});

test('不正なURLキャッシュは無視して本文から安全に再生成する', () => {
  const h = harness();
  h.context.input = backup([{ id: 'n1', note: { content: '本文 https://example.com',
    urls: [null, { url: 'javascript:void(0)' }] } }]);
  h.run('notes=validateBackup(input).notes.map(x=>normalizeNote(x.id,x.data));renderNotes();openEditor(notes[0])');
  assert.equal(h.run('notes[0].urls.length'), 1);
  assert.equal(h.run('notes[0].urls[0].url'), 'https://example.com/');
  assert.equal(h.element('relatedLinks').innerHTML.includes('javascript:'), false);
});

test('nullの項目や壊れた形式別データでも一覧・形式切替が動く', () => {
  const h = harness();
  h.context.input = backup([{ id: 'n1', note: { type: 'checklist', items: [null, { text: '項目' }],
    contentByType: { text: 123 }, itemsByType: { bullet: [null, { text: '箇条書き' }] } } }]);
  h.run('notes=validateBackup(input).notes.map(x=>normalizeNote(x.id,x.data));renderNotes();openEditor(notes[0]);requestTypeChange("bullet")');
  assert.equal(h.run('notes[0].items.length'), 1);
});

test('カテゴリー復元は最新の保存済み設定と統合し、既存の参照先を残す', async () => {
  const h = harness([[settingsPath, { categories: [category('recent'), category('shared', '現在の名前')] }]]);
  h.context.input = backup([], [category('shared', '復元する名前'), category('old')]);
  // 画面のキャッシュは古い状態にして、Firestoreから取得することを確認する。
  h.run("categories=[];notes=[normalizeNote('recent-note',{content:'本文',categoryId:'recent'})];pendingBackup=validateBackup(input)");
  await h.run('restorePendingBackup()');
  const restored = h.store.get(settingsPath).categories;
  assert.deepEqual(restored.map(c => c.id), ['recent', 'shared', 'old']);
  assert.equal(restored.find(c => c.id === 'shared').name, '復元する名前');
  h.context.remoteCategories = restored;
  h.run("applyRemoteCategories(remoteCategories);selectedCategory='recent';renderNotes()");
  assert.equal(h.element('noteCount').textContent, '1件');
});

test('すでに参照先がなくなったメモも未分類で検索できる', () => {
  const h = harness();
  h.run("categories=[];notes=[normalizeNote('n1',{content:'本文',categoryId:'missing'})];selectedCategory='';renderNotes()");
  assert.equal(h.element('noteCount').textContent, '1件');
});

test('復元のバッチ失敗時も個別書込みで同じ保存先へ再試行する', async () => {
  const h = harness([[settingsPath, { categories: [category('recent')] }]]);
  h.beforeBatch = async () => { throw new Error('batch failed'); };
  h.context.input = backup([{ id: 'n1', note: { content: '復元する本文' } }], [category('old')]);
  h.run('pendingBackup=validateBackup(input)');
  await h.run('restorePendingBackup()');
  assert.equal(h.store.get(notePath('n1')).content, '復元する本文');
  assert.deepEqual(h.store.get(settingsPath).categories.map(c => c.id), ['recent', 'old']);
});

test('カテゴリー統合に失敗した場合はメモの復元を開始しない', async () => {
  const h = harness();
  h.beforeWrite = async ref => { if (ref === settingsPath) throw new Error('offline'); };
  h.context.input = backup([{ id: 'n1', note: { content: '本文', categoryId: 'restored' } }], [category('restored')]);
  h.run('pendingBackup=validateBackup(input)');
  await h.run('restorePendingBackup()');
  assert.equal(h.store.has(notePath('n1')), false);
  assert.match(h.element('backupStatus').textContent, /失敗/);
});

for (const withIds of [true, false]) {
  test(`途中失敗した移行の再試行で重複・上書きしない（旧ID${withIds ? 'あり' : 'なし'}）`, async () => {
    const h = harness();
    const legacy = ['一つ目', '二つ目'].map((content, index) => ({ content, ...(withIds ? { id: `legacy-${index}` } : {}) }));
    h.context.localStorage = { getItem: () => JSON.stringify(legacy) };
    let failOnce = true;
    h.beforeWrite = async (ref, data) => {
      if (ref.includes('/iroiroNotes/') && data.content === '二つ目' && failOnce) {
        failOnce = false; throw new Error('simulated offline');
      }
    };
    try { await h.run('migrateLegacy()'); } catch { /* 修正前の未処理エラーも検査対象 */ }
    const first = [...h.store].find(([ref]) => ref.includes('/iroiroNotes/'));
    assert.ok(first);
    h.store.set(first[0], { ...first[1], content: '移行後に編集した内容' });
    h.context.loadedNotes = [...h.store].filter(([ref]) => ref.includes('/iroiroNotes/')).map(([ref, data]) => ({ id: ref.split('/').at(-1), ...data }));
    h.run('notes=loadedNotes');
    await h.run('migrateLegacy()');
    const savedNotes = [...h.store].filter(([ref]) => ref.includes('/iroiroNotes/'));
    assert.equal(savedNotes.length, 2);
    assert.equal(h.store.get(first[0]).content, '移行後に編集した内容');
    assert.ok(h.store.has('users/test-user/iroiroMigrations/localStorageV1'));
    assert.equal(h.element('migrateLocalButton').disabled, false);
  });
}

test('通常の新規保存と空メモの破棄は維持する', async () => {
  const h = harness();
  h.run('openEditor(createNote())');
  h.element('noteContentInput').value = '通常の新規メモ';
  h.run('syncEditingNoteFromForm();scheduleSave()');
  await h.run('closeEditor()');
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0].data.content, '通常の新規メモ');
  h.run('openEditor(createNote())');
  await h.run('closeEditor()');
  assert.equal(h.writes.length, 1);
});
