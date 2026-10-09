import test from 'node:test';
import assert from 'node:assert/strict';
import { storageKey, normalizeDraft, remoteVersion, editedDraft, reconcileDrafts, writeDraftTransaction, applyWriteResult, defaultCategories, mergeCategories, blockEdit, enterEdit, exportMarkdown } from '../editor-core.mjs';
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
