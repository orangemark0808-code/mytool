const STORAGE_KEY = 'pomodoro_state';
const SETTINGS_KEY = 'pomodoro_settings';
const DEFAULT_WORK_MIN = 50;
const DEFAULT_BREAK_MIN = 10;
const APP_VERSION = '2026-07-26-06';
const DEFAULT_SET_COUNT = 3;
let WORK_SECONDS = DEFAULT_WORK_MIN * 60;
let BREAK_SECONDS = DEFAULT_BREAK_MIN * 60;
let SET_COUNT = DEFAULT_SET_COUNT;
let mode = 'work';
let totalSeconds = WORK_SECONDS;
let remaining = WORK_SECONDS;
let running = false;
let completedSets = 0;
let completed = false;
let intervalId = null;
let startTimestamp = null;
let remainingAtStart = null;
let swRegistration = null;
let progressEl = null;
let timerEndedLock = false;
let soundLooping = false;
let soundCtx = null;
let soundLoopTimer = null;
let completionNoticeTimer = null;
let backgroundFeedbackTimer = null;
let bannerTimer = null;
let lastSoundResult = '未初期化';
let lastSoundKind = '未実行';
let activeOscillators = [];
let lastOsNotificationResult = '未実行';
let lastTimerEndKind = '未実行';
let serviceWorkerState = '未登録';
let serviceWorkerReady = false;
let lastOsNotificationError = 'なし';
let lastAppNotificationKind = '未実行';
let audioUnlocked = false;
let lastAudioResumeResult = '未実行';
const CIRCLE_R = 108;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R;
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isIosPwa = ('standalone' in navigator) && !!navigator.standalone;
const notifSupported = ('Notification' in window) && ('serviceWorker' in navigator) && !(isIos && !isIosPwa);

function loadSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (!settings) return;
    const workMin = parseInt(settings.workMin, 10);
    const breakMin = parseInt(settings.breakMin, 10);
    const setCount = parseInt(settings.setCount, 10);
    if (workMin >= 1 && workMin <= 180) WORK_SECONDS = workMin * 60;
    if (breakMin >= 1 && breakMin <= 60) BREAK_SECONDS = breakMin * 60;
    if (setCount >= 1 && setCount <= 99) SET_COUNT = setCount;
  } catch (error) {}
}
function saveSettings(workMin, breakMin, setCount) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ workMin, breakMin, setCount })); } catch (error) {} }
function setTabLabels() { document.getElementById('tabWork').textContent = `作業 ${WORK_SECONDS / 60}分`; document.getElementById('tabBreak').textContent = `休憩 ${BREAK_SECONDS / 60}分`; }
function applySettings() {
  const workMin = parseInt(document.getElementById('inputWork').value, 10);
  const breakMin = parseInt(document.getElementById('inputBreak').value, 10);
  const setCount = parseInt(document.getElementById('inputSets').value, 10);
  if (!Number.isInteger(workMin) || workMin < 1 || workMin > 180 || !Number.isInteger(breakMin) || breakMin < 1 || breakMin > 60 || !Number.isInteger(setCount) || setCount < 1 || setCount > 99) return;
  stopTimer({ stopAudio: true }); clearEndFeedback();
  WORK_SECONDS = workMin * 60; BREAK_SECONDS = breakMin * 60; SET_COUNT = setCount;
  if (completedSets >= SET_COUNT) { completedSets = 0; completed = false; mode = 'work'; }
  totalSeconds = mode === 'work' ? WORK_SECONDS : BREAK_SECONDS; remaining = totalSeconds;
  document.getElementById('startBtn').textContent = '開始'; document.getElementById('logText').textContent = '';
  saveSettings(workMin, breakMin, setCount); setTabLabels(); updateModeUI(); updateDisplay(); saveState();
}
function saveState() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, totalSeconds, remaining, running, completedSets, startTimestamp, remainingAtStart, completed })); } catch (error) {} }
function loadState() {
  try {
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (!state) return false;
    mode = state.mode === 'break' ? 'break' : 'work'; totalSeconds = Number.isFinite(state.totalSeconds) ? state.totalSeconds : (mode === 'work' ? WORK_SECONDS : BREAK_SECONDS);
    remaining = Number.isFinite(state.remaining) ? state.remaining : totalSeconds; running = state.running === true;
    const legacySessions = Number.isInteger(state.sessions) ? state.sessions : 0;
    completedSets = Number.isInteger(state.completedSets) ? state.completedSets : legacySessions;
    completedSets = Math.max(0, Math.min(completedSets, SET_COUNT)); completed = state.completed === true || completedSets >= SET_COUNT;
    startTimestamp = Number.isFinite(state.startTimestamp) ? state.startTimestamp : null; remainingAtStart = Number.isFinite(state.remainingAtStart) ? state.remainingAtStart : null;
    return true;
  } catch (error) { return false; }
}
async function registerSW() {
  if (!('serviceWorker' in navigator)) { serviceWorkerState = '未登録'; return; }
  try {
    await navigator.serviceWorker.register('./sw.js');
    swRegistration = await navigator.serviceWorker.ready;
    await swRegistration.update();
    serviceWorkerReady = true;
    serviceWorkerState = swRegistration.active ? '登録済み' : '待機中';
    navigator.serviceWorker.addEventListener('message', event => { if (event.data.type === 'TIMER_ENDED' && document.visibilityState === 'visible') onTimerEnd({ osNotified: true, isFinalBreak: event.data.isFinalBreak === true }); });
  } catch (error) { serviceWorkerState = 'エラー'; serviceWorkerReady = false; lastOsNotificationError = `${error.name}: ${error.message}`; console.warn('ServiceWorker登録失敗:', error); }
}
function scheduleSwNotification(delaySec) { try { const worker = swRegistration && swRegistration.active; if (worker) worker.postMessage({ type: 'SCHEDULE', delay: delaySec * 1000, isWork: mode === 'work', isFinalBreak: mode === 'break' && completedSets === SET_COUNT - 1, setCount: SET_COUNT }); } catch (error) {} }
function cancelSwNotification() { try { const worker = swRegistration && swRegistration.active; if (worker) worker.postMessage({ type: 'CANCEL' }); } catch (error) {} }
async function showOsNotification(kind, isTest = false) {
  if (!notifSupported || Notification.permission !== 'granted') { lastOsNotificationResult = '失敗'; lastOsNotificationError = '通知権限がありません'; updateNotificationStatus(); return false; }
  try {
    const registration = swRegistration || await navigator.serviceWorker.ready;
    swRegistration = registration; serviceWorkerReady = true; serviceWorkerState = registration.active ? '登録済み' : '待機中';
    const content = isTest ? { title: 'ポモドーロタイマー', body: '通知テストです' } : kind === 'complete' ? { title: 'ポモドーロタイマー', body: SET_COUNT + 'セット完了しました' } : kind === 'work' ? { title: 'ポモドーロタイマー', body: '作業時間が終了しました\\n休憩を開始します' } : { title: 'ポモドーロタイマー', body: '休憩時間が終了しました\\n次の作業を開始します' };
    await registration.showNotification(content.title, { body: content.body, tag: isTest ? 'pomodoro-test' : 'pomodoro', renotify: !isTest, requireInteraction: !isTest }); lastOsNotificationResult = '成功'; lastOsNotificationError = 'なし'; updateNotificationStatus(); return true;
  } catch (error) { lastOsNotificationResult = '失敗'; lastOsNotificationError = `${error.name}: ${error.message}`; console.warn('OS通知表示失敗:', error); updateNotificationStatus(); return false; }
}
async function requestNotificationPermission() { if (!notifSupported) return false; try { const result = await Notification.requestPermission(); document.getElementById('permissionBar').classList.add('hidden'); updateNotificationStatus(); return result === 'granted'; } catch (error) { lastOsNotificationResult = '失敗'; updateNotificationStatus(); return false; } }
function checkNotificationPermission() { const bar = document.getElementById('permissionBar'); if (notifSupported && Notification.permission === 'default') bar.classList.remove('hidden'); else bar.classList.add('hidden'); updateNotificationStatus(); }
function recalcRemaining() { if (running && startTimestamp !== null) remaining = Math.max(remainingAtStart - Math.floor((Date.now() - startTimestamp) / 1000), 0); }
function updateDisplay() { const safeRemaining = Math.max(remaining, 0); const minutes = Math.floor(safeRemaining / 60).toString().padStart(2, '0'); const seconds = (safeRemaining % 60).toString().padStart(2, '0'); document.getElementById('timeDisplay').textContent = `${minutes}:${seconds}`; progressEl.style.strokeDashoffset = CIRCUMFERENCE * (1 - safeRemaining / totalSeconds); document.title = `${minutes}:${seconds} — ${completed ? '全セット完了' : mode === 'work' ? '作業中' : '休憩中'}`; }
function updateModeUI() { const english = completed ? 'COMPLETE' : mode === 'work' ? 'FOCUS' : 'BREAK'; const japanese = completed ? '全セット完了' : mode === 'work' ? '作業中' : '休憩中'; const shownSet = completed ? SET_COUNT : Math.min(completedSets + 1, SET_COUNT); document.getElementById('modeLabelEn').textContent = english; document.getElementById('modeLabelJa').textContent = japanese; document.getElementById('sessionCount').textContent = `SET ${String(shownSet).padStart(2, '0')} / ${String(SET_COUNT).padStart(2, '0')} · ${english}`; document.getElementById('tabWork').className = 'tab' + (mode === 'work' && !completed ? ' active-work' : ''); document.getElementById('tabBreak').className = 'tab' + (mode === 'break' && !completed ? ' active-break' : ''); }
function stopTimer({ stopAudio = false } = {}) { clearInterval(intervalId); intervalId = null; cancelSwNotification(); running = false; startTimestamp = null; remainingAtStart = null; if (stopAudio) stopSound(); }
async function start({ requestPermission = true, unlock = false } = {}) { if (completed) return; clearInterval(intervalId); if (unlock) await unlockAudio(); if (requestPermission && notifSupported && Notification.permission === 'default') requestNotificationPermission(); try { ensureAudioContext(); } catch (error) {} startTimestamp = Date.now(); remainingAtStart = remaining; running = true; document.getElementById('startBtn').textContent = '一時停止'; scheduleSwNotification(remaining); saveState(); intervalId = setInterval(tick, 1000); }
function pause() { recalcRemaining(); stopTimer(); document.getElementById('startBtn').textContent = '再開'; updateDisplay(); saveState(); }
async function toggleTimer() { if (completed) { await restartTimer(); return; } if (running) pause(); else await start({ unlock: true }); }
function resetTimer() { stopTimer({ stopAudio: true }); clearEndFeedback(); mode = 'work'; completedSets = 0; completed = false; totalSeconds = WORK_SECONDS; remaining = totalSeconds; document.getElementById('startBtn').textContent = '開始'; document.getElementById('logText').textContent = ''; updateModeUI(); updateDisplay(); saveState(); }
async function restartTimer() { resetTimer(); await start({ unlock: true }); }
function tick() { recalcRemaining(); updateDisplay(); saveState(); if (remaining <= 0) onTimerEnd(); }
function onTimerEnd({ osNotified = false, isFinalBreak = false } = {}) {
  if (timerEndedLock || completed) return;
  timerEndedLock = true;
  setTimeout(() => { timerEndedLock = false; }, 2000);
  stopTimer(); remaining = 0; updateDisplay();
  const isWorkEnd = mode === 'work';
  const willComplete = !isWorkEnd && (completedSets + 1 >= SET_COUNT || isFinalBreak);
  const endKind = willComplete ? 'complete' : isWorkEnd ? 'work' : 'break';
  lastTimerEndKind = endKind === 'work' ? '作業' : endKind === 'break' ? '休憩' : '全セット完了'; presentEndFeedback(endKind);
  if (!osNotified) showOsNotification(endKind);
  if (isWorkEnd) {
    document.getElementById('logText').textContent = `セット ${completedSets + 1} の作業が終了しました — 休憩へ`;
    saveState(); setTimeout(() => autoSwitchMode('break'), 1200); return;
  }
  completedSets += 1;
  if (completedSets >= SET_COUNT) {
    completed = true; document.getElementById('startBtn').textContent = 'もう一度'; document.getElementById('logText').textContent = `${SET_COUNT}セット完了しました`; updateModeUI(); updateDisplay(); saveState(); return;
  }
  document.getElementById('logText').textContent = `${completedSets}セット完了 — 次の作業へ`; saveState(); setTimeout(() => autoSwitchMode('work'), 1200);
}
function autoSwitchMode(nextMode) { mode = nextMode; totalSeconds = nextMode === 'work' ? WORK_SECONDS : BREAK_SECONDS; remaining = totalSeconds; startTimestamp = null; remainingAtStart = null; updateModeUI(); updateDisplay(); saveState(); start({ requestPermission: false, unlock: false }); }
function switchMode(nextMode) { if (running) pause(); if (completed) { completed = false; completedSets = 0; } mode = nextMode; totalSeconds = nextMode === 'work' ? WORK_SECONDS : BREAK_SECONDS; remaining = totalSeconds; document.getElementById('startBtn').textContent = '開始'; document.getElementById('logText').textContent = ''; updateModeUI(); updateDisplay(); saveState(); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible' || !running) return; recalcRemaining(); if (remaining <= 0) onTimerEnd(); else { updateDisplay(); clearInterval(intervalId); intervalId = setInterval(tick, 1000); } });
function ensureAudioContext() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) { lastSoundResult = 'エラー'; updateNotificationStatus(); return null; }
    if (!soundCtx || soundCtx.state === 'closed') soundCtx = new AudioContextClass();
    if (soundCtx.state === 'suspended') {
      soundCtx.resume().then(() => { lastSoundResult = '利用可能'; updateNotificationStatus(); }).catch(() => { lastSoundResult = 'エラー'; updateNotificationStatus(); });
    } else { lastSoundResult = soundCtx.state === 'running' ? '利用可能' : '停止中'; updateNotificationStatus(); }
    return soundCtx;
  } catch (error) { soundCtx = null; lastSoundResult = 'エラー'; updateNotificationStatus(); return null; }
}
function playSound(kind = 'work') {
  if (soundLooping) { lastSoundResult = '二重再生抑止'; refreshDiagnostics(); return; }
  const context = ensureAudioContext();
  if (!context) { lastSoundResult = 'AudioContextなし'; refreshDiagnostics(); return; }
  const patterns = {
    work: [[880,.35],[1046,.35],[1318,.35]],
    break: [[660,.35],[990,.35],[660,.35],[990,.35]],
    complete: [[784,.35],[988,.35],[1175,.35],[1568,.8]]
  };
  const notes = patterns[kind] || patterns.work;
  const startNotes = () => {
    soundLooping = true; lastSoundKind = kind; lastSoundResult = kind === 'work' ? '作業終了音：成功' : kind === 'break' ? '休憩終了音：成功' : '全セット完了音：成功';
    let offset = 0; activeOscillators = [];
    notes.forEach(([frequency, duration], index) => {
      const oscillator = context.createOscillator(); const gain = context.createGain(); const startAt = context.currentTime + offset;
      oscillator.connect(gain); gain.connect(context.destination); oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, startAt);
      gain.gain.setValueAtTime(0.0001, startAt); gain.gain.linearRampToValueAtTime(0.62, startAt + 0.025); gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
      oscillator.start(startAt); oscillator.stop(startAt + duration + 0.03); activeOscillators.push(oscillator); offset += duration + (kind === 'break' && index === 1 ? 0.32 : 0.18);
    });
    clearTimeout(soundLoopTimer); soundLoopTimer = setTimeout(() => { activeOscillators = []; soundLooping = false; lastSoundResult = '停止中'; refreshDiagnostics(); }, Math.ceil((offset + .1) * 1000)); refreshDiagnostics();
  };
  if (context.state === 'running') startNotes(); else context.resume().then(startNotes).catch(error => { soundLooping = false; lastSoundResult = 'resume失敗'; lastAudioResumeResult = `${error.name}: ${error.message}`; refreshDiagnostics(); });
}
function stopSound() { activeOscillators.forEach(oscillator => { try { oscillator.stop(); } catch (error) {} }); activeOscillators = []; clearTimeout(soundLoopTimer); soundLooping = false; lastSoundResult = '停止中'; refreshDiagnostics(); const button = document.getElementById('soundTestBtn'); if (button) button.textContent = '通知音をテスト'; }
function toggleTestSound() { if (soundLooping) { stopSound(); return; } playSound(document.getElementById('soundType').value); }function clearEndFeedback() { clearTimeout(completionNoticeTimer); clearTimeout(backgroundFeedbackTimer); clearTimeout(bannerTimer); document.body.classList.remove('notification-active'); const notice = document.getElementById('completionNotice'); if (notice) notice.classList.remove('show'); const banner = document.getElementById('notifyBanner'); if (banner) banner.classList.remove('show'); }
function presentEndFeedback(kind) { lastAppNotificationKind = kind === 'work' ? '作業' : kind === 'break' ? '休憩' : '全セット完了';
  clearEndFeedback();
  playSound(kind);
  showNotify();
  const notice = document.getElementById('completionNotice');
  const messages = kind === 'complete' ? { eyebrow: 'ALL SETS COMPLETE', title: `${SET_COUNT}セット完了しました`, detail: '', duration: 8000 } : kind === 'work' ? { eyebrow: 'FOCUS COMPLETE', title: '作業時間が終了しました', detail: '休憩を開始します', duration: 5000 } : { eyebrow: 'BREAK COMPLETE', title: '休憩時間が終了しました', detail: '次の作業を開始します', duration: 5000 };
  document.getElementById('completionEyebrow').textContent = messages.eyebrow; document.getElementById('completionTitle').textContent = messages.title; document.getElementById('completionDetail').textContent = messages.detail;
  notice.classList.add('show'); document.body.classList.add('notification-active');
  completionNoticeTimer = setTimeout(() => notice.classList.remove('show'), messages.duration);
  backgroundFeedbackTimer = setTimeout(() => document.body.classList.remove('notification-active'), 2000);
}
function showNotify() { const banner = document.getElementById('notifyBanner'); clearTimeout(bannerTimer); banner.textContent = mode === 'work' ? '作業時間が終了しました' : '休憩時間が終了しました'; banner.classList.add('show'); bannerTimer = setTimeout(() => banner.classList.remove('show'), 4000); }
function updateNotificationStatus() {
  const target = document.getElementById('notificationStatus'); if (!target) return;
  const permission = !notifSupported ? '非対応' : Notification.permission === 'granted' ? '許可済み' : Notification.permission === 'denied' ? '拒否' : '未選択';
  const hint = notifSupported && Notification.permission === 'denied' ? '<p class="notification-diagnostics__note">通知が拒否されています。Chromeのサイト設定から通知を許可してください。</p>' : '';
  target.innerHTML = `通知状態<br>通知権限：${permission}<br>Service Worker：${serviceWorkerState}<br>音声：${lastSoundResult}<br>最後のOS通知：${lastOsNotificationResult}<br>最後のアプリ内通知：${lastAppNotificationKind}<br>最後の終了通知：${lastTimerEndKind}${hint}`;
}
async function testOsNotification() { if (!notifSupported) { lastOsNotificationResult = '失敗'; updateNotificationStatus(); return; } if (Notification.permission === 'default') await requestNotificationPermission(); if (Notification.permission === 'denied') { lastOsNotificationResult = '失敗'; updateNotificationStatus(); return; } await showOsNotification('test', true); refreshDiagnostics(); }
async function copyDiagnostics() { const details = { appVersion: APP_VERSION, userAgent: navigator.userAgent, notificationSupported: notifSupported, notificationPermission: notifSupported ? Notification.permission : 'unsupported', serviceWorkerSupported: 'serviceWorker' in navigator, serviceWorkerRegistered: !!swRegistration, serviceWorkerController: !!(navigator.serviceWorker && navigator.serviceWorker.controller), audioContextState: soundCtx ? soundCtx.state : 'uninitialized', lastSoundResult, lastSoundKind, lastOsNotificationResult, lastTimerEndKind, visibilityState: document.visibilityState, displayMode: window.matchMedia && window.matchMedia('(display-mode: standalone)').matches || navigator.standalone ? 'standalone' : 'browser', currentTime: new Date().toISOString() }; const text = Object.entries(details).map(([key, value]) => `${key}: ${value}`).join('\n'); try { await navigator.clipboard.writeText(text); document.getElementById('logText').textContent = '診断情報をコピーしました'; } catch (error) { document.getElementById('logText').textContent = '診断情報をコピーできませんでした'; } }
async function unlockAudio() { const context = ensureAudioContext(); if (!context) { audioUnlocked = false; lastAudioResumeResult = 'AudioContextなし'; refreshDiagnostics(); return false; } try { if (context.state === 'suspended') await context.resume(); const oscillator = context.createOscillator(); const gain = context.createGain(); gain.gain.setValueAtTime(0.00001, context.currentTime); oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.02); audioUnlocked = context.state === 'running'; lastAudioResumeResult = audioUnlocked ? '成功' : context.state; refreshDiagnostics(); return audioUnlocked; } catch (error) { audioUnlocked = false; lastAudioResumeResult = `${error.name}: ${error.message}`; refreshDiagnostics(); return false; } }
function buildDiagnostics() { return Object.entries({ appVersion: APP_VERSION, userAgent: navigator.userAgent, platform: navigator.platform || 'unknown', notificationSupported: notifSupported, notificationPermission: notifSupported ? Notification.permission : 'unsupported', serviceWorkerSupported: 'serviceWorker' in navigator, serviceWorkerRegistered: !!swRegistration, serviceWorkerReady, serviceWorkerActive: !!(swRegistration && swRegistration.active), serviceWorkerController: !!(navigator.serviceWorker && navigator.serviceWorker.controller), audioContextSupported: !!(window.AudioContext || window.webkitAudioContext), audioContextState: soundCtx ? soundCtx.state : 'uninitialized', audioUnlocked, lastAudioResumeResult, lastSoundResult, lastSoundKind, lastOsNotificationResult, lastOsNotificationError, lastTimerEndKind, visibilityState: document.visibilityState, displayMode: ((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone) ? 'standalone' : 'browser', currentTime: new Date().toISOString() }).map(([key,value]) => `${key}: ${value}`).join('\n'); }
function refreshDiagnostics() { updateNotificationStatus(); const textarea = document.getElementById('diagnosticsText'); if (textarea) textarea.value = buildDiagnostics(); }
async function copyDiagnostics() { const text = buildDiagnostics(); const textarea = document.getElementById('diagnosticsText'); textarea.value = text; let copied = false; try { await navigator.clipboard.writeText(text); copied = true; } catch (error) { try { textarea.focus(); textarea.select(); copied = document.execCommand('copy'); } catch (fallbackError) {} } textarea.focus(); textarea.select(); document.getElementById('logText').textContent = copied ? '診断情報をコピーしました' : '自動コピーできませんでした。下の診断情報を長押ししてコピーしてください。'; }
async function init() {
  progressEl = document.getElementById('progressCircle'); progressEl.style.strokeDasharray = CIRCUMFERENCE; progressEl.style.strokeDashoffset = 0;
  loadSettings(); document.getElementById('inputWork').value = WORK_SECONDS / 60; document.getElementById('inputBreak').value = BREAK_SECONDS / 60; document.getElementById('inputSets').value = SET_COUNT; setTabLabels();
  document.getElementById('startBtn').addEventListener('click', toggleTimer); document.getElementById('resetBtn').addEventListener('click', resetTimer); document.getElementById('applyBtn').addEventListener('click', applySettings); document.getElementById('tabWork').addEventListener('click', () => switchMode('work')); document.getElementById('tabBreak').addEventListener('click', () => switchMode('break')); document.getElementById('soundTestBtn').addEventListener('click', toggleTestSound); document.getElementById('notifAllowBtn').addEventListener('click', requestNotificationPermission); document.getElementById('notifLaterBtn').addEventListener('click', () => document.getElementById('permissionBar').classList.add('hidden')); document.getElementById('completionNotice').addEventListener('click', clearEndFeedback); document.getElementById('notificationTestBtn').addEventListener('click', testOsNotification); document.getElementById('diagnosticsRefreshBtn').addEventListener('click', refreshDiagnostics); document.getElementById('diagnosticsCopyBtn').addEventListener('click', copyDiagnostics);
  await registerSW(); checkNotificationPermission(); const restored = loadState();
  if (restored && running) { recalcRemaining(); if (remaining <= 0) { running = false; remaining = 0; document.getElementById('logText').textContent = '閉じている間にタイマーが終了しました'; saveState(); showNotify(); } else { document.getElementById('startBtn').textContent = '一時停止'; scheduleSwNotification(remaining); intervalId = setInterval(tick, 1000); } }
  if (completed) document.getElementById('startBtn').textContent = 'もう一度'; updateModeUI(); updateDisplay(); refreshDiagnostics();
}
document.addEventListener('DOMContentLoaded', init);
