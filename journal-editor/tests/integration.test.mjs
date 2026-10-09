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
  for (const id of ['editorView', 'listView', 'settingsView']) element(id).classList.add('hidden');
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
