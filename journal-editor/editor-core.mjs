export const SCHEMA_VERSION = 2;
export const LEGACY_KEYS = {
  drafts: 'orangemania-blog-editor-v1',
  categories: 'orangemania-blog-editor-categories-v1',
};

export function storageKey(uid) {
  if (!uid) throw new Error('An account is required for journal storage');
  return `orangemania-journal-v2:${encodeURIComponent(uid)}`;
}

export function validDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : '';
}

export function contentKey(draft) {
  const fields = [draft.title, draft.body, draft.category || null, draft.categoryName || '', draft.deletedAt || null];
  // Preserve old-version baselines for articles with no posting state. An
  // explicitly published state participates in conflict detection.
  if (draft.noteStatus === 'published') fields.push('published');
  return JSON.stringify(fields);
}

export function remoteVersion(draft) {
  // Include content as older open tabs do not update the new revision field.
  return JSON.stringify([draft.revision || '', draft.updatedAt, contentKey(draft)]);
}

export function normalizeDraft(raw, { remote = false, id = raw?.id } = {}) {
  const draft = {
    id: String(id || crypto.randomUUID()),
    title: typeof raw?.title === 'string' ? raw.title : '無題の記事',
    body: typeof raw?.body === 'string' ? raw.body : '',
    category: typeof raw?.category === 'string' && raw.category ? raw.category : null,
    categoryName: typeof raw?.categoryName === 'string' ? raw.categoryName : '',
    noteStatus: raw?.noteStatus === 'published' ? 'published' : 'unpublished',
    createdAt: validDate(raw?.createdAt) || validDate(raw?.updatedAt),
    updatedAt: validDate(raw?.updatedAt) || validDate(raw?.createdAt),
    revision: typeof raw?.revision === 'string' ? raw.revision : '',
    deletedAt: validDate(raw?.deletedAt) || null,
    schemaVersion: SCHEMA_VERSION,
    baseVersion: typeof raw?.baseVersion === 'string' ? raw.baseVersion : null,
    pendingSync: remote ? false : raw?.pendingSync === true,
  };
  if (remote) draft.baseVersion = remoteVersion(draft);
  return draft;
}

export function remotePayload(draft) {
  const { id, title, body, category, categoryName, noteStatus, createdAt, updatedAt, revision, deletedAt } = normalizeDraft(draft);
  return { id, title, body, category, categoryName, noteStatus, createdAt, updatedAt, revision, deletedAt, schemaVersion: SCHEMA_VERSION };
}

export function editedDraft(draft, changes, now = new Date().toISOString()) {
  return { ...draft, ...changes, updatedAt: now, revision: crypto.randomUUID(), pendingSync: true };
}

// Missing cached records are never evidence of deletion. Pending edits always win
// locally; the transaction below preserves both versions if the server changed.
export function reconcileDrafts(local, remote, { authoritative = false, activeId = null, writingIds = new Set() } = {}) {
  const merged = new Map(local.map((draft) => [draft.id, draft]));
  const remoteById = new Map(remote.map((draft) => [draft.id, draft]));
  for (const incoming of remote) {
    const current = merged.get(incoming.id);
    if (!current) { merged.set(incoming.id, incoming); continue; }
    if (!authoritative || current.pendingSync || writingIds.has(current.id)) continue;
    merged.set(incoming.id, incoming);
  }
  const recovered = [];
  if (authoritative) {
    for (const draft of local) {
      const incoming = remoteById.get(draft.id);
      const deleted = incoming?.deletedAt || (!remoteById.has(draft.id) && draft.baseVersion);
      if (!deleted || draft.deletedAt || draft.pendingSync || writingIds.has(draft.id)) continue;
      if (draft.id === activeId) {
        const copy = recoveryCopy(draft, '復元');
        merged.set(copy.id, copy);
        recovered.push({ previousId: draft.id, copy });
      }
      if (!incoming) merged.delete(draft.id);
    }
  }
  return { drafts: [...merged.values()], recovered };
}

export function recoveryCopy(draft, suffix = '競合コピー', id = crypto.randomUUID()) {
  const now = new Date().toISOString();
  return editedDraft({ ...draft, id, baseVersion: null, deletedAt: null, createdAt: now }, {
    title: `${draft.title || '無題の記事'}（${suffix}）`,
  }, now);
}

// All reads precede writes, and retries reuse the same copy ID. A stale client
// must never overwrite a newer server revision or resurrect a deleted article.
export async function writeDraftTransaction(firebase, collectionRef, draft) {
  const payload = remotePayload(draft);
  const copyId = crypto.randomUUID();
  return firebase.runTransaction(collectionRef.firestore, async (transaction) => {
    const ref = firebase.doc(collectionRef, draft.id);
    const snapshot = await transaction.get(ref);
    const current = snapshot.exists() ? normalizeDraft(snapshot.data(), { remote: true, id: snapshot.id || draft.id }) : null;
    const unchanged = current && remoteVersion(current) === draft.baseVersion;
    const sameContent = current && contentKey(current) === contentKey(draft);
    const conflict = current ? !unchanged && !sameContent : Boolean(draft.baseVersion);
    if (conflict && !draft.deletedAt) {
      const copy = recoveryCopy(draft, current && !current.deletedAt ? '競合コピー' : '復元', copyId);
      transaction.set(firebase.doc(collectionRef, copyId), remotePayload(copy));
      return { kind: 'conflict', original: current, saved: normalizeDraft(copy, { remote: true }) };
    }
    // Soft deletion preserves the newest server text for later restoration.
    const saved = draft.deletedAt && current && !unchanged ? { ...remotePayload(current), deletedAt: draft.deletedAt, updatedAt: draft.updatedAt, revision: draft.revision } : payload;
    transaction.set(ref, saved);
    return { kind: 'saved', saved: normalizeDraft(saved, { remote: true }) };
  });
}

// Metadata-only conversion: preserve the latest server title/body/status even
// when another device edits an article during the bulk operation.
export async function assignUncategorizedToDiary(firebase, collectionRef, categoryRef, id, diary) {
  const revision = crypto.randomUUID();
  return firebase.runTransaction(collectionRef.firestore, async (transaction) => {
    const categories = await transaction.get(categoryRef);
    const validDiary = categories.exists() && normalizeCategories(categories.data().records).some((category) => category.id === diary.id && category.name === '日記' && !category.deleted);
    if (!validDiary) throw new Error('Diary category is not available');
    const ref = firebase.doc(collectionRef, id), snapshot = await transaction.get(ref);
    if (!snapshot.exists()) return { updated: false };
    const current = normalizeDraft(snapshot.data(), { remote: true, id: snapshot.id || id });
    if (current.category || current.deletedAt) return { updated: false };
    const updatedAt = new Date(Math.max(Date.now(), Date.parse(current.updatedAt) || 0)).toISOString();
    const changes = { category: diary.id, categoryName: '日記', revision, updatedAt };
    transaction.update(ref, changes);
    return { updated: true, draft: normalizeDraft({ ...current, ...changes }, { remote: true }) };
  });
}

export function applyWriteResult(drafts, sent, result, activeId) {
  const live = drafts.find((draft) => draft.id === sent.id);
  if (!live) return { drafts, activeId };
  if (result.kind === 'saved') {
    const next = live.revision === sent.revision ? result.saved : { ...live, baseVersion: remoteVersion(result.saved), pendingSync: true };
    return { drafts: drafts.map((draft) => draft.id === sent.id ? next : draft), activeId };
  }
  const copy = live.revision === sent.revision ? result.saved : {
    ...live, id: result.saved.id, title: result.saved.title, createdAt: result.saved.createdAt,
    baseVersion: remoteVersion(result.saved), pendingSync: true,
  };
  const next = drafts.filter((draft) => draft.id !== sent.id && draft.id !== copy.id);
  if (result.original) next.push(result.original);
  next.push(copy);
  return { drafts: next, activeId: activeId === sent.id ? copy.id : activeId };
}

export function defaultCategories() {
  return [
    { id: 'journal-diary', name: '日記', order: 0, updatedAt: '2026-01-01T00:00:00.000Z', deleted: false },
    { id: 'journal-note', name: 'note用', order: 1, updatedAt: '2026-01-01T00:00:00.000Z', deleted: false },
  ];
}

export function orderedCategories(records) {
  const priority = (category) => category.name === '日記' ? 0 : category.name === 'note用' ? 1 : 2;
  return records.filter((category) => !category.deleted).sort((a, b) => priority(a) - priority(b) || a.order - b.order || a.id.localeCompare(b.id));
}

export function isNoteDraft(draft, categories) {
  if (!draft?.category) return false;
  return (categories.find((category) => category.id === draft.category)?.name || draft.categoryName) === 'note用';
}

export function normalizeCategories(records) {
  return (Array.isArray(records) ? records : []).filter((record) => typeof record?.id === 'string').map((record, index) => ({
    id: record.id, name: typeof record.name === 'string' ? record.name.trim().slice(0, 30) : '無題のカテゴリ',
    order: Number.isFinite(record.order) ? record.order : index,
    updatedAt: validDate(record.updatedAt) || '2026-01-01T00:00:00.000Z', deleted: Boolean(record.deleted),
  }));
}

export function mergeCategories(local, remote) {
  const merged = new Map(normalizeCategories(local).map((record) => [record.id, record]));
  for (const record of normalizeCategories(remote)) {
    const current = merged.get(record.id);
    if (!current || record.updatedAt > current.updatedAt || (record.updatedAt === current.updatedAt && JSON.stringify(record) > JSON.stringify(current))) merged.set(record.id, record);
  }
  return [...merged.values()].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

// Compare only with the signed-in account's confirmed server records. Matching
// category names can have different IDs on the old PC and phone versions.
export function planLegacyImport(legacyDrafts, legacyCategories, serverDrafts, serverCategories) {
  const categories = normalizeCategories(legacyCategories);
  const known = normalizeCategories(serverCategories);
  const aliases = new Map(), categoriesToImport = [];
  for (const category of categories) {
    const exact = known.find((item) => item.id === category.id);
    const sameName = known.filter((item) => !item.deleted && item.name === category.name);
    const current = exact || (sameName.length === 1 ? sameName[0] : null);
    if (current) aliases.set(category.id, current.id);
    else if (!category.deleted) categoriesToImport.push(category);
  }
  const remote = new Map(serverDrafts.map((draft) => [draft.id, draft]));
  const entries = legacyDrafts.map((raw) => {
    const draft = normalizeDraft(raw);
    const category = aliases.get(draft.category) || draft.category;
    const current = remote.get(draft.id);
    const same = current && current.title === draft.title && current.body === draft.body && (current.category || null) === category;
    return {
      draft: { ...draft, category, categoryName: known.find((item) => item.id === category)?.name || categories.find((item) => item.id === draft.category)?.name || draft.categoryName },
      kind: same ? 'matched' : current ? 'changed' : 'new',
    };
  });
  return {
    entries, categoriesToImport,
    newCount: entries.filter((entry) => entry.kind === 'new').length,
    changedCount: entries.filter((entry) => entry.kind === 'changed').length,
    matchedCount: entries.filter((entry) => entry.kind === 'matched').length,
  };
}

export function blockEdit(value, start, end, action) {
  const lineStart = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1;
  const searchEnd = end > start && value[end - 1] === '\n' ? end - 1 : end;
  const nextNewline = value.indexOf('\n', searchEnd);
  const lineEnd = nextNewline === -1 ? value.length : nextNewline;
  const lines = value.slice(lineStart, lineEnd).split('\n');
  const plain = lines.map((line) => line.replace(/^(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+\.\s+)/, ''));
  const transformed = plain.map((line, index) => {
    if (action === 'heading') return `## ${line}`;
    if (action === 'subheading') return `### ${line}`;
    if (action === 'bullet') return `- ${line}`;
    if (action === 'number') return `${index + 1}. ${line}`;
    return `> ${line}`;
  });
  return { start: lineStart, end: lineEnd, text: transformed.join('\n') };
}

export function enterEdit(value, start, end, shift = false) {
  if (shift) return { start, end, text: '  \n' };
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const line = value.slice(lineStart, start);
  const match = line.match(/^(\s*)([-*+] |\d+\. |> ?)(.*)$/);
  if (!match) return { start, end, text: '\n\n' };
  if (!match[3].trim()) return { start: lineStart, end, text: '\n' };
  const number = match[2].match(/^(\d+)\./);
  const prefix = number ? `${Number(number[1]) + 1}. ` : match[2];
  return { start, end, text: `\n${match[1]}${prefix}` };
}

export function exportMarkdown(title, body) {
  return title.trim() ? `# ${title.trim()}\n\n${body}` : body;
}
