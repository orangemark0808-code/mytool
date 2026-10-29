import { appendTask } from './task-add.mjs?v=2026-10-25-03';
import { readFoodInventory } from './food-read.mjs?v=2026-10-29-09';
// Same-origin browser-only authentication bridge. No Firebase credentials are
// sent to the dashboard origin or its server; only selected task fields leave.
const targetOrigin = "https://daily-notice.ohana888.chatgpt.site";
const params = new URLSearchParams(location.hash.slice(1));
const mode = params.get("mode") || "legacy";
const requestId = params.get("requestId");
const validId = value => typeof value === "string" && /^[a-f0-9-]{36}$/.test(value);
const status = document.getElementById("status");
const login = document.getElementById("login");
document.getElementById("close").onclick = () => window.close();
let clientPromise;

function client() {
  if (!clientPromise) clientPromise = (async () => {
    const config = window.IROIRO_FIREBASE_CONFIG;
    if (!config?.apiKey || !config?.projectId || !config?.appId) throw new Error("missing-config");
    const [appModule, authModule, firestore, taskModule] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"),
      import("./task-core.mjs?v=2026.10.23-1"),
    ]);
    const app = appModule.initializeApp(config);
    const auth = authModule.getAuth(app);
    await auth.authStateReady();
    return { auth, authModule, firestore, taskModule, db: firestore.getFirestore(app) };
  })().catch(error => { clientPromise = null; throw error; });
  return clientPromise;
}

async function readTasks() {
  const { auth, firestore, taskModule, db } = await client();
  if (!auth.currentUser) throw Object.assign(new Error("auth-required"), { code: "auth/no-current-user" });
  const uid = auth.currentUser.uid, fetchedAt = new Date().toISOString();
  const settings = await firestore.getDocFromServer(firestore.doc(db, "users", uid, "iroiroSettings", "main"));
  const categories = settings.exists() ? settings.data().categories : null;
  const matches = Array.isArray(categories) ? categories.filter(item => typeof item?.name === "string" && item.name.trim() === "タスク" && typeof item.id === "string") : [];
  if (matches.length !== 1) throw new Error("task-category-not-unique");
  const result = await firestore.getDocsFromServer(firestore.query(
    firestore.collection(db, "users", uid, "iroiroNotes"),
    firestore.where("categoryId", "==", matches[0].id), firestore.limit(501),
  ));
  if (result.size > 500 || auth.currentUser?.uid !== uid) throw new Error("invalid-result");
  const notes = result.docs.map(document => {
    const data = document.data();
    const task = taskModule.normalizeTask(data.task || { items: data.type === "text" ? [] : data.items });
    const updatedAt = data.updatedAt?.toDate?.();
    return { title: String(data.title || ""), status: task.status, priority: task.priority, dueDate: task.dueDate,
      updatedAt: updatedAt instanceof Date && Number.isFinite(updatedAt.getTime()) ? updatedAt.toISOString() : null,
      items: task.items.map(item => ({ text: item.text, checked: item.checked })) };
  });
  if (new TextEncoder().encode(JSON.stringify({ fetchedAt, notes })).byteLength > 490000) throw new Error("too-large");
  return { fetchedAt, notes };
}
const authError = error => String(error?.code || "").startsWith("auth/") || ["permission-denied", "unauthenticated"].includes(error?.code);

function background() {
  const cancelled = new Set();
  let reading = false, authorizing = false;
  const send = (id, value, resource="tasks") => {
    if (!cancelled.has(id)) window.parent.postMessage({ type: resource==="foods"?"iroiro-foods-result":"iroiro-tasks-result", requestId: id, ...value }, targetOrigin);
  };
  const read = async (id,addition=null,resource="tasks") => {
    if (reading || authorizing) { send(id, { error: "busy" },resource); return; }
    reading = true;
    let added=false;
    try {
      if(addition){await appendTask(await client(),addition);added=true;}
      const data=resource==="foods"?await readFoodInventory(await client()):await readTasks();
      send(id,{...data,added,operationId:addition?.operationId},resource);
    }
    catch (error) { send(id, { added,operationId:addition?.operationId,error: authError(error) ? "auth-required" : resource==="foods"?error.message:addition ? error.message : "read-failed" },resource); }
    finally { reading = false; }
  };
  window.addEventListener("message", event => {
    if (event.origin !== targetOrigin || event.source !== window.parent || !validId(event.data?.requestId)) return;
    const id = event.data.requestId;
    if (event.data.type === "iroiro-cancel") {
      cancelled.add(id); if (cancelled.size > 30) cancelled.delete(cancelled.values().next().value);
      return;
    }
    if (cancelled.has(id)) return;
    if (event.data.type === "iroiro-background-ping") { window.parent.postMessage({type:"iroiro-background-ready",requestId:id},targetOrigin);return; }
    if (event.data.type === "iroiro-foods-request") { void read(id,null,"foods"); return; }
    if (event.data.type === "iroiro-tasks-request") { void read(id); return; }
    if (event.data.type === "iroiro-task-add") { void read(id,event.data.addition); return; }
    if (event.data.type !== "iroiro-auth-channel" || !event.ports[0]) return;
    const resource=event.data.resource==="foods"?"foods":"tasks";
    const port = event.ports[0]; let used = false;
    port.onmessage = async message => {
      if (used || cancelled.has(id)) { port.close(); return; }
      used = true;
      const credential = message.data;
      if (reading || authorizing || credential?.type !== "google-credential" || credential.requestId !== id ||
          typeof credential.idToken !== "string" || credential.idToken.length > 20000 ||
          typeof credential.uid !== "string" || credential.uid.length > 128) {
        port.postMessage({ type: "failed", requestId: id }); port.close(); return;
      }
      authorizing = true;
      try {
        const { auth, authModule } = await client();
        if (cancelled.has(id)) return;
        const result = await authModule.signInWithCredential(auth, authModule.GoogleAuthProvider.credential(credential.idToken));
        if (result.user.uid !== credential.uid) { await authModule.signOut(auth); throw new Error("account-mismatch"); }
        if (cancelled.has(id)) return;
        port.postMessage({ type: "authorized", requestId: id });
        authorizing = false;
        await read(id,null,resource);
      } catch {
        port.postMessage({ type: "failed", requestId: id }); send(id, { error: "auth-required" },resource);
      } finally { authorizing = false; port.close(); }
    };
    port.start();
  });
  window.parent.postMessage({ type: "iroiro-background-ready" }, targetOrigin);
}

async function authorize() {
  let port = null, ready = false;
  login.hidden = false; login.disabled = true; login.textContent = "Googleで接続する";
  status.textContent = "バックグラウンド更新のために、イロイロキロクのアカウントを確認します。";
  const fail = () => {
    status.textContent = "接続できませんでした。閉じて、今日のお知らせからもう一度接続してください。";
    window.opener?.postMessage({ type: "iroiro-auth-error", requestId }, targetOrigin);
  };
  window.addEventListener("message", event => {
    if (event.origin !== targetOrigin || event.source !== window.opener || event.data?.type !== "iroiro-auth-channel" ||
        event.data.requestId !== requestId || !event.ports[0] || port) return;
    port = event.ports[0]; login.disabled = !ready;
    port.onmessage = event => {
      if (event.data?.requestId !== requestId) return;
      if (event.data.type === "authorized") {
        window.opener?.postMessage({ type: "iroiro-auth-complete", requestId }, targetOrigin);
        status.textContent = "接続しました。これからはバックグラウンドで更新します。";
        port.close(); window.close();
      } else if (event.data.type === "failed") fail();
    };
    port.start();
  });
  window.opener.postMessage({ type: "iroiro-auth-ready", requestId }, targetOrigin);
  try {
    const { auth, authModule } = await client();
    ready = true; login.disabled = !port;
    login.onclick = async () => {
      if (!port) return;
      login.disabled = true;
      try {
        const provider = new authModule.GoogleAuthProvider();
        if (auth.currentUser?.email) provider.setCustomParameters({ login_hint: auth.currentUser.email });
        // Confirm the existing source account instead of silently switching it.
        const result = auth.currentUser
          ? await authModule.reauthenticateWithPopup(auth.currentUser, provider)
          : await authModule.signInWithPopup(auth, provider);
        const credential = authModule.GoogleAuthProvider.credentialFromResult(result);
        if (!credential?.idToken) throw new Error("missing-credential");
        // Only the two same-GitHub-origin pages see this port payload. The Site
        // receives no token and cannot access the transferred endpoints.
        port.postMessage({ type: "google-credential", requestId, idToken: credential.idToken, uid: result.user.uid });
        status.textContent = "接続しています…";
      } catch { fail(); }
    };
  } catch { fail(); }
}

async function legacy() {
  const send = async () => {
    status.textContent = "最新のタスクを取得しています…";
    window.opener.postMessage({ type: "iroiro-tasks-result", requestId, ...await readTasks() }, targetOrigin);
  };
  try {
    const { auth, authModule } = await client();
    window.addEventListener("message", event => {
      if (event.origin === targetOrigin && event.source === window.opener && event.data?.requestId === requestId && event.data.type === "iroiro-tasks-saved") window.close();
    });
    if (auth.currentUser) await send();
    else {
      status.textContent = "イロイロキロクのアカウントでログインしてください。";
      login.hidden = false;
      login.onclick = async () => {
        try { await authModule.signInWithPopup(auth, new authModule.GoogleAuthProvider()); await send(); }
        catch { window.opener?.postMessage({ type: "iroiro-tasks-result", requestId, error: true }, targetOrigin); }
      };
    }
  } catch { window.opener?.postMessage({ type: "iroiro-tasks-result", requestId, error: true }, targetOrigin); }
}

// Restored iframe history can omit the startup hash. Embedded documents still
// accept requests only from the exact parent origin/window and a valid ID.
if (window.parent !== window) {
  background();
} else if (params.get("targetOrigin") !== targetOrigin ||
    (mode === "background" ? window.parent === window : !window.opener || !validId(requestId))) {
  status.textContent = "今日のお知らせの「更新」ボタンから開いてください。";
} else {
  history.replaceState(null, "", location.pathname);
  if (mode === "background") background();
  else if (mode === "authorize") void authorize();
  else void legacy();
}
