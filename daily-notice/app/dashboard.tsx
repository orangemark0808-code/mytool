"use client";

import { useEffect, useRef, useState } from "react";
import { clientRequest } from "@/lib/client-api";
import { Calendar, SquareCheck, PenLine, RefreshCw } from "lucide-react";
import type { TaskAddition } from "@/hooks/use-task-refresh";
import { useTaskRefresh } from "@/hooks/use-task-refresh";
import { useServerLink, type ServerLinkMode } from "@/hooks/use-server-link";
import { ServerLinkSettings } from "@/components/server-link-settings";
import { compareTaskNotes, newerSnapshot } from "@/lib/task-refresh.mjs";
import { TaskRefreshToast } from "@/components/task-refresh-toast";
import { SkyStrip } from "@/components/sky-strip";
import { MoonWidget } from "@/components/moon-widget";
import { MealSuggestions } from "@/components/meal-suggestions";
import { useSky } from "@/hooks/use-sky";
import {initialSnapshot} from "@/lib/snapshot-types";
import { eventOnDay, japanDate, safeSourceUrl } from "@/lib/snapshot.mjs";

type Snapshot = typeof initialSnapshot;
type Memo = { text: string; revision: number; updatedAt: string };
type Event = Snapshot["calendar"]["events"][number];
const TASKS = "https://orangemark0808-code.github.io/mytool/iroiro/";
const CALENDAR = "https://calendar.google.com/calendar/r";
const clock = (value: string) => new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
const stamp = (value: string | null) => value ? `${japanDate(value).slice(5).replace("-", "/")} ${clock(value)}` : "未取得";
const eventDay = (event: Event) => event.allDay ? event.start.slice(0, 10) : japanDate(event.start);
const eventTime = (event: Event, day: string) => event.allDay ? "終日" : `${eventDay(event) < day ? "前日から" : clock(event.start)}–${japanDate(event.end) > day ? "翌日まで" : clock(event.end)}`;

const requestJson = clientRequest;

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  const safe = safeSourceUrl(href);
  return safe ? <a href={safe} target="_blank" rel="noopener noreferrer">{children}<span aria-hidden="true"><svg className="external-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 9 9 3M3 3h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span></a> : <span>{children}</span>;
}

const NO_SERVER_LINK: ServerLinkMode = {available:false,enabled:false,canManage:false,sourceEmail:''};
export default function Dashboard({ initialMemo = null, serverLinkMode = NO_SERVER_LINK }: { initialMemo?: Memo | null; serverLinkMode?: ServerLinkMode }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(initialSnapshot);
  const [lastAdded, setLastAdded] = useState<TaskAddition | null>(null);
  const [groupName, setGroupName] = useState("");
  const [taskName, setTaskName] = useState("");
  const pendingAddition = useRef<TaskAddition | null>(null);
  const taskRefresh = useTaskRefresh(value => setSnapshot(current => newerSnapshot(current, value)), addition => {
    setLastAdded(addition);
    setSnapshot(current => {
      const notes: Array<Snapshot["tasks"]["notes"][number] & { updatedAt?: string | null }> = current.tasks.notes.map(note => ({ ...note, items: [...note.items] }));
      const matching = notes.filter(note => note.title.trim() === addition.group).sort((a,b) => (Date.parse(b.updatedAt || "") || 0) - (Date.parse(a.updatedAt || "") || 0));
      const item = { text: addition.text, checked: false };
      if (matching[0]) matching[0].items.push(item);
      else notes.push({ title: addition.group, status: "todo", priority: "normal", dueDate: "", updatedAt: new Date().toISOString(), items: [item] });
      return { ...current, tasks: { ...current.tasks, notes, lastAttemptAt: new Date().toISOString() } };
    });
  }, {autoStart:!serverLinkMode.enabled});
  const serverLink = useServerLink(serverLinkMode, tasks => setSnapshot(current => newerSnapshot(current,{...current,date:tasks.date,tasks})), taskRefresh.refreshing);
  const [showServerSetup,setShowServerSetup] = useState(false);
  const canAddTask = serverLinkMode.enabled ? serverLink.connected : taskRefresh.connected;
  const readingTasks = serverLinkMode.enabled ? serverLink.busy : taskRefresh.refreshing;
  const refreshTasks = () => serverLinkMode.enabled ? serverLink.refresh() : taskRefresh.refresh();
  async function addTask(event: React.FormEvent) {
    event.preventDefault();
    const group = groupName.trim(), text = taskName.trim();
    if (!group || !text || taskRefresh.refreshing || !canAddTask) return;
    if (pendingAddition.current?.group !== group || pendingAddition.current?.text !== text)
      pendingAddition.current = { group, text, operationId: crypto.randomUUID() };
    setLastAdded(null);
    if (await (serverLinkMode.enabled ? taskRefresh.addFromWindow(pendingAddition.current,serverLinkMode.sourceEmail) : taskRefresh.add(pendingAddition.current))) {
      setGroupName(""); setTaskName(""); pendingAddition.current = null;
    }
  }
  const [today, setToday] = useState(initialSnapshot.date);
  const sky = useSky(setToday);
  const [snapshotError, setSnapshotError] = useState("");
  const [memo, setMemo] = useState<Memo | null>(initialMemo);
  const [text, setText] = useState(initialMemo?.text ?? "");
  const [memoError, setMemoError] = useState("");
  const [memoMessage, setMemoMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingMemo, setLoadingMemo] = useState(false);
  const [remoteMemo, setRemoteMemo] = useState<Memo | null>(null);
  const dirty = memo !== null && memo.text !== text;
  const [activeNav, setActiveNav] = useState("schedule");

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const sections = ["schedule", "tasks", "meals", "memo"].map(id => ({ id, top: document.getElementById(id)?.getBoundingClientRect().top ?? Infinity }));
      if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        setActiveNav("memo");
        return;
      }
      const passed = sections.filter(section => section.top <= window.innerHeight * .3);
      if (!passed.length) return;
      const nearest = Math.max(...passed.map(section => section.top));
      const candidates = passed.filter(section => Math.abs(section.top - nearest) < 2);
      setActiveNav(current => candidates.some(section => section.id === current) ? current : candidates[0].id);
    };
    const scheduleUpdate = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    update();
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let snapshotRequest = 0;
    const update = async () => {
      const requestId = ++snapshotRequest;
      setToday(japanDate());
      try {
        const data = await requestJson<{ snapshot: Snapshot }>("/api/snapshot", { signal: controller.signal });
        if (!controller.signal.aborted && requestId === snapshotRequest) { setSnapshot(current => newerSnapshot(current, data.snapshot)); setSnapshotError(""); }
      } catch (error) {
        if (!controller.signal.aborted && requestId === snapshotRequest) setSnapshotError(error instanceof Error ? error.message : "取得できませんでした。");
      }
    };
    void update();
    if (!initialMemo) void requestJson<Memo>("/api/memo", { signal: controller.signal }).then((data: Memo) => {
      if (!controller.signal.aborted) { setMemo(data); setText(data.text); }
    }).catch(error => { if (!controller.signal.aborted) setMemoError(error.message); });
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void update(); }, 60000);
    const onVisible = () => { if (document.visibilityState === "visible") void update(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { controller.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [initialMemo]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  async function save(revision = memo?.revision) {
    if (saving || revision === undefined) return;
    const submitted = text;
    setSaving(true); setMemoError(""); setMemoMessage("");
    try {
      const result = await requestJson<Memo>("/api/memo", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: submitted, revision }),
      });
      // Keep edits typed during this request; only the submitted version is saved.
      setMemo(result); setRemoteMemo(null); setMemoMessage("保存しました。");
    } catch (error) { setMemoError(error instanceof Error ? error.message : "保存できませんでした。入力内容は残しています。"); }
    finally { setSaving(false); }
  }

  async function checkSaved() {
    if (saving || loadingMemo) return;
    setLoadingMemo(true); setMemoError("");
    try {
      const result = await requestJson<Memo>("/api/memo");
      if (!memo) { setMemo(result); setText(result.text); }
      else setRemoteMemo(result);
    } catch (error) { setMemoError(error instanceof Error ? error.message : "読み込めませんでした。"); }
    finally { setLoadingMemo(false); }
  }

  const calendarDay = snapshot.calendar.date;
  const calendarOld = calendarDay !== today;
  const tasksOld = snapshot.tasks.date !== today;
  const events = snapshot.calendar.events.filter(event => eventOnDay(event, calendarDay)).sort((a, b) => a.start.localeCompare(b.start));
  const upcoming = snapshot.calendar.events.filter(event => eventDay(event) > calendarDay).sort((a, b) => a.start.localeCompare(b.start));
  const tasks = snapshot.tasks.notes.filter(note => note.status !== "done").sort(compareTaskNotes);
  const overdue = tasks.filter(note => note.dueDate && note.dueDate < snapshot.tasks.date).length;
  const dueToday = tasks.filter(note => note.dueDate === snapshot.tasks.date).length;
  const noDue = tasks.filter(note => !note.dueDate).length;
  const checklistCount = tasks.reduce((count, note) => count + note.items.length, 0);
  const completedCount = tasks.reduce((count, note) => count + note.items.filter(item => item.checked).length, 0);
  const formattedDate = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "long", day: "numeric", weekday: "short" }).format(new Date(`${today}T12:00:00+09:00`));

  return <div className="board">
    <header className="site-header">
      <div className="title-lockup"><a className="wordmark" href={import.meta.env.BASE_URL} onClick={event => { if (dirty && !window.confirm("未保存のメモがあります。ページを読み込み直しますか？")) event.preventDefault(); }}><h1>今日のお知らせ</h1></a><span className="badge" aria-label="バージョン 2026-10-31-01">2026-10-31-01</span></div>
      <MoonWidget sky={sky} />
      <div className="header-tools"><nav aria-label="表示する項目">{[["schedule", "予定"], ["tasks", "タスク"], ["meals", "メニュー"], ["memo", "メモ"]].map(([id, label]) => <a key={id} href={`#${id}`} aria-current={activeNav === id ? "location" : undefined} onClick={() => setActiveNav(id)}>{label}</a>)}</nav>
        <p className="fetch-meta"><span>FETCHED</span> {snapshot.calendar.lastSuccessAt === snapshot.tasks.lastSuccessAt ? stamp(snapshot.calendar.lastSuccessAt) : `予定 ${stamp(snapshot.calendar.lastSuccessAt)} / タスク ${stamp(snapshot.tasks.lastSuccessAt)}`}</p></div>
    </header>
    <main>
      <div id="account-settings-slot" />
      <ServerLinkSettings mode={serverLinkMode} link={serverLink} open={showServerSetup} onOpenChange={setShowServerSetup}/>
      <div className="overview">
        <div><p className="day"><span className="date-pill">{formattedDate}</span><span>日本時間</span></p></div>
        <SkyStrip sky={sky} />
        <p className="counts"><span className={events.length ? "" : "is-zero"}>{calendarOld ? "前回の予定" : "今日の予定"} <strong>{snapshot.calendar.lastSuccessAt ? events.length : "—"}</strong></span><span className={tasks.length ? "has-tasks" : "is-zero"}>未完了 <strong>{snapshot.tasks.lastSuccessAt ? tasks.length : "—"}</strong></span><span className={overdue ? "overdue" : "is-zero"}>期限切れ <strong>{snapshot.tasks.lastSuccessAt ? overdue : "—"}</strong></span></p>
      </div>
      {snapshotError && <p className="notice" role="status">{snapshotError} 前回の取得内容を表示しています。</p>}
      <div className="daily-grid">
        <section className="panel" id="schedule" aria-labelledby="schedule-title">
          <div className="panel-title"><h2 className="section-label" id="schedule-title"><Calendar className="card-icon" size={18} color="currentColor" strokeWidth={2} fill="none" aria-hidden="true" focusable="false" /><span>今日の予定<small>TODAY</small></span></h2><span className="source-label"><ExternalLink href={CALENDAR}>Google Calendar</ExternalLink></span></div>
          {(calendarOld || snapshot.calendar.error) && <p className="notice">{calendarDay}取得分です。最新の予定はカレンダーで確認してください。</p>}
          <div className="schedule-list">
            {events.length ? events.map((event, index) => <article className="event-row" key={`${event.id}-${index}`}><time>{event.allDay ? "終日" : eventDay(event) < calendarDay ? "継続" : clock(event.start)}</time><div><h3><ExternalLink href={event.url}>{event.title}</ExternalLink></h3><p className="muted">{eventTime(event, calendarDay)}</p></div></article>) : <p className="empty">{snapshot.calendar.lastSuccessAt ? "今日は予定がありません" : "予定は未取得です。"}</p>}
            <details className="future" open><summary>この先の予定 <span>{upcoming.length}件</span></summary><div className="upcoming-list">{upcoming.length ? upcoming.map((event, index) => <article key={`${event.id}-${index}`}><time>{eventDay(event).slice(5).replace("-", "/")}</time><div><ExternalLink href={event.url}>{event.title}</ExternalLink><p className="muted">{eventTime(event, eventDay(event))}</p></div></article>) : <p className="empty">取得済みの予定はありません。</p>}</div></details>
          </div>
        </section>
        <section className="panel" id="tasks" aria-labelledby="tasks-title">
          <div className="panel-title"><h2 className="section-label" id="tasks-title"><SquareCheck className="card-icon" size={18} color="currentColor" strokeWidth={2} fill="none" aria-hidden="true" focusable="false" /><span>やること<small>TASKS</small></span></h2><div className="task-source-actions"><span className="source-label"><ExternalLink href={TASKS}>イロイロキロク</ExternalLink></span><button className="task-refresh-button" type="button" disabled={readingTasks||taskRefresh.refreshing} aria-label="イロイロキロクからタスクを更新" aria-busy={readingTasks} onClick={refreshTasks}><RefreshCw size={13} strokeWidth={2} aria-hidden="true" />{readingTasks ? "更新中…" : "更新"}</button></div></div>
          {(tasksOld || snapshot.tasks.error) && <p className="notice">{snapshot.tasks.date}取得分です。最新の状態はイロイロキロクで確認してください。</p>}
          <form className="task-add-form" onSubmit={event => void addTask(event)}>
            <div className="task-add-fields">
              <label>グループ名<input list="task-group-options" value={groupName} onChange={event => setGroupName(event.target.value)} maxLength={200} required disabled={!canAddTask || taskRefresh.refreshing} placeholder="選択または入力" autoComplete="off" /></label>
              <datalist id="task-group-options">{[...new Set(snapshot.tasks.notes.map(note => note.title.trim()).filter(Boolean))].map(name => <option value={name} key={name} />)}</datalist>
              <label>タスク名<input value={taskName} onChange={event => setTaskName(event.target.value)} maxLength={2000} required disabled={!canAddTask || taskRefresh.refreshing} placeholder="追加するタスク" /></label>
              <button type="submit" disabled={!canAddTask || taskRefresh.refreshing || !groupName.trim() || !taskName.trim()}>追加</button>
            </div>
            {!serverLinkMode.enabled && !taskRefresh.connected && <p className="task-add-help">接続すると最新の取得・追加ができます。<button type="button" className="text-button" disabled={taskRefresh.refreshing} onClick={taskRefresh.connect}>接続して取得</button></p>}
            {serverLinkMode.enabled && <p className="task-add-help">タスクはイロイロキロクへ保存されます。</p>}
            {lastAdded && <p className="task-add-help" role="status">追加しました：{lastAdded.group} / {lastAdded.text}</p>}
            {taskRefresh.additionError && <p className="task-add-help" role="alert">{taskRefresh.additionError}</p>}
          </form>
          <div className="task-overview"><p>今日まで {dueToday}件 · 期限なし {noDue}件</p><p>{completedCount} / {checklistCount} 項目完了</p></div>
          <div className="task-list">
            {tasks.length ? tasks.map((note, index) => {
              const checked = note.items.filter(item => item.checked).length;
              const pending = note.items.find(item => !item.checked);
              return <details className="task" key={index}><summary><span className="task-text"><span className="task-name">{note.title || "題名なし"}</span>{pending && <span className="task-preview"><span className="task-check" aria-hidden="true" />{pending.text}</span>}</span><span className="task-info"><span>{note.items.length ? `${checked}/${note.items.length}` : note.status === "doing" ? "進行中" : "未着手"}</span></span></summary>
                <div className="task-detail"><div className="task-meta"><span className="task-state">{note.status === "doing" ? "進行中" : "未着手"}</span><p className="task-attributes">優先度：{({ high: "高", normal: "通常", low: "低" } as Record<string, string>)[note.priority]} · <span className={note.dueDate && note.dueDate < snapshot.tasks.date ? "overdue" : ""}>{note.dueDate || "期限なし"}</span></p></div><ul>{note.items.map((item, i) => <li key={i} className={item.checked ? "completed" : ""}><span className={`task-check${item.checked ? " is-checked" : ""}`} aria-hidden="true">{item.checked ? "✓" : ""}</span>{item.text}</li>)}</ul></div>
              </details>;
            }) : <p className="empty">{snapshot.tasks.lastSuccessAt ? "未完了のタスクはありません。" : "タスクは未取得です。"}</p>}
          </div>
        </section>
        <MealSuggestions today={today} externalFood={serverLinkMode.enabled?{stock:serverLink.stock,busy:serverLink.busy,error:serverLink.error||(serverLink.needsConnection?"サーバー接続を確認してください。":""),authNeeded:serverLink.needsConnection,manualMode:false,refresh:serverLink.refresh,connect:async()=>{setShowServerSetup(true);return false;}}:undefined}/>
        <section className="panel memo-panel" id="memo" aria-labelledby="memo-title">
          <div className="panel-title"><div className="memo-heading"><h2 id="memo-title"><PenLine className="card-icon" size={18} color="currentColor" strokeWidth={2} fill="none" aria-hidden="true" focusable="false" /><span>メモ<small>MEMO</small></span></h2><span className="memo-state" role="status" aria-live="polite">{saving ? "保存中…" : dirty ? "未保存の変更があります" : memo ? "保存済み" : "読込中…"}</span></div><div className="memo-actions">{(dirty || saving) && <button className="save-button" type="button" disabled={!memo || !dirty || saving || loadingMemo} onClick={() => void save()}>{saving ? "保存中…" : "保存"}</button>}</div></div>
          <label className="sr-only" htmlFor="memo-input">Memoの内容</label>
          <textarea aria-describedby="memo-help" id="memo-input" className="memo-input" rows={2} value={text} disabled={!memo || loadingMemo} maxLength={20000} onChange={event => { setText(event.target.value); setMemoMessage(""); }} placeholder={memo ? "覚えておきたいことを書いてください…" : "メモを読み込んでいます…"} />
          {memoError && <p className="notice error" role="alert">{memoError}</p>}
          {!dirty && memoMessage && <p className="save-confirmation" role="status">{memoMessage}</p>}
          {remoteMemo && <div className="compare"><h3>サーバーに保存されている内容</h3><pre>{remoteMemo.text || "（空のメモ）"}</pre><p className="muted">入力欄の内容は残しています。内容を確認して保存してください。</p><div className="compare-actions"><button type="button" disabled={saving} onClick={() => void save(remoteMemo.revision)}>入力欄の内容で保存する</button><button type="button" disabled={saving} onClick={() => { if (dirty && !window.confirm("入力中の内容を破棄して、表示中の保存内容に戻しますか？")) return; setMemo(remoteMemo); setText(remoteMemo.text); setRemoteMemo(null); setMemoMessage(""); }}>保存内容に戻す</button></div></div>}
          <p className="memo-help" id="memo-help">直接入力して編集できます</p>
          <div className="memo-bottom"><span>{memo ? `保存 ${stamp(memo.updatedAt)} · ${text.length.toLocaleString()} / 20,000文字` : ""}</span><button className="text-button" type="button" disabled={saving || loadingMemo} onClick={() => void checkSaved()}>{loadingMemo ? "確認中…" : memo ? "最新の保存内容を確認" : "読み込みを再試行"}</button></div>
        </section>

      </div>
      <footer className="site-footer"><span>予定・タスクは最終取得時点の情報です。</span></footer>
    </main>
    <TaskRefreshToast notice={taskRefresh.refreshing?taskRefresh.notice:serverLinkMode.enabled?serverLink.notice||taskRefresh.notice:taskRefresh.notice} connect={serverLinkMode.enabled?()=>setShowServerSetup(true):taskRefresh.connect} retry={refreshTasks} dismiss={()=>{taskRefresh.dismiss();serverLink.dismiss();}} />
  </div>;
}
