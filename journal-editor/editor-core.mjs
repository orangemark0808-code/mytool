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
  // Same rule for pins: unpinned articles keep their old baseline.
  if (draft.pinnedAt) fields.push(['pinned', draft.pinnedAt]);
  return JSON.stringify(fields);
}

export function remoteVersion(draft) {
  // Include content as older open tabs do not update the new revision field.
  return JSON.stringify([draft.revision || '', draft.updatedAt, contentKey(draft), draft.createdAt]);
}

// Older offline drafts store a three-field baseline. Revision, update time and
// content still detect any edits made by the current version.
function matchesRemoteVersion(draft, baseVersion) {
  if (remoteVersion(draft) === baseVersion) return true;
  try {
    const previous = JSON.parse(baseVersion);
    return Array.isArray(previous) && previous.length === 3
      && JSON.stringify([draft.revision || '', draft.updatedAt, contentKey(draft)]) === baseVersion;
  } catch { return false; }
}

export function normalizeDraft(raw, { remote = false, id = raw?.id } = {}) {
  const draft = {
    id: String(id || crypto.randomUUID()),
    title: typeof raw?.title === 'string' ? raw.title : UNTITLED_TITLE,
    body: typeof raw?.body === 'string' ? raw.body : '',
    category: typeof raw?.category === 'string' && raw.category ? raw.category : null,
    categoryName: typeof raw?.categoryName === 'string' ? raw.categoryName : '',
    noteStatus: raw?.noteStatus === 'published' ? 'published' : 'unpublished',
    pinnedAt: validDate(raw?.pinnedAt) || null,
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
  const { id, title, body, category, categoryName, noteStatus, pinnedAt, createdAt, updatedAt, revision, deletedAt } = normalizeDraft(draft);
  return { id, title, body, category, categoryName, noteStatus, pinnedAt, createdAt, updatedAt, revision, deletedAt, schemaVersion: SCHEMA_VERSION };
}

export function editedDraft(draft, changes, now = new Date().toISOString()) {
  return { ...draft, ...changes, updatedAt: now, revision: crypto.randomUUID(), pendingSync: true };
}

// Missing query records are not evidence of deletion without a document read.
// Pending edits always win locally; transactions preserve conflicting versions.
export function reconcileDrafts(local, remote, { authoritative = false, writingIds = new Set(), confirmedMissingIds = new Set() } = {}) {
  const merged = new Map(local.map((draft) => [draft.id, draft]));
  const remoteById = new Map(remote.map((draft) => [draft.id, draft]));
  for (const incoming of remote) {
    const current = merged.get(incoming.id);
    if (!current) { merged.set(incoming.id, incoming); continue; }
    if (!authoritative || current.pendingSync || writingIds.has(current.id)) continue;
    merged.set(incoming.id, incoming);
  }
  const recovered = [], removedIds = [];
  if (authoritative) {
    for (const draft of local) {
      // A collection listener can lag a completed transaction. Absence alone
      // must never delete a newly saved article or start a recovery-copy loop.
      // Clean articles follow confirmed deletions; only unsent edits may need
      // recovery, which is handled by the conflict-aware write transaction.
      if (!remoteById.has(draft.id) && confirmedMissingIds.has(draft.id) && draft.baseVersion && !draft.pendingSync && !writingIds.has(draft.id)) {
        merged.delete(draft.id); removedIds.push(draft.id);
      }
    }
  }
  return { drafts: [...merged.values()], recovered, removedIds };
}

export function recoveryCopy(draft, suffix = '競合コピー', id = crypto.randomUUID()) {
  const now = new Date().toISOString();
  return editedDraft({ ...draft, id, baseVersion: null, deletedAt: null, createdAt: now }, {
    title: recoveryTitle(draft.title, suffix),
  }, now);
}
function recoveryTitle(title, suffix) {
  const base = (title || UNTITLED_TITLE).replace(/(?:（(?:競合コピー|復元)）)+$/u, '');
  return `${base || UNTITLED_TITLE}（${suffix}）`;
}

/* 題名なしの記事。以前の「無題の記事」も題名なしとして扱い、表示は Non Title にそろえる。 */
export const UNTITLED_TITLE = 'Non Title';
const LEGACY_UNTITLED_TITLE = '無題の記事';
export function isUntitledTitle(title) { return title === UNTITLED_TITLE || title === LEGACY_UNTITLED_TITLE; }
export function displayTitle(title) { return title === LEGACY_UNTITLED_TITLE || title.startsWith(`${LEGACY_UNTITLED_TITLE}（`) ? UNTITLED_TITLE + title.slice(LEGACY_UNTITLED_TITLE.length) : title; }

// All reads precede writes, and retries reuse the same copy ID. A stale client
// must never overwrite a newer server revision or resurrect a deleted article.
export async function writeDraftTransaction(firebase, collectionRef, draft) {
  const payload = remotePayload(draft);
  const copyId = crypto.randomUUID();
  return firebase.runTransaction(collectionRef.firestore, async (transaction) => {
    const ref = firebase.doc(collectionRef, draft.id);
    const snapshot = await transaction.get(ref);
    const current = snapshot.exists() ? normalizeDraft(snapshot.data(), { remote: true, id: snapshot.id || draft.id }) : null;
    // A delayed soft-delete must not recreate an article already purged elsewhere.
    if (!current && draft.deletedAt && draft.baseVersion) return { kind: 'removed', id: draft.id };
    const unchanged = current && matchesRemoteVersion(current, draft.baseVersion);
    const sameContent = current && contentKey(current) === contentKey(draft) && current.createdAt === draft.createdAt;
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

// Delete only the reviewed, unchanged trash record. Never delete an active or
// concurrently restored/edited article, and never write a replacement record.
export async function permanentlyDeleteDraft(firebase, collectionRef, expected) {
  return firebase.runTransaction(collectionRef.firestore, async (transaction) => {
    const ref = firebase.doc(collectionRef, expected.id), snapshot = await transaction.get(ref);
    if (!snapshot.exists()) return { kind: 'missing' };
    const current = normalizeDraft(snapshot.data(), { remote: true, id: snapshot.id || expected.id });
    if (!current.deletedAt) return { kind: 'restored' };
    if (!expected.deletedAt || !matchesRemoteVersion(current, expected.baseVersion)) return { kind: 'changed' };
    transaction.delete(ref);
    return { kind: 'deleted' };
  });
}

export function applyWriteResult(drafts, sent, result, activeId) {
  const live = drafts.find((draft) => draft.id === sent.id);
  if (!live) return { drafts, activeId };
  if (result.kind === 'removed') {
    const next = drafts.filter((draft) => draft.id !== sent.id);
    if (!live.deletedAt) {
      const copy = recoveryCopy(live, '復元'); next.push(copy);
      return { drafts: next, activeId: activeId === sent.id ? copy.id : activeId };
    }
    return { drafts: next, activeId: activeId === sent.id ? null : activeId };
  }
  if (result.kind === 'saved') {
    const next = live.revision === sent.revision ? result.saved : { ...live, baseVersion: remoteVersion(result.saved), pendingSync: true };
    return { drafts: drafts.map((draft) => draft.id === sent.id ? next : draft), activeId };
  }
  const copy = live.revision === sent.revision ? result.saved : {
    ...live, id: result.saved.id,
    title: live.title === sent.title ? result.saved.title : recoveryTitle(live.title, result.original && !result.original.deletedAt ? '競合コピー' : '復元'),
    createdAt: result.saved.createdAt,
    baseVersion: remoteVersion(result.saved), pendingSync: true,
  };
  const next = drafts.filter((draft) => draft.id !== sent.id && draft.id !== copy.id);
  if (result.original) next.push(result.original);
  next.push(copy);
  return { drafts: next, activeId: activeId === sent.id ? copy.id : activeId };
}

export function defaultCategories() {
  return [
    { id: 'journal-diary', name: '日記', order: 0, updatedAt: '2026-01-01T00:00:00.000Z', deleted: false, book: 'diary' },
    { id: 'journal-note', name: 'note用', order: 1, updatedAt: '2026-01-01T00:00:00.000Z', deleted: false, book: 'note' },
  ];
}

export const FIXED_CATEGORY_NAMES = ['日記', 'note用'];

export function standardCategories() {
  return defaultCategories();
}

/* 書き始めに選べるテンプレート。 */
export function templateOptions() {
  return [
    { id: 'drama-no-spoiler', label: 'ネタバレなし', body: "【ドラマ感想】作品名｜共感を呼ぶ一言キャッチコピー\n\n作品名／配信先／全◯話／ジャンル\nおすすめ度：★★★★☆\n\n### 観る前の私\n**観ようと思ったきっかけ**\n（なんとなく、話題だったから、疲れていたから、など）\n\n### あらすじ（ネタバレなし）\n（導入部分まで。3〜4行）\n\n### 私の感想\n**いちばん心が動いたところ**\n（どの場面で、どう感じたか）\n\n**自分の経験と重なったところ**\n（「私もこういうことあった」を一言でも入れる）\n\n**ここがちょっと気になった**\n（正直な気持ち。軽めでOK）\n\n### 一言ツッコミ\n- 「◯◯、そこは気づけよ！」\n- 「◯◯、絶対あとで伏線になるやつ」\n- 「◯◯、さすがに強すぎん？」\n\n### こんな人に刺さると思う\n- ◯◯な気持ちになったことがある人\n- ◯◯な夜に観たい人\n\n### 最後に\n（余韻の一言＋読者への問いかけ）\n「みなさんはどう感じましたか？ よかったらコメントで教えてください」" },
    { id: 'drama-spoiler', label: 'ネタバレあり', body: "【ネタバレあり】【ドラマ感想】作品名｜共感を呼ぶ一言キャッチコピー\n\n⚠️ この記事は結末までのネタバレを含みます。未視聴の方はご注意ください。\n\n作品名／配信先／全◯話／ジャンル\nおすすめ度：★★★★☆\n\n### まず結論\n（ネタバレなしで一言だけ。「観てよかった」「好き嫌い分かれそう」など）\n\n### あらすじ（全体）\n（結末まで含めて、5〜6行で簡潔に）\n\n### 私の感想\n**あのシーンで泣いた／震えた／声が出た**\n（場面を具体的に。感情を先に書く）\n\n**あの展開、私はこう受け取った**\n（自分なりの解釈）\n\n**登場人物への気持ち**\n（共感できた人、できなかった人）\n\n**ラストについて**\n（納得できたか、モヤモヤしたか）\n\n### 伏線・気づいたこと\n- ◯話の◯◯は、最終話の◯◯につながってたんだ\n- 見返して気づいたこと\n\n### 一言ツッコミ\n- 「◯◯、結局そうなるんかい！」\n- 「◯◯、あの時点で気づいてたよね？」\n\n### 観た人と語りたいこと\n（読者に問いかける）\n「あのラスト、みなさんはどう解釈しましたか？」\n\n### 最後に\n（余韻の一言）" },
  ];
}

/* 以前あったカテゴリ「テンプレート」を片付ける。
   記事は note用 へ移し、自動で作られたまま手つかずのテンプレート記事はごみ箱へ入れる（復元できる）。 */
export const RETIRED_TEMPLATE_CATEGORY_ID = 'journal-template';
const RETIRED_SEED_TEMPLATES = { 'template-seed-no-spoiler': 'drama-no-spoiler', 'template-seed-spoiler': 'drama-spoiler' };
export function retireTemplateCategory(drafts, categories, noteCategory, now = new Date().toISOString()) {
  const retired = categories.find((category) => category.id === RETIRED_TEMPLATE_CATEGORY_ID && !category.deleted);
  if (!retired || !noteCategory) return null;
  const changedIds = [];
  const nextDrafts = drafts.map((draft) => {
    if (draft.category !== retired.id) return draft;
    changedIds.push(draft.id);
    const seed = templateOptions().find((template) => template.id === RETIRED_SEED_TEMPLATES[draft.id]);
    const untouched = seed && draft.body === seed.body;
    return editedDraft(draft, { category: noteCategory.id, categoryName: noteCategory.name, noteStatus: draft.noteStatus === 'published' ? 'published' : 'unpublished', ...(untouched && !draft.deletedAt ? { deletedAt: now } : {}) }, now);
  });
  const nextCategories = categories.map((category) => category === retired ? { ...category, deleted: true, updatedAt: now } : category);
  return { drafts: nextDrafts, categories: nextCategories, changedIds };
}

/* テンプレートを本文へ入れる。本文が空なら置き換え、あれば末尾に追加する。 */
export function applyTemplateText(body, template) {
  if (!body.trim()) return { text: template, caret: 0, appended: false };
  const separator = body.endsWith('\n\n') ? '' : body.endsWith('\n') ? '\n' : '\n\n';
  const text = body + separator + template;
  return { text, caret: body.length + separator.length, appended: true };
}

export function orderedCategories(records) {
  const priority = (category) => category.name === '日記' ? 0 : category.name === 'note用' ? 1 : 2;
  return records.filter((category) => !category.deleted).sort((a, b) => priority(a) - priority(b) || a.order - b.order || a.id.localeCompare(b.id));
}

/* 入口（冊子）は「日記」と「note」の2つ。カテゴリ「日記」「note用」がそれぞれの入口そのもので、
   追加したカテゴリはどちらかの入口の中の小分けになる。未分類や未取得のカテゴリの記事は日記に入る。 */
export const BOOKS = ['diary', 'note'];
export const BOOK_LABELS = { diary: '日記', note: 'note' };
export const BOOK_CATEGORY_NAMES = { diary: '日記', note: 'note用' };
export function categoryBook(category) {
  if (!category) return 'diary';
  if (category.name === '日記') return 'diary';
  if (category.name === 'note用') return 'note';
  return category.book === 'note' ? 'note' : 'diary';
}
export function isBookCategory(category) {
  return Boolean(category) && FIXED_CATEGORY_NAMES.includes(category.name);
}
export function draftBook(draft, categories) {
  if (!draft?.category) return 'diary';
  const category = categories.find((item) => item.id === draft.category);
  if (category) return categoryBook(category);
  return draft.categoryName === 'note用' ? 'note' : 'diary';
}
/* 記事の小分けカテゴリのID。入口そのもの（日記・note用）や未分類なら null。 */
export function draftSubcategory(draft, categories) {
  if (!draft?.category) return null;
  const category = categories.find((item) => item.id === draft.category);
  if (!category) return draft.categoryName && !FIXED_CATEGORY_NAMES.includes(draft.categoryName) ? draft.category : null;
  return isBookCategory(category) ? null : category.id;
}
export function bookSubcategories(categories, book) {
  return orderedCategories(categories).filter((category) => !isBookCategory(category) && categoryBook(category) === book);
}

export function isNoteDraft(draft, categories) {
  return draftBook(draft, categories) === 'note';
}

export function normalizeCategories(records) {
  return (Array.isArray(records) ? records : []).filter((record) => typeof record?.id === 'string').map((record, index) => ({
    id: record.id, name: typeof record.name === 'string' ? record.name.trim().slice(0, 30) : '無題のカテゴリ',
    order: Number.isFinite(record.order) ? record.order : index,
    updatedAt: validDate(record.updatedAt) || '2026-01-01T00:00:00.000Z', deleted: Boolean(record.deleted),
    book: record.book === 'note' ? 'note' : 'diary',
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
