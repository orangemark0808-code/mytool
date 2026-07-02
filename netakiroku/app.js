import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const FIREBASE_CONFIG = window.NETAKIROKU_FIREBASE_CONFIG || window.PROMPT_STOCK_FIREBASE_CONFIG || {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: "",
};

const DEFAULT_SETTINGS = {
  categories: ["AI制作", "日常", "仕事", "制作裏話", "メモ"],
  statuses: ["ネタ作成中", "漫画未作成", "漫画作成済み", "ボツ"],
  tagSuggestions: [],
  actorSuggestions: ["主人公", "ナレーション", "PC通知"],
};

const TYPE_OPTIONS = [
  { label: "空白", value: "" },
  { label: "(心)", value: "(心)" },
  { label: "(叫)", value: "(叫)" },
  { label: "(回)", value: "(回)" },
  { label: "(状)", value: "(状)" },
  { label: "(M)", value: "(M)" },
  { label: "(PC)", value: "(PC)" },
];

const elements = {
  listView: document.getElementById("listView"),
  editorView: document.getElementById("editorView"),
  settingsView: document.getElementById("settingsView"),
  loginButton: document.getElementById("loginButton"),
  logoutButton: document.getElementById("logoutButton"),
  settingsButton: document.getElementById("settingsButton"),
  settingsBackButton: document.getElementById("settingsBackButton"),
  accountName: document.getElementById("accountName"),
  syncStatus: document.getElementById("syncStatus"),
  newButton: document.getElementById("newButton"),
  searchInput: document.getElementById("searchInput"),
  statusFilter: document.getElementById("statusFilter"),
  categoryFilter: document.getElementById("categoryFilter"),
  sortSelect: document.getElementById("sortSelect"),
  csvImportInput: document.getElementById("csvImportInput"),
  countText: document.getElementById("countText"),
  netaList: document.getElementById("netaList"),
  editorForm: document.getElementById("editorForm"),
  backButton: document.getElementById("backButton"),
  titleInput: document.getElementById("titleInput"),
  pageCountInput: document.getElementById("pageCountInput"),
  statusInput: document.getElementById("statusInput"),
  categoryInput: document.getElementById("categoryInput"),
  tagsInput: document.getElementById("tagsInput"),
  memoInput: document.getElementById("memoInput"),
  rowsEditor: document.getElementById("rowsEditor"),
  addRowButton: document.getElementById("addRowButton"),
  saveButton: document.getElementById("saveButton"),
  editorCopyButton: document.getElementById("editorCopyButton"),
  editorDownloadButton: document.getElementById("editorDownloadButton"),
  toast: document.getElementById("toast"),
};

let app;
let auth;
let db;
let currentUser = null;
let netas = [];
let settings = structuredClone(DEFAULT_SETTINGS);
let editingId = null;
let draftRows = [];

function isConfigured() {
  return Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.appId);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => elements.toast.classList.remove("show"), 2400);
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  }[char]));
}

function timestampToMillis(value) {
  if (!value) return Date.now();
  if (typeof value === "number") return value;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value.seconds) return value.seconds * 1000;
  return Date.parse(value) || Date.now();
}

function formatDate(value) {
  const date = new Date(timestampToMillis(value));
  return date.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function yyyymmdd(date = new Date()) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function getCollections() {
  return {
    neta: collection(db, "users", currentUser.uid, "netakiroku"),
    settings: doc(db, "users", currentUser.uid, "netakirokuSettings", "main"),
  };
}

function normalizeRow(row = {}) {
  let actor = String(row.actor ?? row.person ?? "").trim();
  let type = String(row.type ?? "").trim();
  if (actor === "PC説明" && type === "(M)") {
    actor = "PC通知";
    type = "(PC)";
  }
  const typeOption = TYPE_OPTIONS.find((option) => option.value === type) || TYPE_OPTIONS[0];
  return {
    panel: String(row.panel ?? "").trim(),
    actor,
    type: typeOption.value,
    typeLabel: typeOption.label,
    detail: String(row.detail ?? "").trim(),
    reference: String(row.reference ?? "").trim(),
  };
}

function normalizeNeta(id, data = {}) {
  const rows = Array.isArray(data.rows) ? data.rows.map(normalizeRow) : [normalizeRow({ panel: "1" })];
  const status = normalizeStatusValue(data.status);
  return {
    id,
    title: String(data.title || "無題のネタ").trim(),
    pageCount: Math.max(1, Number(data.pageCount || 1)),
    status: settings.statuses.includes(status) ? status : settings.statuses[0],
    category: String(data.category || settings.categories[0] || "").trim(),
    tags: Array.isArray(data.tags) ? data.tags.map(String).filter(Boolean) : splitTags(data.tags),
    memo: String(data.memo || ""),
    rows: rows.length ? rows : [normalizeRow({ panel: "1" })],
    createdAt: data.createdAt || Date.now(),
    updatedAt: data.updatedAt || Date.now(),
  };
}

function splitTags(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value || "").split(/[,\u3001]/).map((item) => item.trim()).filter(Boolean);
}

function mergeSettings(remote = {}) {
  settings = {
    categories: normalizeOptionList(remote.categories, DEFAULT_SETTINGS.categories),
    statuses: normalizeStatusList(remote.statuses),
    tagSuggestions: normalizeOptionList(remote.tagSuggestions, DEFAULT_SETTINGS.tagSuggestions),
    actorSuggestions: normalizeOptionList(remote.actorSuggestions, DEFAULT_SETTINGS.actorSuggestions),
  };
}

function normalizeStatusValue(value) {
  const status = String(value || "").trim();
  if (status === "未作成") return "漫画未作成";
  if (status === "作成中") return "ネタ作成中";
  if (status === "完成" || status === "作成済み") return "漫画作成済み";
  return DEFAULT_SETTINGS.statuses.includes(status) ? status : DEFAULT_SETTINGS.statuses[0];
}

function normalizeStatusList(value) {
  const normalized = normalizeOptionList(value, DEFAULT_SETTINGS.statuses).map(normalizeStatusValue);
  const allowed = new Set(normalized);
  const statuses = DEFAULT_SETTINGS.statuses.filter((status) => allowed.has(status) || !Array.isArray(value));
  return statuses.length ? statuses : [...DEFAULT_SETTINGS.statuses];
}

function normalizeOptionList(value, fallback) {
  const merged = Array.isArray(value) ? value : fallback;
  return [...new Set(merged.map((item) => {
    if (item && typeof item === "object") return String(item.name || item.label || item.value || "").trim();
    return String(item).trim();
  }).filter(Boolean))];
}

async function loadRemote() {
  const refs = getCollections();
  elements.syncStatus.textContent = "同期中...";
  const settingsSnap = await getDoc(refs.settings);
  if (settingsSnap.exists()) {
    mergeSettings(settingsSnap.data());
  } else {
    mergeSettings(DEFAULT_SETTINGS);
    await setDoc(refs.settings, settings);
  }
  const listQuery = query(refs.neta, orderBy("updatedAt", "desc"));
  const snap = await getDocs(listQuery);
  netas = snap.docs.map((item) => normalizeNeta(item.id, item.data()));
  elements.syncStatus.textContent = `同期済み users/${currentUser.uid}/netakiroku`;
  render();
}

async function saveSettings() {
  settings.statuses = [...DEFAULT_SETTINGS.statuses];
  render();
  await setDoc(getCollections().settings, settings, { merge: true });
}

function setView(view) {
  elements.listView.hidden = view !== "list";
  elements.editorView.hidden = view !== "editor";
  elements.settingsView.hidden = view !== "settings";
  refreshIcons();
}

function render() {
  renderFilters();
  renderList();
  renderSettings();
  refreshIcons();
}

function renderFilters() {
  settings.statuses = [...DEFAULT_SETTINGS.statuses];
  const currentStatusFilter = elements.statusFilter.value ? normalizeStatusValue(elements.statusFilter.value) : "";
  fillSelect(elements.statusFilter, ["すべてのステータス", ...settings.statuses], currentStatusFilter);
  fillSelect(elements.categoryFilter, ["すべてのカテゴリ", ...settings.categories], elements.categoryFilter.value);
  fillSelect(elements.statusInput, settings.statuses, normalizeStatusValue(elements.statusInput.value || settings.statuses[0]));
  fillSelect(elements.categoryInput, settings.categories, elements.categoryInput.value || settings.categories[0]);
  applyStatusSelectClass(elements.statusInput);
}

function fillSelect(select, options, current) {
  const old = current ?? select.value;
  select.innerHTML = options.map((option, index) => {
    const value = index === 0 && option.startsWith("すべて") ? "" : option;
    return `<option value="${escapeHtml(value)}">${escapeHtml(option)}</option>`;
  }).join("");
  select.value = [...select.options].some((option) => option.value === old) ? old : select.options[0]?.value || "";
}

function getFirstPanel(neta) {
  const row = neta.rows.find((item) => String(item.panel).trim() === "1" && item.detail) || neta.rows.find((item) => item.detail) || neta.rows[0];
  return row?.detail || "本文行が未入力です";
}

function statusClass(status) {
  if (status === "ネタ作成中") return "status-drafting";
  if (status === "漫画未作成") return "status-todo";
  if (status === "漫画作成済み") return "status-done";
  if (status === "ボツ") return "status-dead";
  return "status-drafting";
}

function applyStatusSelectClass(select) {
  if (!select) return;
  select.classList.remove("status-drafting", "status-todo", "status-done", "status-dead");
  select.classList.add("status-control", statusClass(normalizeStatusValue(select.value)));
}

function renderList() {
  const keyword = elements.searchInput.value.trim().toLowerCase();
  const status = elements.statusFilter.value;
  const category = elements.categoryFilter.value;
  const sort = elements.sortSelect.value;
  const filtered = netas.filter((neta) => {
    const haystack = [
      neta.title,
      neta.category,
      neta.status,
      neta.tags.join(" "),
      neta.rows.map((row) => `${row.actor} ${row.detail} ${row.reference}`).join(" "),
    ].join(" ").toLowerCase();
    return (!keyword || haystack.includes(keyword)) &&
      (!status || neta.status === status) &&
      (!category || neta.category === category);
  }).sort((a, b) => {
    const key = sort === "createdDesc" ? "createdAt" : "updatedAt";
    return timestampToMillis(b[key]) - timestampToMillis(a[key]);
  });

  elements.countText.textContent = `${filtered.length}件`;
  if (!filtered.length) {
    elements.netaList.innerHTML = `<div class="empty">まだネタがありません。右上または一覧上部の「新規作成」から追加してください。</div>`;
    return;
  }
  elements.netaList.innerHTML = filtered.map((neta) => `
    <article class="neta-card">
      <div class="card-top">
        <h2>${escapeHtml(neta.title)}</h2>
        <select class="badge status-badge status-select ${statusClass(neta.status)}" data-status-select data-id="${neta.id}" aria-label="ステータス変更">
          ${settings.statuses.map((statusName) => `<option value="${escapeHtml(statusName)}" ${statusName === neta.status ? "selected" : ""}>${escapeHtml(statusName)}</option>`).join("")}
        </select>
      </div>
      <p class="first-panel">${escapeHtml(getFirstPanel(neta))}</p>
      <div class="meta-grid">
        <span class="meta-pill">${escapeHtml(neta.pageCount)}ページ</span>
        <span class="meta-pill">${neta.rows.length}コマ行</span>
        <span class="meta-pill">${escapeHtml(neta.category || "カテゴリなし")}</span>
        <span class="meta-pill">更新 ${formatDate(neta.updatedAt)}</span>
      </div>
      <div class="tag-list">${neta.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
      <div class="card-actions">
        <button class="btn ghost" type="button" data-action="edit" data-id="${neta.id}"><i data-lucide="pencil"></i><span>編集</span></button>
        <button class="btn ghost" type="button" data-action="download" data-id="${neta.id}"><i data-lucide="download"></i><span>CSV</span></button>
        <button class="btn ghost" type="button" data-action="copy" data-id="${neta.id}"><i data-lucide="copy"></i><span>コピー</span></button>
        <button class="btn ghost" type="button" data-action="duplicate" data-id="${neta.id}"><i data-lucide="copy-plus"></i><span>複製</span></button>
        <button class="btn ghost danger" type="button" data-action="delete" data-id="${neta.id}"><i data-lucide="trash-2"></i><span>削除</span></button>
      </div>
    </article>
  `).join("");
}

function openEditor(id = null) {
  editingId = id;
  const neta = id ? netas.find((item) => item.id === id) : normalizeNeta("", {
    title: "",
    pageCount: 1,
    status: settings.statuses[0],
    category: settings.categories[0],
    rows: [{ panel: "1" }],
  });
  elements.titleInput.value = neta?.title === "無題のネタ" ? "" : neta?.title || "";
  elements.pageCountInput.value = neta?.pageCount || 1;
  elements.statusInput.value = neta?.status || settings.statuses[0];
  applyStatusSelectClass(elements.statusInput);
  elements.categoryInput.value = neta?.category || settings.categories[0] || "";
  elements.tagsInput.value = (neta?.tags || []).join(", ");
  elements.memoInput.value = neta?.memo || "";
  draftRows = (neta?.rows || [normalizeRow({ panel: "1" })]).map(normalizeRow);
  renderRows();
  setView("editor");
}

function renderRows() {
  elements.rowsEditor.innerHTML = draftRows.map((row, index) => `
    <div class="row-editor" data-index="${index}">
      <div class="row-field"><label>コマ<input data-field="panel" value="${escapeHtml(row.panel)}" inputmode="numeric"></label></div>
      <div class="row-field"><label>人物名や状況<input data-field="actor" value="${escapeHtml(row.actor)}" autocomplete="off"></label></div>
      <div class="row-field"><label>区分<select data-field="type">${TYPE_OPTIONS.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === row.type ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select></label></div>
      <div class="row-field detail"><label>詳細<textarea data-field="detail" rows="2">${escapeHtml(row.detail)}</textarea></label></div>
      <div class="row-field reference"><label>参照・補足<textarea data-field="reference" rows="2">${escapeHtml(row.reference)}</textarea></label></div>
      <div class="row-actions">
        <button class="btn ghost" type="button" data-row-action="up" title="上へ"><i data-lucide="arrow-up"></i></button>
        <button class="btn ghost" type="button" data-row-action="down" title="下へ"><i data-lucide="arrow-down"></i></button>
        <button class="btn ghost" type="button" data-row-action="copy" title="複製"><i data-lucide="copy-plus"></i></button>
        <button class="btn ghost danger" type="button" data-row-action="delete" title="削除"><i data-lucide="trash-2"></i></button>
      </div>
    </div>
  `).join("");
  refreshIcons();
}

function collectDraft() {
  return {
    title: elements.titleInput.value.trim(),
    pageCount: Math.max(1, Number(elements.pageCountInput.value || 1)),
    status: normalizeStatusValue(elements.statusInput.value || settings.statuses[0]),
    category: elements.categoryInput.value || "",
    tags: splitTags(elements.tagsInput.value),
    memo: elements.memoInput.value.trim(),
    rows: draftRows.map(normalizeRow),
  };
}

async function saveCurrent(event) {
  event?.preventDefault();
  if (!currentUser) return;
  const data = collectDraft();
  if (!data.title) {
    showToast("タイトルを入力してください");
    return;
  }
  elements.saveButton.disabled = true;
  try {
    if (editingId) {
      const ref = doc(db, "users", currentUser.uid, "netakiroku", editingId);
      await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
      netas = netas.map((item) => item.id === editingId ? normalizeNeta(editingId, { ...item, ...data, updatedAt: Date.now() }) : item);
    } else {
      const ref = await addDoc(getCollections().neta, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      editingId = ref.id;
      netas.unshift(normalizeNeta(ref.id, { ...data, createdAt: Date.now(), updatedAt: Date.now() }));
    }
    showToast("保存しました");
    setView("list");
    render();
  } catch (error) {
    showToast(`保存できませんでした: ${error.message}`);
  } finally {
    elements.saveButton.disabled = false;
  }
}

function buildCsv(neta) {
  const rows = neta.rows.length ? neta.rows : [normalizeRow()];
  return rows.map((row, index) => [
    index === 0 ? neta.title : "",
    index === 0 ? neta.pageCount : "",
    row.panel,
    row.actor,
    row.type,
    row.detail,
    row.reference,
  ].map(csvCell).join(",")).join("\r\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function safeFileName(title) {
  return String(title || "netakiroku").replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_").slice(0, 80);
}

function downloadCsv(neta) {
  const blob = new Blob(["\ufeff", buildCsv(neta)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFileName(neta.title)}_${yyyymmdd()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function copyCsv(neta) {
  await navigator.clipboard.writeText(buildCsv(neta));
  showToast("CSVをコピーしました");
}

async function duplicateNeta(id) {
  const source = netas.find((item) => item.id === id);
  if (!source) return;
  const data = {
    ...source,
    title: `${source.title} コピー`,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  delete data.id;
  const ref = await addDoc(getCollections().neta, data);
  netas.unshift(normalizeNeta(ref.id, { ...data, createdAt: Date.now(), updatedAt: Date.now() }));
  render();
  showToast("複製しました");
}

async function removeNeta(id) {
  const target = netas.find((item) => item.id === id);
  if (!target) return;
  if (!window.confirm(`「${target.title}」を削除しますか？`)) return;
  await deleteDoc(doc(db, "users", currentUser.uid, "netakiroku", id));
  netas = netas.filter((item) => item.id !== id);
  render();
  showToast("削除しました");
}

async function updateNetaStatus(id, status) {
  status = normalizeStatusValue(status);
  const target = netas.find((item) => item.id === id);
  if (!target || target.status === status) return;
  const previousStatus = target.status;
  target.status = status;
  target.updatedAt = Date.now();
  render();
  try {
    await updateDoc(doc(db, "users", currentUser.uid, "netakiroku", id), {
      status,
      updatedAt: serverTimestamp(),
    });
    showToast("ステータスを更新しました");
  } catch (error) {
    target.status = previousStatus;
    target.updatedAt = Date.now();
    render();
    showToast(`ステータスを更新できませんでした: ${error.message}`);
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (char === "\"" && next === "\"") {
        cell += "\"";
        i += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell.replace(/\r$/, ""));
  if (row.some((item) => item !== "")) rows.push(row);
  return rows;
}

function rowLooksLikeMemo(cells, index) {
  const joined = cells.join("").trim();
  return index >= 16 && /備忘録|メモ|注意|テンプレート/.test(joined);
}

async function importCsv(file) {
  if (!file || !currentUser) return;
  const text = await file.text();
  const csvRows = parseCsv(text.replace(/^\ufeff/, ""));
  let title = "";
  let pageCount = 1;
  const bodyRows = [];
  csvRows.forEach((cells, index) => {
    if (rowLooksLikeMemo(cells, index)) return;
    const [a = "", b = "", c = "", d = "", e = "", f = "", g = ""] = cells;
    if (a.trim()) title = a.trim();
    if (b.trim()) pageCount = Math.max(1, Number(b.trim()) || pageCount);
    if (!c.trim() && !d.trim() && !e.trim() && !f.trim() && !g.trim()) return;
    bodyRows.push(normalizeRow({ panel: c, actor: d, type: e, detail: f, reference: g }));
  });
  const data = {
    title: title || file.name.replace(/\.csv$/i, ""),
    pageCount,
    status: settings.statuses[0],
    category: settings.categories[0] || "",
    tags: [],
    memo: "",
    rows: bodyRows.length ? bodyRows : [normalizeRow({ panel: "1" })],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(getCollections().neta, data);
  netas.unshift(normalizeNeta(ref.id, { ...data, createdAt: Date.now(), updatedAt: Date.now() }));
  render();
  showToast("CSVを取り込みました");
}

function renderSettings() {
  renderOptionList("categories", "categoriesList");
  renderOptionList("statuses", "statusesList");
  renderOptionList("tagSuggestions", "tagSuggestionsList");
  renderOptionList("actorSuggestions", "actorSuggestionsList");
}

function renderOptionList(kind, elementId) {
  const list = document.getElementById(elementId);
  list.innerHTML = settings[kind].map((value, index) => `
    <div class="option-row" data-kind="${kind}" data-index="${index}">
      <input value="${escapeHtml(value)}" data-option-name>
      <button class="btn ghost" type="button" data-option-action="up" title="上へ"><i data-lucide="arrow-up"></i></button>
      <button class="btn ghost" type="button" data-option-action="down" title="下へ"><i data-lucide="arrow-down"></i></button>
      <button class="btn ghost danger" type="button" data-option-action="delete" title="削除"><i data-lucide="trash-2"></i></button>
    </div>
  `).join("");
}

function addOption(kind) {
  const inputId = {
    categories: "categoryOptionInput",
    statuses: "statusOptionInput",
    tagSuggestions: "tagOptionInput",
    actorSuggestions: "actorOptionInput",
  }[kind];
  const input = document.getElementById(inputId);
  const value = input.value.trim();
  if (!value) return;
  if (!settings[kind].includes(value)) settings[kind].push(value);
  input.value = "";
  saveSettings();
}

function wireEvents() {
  elements.loginButton.addEventListener("click", () => signInWithPopup(auth, new GoogleAuthProvider()).catch((error) => showToast(error.message)));
  elements.logoutButton.addEventListener("click", () => signOut(auth));
  elements.newButton.addEventListener("click", () => openEditor());
  elements.backButton.addEventListener("click", () => { setView("list"); render(); });
  elements.settingsButton.addEventListener("click", () => { setView("settings"); render(); });
  elements.settingsBackButton.addEventListener("click", () => { setView("list"); render(); });
  elements.editorForm.addEventListener("submit", saveCurrent);
  elements.addRowButton.addEventListener("click", () => {
    draftRows.push(normalizeRow({ panel: String(draftRows.length + 1) }));
    renderRows();
  });
  [elements.searchInput, elements.statusFilter, elements.categoryFilter, elements.sortSelect].forEach((item) => item.addEventListener("input", render));
  elements.statusInput.addEventListener("change", () => applyStatusSelectClass(elements.statusInput));
  elements.csvImportInput.addEventListener("change", (event) => {
    importCsv(event.target.files[0]).finally(() => { event.target.value = ""; });
  });
  elements.netaList.addEventListener("click", (event) => {
    if (event.target.closest("[data-status-select]")) event.stopPropagation();
  });
  elements.netaList.addEventListener("change", (event) => {
    const select = event.target.closest("[data-status-select]");
    if (!select) return;
    event.stopPropagation();
    updateNetaStatus(select.dataset.id, select.value);
  });
  elements.netaList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const neta = netas.find((item) => item.id === button.dataset.id);
    if (button.dataset.action === "edit") openEditor(button.dataset.id);
    if (button.dataset.action === "download" && neta) downloadCsv(neta);
    if (button.dataset.action === "copy" && neta) copyCsv(neta);
    if (button.dataset.action === "duplicate") duplicateNeta(button.dataset.id);
    if (button.dataset.action === "delete") removeNeta(button.dataset.id);
  });
  elements.rowsEditor.addEventListener("input", (event) => {
    const field = event.target.dataset.field;
    const rowEl = event.target.closest(".row-editor");
    if (!field || !rowEl) return;
    const index = Number(rowEl.dataset.index);
    draftRows[index][field] = event.target.value;
    if (field === "type") draftRows[index] = normalizeRow(draftRows[index]);
  });
  elements.rowsEditor.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-row-action]");
    if (!button) return;
    const index = Number(button.closest(".row-editor").dataset.index);
    const action = button.dataset.rowAction;
    if (action === "up" && index > 0) [draftRows[index - 1], draftRows[index]] = [draftRows[index], draftRows[index - 1]];
    if (action === "down" && index < draftRows.length - 1) [draftRows[index + 1], draftRows[index]] = [draftRows[index], draftRows[index + 1]];
    if (action === "copy") draftRows.splice(index + 1, 0, { ...draftRows[index] });
    if (action === "delete") draftRows.splice(index, 1);
    if (!draftRows.length) draftRows.push(normalizeRow({ panel: "1" }));
    renderRows();
  });
  elements.editorCopyButton.addEventListener("click", () => copyCsv(normalizeNeta(editingId || "", collectDraft())));
  elements.editorDownloadButton.addEventListener("click", () => downloadCsv(normalizeNeta(editingId || "", collectDraft())));
  document.querySelectorAll("[data-add]").forEach((button) => button.addEventListener("click", () => addOption(button.dataset.add)));
  elements.settingsView.addEventListener("change", (event) => {
    if (!event.target.matches("[data-option-name]")) return;
    const row = event.target.closest(".option-row");
    const value = event.target.value.trim();
    if (!value) return renderSettings();
    settings[row.dataset.kind][Number(row.dataset.index)] = value;
    settings[row.dataset.kind] = normalizeOptionList(settings[row.dataset.kind], []);
    saveSettings();
  });
  elements.settingsView.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-option-action]");
    if (!button) return;
    const row = button.closest(".option-row");
    const kind = row.dataset.kind;
    const index = Number(row.dataset.index);
    if (button.dataset.optionAction === "delete") settings[kind].splice(index, 1);
    if (button.dataset.optionAction === "up" && index > 0) [settings[kind][index - 1], settings[kind][index]] = [settings[kind][index], settings[kind][index - 1]];
    if (button.dataset.optionAction === "down" && index < settings[kind].length - 1) [settings[kind][index + 1], settings[kind][index]] = [settings[kind][index], settings[kind][index + 1]];
    settings.statuses = [...DEFAULT_SETTINGS.statuses];
    saveSettings();
  });
}

function initAuth() {
  if (!isConfigured()) {
    elements.syncStatus.textContent = "Firebase設定が未設定です";
    showToast("firebase-config.local.js を設定してください");
    return;
  }
  app = initializeApp(FIREBASE_CONFIG);
  auth = getAuth(app);
  db = getFirestore(app);
  wireEvents();
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (!user) {
      netas = [];
      elements.accountName.textContent = "Googleログインで同期";
      elements.accountName.hidden = true;
      elements.loginButton.hidden = false;
      elements.logoutButton.hidden = true;
      elements.settingsButton.hidden = true;
      elements.syncStatus.textContent = "未ログイン";
      setView("login");
      return;
    }
    elements.accountName.textContent = "";
    elements.accountName.hidden = true;
    elements.loginButton.hidden = true;
    elements.logoutButton.hidden = false;
    elements.settingsButton.hidden = false;
    setView("list");
    try {
      await loadRemote();
    } catch (error) {
      elements.syncStatus.textContent = "同期失敗";
      showToast(`読み込みに失敗しました: ${error.message}`);
    }
  });
}

refreshIcons();
initAuth();
