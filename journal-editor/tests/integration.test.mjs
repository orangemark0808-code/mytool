import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import * as core from '../editor-core.mjs';
import * as markdown from '../markdown.mjs';

const source = readFileSync(new URL('../script.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace(/^init\(\);\s*$/m, '');
function harness() {
  const elements = new Map(), storage = new Map(), events = new Map(), timers = new Map(), listeners = new Map();
  let timerId = 0;
  const classList = () => {
    const names = new Set();
    return { add: (name) => names.add(name), remove: (name) => names.delete(name), contains: (name) => names.has(name), toggle(name, value = !names.has(name)) { value ? names.add(name) : names.delete(name); return value; } };
  };
  function element(id) {
    if (!elements.has(id)) elements.set(id, { value: '', textContent: '', innerHTML: '', selectionStart: 0, selectionEnd: 0, scrollTop: 0, offsetHeight: 78, classList: classList(), style: { setProperty() {} }, setAttribute() {}, focus() {}, setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }, setRangeText(text, start, end) { this.value = this.value.slice(0, start) + text + this.value.slice(end); this.selectionStart = this.selectionEnd = start + text.length; }, addEventListener(name, fn) { events.set(`${id}:${name}`, fn); } });
    return elements.get(id);
  }
  for (const id of ['editorView', 'listView', 'settingsView', 'bulkDiaryConfirmation']) element(id).classList.add('hidden');
  const document = { getElementById: element, querySelector: element, documentElement: element('root'), body: { dataset: {}, classList: classList() }, addEventListener(name, fn) { events.set(`document:${name}`, fn); } };
  const window = { innerHeight: 844, matchMedia: () => ({ matches: false }), addEventListener(name, fn) { events.set(`window:${name}`, fn); } };
  const firebase = {
    collection: (_db, ...parts) => ({ firestore: {}, path: parts.join('/') }),
    doc: (_db, ...parts) => ({ path: parts.join('/') }),
    onSnapshot(ref, _options, callback, failure) { listeners.set(ref.path, { callback, failure }); return () => {}; },
  };
  const context = vm.createContext({ ...core, ...markdown, document, window, navigator: { onLine: true }, localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) }, crypto, console: { error() {} }, Date, Intl, confirm: () => true, setTimeout(fn) { timers.set(++timerId, fn); return timerId; }, clearTimeout(id) { timers.delete(id); } });
  vm.runInContext(source, context);
  const run = (code) => vm.runInContext(code, context);
  context.testFirebase = firebase;
  run("state.user={uid:'account-a'};state.firebase=testFirebase;state.db={};state.categories=defaultCategories();state.view='editor';$('editorView').classList.remove('hidden');");
  const draft = core.normalizeDraft({ id: 'd', title: 'Synthetic', body: 'original', category: 'unknown-category', categoryName: 'Legacy name', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', revision: 'v1' }, { remote: true });
  context.fixture = draft;
  run("state.drafts=[fixture];state.currentId='d';titleInput.value='Synthetic';bodyInput.value='original';renderCategoryOptions();resetHistory();persistLocal();");
  const articleSnapshot = (drafts, fromCache = false) => {
    const callback = listeners.get('users/account-a/blogEditorDrafts').callback;
    callback({ metadata: { fromCache, hasPendingWrites: false }, docs: drafts.map((draft) => ({ id: draft.id, data: () => draft })) });
  };
  return { context, elements, storage, events, timers, listeners, run, draft, articleSnapshot };
}

test('Japanese composition Enter is left to the IME', () => {
  const h = harness(); let prevented = false;
  h.events.get('bodyInput:keydown')({ key: 'Enter', isComposing: true, preventDefault() { prevented = true; } });
  assert.equal(prevented, false); assert.equal(h.elements.get('bodyInput').value, 'original');
  h.events.get('bodyInput:compositionstart')();
  h.events.get('bodyInput:keydown')({ key: 'Enter', isComposing: false, preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
});
test('unknown category stays selected and survives ordinary body edits', () => {
  const h = harness();
  assert.equal(h.elements.get('categorySelect').value, 'unknown-category');
  h.elements.get('bodyInput').value = 'edited'; h.run('scheduleSave();');
  assert.equal(h.run('currentDraft().category'), 'unknown-category');
  assert.equal(h.run('currentDraft().categoryName'), 'Legacy name');
});
test('unchanged server snapshot preserves undo history and scroll', () => {
  const h = harness(); h.run("state.history=[{value:'before'},snapshot()];state.historyIndex=1;bodyInput.scrollTop=200;startRemoteSync();");
  h.articleSnapshot([h.draft]);
  assert.equal(h.run('state.history.length'), 2); assert.equal(h.run('state.historyIndex'), 1);
  assert.equal(h.elements.get('bodyInput').scrollTop, 200);
});
test('dirty editor and its local stored paragraph remain identical after remote conflict', () => {
  const h = harness(); h.elements.get('bodyInput').value = 'my unsent edit'; h.run('scheduleSave();startRemoteSync();');
  h.articleSnapshot([{ ...h.draft, body: 'other device', revision: 'v2' }]);
  const saved = JSON.parse(h.storage.get(`${core.storageKey('account-a')}:draft:d`));
  assert.equal(saved.body, 'my unsent edit'); assert.equal(h.elements.get('bodyInput').value, saved.body);
  assert.equal(saved.pendingSync, true); assert.notEqual(h.elements.get('syncStatus').textContent, 'クラウド同期済み');
});
test('empty cached snapshot cannot remove journal from the local index', () => {
  const h = harness(); h.run('startRemoteSync();'); h.articleSnapshot([], true);
  assert.equal(h.run('state.drafts.length'), 1);
  assert.deepEqual(JSON.parse(h.storage.get(core.storageKey('account-a'))).ids, ['d']);
});
test('typing after server deletion is saved under a recovered article ID', () => {
  const h = harness(); h.run('startRemoteSync();'); h.articleSnapshot([]);
  const id = h.run('state.currentId'); assert.notEqual(id, 'd');
  h.elements.get('bodyInput').value = 'typing after deletion'; h.run('scheduleSave();');
  const saved = JSON.parse(h.storage.get(`${core.storageKey('account-a')}:draft:${id}`));
  assert.equal(saved.body, 'typing after deletion'); assert.equal(saved.pendingSync, true);
});
test('online event queues unsent offline edits again', async () => {
  const h = harness(); h.context.navigator.onLine = false;
  h.elements.get('bodyInput').value = 'offline paragraph'; h.run('scheduleSave();state.saveTimers.clear();state.remoteReady=true;');
  await h.run("saveDraftById('d')");
  assert.equal(h.run('currentDraft().pendingSync'), true);
  h.context.navigator.onLine = true; h.events.get('window:online')();
  assert.equal(h.run("state.saveTimers.has('d')"), true);
});
test('account switch clears displayed text and never auto-imports legacy journals', async () => {
  const h = harness(); h.storage.set(core.LEGACY_KEYS.drafts, JSON.stringify([{ ...h.draft, body: 'legacy private text' }]));
  await h.run("handleAuth({uid:'account-b'})");
  assert.equal(h.run('state.drafts.length'), 0); assert.equal(h.elements.get('bodyInput').value, '');
  assert.ok(h.storage.has(core.storageKey('account-a'))); assert.equal(h.run('state.legacyImported'), false);
});
test('category listener failure is not hidden by successful article snapshots', () => {
  const h = harness(); h.run('startRemoteSync();');
  h.listeners.get('users/account-a/blogEditorMigrations/editorCategoriesV2').failure({ code: 'permission-denied' });
  h.articleSnapshot([h.draft]);
  assert.equal(h.run('state.categoryError'), true);
  assert.match(h.elements.get('syncStatus').textContent, /同期エラー/);
});
test('retry reconnects failed listeners', () => {
  const h = harness(); h.run('startRemoteSync();');
  const first = h.listeners.get('users/account-a/blogEditorDrafts').callback;
  h.listeners.get('users/account-a/blogEditorDrafts').failure({ code: 'unavailable' });
  h.run('retrySync();');
  assert.notEqual(h.listeners.get('users/account-a/blogEditorDrafts').callback, first);
});
test('actual save adapter keeps newer typing pending after old write completes', async () => {
  const h = harness();
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  h.context.testFirebase.runTransaction = async (_db, callback) => {
    const result = await callback({ get: async () => ({ id: 'd', exists: () => true, data: () => h.draft }), set() {} });
    await gate; return result;
  };
  h.run('state.firebaseReady=state.remoteReady=state.categoriesReady=true;');
  h.elements.get('bodyInput').value = 'sent text'; h.run('scheduleSave();');
  const pending = h.run("saveDraftById('d')");
  h.elements.get('bodyInput').value = 'newer typing'; h.run('scheduleSave();');
  release(); await pending;
  assert.equal(h.run('currentDraft().body'), 'newer typing');
  assert.equal(h.run('currentDraft().pendingSync'), true);
  assert.notEqual(h.elements.get('syncStatus').textContent, 'クラウド同期済み');
});
test('failed upload retains pending paragraph and displays error', async () => {
  const h = harness();
  h.context.testFirebase.runTransaction = async () => { throw { code: 'unavailable' }; };
  h.run('state.firebaseReady=state.remoteReady=state.categoriesReady=true;');
  h.elements.get('bodyInput').value = 'unsent paragraph'; h.run('scheduleSave();');
  await h.run("saveDraftById('d')");
  assert.equal(h.run('currentDraft().pendingSync'), true);
  assert.equal(JSON.parse(h.storage.get(`${core.storageKey('account-a')}:draft:d`)).body, 'unsent paragraph');
  assert.match(h.elements.get('syncStatus').textContent, /同期エラー/);
});
test('legacy import keeps source data, preserves ID categories and avoids duplicate unused defaults', () => {
  const h = harness();
  const legacy = JSON.stringify([{ ...h.draft, body: 'old local paragraph', category: 'old-diary' }]);
  h.storage.set(core.LEGACY_KEYS.drafts, legacy);
  h.storage.set(core.LEGACY_KEYS.categories, JSON.stringify([{ id: 'old-diary', name: '日記', order: 0 }]));
  h.run('state.remoteReady=state.categoriesReady=true;state.serverDrafts=[fixture];state.serverCategories=[];');
  h.run('migrateLocal();');
  assert.equal(h.storage.get(core.LEGACY_KEYS.drafts), legacy);
  assert.equal(h.run('state.drafts.length'), 2);
  assert.equal(h.run("state.drafts.find(d=>d.body==='old local paragraph').category"), 'old-diary');
  assert.equal(h.run("activeCategories().filter(c=>c.name==='日記').length"), 1);
});
test('matching cloud data hides the redundant phone notice and keeps legacy source', () => {
  const h = harness();
  const old = JSON.stringify([h.draft]); h.storage.set(core.LEGACY_KEYS.drafts, old);
  h.run('startRemoteSync();'); h.articleSnapshot([h.draft]);
  h.listeners.get('users/account-a/blogEditorMigrations/editorCategoriesV2').callback({ metadata: { fromCache: false, hasPendingWrites: false }, exists: () => true, data: () => ({ records: [] }) });
  assert.equal(h.elements.get('legacyNotice').classList.contains('hidden'), true);
  assert.equal(h.elements.get('migrationPanel').classList.contains('hidden'), true);
  assert.match(h.elements.get('legacyDetailsMessage').textContent, /再取り込みは不要/);
  assert.equal(h.storage.get(core.LEGACY_KEYS.drafts), old);
});
test('before confirmed cloud snapshots import stays disabled', () => {
  const h = harness(); h.storage.set(core.LEGACY_KEYS.drafts, JSON.stringify([h.draft]));
  h.run('startRemoteSync();updateMigrationPanel();'); h.articleSnapshot([h.draft], true);
  assert.equal(h.elements.get('migrateLocalButton').disabled, true);
  h.run('migrateLocal();'); assert.equal(h.run('state.legacyImported'), false);
});
test('differing old articles are shown by title and import creates a separate copy', () => {
  const h = harness();
  h.storage.set(core.LEGACY_KEYS.drafts, JSON.stringify([{ ...h.draft, title: '<img>Old phone title', body: 'phone-only text' }]));
  h.run('state.remoteReady=state.categoriesReady=true;state.serverDrafts=[fixture];updateMigrationPanel();');
  assert.match(h.elements.get('migrationMessage').textContent, /内容が異なる記事1件/);
  assert.match(h.elements.get('legacyDraftList').innerHTML, /&lt;img&gt;Old phone title/);
  assert.equal(h.elements.get('legacyDetails').open, true);
  h.run('migrateLocal();');
  assert.equal(h.run('state.drafts.length'), 2);
  assert.equal(h.run("state.drafts.find(d=>d.id==='d').body"), 'original');
  assert.equal(h.run("state.drafts.find(d=>d.id!=='d').body"), 'phone-only text');
});
test('closing the notice is local, keeps data, and can be undone by reviewing', () => {
  const h = harness(); const old = JSON.stringify([h.draft]); h.storage.set(core.LEGACY_KEYS.drafts, old);
  h.run('dismissLegacyNotice();'); assert.equal(h.run('state.legacyImported'), true);
  assert.equal(h.storage.get(core.LEGACY_KEYS.drafts), old);
  h.events.get('reviewLegacyButton:click')(); assert.equal(h.run('state.legacyImported'), false);
  assert.equal(h.run('state.drafts.length'), 1);
});
test('new articles default to existing diary ID and uncategorized is last', () => {
  const h = harness();
  h.run("state.categories=[{id:'legacy-note',name:'note用',order:0},{id:'legacy-diary',name:'日記',order:9}];newDraft();");
  assert.equal(h.run('currentDraft().category'), 'legacy-diary');
  assert.equal(h.elements.get('categorySelect').value, 'legacy-diary');
  assert.equal(h.elements.get('noteStatusField').hidden, true);
  const html = h.elements.get('categorySelect').innerHTML;
  assert.ok(html.indexOf('日記') < html.indexOf('note用'));
  assert.ok(html.indexOf('note用') < html.indexOf('未分類'));
});
test('selecting note shows unpublished default and stores posted changes', () => {
  const h = harness(); h.run('newDraft();');
  h.elements.get('categorySelect').value = 'journal-note'; h.events.get('categorySelect:change')();
  assert.equal(h.elements.get('noteStatusField').hidden, false);
  assert.equal(h.elements.get('noteStatusSelect').value, 'unpublished');
  h.elements.get('noteStatusSelect').value = 'published'; h.events.get('noteStatusSelect:change')();
  assert.equal(h.run('currentDraft().noteStatus'), 'published');
  const id = h.run('state.currentId');
  assert.equal(JSON.parse(h.storage.get(`${core.storageKey('account-a')}:draft:${id}`)).noteStatus, 'published');
});
test('hidden posting state is retained when switching away from note and back', () => {
  const h = harness(); h.run('newDraft();');
  h.elements.get('categorySelect').value = 'journal-note'; h.events.get('categorySelect:change')();
  h.elements.get('noteStatusSelect').value = 'published'; h.events.get('noteStatusSelect:change')();
  h.elements.get('categorySelect').value = ''; h.events.get('categorySelect:change')();
  assert.equal(h.elements.get('noteStatusField').hidden, true);
  h.elements.get('categorySelect').value = 'journal-note'; h.events.get('categorySelect:change')();
  assert.equal(h.elements.get('noteStatusSelect').value, 'published');
  assert.equal(h.run('currentDraft().noteStatus'), 'published');
});
test('existing uncategorized articles are not reclassified on opening', () => {
  const h = harness();
  h.context.uncategorized = core.normalizeDraft({ ...h.draft, category: null, categoryName: '' }, { remote: true });
  h.run("state.drafts=[uncategorized];loadDraft('d');");
  assert.equal(h.run('currentDraft().category'), null);
  assert.equal(h.elements.get('categorySelect').value, '');
});
test('opening an existing posted note restores its field correctly', () => {
  const h = harness();
  h.context.posted = core.normalizeDraft({ ...h.draft, category: 'journal-note', categoryName: 'note用', noteStatus: 'published' }, { remote: true });
  h.run("state.drafts=[posted];loadDraft('d');");
  assert.equal(h.elements.get('noteStatusField').hidden, false);
  assert.equal(h.elements.get('noteStatusSelect').value, 'published');
  assert.equal(h.run('currentDraft().pendingSync'), false);
});
test('posting changes received from another device update the visible selector', () => {
  const h = harness();
  const note = core.normalizeDraft({ ...h.draft, category: 'journal-note', categoryName: 'note用' }, { remote: true });
  h.context.note = note; h.run("state.drafts=[note];loadDraft('d');startRemoteSync();");
  h.articleSnapshot([{ ...note, noteStatus: 'published', revision: 'v2' }]);
  assert.equal(h.elements.get('noteStatusSelect').value, 'published');
  assert.equal(h.run('currentDraft().noteStatus'), 'published');
});
test('posted search matches only note status, and list shows status badges', () => {
  const h = harness();
  h.context.notes = [
    core.normalizeDraft({ ...h.draft, id: 'published', title: 'Published note', category: 'journal-note', categoryName: 'note用', noteStatus: 'published' }),
    core.normalizeDraft({ ...h.draft, id: 'unpublished', title: 'Draft note', category: 'journal-note', categoryName: 'note用' }),
    core.normalizeDraft({ ...h.draft, id: 'diary', title: 'Diary', category: 'journal-diary', categoryName: '日記', noteStatus: 'published' }),
  ];
  h.run("state.drafts=notes;state.searchQuery='投稿済';renderList();");
  const html = h.elements.get('draftList').innerHTML;
  assert.match(html, /Published note/); assert.match(html, /投稿済/);
  assert.ok(!html.includes('Draft note')); assert.ok(!html.includes('Diary'));
});

test('category and posting filters intersect search and recognize legacy category IDs', () => {
  const h = harness();
  h.context.filterArticles = [
    core.normalizeDraft({ ...h.draft, id: 'posted', title: 'Posted match', category: 'legacy-note', categoryName: 'note用', noteStatus: 'published' }),
    core.normalizeDraft({ ...h.draft, id: 'unposted', title: 'Unposted match', category: 'legacy-note', categoryName: 'note用' }),
    core.normalizeDraft({ ...h.draft, id: 'diary', title: 'Diary match', category: 'journal-diary', noteStatus: 'published' }),
  ];
  h.run("state.categories.push({id:'legacy-note',name:'note用',order:2});state.drafts=filterArticles;setListCategoryFilter('note');setListNoteFilter('published');state.searchQuery='match';renderList();");
  assert.match(h.elements.get('draftList').innerHTML, /Posted match/);
  assert.ok(!h.elements.get('draftList').innerHTML.includes('Unposted match'));
  assert.ok(!h.elements.get('draftList').innerHTML.includes('Diary match'));
  h.run("state.searchQuery='absent';renderList();");
  assert.match(h.elements.get('draftList').innerHTML, /この条件に一致/);
  h.run("state.searchQuery='';setListCategoryFilter('diary');");
  assert.equal(h.run('state.noteStatusFilter'), 'all');
  assert.equal(h.elements.get('listNoteFilters').classList.contains('hidden'), true);
  assert.match(h.elements.get('draftList').innerHTML, /Diary match/);
  h.run("setListCategoryFilter('note');setListNoteFilter('unpublished');");
  assert.match(h.elements.get('draftList').innerHTML, /Unposted match/);
  assert.ok(!h.elements.get('draftList').innerHTML.includes('Posted match'));
});

test('trash remains accessible regardless of active note filters and titles cannot open trash articles', () => {
  const h = harness();
  h.context.filterArticles = [
    core.normalizeDraft({ ...h.draft, id: 'active', title: 'Active note', category: 'journal-note' }),
    core.normalizeDraft({ ...h.draft, id: 'trash', title: 'Trash diary', category: 'journal-diary', deletedAt: '2026-10-09T00:00:00Z' }),
  ];
  h.run("state.drafts=filterArticles;setListCategoryFilter('note');setListNoteFilter('published');");
  h.events.get('trashButton:click')();
  assert.match(h.elements.get('draftList').innerHTML, /Trash diary/);
  assert.match(h.elements.get('draftList').innerHTML, /data-restore=/);
  assert.ok(!h.elements.get('draftList').innerHTML.includes('data-edit='));
  assert.equal(h.elements.get('listFilters').classList.contains('hidden'), true);
  assert.equal(h.elements.get('listOrderDescription').textContent, '更新日の新しい順');
  h.events.get('trashButton:click')();
  assert.equal(h.run('state.categoryFilter'), 'note');
  assert.equal(h.run('state.noteStatusFilter'), 'published');
  assert.equal(h.elements.get('listFilters').classList.contains('hidden'), false);
  assert.equal(h.elements.get('listOrderDescription').textContent, '作成日の新しい順');
});

test('title action opens input mode even after preview and leaves only trash in the action area', () => {
  const h = harness();
  h.run("state.drafts[0].title='<Sample>';setEditorMode('preview');renderList();");
  const html = h.elements.get('draftList').innerHTML;
  assert.match(html, /draft-title-button/);
  assert.match(html, /&lt;Sample&gt;/);
  assert.ok(!html.split('<div class="draft-actions">')[1].includes('data-edit='));
  assert.match(html, /data-delete=/);
  h.events.get('draftList:click')({ target: { closest: () => ({ dataset: { edit: 'd' } }) } });
  assert.equal(h.run('state.mode'), 'edit');
  assert.equal(h.run('state.view'), 'editor');
  assert.equal(h.run('currentDraft().body'), 'original');
});
test('new diary is available even if its former standard category was deleted', () => {
  const h = harness();
  h.run('state.categories=defaultCategories().map(c=>({...c,deleted:true}));newDraft();');
  assert.equal(h.run('currentDraft().categoryName'), '日記');
  assert.equal(h.run('activeCategories().length'), 2);
  assert.equal(h.run("state.drafts.find(d=>d.id==='d').category"), 'unknown-category');
});
test('bulk diary controls count only active uncategorized articles', () => {
  const h = harness();
  h.context.bulkRecords = [core.normalizeDraft({...h.draft,id:'active',category:null}),core.normalizeDraft({...h.draft,id:'trash',category:null,deletedAt:'2026-10-09T00:00:00Z'}),core.normalizeDraft({...h.draft,id:'note',category:'journal-note'})];
  h.run('state.drafts=bulkRecords;updateBulkCategoryControls();');
  assert.match(h.elements.get('bulkDiaryButton').textContent,/未分類1件/);
  assert.equal(h.elements.get('bulkDiaryButton').disabled,true);
  h.run('state.remoteReady=state.categoriesReady=true;updateBulkCategoryControls();');
  assert.equal(h.elements.get('bulkDiaryButton').disabled,false);
});
test('bulk diary operation reports changes and preserves other classifications', async () => {
  const h = harness();
  const article = core.normalizeDraft({...h.draft,category:null});
  h.context.bulkArticle = article;
  h.context.testFirebase.runTransaction = async (_db, callback) => callback({
    get: async (ref) => ref.path ? {exists:()=>true,data:()=>({records:core.defaultCategories()})} : {id:'d',exists:()=>true,data:()=>article},
    update: (_ref, changes) => Object.assign(article, changes),
  });
  h.context.testFirebase.doc = (source,...parts) => source.firestore ? {id:parts[0]} : {path:parts.join('/')};
  h.run('state.drafts=[bulkArticle];state.firebaseReady=state.remoteReady=state.categoriesReady=true;updateBulkCategoryControls();');
  await h.run('convertUncategorizedToDiary();');
  assert.equal(article.category,null);
  h.events.get('bulkDiaryButton:click')();
  assert.equal(article.category,null);
  assert.equal(h.elements.get('bulkDiaryConfirmation').classList.contains('hidden'),false);
  h.events.get('bulkDiaryCancelButton:click')();
  await h.events.get('bulkDiaryConfirmButton:click')();
  assert.equal(article.category,null);
  h.events.get('bulkDiaryButton:click')();
  await h.events.get('bulkDiaryConfirmButton:click')();
  assert.equal(h.run('currentDraft().category'),'journal-diary');
  assert.equal(h.run('currentDraft().body'),'original');
  assert.match(h.elements.get('bulkDiaryResult').textContent,/1件を日記へ変更/);
  assert.equal(h.run('state.bulkAssigning'),false);
});
