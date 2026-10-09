import { SCHEMA_VERSION, LEGACY_KEYS, storageKey, normalizeDraft, remoteVersion, contentKey, editedDraft, reconcileDrafts, applyWriteResult, writeDraftTransaction, assignUncategorizedToDiary, defaultCategories, orderedCategories, isNoteDraft, normalizeCategories, mergeCategories, planLegacyImport, blockEdit, enterEdit, exportMarkdown } from './editor-core.mjs?v=2026-10-09-09';
import { escapeHtml, markdownToHtml } from './markdown.mjs?v=2026-10-09-09';

const VERSION = '2026-10-09-09';
const VIEW_KEY = 'orangemania-blog-editor-view-v1';
const config = window.BLOG_EDITOR_FIREBASE_CONFIG || {};
const $ = (id) => document.getElementById(id);
const titleInput = $('titleInput'), bodyInput = $('bodyInput'), categorySelect = $('categorySelect'), noteStatusSelect = $('noteStatusSelect');
const state = {
  drafts: [], categories: [], currentId: null, user: null, view: 'list', mode: 'edit',
  searchQuery: '', showTrash: false, history: [], historyIndex: -1, composing: false,
  previewDirty: true, saveTimers: new Map(), writes: new Map(), session: 0,
  remoteReady: false, categoriesReady: false, categoriesDirty: false, categoriesWriting: false,
  unsubscribe: null, unsubscribeCategories: null, firebase: null, firebaseReady: false,
  storageFailed: false, storageReadFailed: false, syncError: false, categoryError: false,
  draftListenerFailed: false, categoryListenerFailed: false, listenerGeneration: 0,
  legacyImported: false, legacyReviewShown: false, snapshotCount: 0, serverDrafts: [], serverCategories: [], bulkAssigning: false,
};

function currentDraft() { return state.drafts.find((draft) => draft.id === state.currentId); }
function activeCategories() { return orderedCategories(state.categories); }
function noteStatusLabel(draft) { return draft.noteStatus === 'published' ? '投稿済み' : '未投稿'; }
function categoryName(id, fallback = '') {
  if (!id) return '未分類';
  const category = state.categories.find((item) => item.id === id);
  return category ? category.name : fallback || '未取得のカテゴリ';
}
function draftKey(uid, id) { return `${storageKey(uid)}:draft:${encodeURIComponent(id)}`; }
function readArray(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Invalid local journal data');
  return parsed;
}
function loadAccount(uid) {
  const raw = localStorage.getItem(storageKey(uid));
  if (!raw) return { drafts: [], categories: defaultCategories(), currentId: null };
  const saved = JSON.parse(raw);
  if (!Array.isArray(saved.ids)) throw new Error('Invalid local journal index');
  return { ...saved, categories: normalizeCategories(saved.categories), drafts: saved.ids.map((id) => {
    const value = localStorage.getItem(draftKey(uid, id));
    if (!value) throw new Error('A locally saved journal is missing');
    return normalizeDraft(JSON.parse(value), { id });
  }) };
}
// Write only the changed article on each keystroke, then its small account index.
// Old article records and the legacy store are never erased by this migration.
function persistLocal(changedIds = null) {
  if (!state.user || state.storageReadFailed) return false;
  try {
    const drafts = changedIds ? state.drafts.filter((draft) => changedIds.includes(draft.id)) : state.drafts;
    for (const draft of drafts) localStorage.setItem(draftKey(state.user.uid, draft.id), JSON.stringify(draft));
    localStorage.setItem(storageKey(state.user.uid), JSON.stringify({ ids: state.drafts.map((draft) => draft.id), categories: state.categories, currentId: state.currentId, categoriesDirty: state.categoriesDirty, legacyImported: state.legacyImported }));
    state.storageFailed = false; return true;
  } catch { state.storageFailed = true; refreshSyncStatus(); return false; }
}
function refreshSyncStatus() {
  let text, kind = '';
  const pending = state.drafts.some((draft) => draft.pendingSync) || state.categoriesDirty;
  if (!state.user) text = navigator.onLine ? 'ログインが必要' : 'オフライン';
  else if (state.storageReadFailed || state.storageFailed) { text = '端末に保存できません・バックアップしてください'; kind = 'error'; }
  else if (!navigator.onLine) text = pending ? '端末に保存済み・未同期' : 'オフライン・端末に保存済み';
  else if (state.syncError || state.categoryError) { text = '端末に保存済み・同期エラー'; kind = 'error'; }
  else if (state.writes.size || state.categoriesWriting) text = '端末に保存済み・同期中';
  else if (pending) text = '端末に保存済み・未同期';
  else if (!state.remoteReady || !state.categoriesReady) text = '同期を確認中';
  else { text = 'クラウド同期済み'; kind = 'synced'; }
  for (const id of ['syncStatus', 'editorSyncStatus']) { if ($(id).textContent !== text) $(id).textContent = text; $(id).className = `${id === 'syncStatus' ? 'sync-status' : 'toolbar-save-status'} ${kind}`; }
  updateBulkCategoryControls();
}
function remoteDraftsRef(uid = state.user.uid) { return state.firebase.collection(state.db, 'users', uid, 'blogEditorDrafts'); }
// Existing account-owned metadata collection: no extra security permissions.
function categoriesRef(uid = state.user.uid) { return state.firebase.doc(state.db, 'users', uid, 'blogEditorMigrations', 'editorCategoriesV2'); }
function queueSave(id, delay = 400) {
  clearTimeout(state.saveTimers.get(id));
  state.saveTimers.set(id, setTimeout(() => { state.saveTimers.delete(id); void saveDraftById(id); }, delay));
}
async function saveDraftById(id) {
  if (!state.user || !state.firebaseReady || !state.remoteReady || !navigator.onLine || state.storageReadFailed || state.writes.has(id)) return;
  const draft = state.drafts.find((item) => item.id === id);
  if (!draft?.pendingSync || !persistLocal([id])) return;
  const sent = { ...draft }, uid = state.user.uid, session = state.session;
  state.writes.set(id, sent.revision); refreshSyncStatus();
  try {
    const result = await writeDraftTransaction(state.firebase, remoteDraftsRef(uid), sent);
    if (session !== state.session || state.user?.uid !== uid) return;
    const applied = applyWriteResult(state.drafts, sent, result, state.currentId);
    state.drafts = applied.drafts; state.currentId = applied.activeId; state.syncError = false;
    if (result.kind === 'conflict') {
      if (state.currentId === result.saved.id) titleInput.value = currentDraft().title;
      toast('別端末と競合したため、あなたの文章を別の下書きに保存しました');
    }
    persistLocal(); updateDraftTimestamps(); renderList();
  } catch (error) {
    if (session === state.session) { state.syncError = true; console.error('Journal sync failed:', error.code || error.name); }
  } finally {
    if (session === state.session) {
      state.writes.delete(id); refreshSyncStatus();
      if (!state.syncError) for (const item of state.drafts.filter((entry) => entry.pendingSync)) queueSave(item.id);
    }
  }
}
async function syncCategories() {
  if (!state.user || !state.firebaseReady || !state.categoriesReady || !state.categoriesDirty || state.categoriesWriting || !navigator.onLine || state.storageReadFailed || !persistLocal([])) return;
  const uid = state.user.uid, session = state.session, sent = JSON.stringify(state.categories), records = normalizeCategories(state.categories);
  state.categoriesWriting = true; refreshSyncStatus();
  try {
    const saved = await state.firebase.runTransaction(state.db, async (transaction) => {
      const ref = categoriesRef(uid), snapshot = await transaction.get(ref);
      const merged = mergeCategories(records, snapshot.exists() ? snapshot.data().records : []);
      transaction.set(ref, { records: merged, schemaVersion: SCHEMA_VERSION, kind: 'editorCategories' }); return merged;
    });
    if (session !== state.session) return;
    const unchanged = JSON.stringify(state.categories) === sent;
    state.categories = mergeCategories(state.categories, saved);
    state.categoriesDirty = !unchanged && JSON.stringify(state.categories) !== JSON.stringify(saved);
    state.categoryError = false; persistLocal([]); renderCategoryOptions(); renderCategoryManageList(); renderList();
  } catch (error) {
    if (session === state.session) { state.categoryError = true; console.error('Category sync failed:', error.code || error.name); }
  } finally {
    if (session === state.session) { state.categoriesWriting = false; refreshSyncStatus(); if (state.categoriesDirty && !state.categoryError) void syncCategories(); }
  }
}
function retrySync() {
  if (!state.user) return refreshSyncStatus();
  state.syncError = state.categoryError = false;
  if (state.draftListenerFailed || state.categoryListenerFailed) {
    state.unsubscribe?.(); state.unsubscribeCategories?.(); startRemoteSync();
  }
  pumpSync();
}
function pumpSync() {
  if (!persistLocal()) return;
  for (const draft of state.drafts.filter((item) => item.pendingSync)) queueSave(draft.id, 0);
  void syncCategories(); refreshSyncStatus();
}
function scheduleSave() {
  let draft = currentDraft();
  if (!draft || draft.deletedAt || !state.user) return;
  const category = categorySelect.value || null;
  const categoryLabel = category ? categoryName(category, draft.category === category ? draft.categoryName : '') : '';
  const noteStatus = categoryLabel === 'note用' ? (noteStatusSelect.value === 'published' ? 'published' : 'unpublished') : draft.noteStatus;
  const changes = { title: titleInput.value.trim() || '無題の記事', body: bodyInput.value, category, categoryName: categoryLabel, noteStatus };
  if (draft.title === changes.title && draft.body === changes.body && draft.category === changes.category && draft.categoryName === changes.categoryName && draft.noteStatus === changes.noteStatus) return;
  draft = editedDraft(draft, changes);
  state.drafts = state.drafts.map((item) => item.id === draft.id ? draft : item);
  persistLocal([draft.id]); updateDraftTimestamps(); refreshSyncStatus(); queueSave(draft.id);
}
function startRemoteSync() {
  const uid = state.user.uid, session = state.session, generation = ++state.listenerGeneration;
  state.remoteReady = state.categoriesReady = false;
  state.draftListenerFailed = state.categoryListenerFailed = false;
  const valid = () => session === state.session && generation === state.listenerGeneration;
  const fail = (kind) => (error) => {
    if (!valid()) return;
    if (kind === 'drafts') { state.syncError = state.draftListenerFailed = true; state.remoteReady = false; }
    else { state.categoryError = state.categoryListenerFailed = true; state.categoriesReady = false; }
    refreshSyncStatus(); console.error('Journal listener failed:', error.code || error.name);
  };
  state.unsubscribe = state.firebase.onSnapshot(remoteDraftsRef(uid), { includeMetadataChanges: true }, (snapshot) => {
    if (!valid()) return;
    state.snapshotCount++;
    const authoritative = !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites;
    const remote = snapshot.docs.map((item) => normalizeDraft(item.data(), { remote: true, id: item.id }));
    const previous = currentDraft(), visible = state.view === 'editor';
    const merged = reconcileDrafts(state.drafts, remote, { authoritative, activeId: visible ? state.currentId : null, writingIds: new Set(state.writes.keys()) });
    state.drafts = merged.drafts;
    const recovered = merged.recovered.find((item) => item.previousId === state.currentId);
    if (recovered) { state.currentId = recovered.copy.id; titleInput.value = recovered.copy.title; toast('別端末で削除された記事を、復元用の下書きとして残しました'); }
    if (authoritative) { state.remoteReady = true; state.syncError = false; state.serverDrafts = remote; }
    persistLocal();
    const next = currentDraft();
    if (visible && previous && next && !next.deletedAt && contentKey(previous) !== contentKey(next) && !previous.pendingSync && !recovered) {
      const start = bodyInput.selectionStart, end = bodyInput.selectionEnd, scroll = bodyInput.scrollTop;
      titleInput.value = next.title === '無題の記事' ? '' : next.title; bodyInput.value = next.body;
      bodyInput.setSelectionRange(Math.min(start, next.body.length), Math.min(end, next.body.length)); bodyInput.scrollTop = scroll;
      renderCategoryOptions(); updatePreview(); recordHistory(); toast('別端末での変更を反映しました');
    }
    updateDraftTimestamps(); renderList(); refreshSyncStatus(); updateMigrationPanel();
    if (authoritative) pumpSync();
  }, fail('drafts'));
  state.unsubscribeCategories = state.firebase.onSnapshot(categoriesRef(uid), { includeMetadataChanges: true }, (snapshot) => {
    if (!valid()) return;
    const authoritative = !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites;
    if (snapshot.exists()) state.categories = mergeCategories(state.categories, snapshot.data().records);
    if (authoritative) {
      state.categoriesReady = true;
      state.categoryError = false;
      const remote = snapshot.exists() ? normalizeCategories(snapshot.data().records) : [];
      state.serverCategories = remote;
      state.categoriesDirty = JSON.stringify(mergeCategories(remote, state.categories)) !== JSON.stringify(remote);
    }
    persistLocal([]); renderCategoryOptions(); renderCategoryManageList(); renderList(); refreshSyncStatus(); updateMigrationPanel();
    if (authoritative) void syncCategories();
  }, fail('categories'));
}
function stopSession() {
  state.unsubscribe?.(); state.unsubscribeCategories?.(); state.unsubscribe = state.unsubscribeCategories = null;
  for (const timer of state.saveTimers.values()) clearTimeout(timer);
  state.saveTimers.clear(); state.writes.clear(); state.session++; state.categoriesWriting = false;
}
async function handleAuth(user) {
  if (state.user) persistLocal();
  stopSession(); state.user = user; state.currentId = null; state.drafts = []; state.categories = [];
  state.remoteReady = state.categoriesReady = state.syncError = state.categoryError = state.storageFailed = state.storageReadFailed = false;
  state.legacyImported = state.categoriesDirty = state.showTrash = false;
  state.bulkAssigning = false; $('bulkDiaryResult').textContent = ''; $('bulkDiaryConfirmation').classList.add('hidden');
  state.legacyReviewShown = false;
  state.serverDrafts = []; state.serverCategories = [];
  state.searchQuery = ''; $('searchInput').value = '';
  titleInput.value = bodyInput.value = ''; resetHistory(); updatePreview();
  $('loginButton').hidden = Boolean(user); $('logoutButton').hidden = !user;
  $('authGate').classList.toggle('hidden', Boolean(user)); document.querySelector('.header-actions').classList.toggle('hidden', !user);
  if (!user) {
    for (const view of ['editor', 'list', 'settings']) $(`${view}View`).classList.add('hidden');
    titleInput.value = bodyInput.value = ''; resetHistory(); updatePreview(); updateToolbarVisibility(); refreshSyncStatus(); return;
  }
  try {
    const account = loadAccount(user.uid); state.drafts = account.drafts; state.categories = account.categories;
    state.currentId = account.currentId || null; state.categoriesDirty = account.categoriesDirty || false; state.legacyImported = account.legacyImported || false;
  } catch { state.storageReadFailed = true; state.categories = defaultCategories(); toast('端末の保存データを読み込めませんでした。元データは保持しています'); }
  updateStorageUi(); showView('list'); updateMigrationPanel(); refreshSyncStatus(); startRemoteSync();
}
async function logout() {
  scheduleSave();
  if (!persistLocal() && !confirm('端末への保存に失敗しています。.md保存でバックアップするまでログアウトを中止することをおすすめします。ログアウトしますか？')) return;
  try { await state.firebase.signOut(state.auth); } catch { toast('ログアウトできませんでした'); }
}
async function setupFirebase() {
  $('loginButton').disabled = $('gateLoginButton').disabled = true;
  if (!(config.apiKey && config.projectId && config.appId)) return;
  try {
    const [app, auth, firestore] = await Promise.all([import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'), import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js'), import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js')]);
    state.firebase = { ...app, ...auth, ...firestore }; state.app = state.firebase.initializeApp(config);
    state.auth = state.firebase.getAuth(state.app); state.db = state.firebase.getFirestore(state.app); state.firebaseReady = true;
    $('loginButton').disabled = $('gateLoginButton').disabled = false; state.firebase.onAuthStateChanged(state.auth, handleAuth);
  } catch (error) { toast('ログインの準備に失敗しました。通信状態を確認してください'); console.error('Firebase initialization failed:', error.code || error.name); }
}
function signInWithGoogle() {
  if (!state.firebaseReady) return;
  state.firebase.signInWithPopup(state.auth, new state.firebase.GoogleAuthProvider()).catch((error) => { toast('Googleログインを完了できませんでした'); console.error('Google login failed:', error.code || error.name); });
}

function renderCategoryOptions(selectedId = currentDraft()?.category) {
  const draft = currentDraft(), categories = activeCategories();
  const options = categories.map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`);
  if (selectedId && !categories.some((category) => category.id === selectedId)) options.push(`<option value="${escapeHtml(selectedId)}">${escapeHtml(categoryName(selectedId, draft?.categoryName))}（確認待ち）</option>`);
  options.push('<option value="">未分類</option>');
  categorySelect.innerHTML = options.join(''); categorySelect.value = selectedId || '';
  updateNoteStatusControls();
}
function updateNoteStatusControls() {
  const draft = currentDraft();
  const selected = { category: categorySelect.value || null, categoryName: draft?.category === categorySelect.value ? draft.categoryName : '' };
  $('noteStatusField').hidden = !isNoteDraft(selected, state.categories);
  noteStatusSelect.value = draft?.noteStatus === 'published' ? 'published' : 'unpublished';
}
function renderCategoryManageList() {
  const categories = activeCategories();
  const fixed = (category) => category && ['日記', 'note用'].includes(category.name);
  $('categoryManageList').innerHTML = categories.length ? categories.map((category, index) => `<li class="category-manage-row"><span class="category-manage-name">${escapeHtml(category.name)}</span><div class="category-manage-actions"><button type="button" data-move-up="${escapeHtml(category.id)}" ${fixed(category) || index === 0 || fixed(categories[index - 1]) ? 'disabled' : ''} aria-label="${escapeHtml(category.name)}を上へ">↑</button><button type="button" data-move-down="${escapeHtml(category.id)}" ${fixed(category) || index === categories.length - 1 ? 'disabled' : ''} aria-label="${escapeHtml(category.name)}を下へ">↓</button><button type="button" class="delete" data-delete-category="${escapeHtml(category.id)}" aria-label="${escapeHtml(category.name)}を削除">×</button></div></li>`).join('') : '<li class="empty">カテゴリがありません。</li>';
}
function changedCategories() { state.categoriesDirty = true; persistLocal([]); renderCategoryOptions(); renderCategoryManageList(); renderList(); refreshSyncStatus(); void syncCategories(); }
function addCategory(name) {
  const trimmed = name.trim().slice(0, 30); if (!trimmed) return;
  if (activeCategories().some((category) => category.name === trimmed)) return toast('同じ名前のカテゴリがあります');
  state.categories.push({ id: crypto.randomUUID(), name: trimmed, order: activeCategories().length, updatedAt: new Date().toISOString(), deleted: false }); changedCategories();
}
function moveCategory(id, direction) {
  const categories = activeCategories(), index = categories.findIndex((category) => category.id === id), other = index + direction;
  if (index < 0 || other < 0 || other >= categories.length) return;
  if ([categories[index], categories[other]].some((category) => ['日記', 'note用'].includes(category.name))) return;
  [categories[index], categories[other]] = [categories[other], categories[index]];
  for (const [order, category] of categories.entries()) { category.order = order; category.updatedAt = new Date().toISOString(); }
  changedCategories();
}
function deleteCategory(id) {
  const category = state.categories.find((item) => item.id === id); if (!category) return;
  category.deleted = true; category.updatedAt = new Date().toISOString(); const affected = [];
  state.drafts = state.drafts.map((draft) => { if (draft.category !== id) return draft; affected.push(draft.id); return editedDraft(draft, { category: null, categoryName: '' }); });
  persistLocal(affected); changedCategories(); for (const draftId of affected) queueSave(draftId);
}
function uncategorizedDrafts() { return state.drafts.filter((draft) => !draft.category && !draft.deletedAt); }
function updateBulkCategoryControls() {
  const count = uncategorizedDrafts().length;
  $('bulkDiaryButton').textContent = `未分類${count}件を日記へ変更`;
  const ready = migrationReady() && !state.categoriesDirty && !state.categoriesWriting && !state.writes.size && !state.drafts.some((draft) => draft.pendingSync);
  $('bulkDiaryButton').disabled = state.bulkAssigning || !ready || !count;
  $('bulkDiaryConfirmButton').disabled = $('bulkDiaryButton').disabled;
  if (!count) $('bulkDiaryConfirmation').classList.add('hidden');
  $('bulkDiaryCount').textContent = state.bulkAssigning ? 'カテゴリを変更しています…' : `ごみ箱を除く未分類の記事：${count}件。本文・タイトル・投稿状況は保持します。`;
}
function requestBulkDiaryConversion() {
  if ($('bulkDiaryButton').disabled) return;
  $('bulkDiaryConfirmation').classList.remove('hidden');
  $('bulkDiaryConfirmationMessage').textContent = `未分類の記事${uncategorizedDrafts().length}件を日記へ変更します。本文・タイトル・投稿状況は保持し、ごみ箱の記事は変更しません。`;
  $('bulkDiaryConfirmButton').focus();
}
async function convertUncategorizedToDiary() {
  if (state.bulkAssigning || !state.user || $('bulkDiaryButton').disabled || $('bulkDiaryConfirmation').classList.contains('hidden')) return;
  const targets = uncategorizedDrafts().map((draft) => draft.id);
  const diary = activeCategories().find((category) => category.name === '日記');
  if (!diary) return toast('日記カテゴリを追加してから変更してください');
  $('bulkDiaryConfirmation').classList.add('hidden');
  const session = state.session, uid = state.user.uid;
  let changed = 0, skipped = 0, failed = 0;
  state.bulkAssigning = true; updateBulkCategoryControls();
  try {
    for (const id of targets) {
      if (session !== state.session) return;
      try {
        const result = await assignUncategorizedToDiary(state.firebase, remoteDraftsRef(uid), categoriesRef(uid), id, diary);
        if (session !== state.session) return;
        if (result.updated) {
          changed++;
          state.drafts = state.drafts.map((draft) => draft.id === id && !draft.pendingSync && !state.writes.has(id) ? result.draft : draft);
          persistLocal([id]);
        } else skipped++;
      } catch (error) { failed++; console.error('Category conversion failed:', error.code || error.name); }
      $('bulkDiaryResult').textContent = `${changed}件変更済み／${targets.length}件`;
    }
  } finally {
    if (session === state.session) {
      state.bulkAssigning = false; renderList(); renderCategoryOptions(); refreshSyncStatus();
      $('bulkDiaryResult').textContent = `${changed}件を日記へ変更しました。${skipped ? `対象外になった記事${skipped}件は変更していません。` : ''}${failed ? `${failed}件は変更できませんでした。同期を確認して再試行してください。` : ''}`;
      toast(failed ? '一部の記事を変更できませんでした' : `${changed}件を日記へ変更しました`);
    }
  }
}
function updateStorageUi() { $('storageDescription').textContent = 'Googleアカウントごとにこの端末へ保存し、Firestoreへ同期します。'; $('storageLocation').value = 'この端末 + Firestore'; }
function migrationReady() { return Boolean(state.user && state.remoteReady && state.categoriesReady && navigator.onLine && !state.draftListenerFailed && !state.categoryListenerFailed); }
function legacyPlan() {
  return planLegacyImport(readArray(LEGACY_KEYS.drafts), readArray(LEGACY_KEYS.categories), state.serverDrafts, state.serverCategories);
}
function updateMigrationPanel() {
  try {
    const drafts = readArray(LEGACY_KEYS.drafts), categories = readArray(LEGACY_KEYS.categories);
    const exists = Boolean(state.user && (drafts.length || categories.length));
    const ready = migrationReady();
    const plan = ready ? planLegacyImport(drafts, categories, state.serverDrafts, state.serverCategories) : null;
    const pending = plan ? plan.newCount + plan.changedCount + plan.categoriesToImport.length > 0 : true;
    const available = exists && !state.legacyImported && pending;
    $('migrationPanel').classList.toggle('hidden', !available);
    $('legacyNotice').classList.toggle('hidden', !available);
    $('legacyDetails').classList.toggle('hidden', !exists);
    if (available && ready && !state.legacyReviewShown) { $('legacyDetails').open = true; state.legacyReviewShown = true; }
    $('migrateLocalButton').disabled = !ready;
    $('legacyDetailsSummary').textContent = `この端末の旧データを確認（記事${drafts.length}件・カテゴリ${categories.length}件）`;
    const message = !ready
      ? 'この端末の旧データをクラウドと照合しています。オンラインで同期を確認してから取り込めます。'
      : state.legacyImported
        ? 'このブラウザでは取り込み済み、または案内を確認済みです。下の一覧は残してある旧データのタイトルです。'
        : !pending
          ? `記事${plan.matchedCount}件とカテゴリはクラウドに同じデータがあります。再取り込みは不要です。旧データはこの端末に保持しています。`
          : `この端末だけに残る記事${plan.newCount}件、クラウドと内容が異なる記事${plan.changedCount}件、追加のカテゴリ${plan.categoriesToImport.length}件があります。「この端末の旧データを確認」のタイトル一覧を確認してください。内容の異なる記事は別の下書きとして残し、旧データも消しません。`;
    $('migrationMessage').textContent = message; $('legacyDetailsMessage').textContent = message;
    $('legacyNoticeMessage').textContent = !ready ? 'この端末の旧データをクラウドと照合しています。' : plan.newCount + plan.changedCount > 0 ? 'この端末の旧データに、未取り込みまたは内容の異なる記事があります。設定でタイトルを確認できます。' : 'この端末に未取り込みの旧カテゴリがあります。設定で件数を確認できます。';
    const labels = { matched: 'クラウドに同じ内容', new: 'この端末だけの記事', changed: '内容に違い・別記事として保存' };
    const entries = plan?.entries || drafts.map((raw) => ({ draft: normalizeDraft(raw), kind: null }));
    $('legacyDraftList').innerHTML = entries.map((entry) => `<li><span>${escapeHtml(entry.draft.title)}</span><small>${state.legacyImported ? '取り込み元の旧データ' : labels[entry.kind] || '照合待ち'}</small></li>`).join('') || '<li>旧形式の記事はありません。</li>';
  } catch { for (const id of ['migrationPanel', 'legacyNotice', 'legacyDetails']) $(id).classList.add('hidden'); toast('旧形式データを読み込めませんでした。元データは保持しています'); }
}
function migrateLocal() {
  if (!state.user || state.storageReadFailed) return;
  if (!migrationReady()) return toast('オンラインでクラウドとの照合が終わってから取り込んでください');
  try {
    const plan = legacyPlan();
    if (!plan.newCount && !plan.changedCount && !plan.categoriesToImport.length) { updateMigrationPanel(); return toast('クラウドに同じデータがあります。再取り込みは不要です'); }
    if (!confirm(`新規記事${plan.newCount}件、内容の異なる記事${plan.changedCount}件、カテゴリ${plan.categoriesToImport.length}件を現在のGoogleアカウントへ取り込みます。ご自身のデータであることを確認しましたか？既存の記事は上書きせず、旧データも保持します。`)) return;
    const legacyCategories = plan.categoriesToImport;
    // Keep legacy IDs referenced by existing journals. Hide unused duplicate
    // defaults rather than showing two identically named options after upgrade.
    const now = new Date().toISOString();
    state.categories = state.categories.map((category) =>
      ['journal-diary', 'journal-note'].includes(category.id)
      && !state.drafts.some((draft) => draft.category === category.id)
      && legacyCategories.some((legacy) => !legacy.deleted && legacy.name === category.name)
        ? { ...category, deleted: true, updatedAt: now } : category);
    state.categories = mergeCategories(state.categories, legacyCategories);
    for (const entry of plan.entries.filter((item) => item.kind !== 'matched')) {
      const draft = entry.draft;
      const current = state.drafts.find((item) => item.id === draft.id);
      if (current && current.title === draft.title && current.body === draft.body && current.category === draft.category) continue;
      state.drafts.push(editedDraft(draft, { id: current ? crypto.randomUUID() : draft.id, baseVersion: null, title: current ? `${draft.title}（旧データ）` : draft.title, categoryName: categoryName(draft.category, draft.categoryName) }));
    }
    state.legacyImported = true; state.categoriesDirty = true;
    if (!persistLocal()) { state.legacyImported = false; return toast('端末に保存できません。旧データは保持しています'); }
    renderList(); updateMigrationPanel(); retrySync(); toast('旧データを取り込みました');
  } catch { toast('旧データの取り込みに失敗しました。元データは保持しています'); }
}
function dismissLegacyNotice() {
  if (!state.user || !confirm('記事は取り込まず、このブラウザの案内を閉じます。旧データは保持され、設定の「この端末の旧データを確認」からタイトルを確認できます。閉じますか？')) return;
  state.legacyImported = true;
  if (!persistLocal([])) state.legacyImported = false;
  updateMigrationPanel();
}

function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}
function updateDraftTimestamps(draft = currentDraft()) {
  for (const [id, text] of [['createdAtDisplay', `作成日 ${formatDateTime(draft?.createdAt)}`], ['updatedAtDisplay', `更新日 ${formatDateTime(draft?.updatedAt)}`]]) {
    if ($(id).textContent !== text) $(id).textContent = text;
  }
}
function updatePreview() { $('characterCount').textContent = `${Array.from(bodyInput.value).length}文字`; state.previewDirty = true; if (state.mode !== 'edit' && state.view === 'editor') renderPreview(); }
function renderPreview() { if (!state.previewDirty) return; $('preview').innerHTML = bodyInput.value.trim() ? markdownToHtml(bodyInput.value) : '<p class="placeholder">本文を入力すると、ここにプレビューが表示されます。</p>'; state.previewDirty = false; }
function snapshot() { return { value: bodyInput.value, start: bodyInput.selectionStart, end: bodyInput.selectionEnd, scrollTop: bodyInput.scrollTop }; }
function updateHistoryButtons() { $('undoButton').disabled = state.historyIndex <= 0; $('redoButton').disabled = state.historyIndex >= state.history.length - 1; }
function resetHistory() { state.history = [snapshot()]; state.historyIndex = 0; updateHistoryButtons(); }
function recordHistory() {
  const next = snapshot(); if (state.history[state.historyIndex]?.value === next.value) return;
  state.history.splice(state.historyIndex + 1); state.history.push(next); if (state.history.length > 100) state.history.shift();
  state.historyIndex = state.history.length - 1; updateHistoryButtons();
}
function restoreHistory(index) {
  const item = state.history[index]; if (!item) return;
  bodyInput.value = item.value; bodyInput.setSelectionRange(item.start, item.end); bodyInput.scrollTop = item.scrollTop;
  state.historyIndex = index; updatePreview(); scheduleSave(); updateHistoryButtons(); bodyInput.focus({ preventScroll: true });
}
function applyEdit(text, start = bodyInput.selectionStart, end = bodyInput.selectionEnd) { bodyInput.setRangeText(text, start, end, 'end'); bodyInput.focus({ preventScroll: true }); updatePreview(); recordHistory(); scheduleSave(); }
function toolbar(action) {
  if (state.composing) return;
  if (action === 'undo') { if (state.historyIndex > 0) restoreHistory(state.historyIndex - 1); return; }
  if (action === 'redo') { if (state.historyIndex < state.history.length - 1) restoreHistory(state.historyIndex + 1); return; }
  const start = bodyInput.selectionStart, end = bodyInput.selectionEnd;
  if (action === 'linebreak' || action === 'paragraph') return applyEdit(action === 'linebreak' ? '  \n' : '\n\n');
  if (['heading', 'subheading', 'bullet', 'number', 'quote'].includes(action)) { const edit = blockEdit(bodyInput.value, start, end, action); return applyEdit(edit.text, edit.start, edit.end); }
  if (action === 'rule') return applyEdit('\n\n---\n\n');
  const selected = bodyInput.value.slice(start, end);
  if (action === 'bold') applyEdit(`**${selected || '太字'}**`, start, end);
  if (action === 'link') { applyEdit(`[${selected || 'リンク文字'}](https://example.com)`, start, end); const urlStart = start + (selected || 'リンク文字').length + 3; bodyInput.setSelectionRange(urlStart, urlStart + 'https://example.com'.length); }
}
function setEditorMode(mode, persist = true) {
  if (!['edit', 'preview', 'split'].includes(mode)) mode = 'edit';
  if (window.matchMedia('(max-width: 700px)').matches && mode === 'split') mode = 'edit';
  state.mode = mode; $('workspace').className = `workspace mode-${mode}`; $('editorView').classList.toggle('single-mode', mode !== 'split');
  for (const [id, value] of [['editTab', 'edit'], ['previewTab', 'preview'], ['splitTab', 'split']]) { $(id).classList.toggle('active', value === mode); $(id).setAttribute('aria-selected', String(value === mode)); }
  if (mode !== 'edit') renderPreview(); if (persist) { try { localStorage.setItem(VIEW_KEY, mode); } catch {} }
  closeMore(); updateToolbarVisibility();
}
function showView(view) {
  if (!state.user || state.bulkAssigning) return;
  $('bulkDiaryConfirmation').classList.add('hidden');
  state.view = view; for (const name of ['editor', 'list', 'settings']) $(`${name}View`).classList.toggle('hidden', name !== view);
  $('draftsButton').classList.toggle('active', view === 'list'); $('settingsButton').classList.toggle('active', view === 'settings');
  if (view === 'list') renderList(); if (view === 'settings') { renderCategoryManageList(); updateMigrationPanel(); }
  closeMore(); updateToolbarVisibility();
}
function loadDraft(id) {
  if (state.bulkAssigning) return;
  const draft = state.drafts.find((item) => item.id === id && !item.deletedAt); if (!draft) return;
  state.currentId = id; titleInput.value = draft.title === '無題の記事' ? '' : draft.title; bodyInput.value = draft.body;
  renderCategoryOptions(draft.category); updatePreview(); updateDraftTimestamps(draft); resetHistory(); persistLocal([]); showView('editor'); bodyInput.focus({ preventScroll: true });
}
function newDraft() {
  if (!state.user || state.bulkAssigning) return;
  const now = new Date().toISOString();
  let categoriesChanged = false;
  for (const standard of defaultCategories()) {
    if (activeCategories().some((category) => category.name === standard.name)) continue;
    const existing = state.categories.find((category) => category.id === standard.id);
    if (existing && existing.name === standard.name) Object.assign(existing, { deleted: false, updatedAt: now, order: standard.order });
    else state.categories.push({ ...standard, id: existing ? crypto.randomUUID() : standard.id, updatedAt: now });
    categoriesChanged = true;
  }
  if (categoriesChanged) { state.categoriesDirty = true; void syncCategories(); }
  const diary = activeCategories().find((category) => category.name === '日記');
  const draft = editedDraft(normalizeDraft({ id: crypto.randomUUID(), title: '無題の記事', body: '', category: diary.id, categoryName: diary.name, noteStatus: 'unpublished', createdAt: now, updatedAt: now }), {});
  state.drafts.unshift(draft); state.currentId = draft.id; titleInput.value = bodyInput.value = '';
  renderCategoryOptions(draft.category); updatePreview(); updateDraftTimestamps(draft); resetHistory(); persistLocal([draft.id]); refreshSyncStatus(); queueSave(draft.id); showView('editor'); titleInput.focus();
}
function renderList() {
  const query = state.searchQuery.trim().toLowerCase();
  let drafts = state.drafts.filter((draft) => Boolean(draft.deletedAt) === state.showTrash).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (query) drafts = drafts.filter((draft) => [draft.title, draft.body, categoryName(draft.category, draft.categoryName), isNoteDraft(draft, state.categories) ? noteStatusLabel(draft) : ''].some((value) => value.toLowerCase().includes(query)));
  $('trashButton').textContent = state.showTrash ? 'Journal一覧へ' : `ごみ箱（${state.drafts.filter((draft) => draft.deletedAt).length}）`; $('trashButton').setAttribute('aria-pressed', String(state.showTrash));
  $('listTitle').textContent = state.showTrash ? 'ごみ箱' : 'Journal一覧';
  $('draftList').innerHTML = drafts.length ? drafts.map((draft) => `<article class="draft-row ${draft.id === state.currentId ? 'active' : ''}"><div><div class="draft-title-row"><span class="draft-title">${escapeHtml(draft.title)}</span><span class="category-badge">${escapeHtml(categoryName(draft.category, draft.categoryName))}</span>${isNoteDraft(draft, state.categories) ? `<span class="note-status-badge">${noteStatusLabel(draft)}</span>` : ''}${draft.pendingSync ? '<span class="pending-badge">未同期</span>' : ''}</div><div class="draft-excerpt">${escapeHtml(draft.body.replace(/\n/g, ' ').trim().slice(0, 90) || '本文はまだありません。')}</div><div class="draft-dates"><span>作成 ${formatDateTime(draft.createdAt)}</span><span>更新 ${formatDateTime(draft.updatedAt)}</span></div></div><div class="draft-actions">${state.showTrash ? `<button class="small-button" data-restore="${escapeHtml(draft.id)}" type="button">復元</button>` : `<button class="small-button" data-edit="${escapeHtml(draft.id)}" type="button">編集</button><button class="small-button delete" data-delete="${escapeHtml(draft.id)}" type="button">ごみ箱へ</button>`}</div></article>`).join('') : `<div class="empty">${query ? '該当するJournalが見つかりません。' : state.showTrash ? 'ごみ箱は空です。' : '下書きはまだありません。'}</div>`;
}
function deleteDraft(id) {
  const draft = state.drafts.find((item) => item.id === id); if (!draft) return;
  const now = new Date().toISOString(); state.drafts = state.drafts.map((item) => item.id === id ? editedDraft(item, { deletedAt: now }, now) : item);
  if (state.currentId === id) state.currentId = null;
  persistLocal([id]); refreshSyncStatus(); queueSave(id); renderList(); toast('ごみ箱へ移しました。ごみ箱から復元できます');
}
function restoreDraft(id) { state.drafts = state.drafts.map((draft) => draft.id === id ? editedDraft(draft, { deletedAt: null }) : draft); persistLocal([id]); queueSave(id); refreshSyncStatus(); renderList(); toast('Journalを復元しました'); }

async function copyMarkdown() {
  const value = exportMarkdown(titleInput.value, bodyInput.value);
  if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value); else if (!copyPlainTextFallback(value)) throw new Error('Clipboard unavailable');
  toast('Markdownをコピーしました');
}
function copyPlainTextFallback(value) {
  const start = bodyInput.selectionStart, end = bodyInput.selectionEnd, active = document.activeElement;
  const source = document.createElement('textarea'); source.value = value; source.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;'; document.body.append(source); source.select();
  try { return document.execCommand('copy'); } finally { source.remove(); active?.focus({ preventScroll: true }); bodyInput.setSelectionRange(start, end); }
}
function downloadFile(text, filename, type) {
  const url = URL.createObjectURL(new Blob([text], { type })), link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function download() { downloadFile(exportMarkdown(titleInput.value, bodyInput.value), `${(titleInput.value || 'untitled').replace(/[\\/:*?"<>|]/g, '_')}.md`, 'text/markdown;charset=utf-8'); }
function backup() { downloadFile(JSON.stringify({ schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), categories: state.categories, drafts: state.drafts }, null, 2), 'journal-backup.json', 'application/json;charset=utf-8'); toast('Journalとカテゴリのバックアップを保存しました'); }
let toastTimer;
function toast(message) { $('toast').textContent = message; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 4500); }
async function copyDiagnostic() {
  const text = JSON.stringify({ version: VERSION, online: navigator.onLine, status: $('syncStatus').textContent, serverSnapshotReceived: state.remoteReady, pendingDraftCount: state.drafts.filter((draft) => draft.pendingSync).length, snapshotCount: state.snapshotCount }, null, 2);
  try { if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text); else if (!copyPlainTextFallback(text)) throw new Error(); toast('診断情報をコピーしました'); } catch { toast('診断情報をコピーできませんでした'); }
}
function closeMore() { $('toolbarMore').classList.remove('expanded'); $('moreButton').setAttribute('aria-expanded', 'false'); updateToolbarViewport(); }
function updateToolbarVisibility() { document.body.classList.toggle('editor-active', Boolean(state.user && state.view === 'editor' && state.mode !== 'preview')); updateToolbarViewport(); }
function updateToolbarViewport() {
  const viewport = window.visualViewport, gap = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
  document.documentElement.style.setProperty('--keyboard-gap', `${gap}px`);
  document.documentElement.style.setProperty('--keyboard-safe-area', gap > 100 ? '0px' : 'env(safe-area-inset-bottom, 0px)');
  document.documentElement.style.setProperty('--mobile-bar-height', `${document.querySelector('.toolbar-wrap').offsetHeight || 78}px`);
}
function onBodyKeydown(event) {
  if (event.isComposing || state.composing || event.keyCode === 229) return;
  const modifier = event.ctrlKey || event.metaKey;
  if (modifier && event.key.toLowerCase() === 'z') { event.preventDefault(); toolbar(event.shiftKey ? 'redo' : 'undo'); return; }
  if (modifier && event.key.toLowerCase() === 'y') { event.preventDefault(); toolbar('redo'); return; }
  if (event.key === 'Enter') { event.preventDefault(); const edit = enterEdit(bodyInput.value, bodyInput.selectionStart, bodyInput.selectionEnd, event.shiftKey); applyEdit(edit.text, edit.start, edit.end); }
}
function init() {
  document.body.dataset.appVersion = VERSION; $('appVersion').textContent = `v${VERSION}`;
  try { state.mode = localStorage.getItem(VIEW_KEY) || 'edit'; } catch {}
  setEditorMode(state.mode, false); resetHistory(); updateToolbarVisibility(); refreshSyncStatus(); void setupFirebase();
}
titleInput.addEventListener('input', scheduleSave);
bodyInput.addEventListener('input', () => { updatePreview(); if (!state.composing) recordHistory(); scheduleSave(); });
bodyInput.addEventListener('compositionstart', () => { state.composing = true; });
bodyInput.addEventListener('compositionend', () => { state.composing = false; recordHistory(); scheduleSave(); });
bodyInput.addEventListener('keydown', onBodyKeydown);
const toolbarWrap = document.querySelector('.toolbar-wrap');
toolbarWrap.addEventListener('pointerdown', (event) => { if (event.target.closest('button') && document.activeElement === bodyInput) event.preventDefault(); });
toolbarWrap.addEventListener('click', (event) => { const action = event.target.closest('[data-action]')?.dataset.action; if (action) { toolbar(action); closeMore(); } });
$('moreButton').addEventListener('click', () => { const expanded = $('toolbarMore').classList.toggle('expanded'); $('moreButton').setAttribute('aria-expanded', String(expanded)); updateToolbarViewport(); });
document.addEventListener('click', (event) => { if (!event.target.closest('.toolbar-wrap')) closeMore(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMore(); });
$('markdownCopyButton').addEventListener('click', () => copyMarkdown().catch(() => toast('コピーできませんでした。.md保存も利用できます')));
$('downloadButton').addEventListener('click', download); $('backupButton').addEventListener('click', backup);
for (const id of ['newButton', 'listNewButton']) $(id).addEventListener('click', newDraft);
for (const id of ['homeButton', 'draftsButton']) $(id).addEventListener('click', () => showView('list'));
$('settingsButton').addEventListener('click', () => showView('settings'));
$('bulkDiaryButton').addEventListener('click', requestBulkDiaryConversion);
$('bulkDiaryConfirmButton').addEventListener('click', convertUncategorizedToDiary);
$('bulkDiaryCancelButton').addEventListener('click', () => { $('bulkDiaryConfirmation').classList.add('hidden'); $('bulkDiaryButton').focus(); });
$('legacySettingsButton').addEventListener('click', () => showView('settings'));
for (const id of ['loginButton', 'gateLoginButton']) $(id).addEventListener('click', signInWithGoogle);
$('logoutButton').addEventListener('click', logout); $('migrateLocalButton').addEventListener('click', migrateLocal);
$('dismissLegacyButton').addEventListener('click', dismissLegacyNotice);
$('reviewLegacyButton').addEventListener('click', () => { state.legacyImported = false; state.legacyReviewShown = false; persistLocal([]); updateMigrationPanel(); });
$('retrySyncButton').addEventListener('click', retrySync); $('copyDiagnosticButton').addEventListener('click', copyDiagnostic);
$('trashButton').addEventListener('click', () => { state.showTrash = !state.showTrash; renderList(); });
$('draftList').addEventListener('click', (event) => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.edit) loadDraft(button.dataset.edit); if (button.dataset.restore) restoreDraft(button.dataset.restore);
  if (button.dataset.delete && confirm('このJournalをごみ箱へ移しますか？あとで復元できます。')) deleteDraft(button.dataset.delete);
});
for (const [id, mode] of [['editTab', 'edit'], ['previewTab', 'preview'], ['splitTab', 'split']]) $(id).addEventListener('click', () => setEditorMode(mode));
categorySelect.addEventListener('change', () => { updateNoteStatusControls(); scheduleSave(); });
noteStatusSelect.addEventListener('change', scheduleSave);
$('searchInput').addEventListener('input', (event) => { state.searchQuery = event.target.value; renderList(); });
$('categoryAddForm').addEventListener('submit', (event) => { event.preventDefault(); addCategory($('categoryNameInput').value); $('categoryNameInput').value = ''; });
$('categoryManageList').addEventListener('click', (event) => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.moveUp) moveCategory(button.dataset.moveUp, -1); if (button.dataset.moveDown) moveCategory(button.dataset.moveDown, 1);
  if (button.dataset.deleteCategory && confirm('カテゴリを削除しますか？このカテゴリのJournalは未分類になります。')) deleteCategory(button.dataset.deleteCategory);
});
window.addEventListener('online', retrySync); window.addEventListener('offline', refreshSyncStatus);
window.addEventListener('pagehide', () => { if (state.user) persistLocal(); });
window.addEventListener('resize', () => { if (window.matchMedia('(max-width: 700px)').matches && state.mode === 'split') setEditorMode('edit'); updateToolbarViewport(); });
window.visualViewport?.addEventListener('resize', updateToolbarViewport); window.visualViewport?.addEventListener('scroll', updateToolbarViewport);
if (typeof ResizeObserver !== 'undefined') new ResizeObserver(updateToolbarViewport).observe(toolbarWrap);
init();
