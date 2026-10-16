import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import * as core from '../editor-core.mjs';
import * as markdown from '../markdown.mjs';

const source = readFileSync(new URL('../script.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n').replace(/^import .*;\n/gm, '').replace(/^init\(\);\s*$/m, '');
function harness() {
  const elements = new Map(), storage = new Map(), events = new Map(), timers = new Map(), listeners = new Map(), serverRecords = new Map();
  let timerId = 0;
  const classList = () => {
    const names = new Set();
    return { add: (name) => names.add(name), remove: (name) => names.delete(name), contains: (name) => names.has(name), toggle(name, value = !names.has(name)) { value ? names.add(name) : names.delete(name); return value; } };
  };
  function element(id) {
    if (!elements.has(id)) elements.set(id, { value: '', textContent: '', innerHTML: '', selectionStart: 0, selectionEnd: 0, scrollTop: 0, offsetHeight: 78, classList: classList(), style: { setProperty() {} }, setAttribute() {}, focus() {}, blur() {}, setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }, setRangeText(text, start, end) { this.value = this.value.slice(0, start) + text + this.value.slice(end); this.selectionStart = this.selectionEnd = start + text.length; }, addEventListener(name, fn) { events.set(`${id}:${name}`, fn); } });
    return elements.get(id);
  }
  for (const id of ['editorView', 'listView', 'settingsView', 'bulkDiaryConfirmation', 'purgeConfirmation']) element(id).classList.add('hidden');
  const document = { getElementById: element, querySelector: element, documentElement: element('root'), body: { dataset: {}, classList: classList() }, addEventListener(name, fn) { events.set(`document:${name}`, fn); } };
  const window = { innerHeight: 844, matchMedia: () => ({ matches: false }), addEventListener(name, fn) { events.set(`window:${name}`, fn); } };
  const firebase = {
    collection: (_db, ...parts) => ({ firestore: {}, path: parts.join('/') }),
    doc: (_db, ...parts) => ({ path: parts.join('/') }),
    onSnapshot(ref, _options, callback, failure) { listeners.set(ref.path, { callback, failure }); return () => {}; },
    async getDocFromServer(ref) {
      const record = serverRecords.get(ref.path);
      return { id: ref.path, metadata: { fromCache: false, hasPendingWrites: false }, exists: () => Boolean(record), data: () => record };
    },
  };
  const context = vm.createContext({ ...core, ...markdown, document, window, navigator: { onLine: true }, localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) }, crypto, console: { error() {} }, Date, Intl, confirm: () => true, setTimeout(fn) { timers.set(++timerId, fn); return timerId; }, clearTimeout(id) { timers.delete(id); } });
  vm.runInContext(source, context);
  const run = (code) => vm.runInContext(code, context);
  context.testFirebase = firebase;
  run("state.user={uid:'account-a'};state.firebase=testFirebase;state.db={};state.categories=defaultCategories();state.view='editor';$('editorView').classList.remove('hidden');");
  const draft = core.normalizeDraft({ id: 'd', title: 'Synthetic', body: 'original', category: 'unknown-category', categoryName: 'Legacy name', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', revision: 'v1' }, { remote: true });
  context.fixture = draft;
  serverRecords.set(draft.id, draft);
  run("state.drafts=[fixture];state.currentId=state.editorDraftId='d';titleInput.value='Synthetic';bodyInput.value='original';renderCategoryOptions();resetHistory();persistLocal();");
  const articleSnapshot = (drafts, fromCache = false, updateServer = true) => {
    if (!fromCache && updateServer) { serverRecords.clear(); for (const draft of drafts) serverRecords.set(draft.id, draft); }
    const callback = listeners.get('users/account-a/blogEditorDrafts').callback;
    callback({ metadata: { fromCache, hasPendingWrites: false }, docs: drafts.map((draft) => ({ id: draft.id, data: () => draft })) });
  };
  return { context, elements, storage, events, timers, listeners, serverRecords, run, draft, articleSnapshot };
}

function connect(h) {
  h.run('startRemoteSync();state.firebaseReady=true;');
  h.articleSnapshot([h.draft]);
  confirmCategories(h);
}
function confirmCategories(h, fromCache = false) {
  h.listeners.get('users/account-a/blogEditorMigrations/editorCategoriesV2').callback({
    metadata: { fromCache, hasPendingWrites: false }, exists: () => true,
    data: () => ({ records: h.run('state.categories') }),
  });
}
function delayedWrite(h) {
  const records = h.serverRecords;
  let release, committed;
  const gate = new Promise((resolve) => { release = resolve; });
  const didCommit = new Promise((resolve) => { committed = resolve; });
  h.context.testFirebase.runTransaction = async (_db, callback) => {
    const result = await callback({
      get: async (ref) => ({ id: ref.path, exists: () => records.has(ref.path), data: () => records.get(ref.path) }),
      set: (ref, payload) => records.set(ref.path, payload),
    });
    committed(); await gate; return result;
  };
  return { records, release, didCommit };
}

test('cache-only article or category snapshots revoke the synced label', () => {
  const h = harness(); connect(h);
  assert.equal(h.elements.get('syncStatus').textContent, 'クラウド同期済み');
  h.articleSnapshot([h.draft], true);
  assert.equal(h.elements.get('syncStatus').textContent, '同期を確認中');
  // Initial readiness remains available for offline-first upload attempts.
  assert.equal(h.run('state.remoteReady'), true);
  h.articleSnapshot([h.draft]); confirmCategories(h, true);
  assert.equal(h.elements.get('syncStatus').textContent, '同期を確認中');
  confirmCategories(h);
  assert.equal(h.elements.get('syncStatus').textContent, 'クラウド同期済み');
});

for (const kind of ['soft-delete', 'purge', 'edit']) {
  test(`a ${kind} received before an upload resolves is rechecked after the write`, async () => {
    const h = harness(); connect(h);
    const server = delayedWrite(h);
    h.elements.get('bodyInput').value = 'uploaded text'; h.run("scheduleSave();showView('list');");
    const saving = h.run("saveDraftById('d')"); await server.didCommit;
    const saved = server.records.get('d');
    const later = kind === 'purge' ? [] : [{ ...saved, revision: 'other-device',
      ...(kind === 'soft-delete' ? { deletedAt: '2026-10-16T03:00:00Z' } : { body: 'newer remote text' }) }];
    const previousListener = h.listeners.get('users/account-a/blogEditorDrafts').callback;
    h.articleSnapshot(later); server.release(); await saving;
    assert.notEqual(h.listeners.get('users/account-a/blogEditorDrafts').callback, previousListener);
    assert.notEqual(h.elements.get('syncStatus').textContent, 'クラウド同期済み');
    // A superseded listener cannot restore a stale version.
    previousListener({ metadata: { fromCache: false, hasPendingWrites: false }, docs: [{ id: 'd', data: () => saved }] });
    h.articleSnapshot(later); confirmCategories(h); await new Promise((resolve) => setImmediate(resolve));
    const local = h.run("state.drafts.find(d=>d.id==='d')");
    if (kind === 'purge') assert.equal(local, undefined);
    else if (kind === 'soft-delete') assert.ok(local.deletedAt);
    else assert.equal(local.body, 'newer remote text');
    assert.equal(h.elements.get('syncStatus').textContent, 'クラウド同期済み');
  });
}

test('a pre-commit snapshot is not replayed over a successful upload', async () => {
  const h = harness(); connect(h); const server = delayedWrite(h);
  h.elements.get('bodyInput').value = 'new saved text'; h.run('scheduleSave();');
  const saving = h.run("saveDraftById('d')"); await server.didCommit;
  h.articleSnapshot([h.draft], false, false); server.release(); await saving;
  assert.equal(h.run('currentDraft().body'), 'new saved text');
  h.articleSnapshot([...server.records.values()]); confirmCategories(h);
  assert.equal(h.run('currentDraft().body'), 'new saved text');
  assert.equal(h.run('state.drafts.length'), 1);
});

test('a normal acknowledged upload does not restart the listeners', async () => {
  const h = harness(); connect(h); const server = delayedWrite(h);
  const listener = h.listeners.get('users/account-a/blogEditorDrafts').callback;
  h.elements.get('bodyInput').value = 'new saved text'; h.run('scheduleSave();');
  const saving = h.run("saveDraftById('d')"); await server.didCommit;
  h.articleSnapshot([...server.records.values()]); server.release(); await saving;
  assert.equal(h.listeners.get('users/account-a/blogEditorDrafts').callback, listener);
  assert.equal(h.elements.get('syncStatus').textContent, 'クラウド同期済み');
});

test('newer local typing survives deletion received during the previous upload', async () => {
  const h = harness(); connect(h); const server = delayedWrite(h);
  h.elements.get('bodyInput').value = 'first edit'; h.run('scheduleSave();');
  const saving = h.run("saveDraftById('d')"); await server.didCommit;
  h.elements.get('bodyInput').value = 'newer unsent edit'; h.run('scheduleSave();');
  const deleted = { ...server.records.get('d'), revision: 'deleted-elsewhere', deletedAt: '2026-10-16T03:00:00Z' };
  h.articleSnapshot([deleted]); server.release(); await saving;
  h.articleSnapshot([deleted]);
  assert.equal(h.elements.get('bodyInput').value, 'newer unsent edit');
  assert.equal(h.run('currentDraft().pendingSync'), true);
  server.records.set('d', deleted);
  await h.run("saveDraftById('d')");
  assert.notEqual(h.run('state.currentId'), 'd');
  assert.equal(h.run('currentDraft().body'), 'newer unsent edit');
  assert.ok(server.records.get('d').deletedAt);
});

for (const input of ['bodyInput', 'titleInput']) {
  test(`${input} composition preserves local text and defers remote replacement`, async () => {
    const h = harness(); connect(h);
    h.events.get(`${input}:compositionstart`)();
    // A remote update before the first IME input must not change the baseline.
    h.articleSnapshot([{ ...h.draft, title: 'remote title', body: 'remote body', revision: 'remote-edit' }]);
    assert.equal(h.elements.get('bodyInput').value, 'original');
    assert.equal(h.elements.get('titleInput').value, 'Synthetic');
    h.elements.get(input).value = '変換途中'; h.events.get(`${input}:input`)();
    let uploads = 0;
    h.context.testFirebase.runTransaction = async () => { uploads++; throw new Error('not during composition'); };
    await h.run("saveDraftById('d')");
    assert.equal(uploads, 0);
    const saved = JSON.parse(h.storage.get(`${core.storageKey('account-a')}:draft:d`));
    assert.equal(saved[input === 'bodyInput' ? 'body' : 'title'], '変換途中');
    h.elements.get(input).value = '変換確定'; h.events.get(`${input}:compositionend`)();
    assert.equal(h.elements.get(input).value, '変換確定');
    assert.equal(h.run('currentDraft().pendingSync'), true);
    assert.equal(h.run('currentDraft().baseVersion'), h.draft.baseVersion);
    assert.equal(h.run("state.saveTimers.has('d')"), true);
  });
}

test('cancelled composition applies a deferred update without claiming cached data is synced', () => {
  const h = harness(); connect(h);
  h.events.get('bodyInput:compositionstart')();
  const remote = { ...h.draft, body: 'new remote text', revision: 'remote-edit' };
  h.articleSnapshot([remote]); h.articleSnapshot([remote], true);
  h.events.get('bodyInput:compositionend')();
  assert.equal(h.elements.get('bodyInput').value, 'new remote text');
  assert.equal(h.run('currentDraft().pendingSync'), false);
  assert.equal(h.elements.get('syncStatus').textContent, '同期を確認中');
});

test('an upload finishing during composition waits for the final local input', async () => {
  const h = harness(); connect(h); const server = delayedWrite(h);
  h.elements.get('bodyInput').value = 'first edit'; h.run('scheduleSave();');
  const saving = h.run("saveDraftById('d')"); await server.didCommit;
  h.events.get('bodyInput:compositionstart')();
  h.elements.get('bodyInput').value = '変換途中'; h.events.get('bodyInput:input')();
  server.release(); await new Promise((resolve) => setImmediate(resolve));
  assert.equal(h.run("state.writes.has('d')"), true);
  assert.equal(h.elements.get('bodyInput').value, '変換途中');
  h.elements.get('bodyInput').value = '変換確定'; h.events.get('bodyInput:compositionend')();
  await saving;
  assert.equal(h.run('currentDraft().body'), '変換確定');
  assert.equal(h.run('currentDraft().pendingSync'), true);
});

test('a conflict result preserves a newer title composed during the upload', async () => {
  const h = harness(); connect(h); const server = delayedWrite(h);
  server.records.set('d', { ...h.draft, body: 'other device edit', revision: 'other-edit' });
  h.elements.get('bodyInput').value = 'my body'; h.run('scheduleSave();');
  const saving = h.run("saveDraftById('d')"); await server.didCommit;
  h.events.get('titleInput:compositionstart')();
  h.elements.get('titleInput').value = '新しいタイトル'; h.events.get('titleInput:input')();
  server.release(); await new Promise((resolve) => setImmediate(resolve));
  assert.equal(h.elements.get('titleInput').value, '新しいタイトル');
  h.events.get('titleInput:compositionend')(); await saving;
  assert.equal(h.run('currentDraft().title'), '新しいタイトル（競合コピー）');
  assert.equal(h.elements.get('titleInput').value, '新しいタイトル（競合コピー）');
  assert.equal(h.run('currentDraft().pendingSync'), true);
  assert.equal(server.records.get('d').body, 'other device edit');
});

test('releasing deferred composition does not replay stale data for other articles', () => {
  const h = harness(); connect(h);
  h.events.get('bodyInput:compositionstart')();
  h.articleSnapshot([{ ...h.draft, body: 'remote edit', revision: 'remote-edit' }]);
  h.run("state.drafts.push(normalizeDraft({...fixture,id:'separately-saved'}, {remote:true}));");
  h.events.get('bodyInput:compositionend')();
  assert.equal(h.run("state.drafts.some(d=>d.id==='separately-saved')"), true);
  assert.equal(h.elements.get('bodyInput').value, 'remote edit');
});

test('confirmed deletion after cancelled composition closes the clean editor without a copy', async () => {
  const h = harness(); connect(h);
  h.events.get('bodyInput:compositionstart')(); h.articleSnapshot([]);
  assert.equal(h.run('state.currentId'), 'd');
  h.events.get('bodyInput:compositionend')();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(h.run('state.currentId'), null);
  assert.equal(h.run('state.view'), 'list');
  assert.equal(h.run('state.drafts.length'), 0);
});

test('blur releases composition and account switches discard deferred work', async () => {
  const h = harness(); connect(h); const server = delayedWrite(h);
  h.elements.get('bodyInput').value = 'first edit'; h.run('scheduleSave();');
  const saving = h.run("saveDraftById('d')"); await server.didCommit;
  h.events.get('bodyInput:compositionstart')();
  h.elements.get('bodyInput').value = 'blurred IME text'; h.events.get('bodyInput:blur')();
  assert.equal(h.run('state.composing'), false);
  assert.equal(h.run('currentDraft().body'), 'blurred IME text');
  h.events.get('bodyInput:compositionstart')();
  server.release(); await new Promise((resolve) => setImmediate(resolve));
  await h.run("handleAuth({uid:'account-b'})"); await saving;
  assert.equal(h.run('state.drafts.length'), 0);
  assert.equal(h.run('state.compositionWaiters.size'), 0);
  assert.equal(h.elements.get('bodyInput').value, '');
});

test('resuming a page or retrying invalidates old sync confirmation and reconnects', () => {
  const h = harness(); connect(h);
  let listener = h.listeners.get('users/account-a/blogEditorDrafts').callback;
  h.events.get('window:pageshow')({ persisted: true });
  assert.notEqual(h.listeners.get('users/account-a/blogEditorDrafts').callback, listener);
  assert.equal(h.elements.get('syncStatus').textContent, '同期を確認中');
  h.articleSnapshot([h.draft]); confirmCategories(h);
  h.context.document.visibilityState = 'hidden'; h.events.get('document:visibilitychange')();
  assert.equal(h.elements.get('syncStatus').textContent, '同期を確認中');
  listener = h.listeners.get('users/account-a/blogEditorDrafts').callback;
  h.context.document.visibilityState = 'visible'; h.events.get('document:visibilitychange')();
  assert.notEqual(h.listeners.get('users/account-a/blogEditorDrafts').callback, listener);
  h.articleSnapshot([h.draft]); confirmCategories(h);
  listener = h.listeners.get('users/account-a/blogEditorDrafts').callback;
  h.run('retrySync();');
  assert.notEqual(h.listeners.get('users/account-a/blogEditorDrafts').callback, listener);
  assert.equal(h.elements.get('syncStatus').textContent, '同期を確認中');
});

test('new article after preview always opens the text input mode', () => {
  const h = harness(); h.run("setEditorMode('preview');newDraft();");
  assert.equal(h.run('state.mode'), 'edit');
  assert.equal(h.elements.get('workspace').className, 'workspace mode-edit');
  assert.equal(h.run('state.view'), 'editor');
});

test('list sorting switches dates, keeps pins first and never edits article records', () => {
  const h = harness();
  h.context.sortArticles = [
    core.normalizeDraft({ ...h.draft, id: 'old', title: 'Old creation recent edit', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-10-16T00:00:00Z' }, { remote: true }),
    core.normalizeDraft({ ...h.draft, id: 'new', title: 'New creation older edit', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' }, { remote: true }),
    core.normalizeDraft({ ...h.draft, id: 'pin', title: 'Pinned', pinnedAt: '2026-10-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' }, { remote: true }),
  ];
  h.run("state.drafts=sortArticles;showView('list');persistLocal();");
  const before = h.run('JSON.stringify(state.drafts)'), localBefore = h.storage.get(`${core.storageKey('account-a')}:draft:old`);
  let html = h.elements.get('draftList').innerHTML;
  assert.ok(html.indexOf('data-edit="pin"') < html.indexOf('data-edit="new"'));
  assert.ok(html.indexOf('data-edit="new"') < html.indexOf('data-edit="old"'));
  h.events.get('listSortSelect:change')({ target: { value: 'updatedAt' } });
  html = h.elements.get('draftList').innerHTML;
  assert.ok(html.indexOf('data-edit="pin"') < html.indexOf('data-edit="old"'));
  assert.ok(html.indexOf('data-edit="old"') < html.indexOf('data-edit="new"'));
  assert.equal(h.elements.get('listOrderDescription').textContent, 'ピン止めを先頭・更新日の新しい順');
  assert.equal(h.run('readListSort()'), 'updatedAt');
  assert.equal(h.run('JSON.stringify(state.drafts)'), before);
  assert.equal(h.storage.get(`${core.storageKey('account-a')}:draft:old`), localBefore);
  assert.equal(h.run('state.saveTimers.size'), 0);
  h.events.get('listSortSelect:change')({ target: { value: 'createdAt' } });
  assert.equal(h.run('readListSort()'), 'createdAt');
});

test('sort preference survives trash and filters; trash keeps its own updated order', () => {
  const h = harness(); h.run("changeListSort('updatedAt');setListCategoryFilter('diary');");
  assert.equal(h.run('state.listSort'), 'updatedAt');
  h.events.get('trashButton:click')();
  assert.equal(h.elements.get('draftList').classList.contains('card-list'), false);
  assert.equal(h.elements.get('listSortField').hidden, true);
  assert.equal(h.elements.get('backToListLabel').hidden, false);
  assert.equal(h.elements.get('trashButton').classList.contains('list-back-button'), true);
  assert.equal(h.elements.get('listOrderDescription').textContent, '更新日の新しい順');
  h.events.get('homeButton:click')();
  assert.equal(h.elements.get('draftList').classList.contains('card-list'), true);
  assert.equal(h.elements.get('listSortField').hidden, false);
  assert.equal(h.elements.get('backToListLabel').hidden, true);
  assert.equal(h.run('state.listSort'), 'updatedAt');
  h.storage.set('orangemania-journal-list-sort-v1', 'invalid');
  assert.equal(h.run('readListSort()'), 'createdAt');
});

test('copy suffixes become unique escaped list labels without changing saved or editable titles', () => {
  const h = harness();
  h.run("state.drafts[0].title='<Synthetic>（競合コピー）（復元）（復元）';showView('list');");
  const original = h.run('currentDraft().title');
  const html = h.elements.get('draftList').innerHTML;
  assert.match(html, /&lt;Synthetic&gt;<\/button>/);
  assert.equal((html.match(/class="article-state-badge"/g) || []).length, 2);
  assert.ok(!h.run("draftTitleMarkup(currentDraft())").includes('（復元）（復元）'));
  assert.equal(h.run('currentDraft().title'), original);
  h.run("loadDraft('d');");
  assert.equal(h.elements.get('titleInput').value, original);
});

test('PC keeps the normal editing layout and split view', () => {
  const h = harness(); h.events.get('bodyInput:focus')();
  assert.equal(h.context.document.body.classList.contains('editor-typing'), false);
  h.run("setEditorMode('split');");
  assert.equal(h.run('state.mode'), 'split');
});

test('using a mouse on a touch-capable PC restores desktop editing controls', () => {
  const h = harness(); h.context.window.matchMedia = (query) => ({ matches: query.includes('pointer: coarse') });
  h.context.document.activeElement = h.elements.get('bodyInput');
  h.events.get('window:pointerdown')({ pointerType: 'touch' });
  assert.equal(h.context.document.body.classList.contains('compact-editor'), true);
  h.events.get('window:pointerdown')({ pointerType: 'mouse' });
  assert.equal(h.context.document.body.classList.contains('compact-editor'), false);
  assert.equal(h.context.document.body.classList.contains('editor-typing'), false);
  h.run("setEditorMode('split');");
  assert.equal(h.run('state.mode'), 'split');
});

test('tablet and phone focused editing preserves IME input and Done restores controls', () => {
  const h = harness();
  h.context.window.matchMedia = (query) => ({ matches: query.includes('pointer: coarse') });
  h.events.get('bodyInput:focus')();
  assert.equal(h.context.document.body.classList.contains('editor-typing'), true);
  h.events.get('bodyInput:compositionstart')();
  h.elements.get('bodyInput').value = '外出先での追記'; h.events.get('bodyInput:input')();
  h.events.get('finishInputButton:click')();
  assert.equal(h.run('currentDraft().body'), '外出先での追記');
  assert.equal(h.run('currentDraft().pendingSync'), true);
  assert.equal(h.run('state.composing'), false);
  assert.equal(h.context.document.body.classList.contains('editor-typing'), false);
  h.run("setEditorMode('split');");
  assert.equal(h.run('state.mode'), 'edit');
});

test('logout after account reload never saves the empty, unloaded editor over the restored article', async () => {
  const h = harness(); let signedOut = false;
  h.context.testFirebase.signOut = async () => { signedOut = true; };
  await h.run("handleAuth({uid:'account-a'})");
  assert.equal(h.run('state.currentId'), 'd');
  assert.equal(h.run('state.editorDraftId'), null);
  assert.equal(h.elements.get('bodyInput').value, '');
  await h.run('logout();');
  assert.equal(signedOut, true);
  assert.equal(h.run('currentDraft().title'), 'Synthetic');
  assert.equal(h.run('currentDraft().body'), 'original');
  assert.equal(h.run('currentDraft().pendingSync'), false);
  assert.equal(JSON.parse(h.storage.get(`${core.storageKey('account-a')}:draft:d`)).body, 'original');
});

test('logout from the list cannot overwrite a newer server update with hidden editor fields', async () => {
  const h = harness(); connect(h);
  h.context.testFirebase.signOut = async () => {};
  h.run("showView('list');");
  h.articleSnapshot([{ ...h.draft, title: 'remote title', body: 'remote body', revision: 'remote-v2' }]);
  assert.equal(h.elements.get('bodyInput').value, 'original');
  await h.run('logout();');
  assert.equal(h.run('currentDraft().body'), 'remote body');
  assert.equal(h.run('currentDraft().title'), 'remote title');
  assert.equal(h.run('currentDraft().pendingSync'), false);
});

test('editor fields belonging to a different article cannot be saved into currentId', () => {
  const h = harness(); h.run("state.editorDraftId='other';titleInput.value='wrong';bodyInput.value='wrong';scheduleSave();");
  assert.equal(h.run('currentDraft().body'), 'original');
  assert.equal(h.run('currentDraft().title'), 'Synthetic');
});

for (const button of ['homeButton', 'draftsButton']) {
  test(`${button} exits trash, clears deletion review and opens the complete journal list`, () => {
    const h = harness();
    h.run("showView('list');state.showTrash=true;state.searchQuery='trash-only';$('searchInput').value='trash-only';state.categoryFilter='note';state.noteStatusFilter='published';state.selectedTrash.add('d');state.purgeTargets=[fixture];$('purgeConfirmation').classList.remove('hidden');renderList();");
    const before = h.run('JSON.stringify(state.drafts)');
    h.events.get(`${button}:click`)();
    assert.equal(h.run('state.showTrash'), false);
    assert.equal(h.elements.get('listTitle').textContent, 'Journal一覧');
    assert.equal(h.elements.get('searchInput').value, '');
    assert.equal(h.run('state.categoryFilter'), 'all');
    assert.equal(h.run('state.noteStatusFilter'), 'all');
    assert.equal(h.run('state.selectedTrash.size'), 0);
    assert.equal(h.run('state.purgeTargets.length'), 0);
    assert.equal(h.elements.get('purgeConfirmation').classList.contains('hidden'), true);
    assert.match(h.elements.get('draftList').innerHTML, /Synthetic/);
    assert.equal(h.run('JSON.stringify(state.drafts)'), before);
  });
}

test('header navigation waits for a running bulk deletion before clearing its state', () => {
  const h = harness(); h.run('state.showTrash=true;state.bulkPurging=true;');
  h.events.get('homeButton:click')();
  assert.equal(h.run('state.showTrash'), true);
});

test('three clients converge despite historical purge markers and existing conflict copies', async () => {
  const clients = [harness(), harness(), harness()];
  const cloud = [clients[0].draft, core.normalizeDraft({ ...clients[0].draft, id: 'existing-copy', title: 'Synthetic（競合コピー）（復元）', body: 'different preserved text', revision: 'copy-v1' }, { remote: true })];
  for (const [index, h] of clients.entries()) {
    connect(h); h.run("showView('list');");
    if (index === 0) h.run("state.purgedIds.add('d');state.drafts=[];");
    if (index === 1) h.run("state.purgedIds.add('existing-copy');");
    h.articleSnapshot(cloud);
  }
  await new Promise((resolve) => setImmediate(resolve));
  for (const h of clients) {
    assert.deepEqual(Array.from(h.run('state.drafts.map(d=>d.id).sort()')), ['d', 'existing-copy']);
    assert.equal(h.run('state.purgedIds.size'), 0);
    assert.equal(h.run('state.drafts.some(d=>d.pendingSync)'), false);
    assert.equal(h.elements.get('syncStatus').textContent, 'クラウド同期済み');
    assert.equal(h.run("state.drafts.find(d=>d.id==='existing-copy').body"), 'different preserved text');
  }
});

test('repeated lagging collection snapshots never turn a saved article into recovery copies', async () => {
  const h = harness(); connect(h);
  for (let i = 0; i < 4; i++) {
    h.articleSnapshot([], false, false);
    assert.notEqual(h.elements.get('syncStatus').textContent, 'クラウド同期済み');
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(h.run('state.drafts.length'), 1);
    assert.equal(h.run('state.currentId'), 'd');
    assert.equal(h.run('currentDraft().title'), 'Synthetic');
    assert.equal(h.run('currentDraft().pendingSync'), false);
    assert.equal(h.run('state.purgedIds.size'), 0);
    assert.equal(h.elements.get('syncStatus').textContent, 'クラウド同期済み');
  }
});

test('a stale server query cannot resurrect a genuinely purged article', async () => {
  const h = harness(); connect(h);
  h.run("state.drafts=[];state.currentId=null;state.purgedIds.add('d');"); h.serverRecords.clear();
  h.articleSnapshot([h.draft], false, false);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(h.run('state.drafts.length'), 0);
  assert.equal(h.run('state.serverDrafts.length'), 0);
  assert.equal(h.elements.get('syncStatus').textContent, 'クラウド同期済み');
});

test('failed presence confirmation preserves local content and prevents a synced label', async () => {
  const h = harness(); connect(h);
  const read = h.context.testFirebase.getDocFromServer;
  h.context.testFirebase.getDocFromServer = async () => { throw { code: 'unavailable' }; };
  h.articleSnapshot([], false, false); await new Promise((resolve) => setImmediate(resolve));
  assert.equal(h.run('currentDraft().body'), 'original');
  assert.match(h.elements.get('syncStatus').textContent, /同期エラー/);
  h.context.testFirebase.getDocFromServer = read;
  h.run('retrySync();'); h.articleSnapshot([h.draft]); confirmCategories(h);
  assert.equal(h.elements.get('syncStatus').textContent, 'クラウド同期済み');
});

test('typing during a presence read prevents its absent result from discarding the draft', async () => {
  const h = harness(); connect(h); let release;
  h.context.testFirebase.getDocFromServer = () => new Promise((resolve) => { release = resolve; });
  h.articleSnapshot([]);
  h.elements.get('bodyInput').value = 'unsent typing'; h.events.get('bodyInput:input')();
  release({ exists: () => false, metadata: { fromCache: false } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(h.run('currentDraft().body'), 'unsent typing');
  assert.equal(h.run('currentDraft().pendingSync'), true);
  assert.equal(h.run('state.purgedIds.size'), 0);
});

test('an older document read cannot replace a newer listener update', async () => {
  const h = harness(); connect(h); let release;
  h.context.testFirebase.getDocFromServer = () => new Promise((resolve) => { release = resolve; });
  h.articleSnapshot([], false, false);
  h.articleSnapshot([{ ...h.draft, body: 'latest text', revision: 'latest' }]);
  release({ exists: () => false, metadata: { fromCache: false } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(h.run('currentDraft().body'), 'latest text');
  assert.equal(h.run('state.presenceChecks.size'), 0);
});

test('account switches ignore pending presence checks from the previous account', async () => {
  const h = harness(); connect(h); let release;
  h.context.testFirebase.getDocFromServer = () => new Promise((resolve) => { release = resolve; });
  h.articleSnapshot([], false, false);
  await h.run("handleAuth({uid:'account-b'})");
  release({ exists: () => true, data: () => h.draft, metadata: { fromCache: false } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(h.run('state.drafts.length'), 0);
  assert.equal(h.run('state.presenceChecks.size'), 0);
});

test('the synced label requires local article contents to match the confirmed server data', () => {
  const h = harness(); connect(h);
  h.run("state.drafts=[{...fixture,body:'different local text'}];refreshSyncStatus();");
  assert.equal(h.elements.get('syncStatus').textContent, '同期を確認中');
});

test('diagnostics compare browser data without exposing account IDs or journal text', async () => {
  const h = harness(); connect(h); let copied;
  h.context.TextEncoder = TextEncoder;
  h.context.navigator.clipboard = { writeText: async (text) => { copied = text; } };
  await h.run('copyDiagnostic();');
  const report = JSON.parse(copied);
  assert.equal(report.localDraftCount, 1);
  assert.equal(report.localMatchesServer, true);
  assert.equal(report.localFingerprint, report.serverFingerprint);
  assert.match(report.scopeFingerprint, /^[a-f0-9]{64}$/);
  for (const secret of ['Synthetic', 'original', 'account-a']) assert.equal(copied.includes(secret), false);
  h.run("state.drafts=[{...fixture,body:'different local text'}];");
  await h.run('copyDiagnostic();');
  const different = JSON.parse(copied);
  assert.equal(different.localMatchesServer, false);
  assert.notEqual(different.localFingerprint, different.serverFingerprint);
  assert.equal(different.scopeFingerprint, report.scopeFingerprint);
  assert.equal(copied.includes('different local text'), false);
});

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
test('a clean editor closes after verified server deletion and new typing uses explicit new draft', async () => {
  const h = harness(); h.run('startRemoteSync();'); h.articleSnapshot([]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(h.run('state.currentId'), null);
  assert.equal(h.run('state.drafts.length'), 0);
  h.run('newDraft();'); const id = h.run('state.currentId'); assert.notEqual(id, 'd');
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

function purgeHarness(fail = false) {
  const h = harness();
  const articles = [
    core.normalizeDraft({ ...h.draft, id: 'trash-one', title: 'Trash <one>', deletedAt: '2026-10-09T00:00:00Z' }, { remote: true }),
    core.normalizeDraft({ ...h.draft, id: 'trash-two', title: 'Unselected trash', deletedAt: '2026-10-09T00:00:00Z' }, { remote: true }),
    core.normalizeDraft({ ...h.draft, id: 'active', title: 'Active article' }, { remote: true }),
  ];
  const records = new Map(articles.map((article) => [article.id, structuredClone(article)])), deleted = [];
  h.context.purgeArticles = articles;
  h.context.testFirebase.doc = (source, ...parts) => source.firestore ? { id: parts[0] } : { path: parts.join('/') };
  h.context.testFirebase.runTransaction = async (_db, callback) => {
    if (fail) throw new Error('Test-only denied deletion');
    return callback({
      get: async ({ id }) => ({ id, exists: () => records.has(id), data: () => records.get(id) }),
      delete: ({ id }) => { records.delete(id); deleted.push(id); },
    });
  };
  h.run("state.drafts=purgeArticles;state.currentId=null;state.showTrash=true;state.view='list';state.firebaseReady=state.remoteReady=state.categoriesReady=true;persistLocal();renderList();");
  return { h, records, deleted };
}

test('selected permanent deletion requires review, cancels safely, and removes only chosen cloud/local records', async () => {
  const { h, records, deleted } = purgeHarness();
  const otherAccount = `${core.storageKey('account-b')}:draft:trash-one`;
  h.storage.set(otherAccount, 'other account content');
  const input = { dataset: { trashSelect: 'trash-one' }, checked: true };
  h.events.get('draftList:change')({ target: { closest: (selector) => selector === '[data-trash-select]' ? input : null } });
  await h.run('purgeSelectedDrafts();'); assert.equal(deleted.length, 0);
  h.events.get('purgeSelectedButton:click')();
  assert.match(h.elements.get('purgeTitles').innerHTML, /Trash &lt;one&gt;/);
  h.events.get('purgeCancelButton:click')();
  await h.events.get('purgeConfirmButton:click')(); assert.equal(deleted.length, 0);
  h.events.get('purgeSelectedButton:click')();
  h.run("state.editorDraftId='trash-one';bodyInput.value='hidden old article';resetHistory();");
  await h.events.get('purgeConfirmButton:click')();
  assert.deepEqual(deleted, ['trash-one']);
  assert.equal(records.has('trash-two'), true); assert.equal(records.has('active'), true);
  assert.equal(h.storage.has(`${core.storageKey('account-a')}:draft:trash-one`), false);
  assert.equal(h.storage.get(otherAccount), 'other account content');
  const index = JSON.parse(h.storage.get(core.storageKey('account-a')));
  assert.ok(!index.ids.includes('trash-one')); assert.ok(index.purgedIds.includes('trash-one'));
  assert.equal(h.elements.get('bodyInput').value, '');
  assert.equal(h.elements.get('purgeTitles').innerHTML, '');
  assert.match(h.elements.get('purgeResult').textContent, /1件を完全削除/);
});

test('offline or failed permanent deletion keeps the selected article and its local content', async () => {
  const { h, records, deleted } = purgeHarness(true);
  h.run("state.selectedTrash.add('trash-one');navigator.onLine=false;renderList();");
  assert.equal(h.elements.get('purgeSelectedButton').disabled, true);
  h.run('navigator.onLine=true;renderList();requestPurge();');
  await h.run('purgeSelectedDrafts();');
  assert.equal(deleted.length, 0); assert.equal(records.has('trash-one'), true);
  assert.equal(h.run("state.drafts.some(d=>d.id==='trash-one')"), true);
  assert.equal(h.storage.has(`${core.storageKey('account-a')}:draft:trash-one`), true);
  assert.match(h.elements.get('purgeResult').textContent, /元データを保持/);
});

test('concurrently restored article is not purged and changing accounts clears deletion review', async () => {
  const { h, records, deleted } = purgeHarness();
  h.run("state.selectedTrash.add('trash-one');renderList();requestPurge();");
  records.get('trash-one').deletedAt = null;
  await h.run('purgeSelectedDrafts();');
  assert.equal(deleted.length, 0); assert.equal(records.has('trash-one'), true);
  assert.match(h.elements.get('purgeResult').textContent, /復元・変更された1件/);
  h.run("state.selectedTrash.add('trash-two');renderList();requestPurge();");
  await h.run("handleAuth({uid:'account-b'});");
  assert.equal(h.run('state.purgeTargets.length'), 0);
  assert.equal(h.run('state.selectedTrash.size'), 0);
  assert.equal(h.elements.get('purgeConfirmation').classList.contains('hidden'), true);
  assert.equal(h.elements.get('purgeTitles').innerHTML, '');
});

test('confirmed purge on another device removes local trash and subsequent stale cache cannot bring it back', async () => {
  const h = harness();
  const trash = core.normalizeDraft({ ...h.draft, deletedAt: '2026-10-09T00:00:00Z' }, { remote: true });
  h.context.trashFixture = trash;
  h.run('state.drafts=[trashFixture];state.currentId=null;persistLocal();startRemoteSync();');
  h.articleSnapshot([], true);
  assert.equal(h.run('state.drafts.length'), 1);
  h.articleSnapshot([]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(h.run('state.drafts.length'), 0);
  assert.equal(h.storage.has(`${core.storageKey('account-a')}:draft:d`), false);
  h.articleSnapshot([trash], true);
  assert.equal(h.run('state.drafts.length'), 0);
});

test('changing a list category saves the chosen article without changing its text or creation date', async () => {
  const h = harness(), original = structuredClone(h.draft);
  let saved;
  h.context.testFirebase.doc = (_collection, id) => ({ id });
  h.context.testFirebase.runTransaction = async (_db, callback) => callback({
    get: async ({ id }) => ({ id, exists: () => true, data: () => original }),
    set: (_ref, data) => { saved = data; },
  });
  h.run("state.view='list';state.firebaseReady=state.remoteReady=true;openListTagEditor('d','category');");
  const select = { dataset: { listTagSelect: 'd', tagKind: 'category' }, value: 'journal-note' };
  h.events.get('draftList:change')({ target: { closest: (selector) => selector === '[data-list-tag-select]' ? select : null } });
  await h.run("saveDraftById('d');");
  assert.equal(saved.category, 'journal-note'); assert.equal(saved.categoryName, 'note用');
  assert.equal(saved.title, original.title); assert.equal(saved.body, original.body);
  assert.equal(saved.createdAt, original.createdAt); assert.equal(saved.noteStatus, 'unpublished');
  assert.equal(h.elements.get('categorySelect').value, 'journal-note');
  assert.equal(h.run('state.listTagEditor'), null);
});

test('list status edits do not use the hidden editor text of a different article', () => {
  const h = harness();
  h.context.otherArticle = core.normalizeDraft({ ...h.draft, id: 'other', title: 'Other title', body: 'Other body', category: 'journal-note', noteStatus: 'published' }, { remote: true });
  h.run("state.drafts.push(otherArticle);bodyInput.value='Unsaved first article';scheduleSave();showView('list');changeListTag('other','status','unpublished');");
  const other = h.run("state.drafts.find(d=>d.id==='other')");
  assert.equal(other.noteStatus, 'unpublished'); assert.equal(other.body, 'Other body'); assert.equal(other.title, 'Other title');
  assert.equal(h.run('currentDraft().body'), 'Unsaved first article');
  assert.equal(h.elements.get('bodyInput').value, 'Unsaved first article');
  assert.equal(JSON.parse(h.storage.get(`${core.storageKey('account-a')}:draft:other`)).body, 'Other body');
});

test('tag edits immediately update filters, preserve unknown categories on cancel, and cannot edit trash', () => {
  const h = harness();
  h.run("state.view='list';openListTagEditor('d','category');");
  assert.match(h.run("listTagMarkup(currentDraft(),'category')"), /unknown-category.*selected/);
  h.run('closeListTagEditor();');
  assert.equal(h.run('currentDraft().category'), 'unknown-category');
  assert.equal(h.run('currentDraft().pendingSync'), false);
  h.run("changeListTag('d','category','journal-note');setListCategoryFilter('note');setListNoteFilter('unpublished');changeListTag('d','status','published');");
  assert.match(h.elements.get('draftList').innerHTML, /この条件に一致/);
  assert.equal(h.run('currentDraft().noteStatus'), 'published');
  h.run("state.drafts[0].deletedAt='2026-10-09T00:00:00Z';state.showTrash=true;changeListTag('d','category','journal-diary');openListTagEditor('d','category');renderList();");
  assert.equal(h.run('currentDraft().category'), 'journal-note');
  assert.equal(h.run('state.listTagEditor'), null);
  assert.ok(!h.elements.get('draftList').innerHTML.includes('data-open-list-tag='));
});

test('pinned articles lead the list, sync, and keep the visible updated date', async () => {
  const h = harness();
  h.context.newer = core.normalizeDraft({ ...h.draft, id: 'newer', title: 'Newer article', createdAt: '2026-10-05T00:00:00Z' }, { remote: true });
  let saved;
  h.context.testFirebase.doc = (_collection, id) => ({ id });
  h.context.testFirebase.runTransaction = async (_db, callback) => callback({
    get: async ({ id }) => ({ id, exists: () => true, data: () => structuredClone(h.draft) }),
    set: (_ref, data) => { saved = data; },
  });
  h.run("state.drafts.push(newer);state.firebaseReady=state.remoteReady=true;showView('list');");
  assert.ok(h.elements.get('draftList').innerHTML.indexOf('Newer article') < h.elements.get('draftList').innerHTML.indexOf('Synthetic'));
  h.events.get('draftList:click')({ target: { closest: () => ({ dataset: { pin: 'd' } }) } });
  const html = h.elements.get('draftList').innerHTML;
  assert.ok(html.indexOf('Synthetic') < html.indexOf('Newer article'));
  assert.match(html, /aria-pressed="true"/);
  assert.equal(h.elements.get('listOrderDescription').textContent, 'ピン止めを先頭・作成日の新しい順');
  assert.equal(h.run('currentDraft().updatedAt'), h.draft.updatedAt);
  assert.equal(h.run('currentDraft().pendingSync'), true);
  assert.ok(JSON.parse(h.storage.get(`${core.storageKey('account-a')}:draft:d`)).pinnedAt);
  await h.run("saveDraftById('d');");
  assert.ok(saved.pinnedAt); assert.equal(saved.body, h.draft.body); assert.equal(saved.updatedAt, h.draft.updatedAt);
  h.run("togglePin('d');");
  assert.equal(h.run('currentDraft().pinnedAt'), null);
  assert.equal(h.elements.get('listOrderDescription').textContent, '作成日の新しい順');
});

test('trash ignores pins and restoring keeps the pin', () => {
  const h = harness();
  h.run("showView('list');togglePin('d');deleteDraft('d');state.showTrash=true;renderList();");
  assert.ok(!h.elements.get('draftList').innerHTML.includes('data-pin='));
  h.run("togglePin('d');");
  assert.ok(h.run('currentDraft() ? currentDraft().pinnedAt : state.drafts[0].pinnedAt'));
  h.run("restoreDraft('d');state.showTrash=false;renderList();");
  assert.match(h.elements.get('draftList').innerHTML, /pinned/);
});
