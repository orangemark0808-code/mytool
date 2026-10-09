import test from 'node:test';
import assert from 'node:assert/strict';
import { storageKey, normalizeDraft, remotePayload, remoteVersion, contentKey, editedDraft, reconcileDrafts, writeDraftTransaction, assignUncategorizedToDiary, applyWriteResult, defaultCategories, orderedCategories, isNoteDraft, mergeCategories, planLegacyImport, blockEdit, enterEdit, exportMarkdown } from '../editor-core.mjs';
import { markdownToHtml } from '../markdown.mjs';

function remote(body = 'server text', extra = {}) {
  return normalizeDraft({ id: 'article', title: 'Test', body, category: null, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', revision: 'server-v1', ...extra }, { remote: true });
}
function fakeFirestore(initial) {
  const data = new Map(initial ? [[initial.id, structuredClone(initial)]] : []), writes = [];
  const collection = { firestore: {} };
  const firebase = {
    doc: (_collection, id) => ({ id }),
    runTransaction: async (_db, callback) => {
      const staged = [], result = await callback({
        get: async ({ id }) => ({ id, exists: () => data.has(id), data: () => structuredClone(data.get(id)) }),
        set: ({ id }, value) => staged.push([id, structuredClone(value)]),
      });
      for (const [id, value] of staged) { data.set(id, value); writes.push({ id, value }); }
      return result;
    },
  };
  return { firebase, collection, data, writes };
}

test('account storage is isolated; signed-out journals cannot be saved', () => {
  assert.notEqual(storageKey('account-a'), storageKey('account-b'));
  assert.throws(() => storageKey(null));
});
test('empty cache never removes saved local journals', () => {
  assert.equal(reconcileDrafts([remote()], [], { authoritative: false }).drafts.length, 1);
});
test('pending local edits survive newer server text and cached text', () => {
  const local = editedDraft(remote(), { body: 'my unsent paragraph' });
  const newer = remote('someone else', { revision: 'server-v2' });
  for (const authoritative of [true, false]) {
    const result = reconcileDrafts([local], [newer], { authoritative });
    assert.equal(result.drafts[0].body, 'my unsent paragraph');
    assert.equal(result.drafts[0].pendingSync, true);
  }
});
test('physical server deletion of open journal creates writable recovery draft', () => {
  const result = reconcileDrafts([remote()], [], { authoritative: true, activeId: 'article' });
  assert.equal(result.recovered.length, 1);
  assert.notEqual(result.recovered[0].copy.id, 'article');
  assert.equal(result.recovered[0].copy.body, 'server text');
  assert.equal(result.recovered[0].copy.pendingSync, true);
});
test('soft server deletion of open journal preserves trash and recovery copy', () => {
  const result = reconcileDrafts([remote()], [remote('server text', { deletedAt: '2026-10-09T00:00:00Z' })], { authoritative: true, activeId: 'article' });
  assert.equal(result.drafts.length, 2);
  assert.equal(result.recovered.length, 1);
  assert.equal(result.drafts.find((draft) => draft.id === 'article').deletedAt, '2026-10-09T00:00:00Z');
});
test('in-flight draft is never replaced by listener acknowledgement', () => {
  const result = reconcileDrafts([remote('local')], [remote('server')], { authoritative: true, writingIds: new Set(['article']) });
  assert.equal(result.drafts[0].body, 'local');
});
test('transaction saves normal edits only against their original server version', async () => {
  const original = remote(), pending = editedDraft(original, { body: 'my edit' });
  const fake = fakeFirestore(original);
  const result = await writeDraftTransaction(fake.firebase, fake.collection, pending);
  assert.equal(result.kind, 'saved');
  assert.equal(fake.data.get('article').body, 'my edit');
  assert.equal(result.saved.pendingSync, false);
});
test('concurrent edit creates a copy and does not overwrite remote paragraph', async () => {
  const pending = editedDraft(remote(), { body: 'my edit' });
  const fake = fakeFirestore(remote('other device edit', { revision: 'server-v2' }));
  const result = await writeDraftTransaction(fake.firebase, fake.collection, pending);
  assert.equal(result.kind, 'conflict');
  assert.equal(fake.data.get('article').body, 'other device edit');
  assert.equal(fake.data.get(result.saved.id).body, 'my edit');
  assert.equal(fake.writes.length, 1);
});
test('deleted or physically missing remote journal cannot be resurrected by stale edit', async () => {
  for (const original of [null, remote('server text', { deletedAt: '2026-10-09T00:00:00Z', revision: 'deleted' })]) {
    const fake = fakeFirestore(original), pending = editedDraft(remote(), { body: 'offline edit' });
    const result = await writeDraftTransaction(fake.firebase, fake.collection, pending);
    assert.equal(result.kind, 'conflict');
    assert.notEqual(result.saved.id, 'article');
    assert.equal(result.saved.body, 'offline edit');
    assert.equal(fake.data.get('article')?.deletedAt || null, original?.deletedAt || null);
  }
});
test('older save acknowledgement leaves newer typing pending', () => {
  const sent = editedDraft(remote(), { body: 'sent text' });
  const newest = editedDraft(sent, { body: 'newest typing' });
  const saved = normalizeDraft(sent, { remote: true });
  const result = applyWriteResult([newest], sent, { kind: 'saved', saved }, 'article');
  assert.equal(result.drafts[0].body, 'newest typing');
  assert.equal(result.drafts[0].pendingSync, true);
  assert.equal(result.drafts[0].baseVersion, remoteVersion(saved));
});
test('typing during conflict write is moved to the copy and stays pending', () => {
  const sent = editedDraft(remote(), { body: 'sent' }), live = editedDraft(sent, { body: 'newest' });
  const result = applyWriteResult([live], sent, { kind: 'conflict', original: remote('other device'), saved: remote('sent', { id: 'copy', revision: sent.revision, title: 'Test（競合コピー）' }) }, 'article');
  assert.equal(result.activeId, 'copy');
  assert.equal(result.drafts.find((draft) => draft.id === 'copy').body, 'newest');
  assert.equal(result.drafts.find((draft) => draft.id === 'copy').pendingSync, true);
  assert.equal(result.drafts.find((draft) => draft.id === 'article').body, 'other device');
});
test('deletion stores server text in a reversible tombstone', async () => {
  const fake = fakeFirestore(remote('latest server text', { revision: 'server-v2' }));
  const deletion = editedDraft(remote(), { deletedAt: '2026-10-09T00:00:00Z' });
  const result = await writeDraftTransaction(fake.firebase, fake.collection, deletion);
  assert.equal(result.saved.body, 'latest server text');
  assert.ok(result.saved.deletedAt);
  const restored = editedDraft(result.saved, { deletedAt: null });
  const restoreResult = await writeDraftTransaction(fake.firebase, fake.collection, restored);
  assert.equal(restoreResult.saved.deletedAt, null);
  assert.equal(restoreResult.saved.body, 'latest server text');
});
test('default category IDs are stable on all devices; empty/deleted categories remain deleted', () => {
  assert.deepEqual(defaultCategories(), defaultCategories());
  const local = defaultCategories();
  const deleted = { ...local[0], deleted: true, updatedAt: '2026-10-09T00:00:00Z' };
  assert.equal(mergeCategories(local, [deleted]).find((category) => category.id === deleted.id).deleted, true);
  assert.deepEqual(mergeCategories([], []), []);
});
test('category merge retains additions from both devices', () => {
  const first = { id: 'a', name: 'A', order: 0 }, second = { id: 'b', name: 'B', order: 1 };
  assert.equal(mergeCategories([first], [second]).length, 2);
});
test('bullets and quotes act on entire lines, including multiple selected lines', () => {
  assert.deepEqual(blockEdit('前半後半', 2, 2, 'bullet'), { start: 0, end: 4, text: '- 前半後半' });
  assert.equal(blockEdit('one\ntwo\nthree', 0, 8, 'number').text, '1. one\n2. two');
  assert.equal(blockEdit('## title', 0, 0, 'quote').text, '> title');
  assert.equal(blockEdit('\nnext', 0, 0, 'bullet').text, '- ');
});
test('an older client changing text without revision still causes conflict', async () => {
  const original = remote(), pending = editedDraft(original, { body: 'my edit' });
  const fake = fakeFirestore({ ...original, body: 'older app changed text' });
  const result = await writeDraftTransaction(fake.firebase, fake.collection, pending);
  assert.equal(result.kind, 'conflict');
  assert.equal(fake.data.get('article').body, 'older app changed text');
});
test('Enter continues lists and exits empty items; Shift+Enter inserts hard break', () => {
  assert.equal(enterEdit('- item', 6, 6).text, '\n- ');
  assert.equal(enterEdit('3. item', 7, 7).text, '\n4. ');
  assert.deepEqual(enterEdit('- ', 2, 2), { start: 0, end: 2, text: '\n' });
  assert.equal(enterEdit('text', 4, 4, true).text, '  \n');
});
test('preview keeps code literal, ordered-list start, and fenced code', () => {
  assert.equal(markdownToHtml('`**literal**`'), '<p><code>**literal**</code></p>');
  assert.equal(markdownToHtml('3. item'), '<ol start="3"><li>item</li></ol>');
  assert.equal(markdownToHtml('```js\n<script>\n```'), '<pre><code>&lt;script&gt;</code></pre>');
});
test('raw HTML and attribute quotes cannot execute in the preview', () => {
  const html = markdownToHtml('<img src=x onerror=alert(1)>\n\n[label](https://example.com/"quoted")');
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&quot;quoted&quot;'));
  assert.ok(!markdownToHtml('[bad](javascript:alert(1))').includes('<a'));
});
test('file and clipboard share one Markdown export including title', () => {
  assert.equal(exportMarkdown('Title', 'Body'), '# Title\n\nBody');
  assert.equal(exportMarkdown(' ', 'Body'), 'Body');
});
test('PC-imported articles do not need another import on the phone', () => {
  const article = remote();
  const plan = planLegacyImport([article], defaultCategories(), [article], defaultCategories());
  assert.equal(plan.matchedCount, 1); assert.equal(plan.newCount, 0); assert.equal(plan.changedCount, 0);
  assert.equal(plan.categoriesToImport.length, 0);
});
test('old phone category IDs are reconciled with unique cloud category names', () => {
  const cloudCategory = { id: 'pc-note', name: 'note用', order: 0 };
  const phoneCategory = { id: 'phone-note', name: 'note用', order: 0 };
  const article = remote('text', { category: 'pc-note' });
  const plan = planLegacyImport([{ ...article, category: 'phone-note' }], [phoneCategory], [article], [cloudCategory]);
  assert.equal(plan.matchedCount, 1); assert.equal(plan.categoriesToImport.length, 0);
  assert.equal(plan.entries[0].draft.category, 'pc-note');
});
test('phone-only and differing articles remain available without overwriting cloud data', () => {
  const article = remote('cloud');
  const plan = planLegacyImport([{ ...article, body: 'phone edit' }, { ...article, id: 'phone-only' }], [], [article], []);
  assert.equal(plan.newCount, 1); assert.equal(plan.changedCount, 1); assert.equal(plan.matchedCount, 0);
  assert.equal(article.body, 'cloud');
});
test('same content with a different article ID is not silently discarded', () => {
  const article = remote();
  assert.equal(planLegacyImport([{ ...article, id: 'other-id' }], [], [article], []).newCount, 1);
});
test('ambiguous category names are not merged', () => {
  const plan = planLegacyImport([], [{ id: 'phone', name: '同名', order: 0 }], [], [{ id: 'pc-a', name: '同名' }, { id: 'pc-b', name: '同名' }]);
  assert.equal(plan.categoriesToImport.length, 1);
});
test('already stored trash content is not re-imported', () => {
  const article = remote();
  assert.equal(planLegacyImport([article], [], [{ ...article, deletedAt: '2026-10-09T00:00:00Z' }], []).matchedCount, 1);
});
test('category display pins diary and note while retaining original IDs', () => {
  const diary = { id: 'old-diary', name: '日記', order: 8 };
  const note = { id: 'old-note', name: 'note用', order: 0 };
  const result = orderedCategories([{ id: 'custom', name: '旅行', order: -1 }, note, { id: 'deleted', name: '日記', order: 0, deleted: true }, diary]);
  assert.deepEqual(result.map((category) => category.id), ['old-diary', 'old-note', 'custom']);
  assert.equal(result[0], diary);
});
test('posting state defaults safely and recognizes migrated note categories', () => {
  assert.equal(normalizeDraft({ noteStatus: 'invalid' }).noteStatus, 'unpublished');
  assert.equal(normalizeDraft({ noteStatus: 'published' }).noteStatus, 'published');
  assert.equal(isNoteDraft({ category: 'legacy-note' }, [{ id: 'legacy-note', name: 'note用' }]), true);
  assert.equal(isNoteDraft({ category: 'missing-note', categoryName: 'note用' }, []), true);
  assert.equal(isNoteDraft({ category: null, categoryName: 'note用' }, []), false);
});
test('default posting state preserves legacy content baselines', () => {
  const article = remote();
  const legacyKey = JSON.stringify([article.title, article.body, article.category || null, article.categoryName || '', article.deletedAt || null]);
  assert.equal(contentKey(article), legacyKey);
  assert.notEqual(contentKey({ ...article, noteStatus: 'published' }), legacyKey);
});
test('published status is included in the cloud payload and normal transaction', async () => {
  const article = remote('text', { category: 'old-note', categoryName: 'note用' });
  const pending = editedDraft(article, { noteStatus: 'published' });
  const fake = fakeFirestore(article);
  const result = await writeDraftTransaction(fake.firebase, fake.collection, pending);
  assert.equal(remotePayload(pending).noteStatus, 'published');
  assert.equal(result.saved.noteStatus, 'published');
  assert.equal(fake.data.get('article').noteStatus, 'published');
});
test('posting state survives conflict copies and trash restoration', async () => {
  const article = remote('old', { category: 'journal-note', categoryName: 'note用' });
  const pending = editedDraft(article, { noteStatus: 'published' });
  const conflict = fakeFirestore(remote('new server text', { revision: 'v2' }));
  const result = await writeDraftTransaction(conflict.firebase, conflict.collection, pending);
  assert.equal(result.kind, 'conflict'); assert.equal(result.saved.noteStatus, 'published');
  const deletion = editedDraft(result.saved, { deletedAt: '2026-10-09T00:00:00Z' });
  const deleted = await writeDraftTransaction(conflict.firebase, conflict.collection, deletion);
  const restored = await writeDraftTransaction(conflict.firebase, conflict.collection, editedDraft(deleted.saved, { deletedAt: null }));
  assert.equal(restored.saved.noteStatus, 'published');
});
test('posting changes made during a save stay pending after old acknowledgement', () => {
  const sent = editedDraft(remote(), { body: 'sent' });
  const live = editedDraft(sent, { noteStatus: 'published' });
  const result = applyWriteResult([live], sent, { kind: 'saved', saved: normalizeDraft(sent, { remote: true }) }, 'article');
  assert.equal(result.drafts[0].noteStatus, 'published');
  assert.equal(result.drafts[0].pendingSync, true);
});
test('new posting metadata does not re-trigger old-data import notices', () => {
  const article = remote();
  assert.equal(planLegacyImport([article], [], [{ ...article, noteStatus: 'published' }], []).matchedCount, 1);
});
test('bulk diary assignment updates metadata only and preserves exact server content', async () => {
  const article = { ...remote('latest\r\nserver text'), title: ' Exact title ', noteStatus: 'published', extra: 'preserved' };
  const updates = [];
  const firebase = {
    doc: (_collection, id) => ({ id }),
    runTransaction: async (_db, callback) => callback({
      get: async (ref) => ref.id === 'categories' ? { exists: () => true, data: () => ({ records: defaultCategories() }) } : { id: 'article', exists: () => true, data: () => article },
      update: (_ref, value) => { updates.push(value); Object.assign(article, value); },
    }),
  };
  const result = await assignUncategorizedToDiary(firebase, { firestore: {} }, { id: 'categories' }, 'article', defaultCategories()[0]);
  assert.equal(result.updated, true);
  assert.deepEqual(Object.keys(updates[0]).sort(), ['category', 'categoryName', 'revision', 'updatedAt']);
  assert.equal(article.body, 'latest\r\nserver text'); assert.equal(article.title, ' Exact title ');
  assert.equal(article.noteStatus, 'published'); assert.equal(article.extra, 'preserved');
  assert.equal(article.category, 'journal-diary');
});
test('bulk diary assignment skips deleted and already categorized articles', async () => {
  for (const article of [remote('text', { category: 'journal-note' }), remote('text', { deletedAt: '2026-10-09T00:00:00Z' })]) {
    let updated = false;
    const firebase = {
      doc: (_collection, id) => ({ id }),
      runTransaction: async (_db, callback) => callback({
        get: async (ref) => ref.id === 'categories' ? { exists: () => true, data: () => ({ records: defaultCategories() }) } : { id: 'article', exists: () => true, data: () => article },
        update: () => { updated = true; },
      }),
    };
    const result = await assignUncategorizedToDiary(firebase, { firestore: {} }, { id: 'categories' }, 'article', defaultCategories()[0]);
    assert.equal(result.updated, false); assert.equal(updated, false);
  }
});
test('bulk diary assignment refuses a deleted target category', async () => {
  const firebase = { doc: (_collection, id) => ({ id }), runTransaction: async (_db, callback) => callback({get: async()=>({exists:()=>true,data:()=>({records:defaultCategories().map(c=>({...c,deleted:true}))})}),update:()=>assert.fail('No update allowed')}) };
  await assert.rejects(assignUncategorizedToDiary(firebase, {firestore:{}}, {id:'categories'}, 'article', defaultCategories()[0]));
});
