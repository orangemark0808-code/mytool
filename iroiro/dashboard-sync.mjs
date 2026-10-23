// Read-only bridge. Ship alongside iroiro/index.html; keep the existing app intact.
const targetOrigin = "https://daily-notice.ohana888.chatgpt.site";
const parameters = new URLSearchParams(location.hash.slice(1));
const requestId = parameters.get("requestId");
const status = document.getElementById("status");
const login = document.getElementById("login");
document.getElementById("close").onclick = () => window.close();

async function main() {
  if (!window.opener || parameters.get("targetOrigin") !== targetOrigin ||
      !/^[a-f0-9-]{36}$/.test(requestId || "")) {
    status.textContent = "今日のお知らせの「更新」ボタンから開いてください。";
    return;
  }
  history.replaceState(null, "", location.pathname);
  const fail = () => {
    status.textContent = "取得できませんでした。イロイロキロクのログイン状態とインターネット接続を確認して、もう一度更新してください。";
    window.opener?.postMessage({ type: "iroiro-tasks-result", requestId, error: true }, targetOrigin);
  };
  try {
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
    const db = firestore.getFirestore(app);
    let reading = false;
    const read = async () => {
      if (reading || !auth.currentUser) return;
      reading = true; login.hidden = true;
      status.textContent = "最新のタスクを取得しています…";
      const uid = auth.currentUser.uid;
      const fetchedAt = new Date().toISOString();
      const settings = await firestore.getDocFromServer(firestore.doc(db, "users", uid, "iroiroSettings", "main"));
      const categories = settings.exists() ? settings.data().categories : null;
      const matches = Array.isArray(categories) ? categories.filter(item => typeof item?.name === "string" && item.name.trim() === "タスク" && typeof item.id === "string") : [];
      if (matches.length !== 1) throw new Error("task-category-not-unique");
      // Do not load any notes from other categories or allow cache-only success.
      const result = await firestore.getDocsFromServer(firestore.query(
        firestore.collection(db, "users", uid, "iroiroNotes"),
        firestore.where("categoryId", "==", matches[0].id), firestore.limit(501),
      ));
      if (result.size > 500 || auth.currentUser?.uid !== uid) throw new Error("invalid-result");
      const notes = result.docs.map(document => {
        const data = document.data();
        const task = taskModule.normalizeTask(data.task || { items: data.type === "text" ? [] : data.items });
        return { title: String(data.title || ""), status: task.status, priority: task.priority, dueDate: task.dueDate,
          items: task.items.map(item => ({ text: item.text, checked: item.checked })) };
      });
      if (new TextEncoder().encode(JSON.stringify({ fetchedAt, notes })).byteLength > 490000) throw new Error("too-large");
      status.textContent = "今日のお知らせへ反映しています…";
      window.opener.postMessage({ type: "iroiro-tasks-result", requestId, fetchedAt, notes }, targetOrigin);
    };
    window.addEventListener("message", event => {
      if (event.origin !== targetOrigin || event.source !== window.opener || event.data?.requestId !== requestId) return;
      if (event.data.type === "iroiro-tasks-failed") {
        status.textContent = "反映できませんでした。この画面を閉じ、今日のお知らせからもう一度更新してください。";
        return;
      }
      if (event.data.type !== "iroiro-tasks-saved") return;
      status.textContent = "タスクを更新しました。この画面を閉じて戻れます。";
      window.close();
    });
    await auth.authStateReady();
    if (auth.currentUser) await read();
    else {
      status.textContent = "イロイロキロクで使用しているアカウントでログインしてください。";
      login.hidden = false;
      login.onclick = async () => {
        login.disabled = true;
        try { await authModule.signInWithPopup(auth, new authModule.GoogleAuthProvider()); await read(); }
        catch { fail(); }
        finally { login.disabled = false; }
      };
    }
  } catch { fail(); }
}

void main();
