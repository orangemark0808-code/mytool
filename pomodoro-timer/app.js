const STORAGE_KEY = 'pomodoro_state';
const SETTINGS_KEY = 'pomodoro_settings';
const DEFAULT_WORK_MIN = 50;
const DEFAULT_BREAK_MIN = 10;
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
async function registerSW() { if (!('serviceWorker' in navigator)) return; try { swRegistration = await navigator.serviceWorker.register('./sw.js'); navigator.serviceWorker.addEventListener('message', event => { if (event.data.type === 'TIMER_ENDED' && document.visibilityState === 'visible') onTimerEnd({ osNotified: true, isFinalBreak: event.data.isFinalBreak === true }); }); } catch (error) { console.warn('ServiceWorker登録失敗:', error); } }
function scheduleSwNotification(delaySec) { try { const worker = swRegistration && swRegistration.active; if (worker) worker.postMessage({ type: 'SCHEDULE', delay: delaySec * 1000, isWork: mode === 'work', isFinalBreak: mode === 'break' && completedSets === SET_COUNT - 1, setCount: SET_COUNT }); } catch (error) {} }
function cancelSwNotification() { try { const worker = swRegistration && swRegistration.active; if (worker) worker.postMessage({ type: 'CANCEL' }); } catch (error) {} }
function showSwNotification(kind) { try { const worker = swRegistration && swRegistration.active; if (worker) worker.postMessage({ type: 'SHOW_NOTIFICATION', kind, setCount: SET_COUNT, vibrate: false }); } catch (error) {} }
async function requestNotificationPermission() { if (!notifSupported) return false; try { const result = await Notification.requestPermission(); document.getElementById('permissionBar').classList.add('hidden'); return result === 'granted'; } catch (error) { return false; } }
function checkNotificationPermission() { if (notifSupported && Notification.permission === 'default') document.getElementById('permissionBar').classList.remove('hidden'); }
function recalcRemaining() { if (running && startTimestamp !== null) remaining = Math.max(remainingAtStart - Math.floor((Date.now() - startTimestamp) / 1000), 0); }
function updateDisplay() { const safeRemaining = Math.max(remaining, 0); const minutes = Math.floor(safeRemaining / 60).toString().padStart(2, '0'); const seconds = (safeRemaining % 60).toString().padStart(2, '0'); document.getElementById('timeDisplay').textContent = `${minutes}:${seconds}`; progressEl.style.strokeDashoffset = CIRCUMFERENCE * (1 - safeRemaining / totalSeconds); document.title = `${minutes}:${seconds} — ${completed ? '全セット完了' : mode === 'work' ? '作業中' : '休憩中'}`; }
function updateModeUI() { const english = completed ? 'COMPLETE' : mode === 'work' ? 'FOCUS' : 'BREAK'; const japanese = completed ? '全セット完了' : mode === 'work' ? '作業中' : '休憩中'; const shownSet = completed ? SET_COUNT : Math.min(completedSets + 1, SET_COUNT); document.getElementById('modeLabelEn').textContent = english; document.getElementById('modeLabelJa').textContent = japanese; document.getElementById('sessionCount').textContent = `SET ${String(shownSet).padStart(2, '0')} / ${String(SET_COUNT).padStart(2, '0')} · ${english}`; document.getElementById('tabWork').className = 'tab' + (mode === 'work' && !completed ? ' active-work' : ''); document.getElementById('tabBreak').className = 'tab' + (mode === 'break' && !completed ? ' active-break' : ''); }
function stopTimer({ stopAudio = false } = {}) { clearInterval(intervalId); intervalId = null; cancelSwNotification(); running = false; startTimestamp = null; remainingAtStart = null; if (stopAudio) stopSound(); }
function start({ requestPermission = true } = {}) { if (completed) return; clearInterval(intervalId); if (requestPermission && notifSupported && Notification.permission === 'default') requestNotificationPermission(); try { ensureAudioContext(); } catch (error) {} startTimestamp = Date.now(); remainingAtStart = remaining; running = true; document.getElementById('startBtn').textContent = '一時停止'; scheduleSwNotification(remaining); saveState(); intervalId = setInterval(tick, 1000); }
function pause() { recalcRemaining(); stopTimer(); document.getElementById('startBtn').textContent = '再開'; updateDisplay(); saveState(); }
function toggleTimer() { if (completed) { restartTimer(); return; } if (running) pause(); else start(); }
function resetTimer() { stopTimer({ stopAudio: true }); clearEndFeedback(); mode = 'work'; completedSets = 0; completed = false; totalSeconds = WORK_SECONDS; remaining = totalSeconds; document.getElementById('startBtn').textContent = '開始'; document.getElementById('logText').textContent = ''; updateModeUI(); updateDisplay(); saveState(); }
function restartTimer() { resetTimer(); start(); }
function tick() { recalcRemaining(); updateDisplay(); saveState(); if (remaining <= 0) onTimerEnd(); }
function onTimerEnd({ osNotified = false, isFinalBreak = false } = {}) {
  if (timerEndedLock || completed) return;
  timerEndedLock = true;
  setTimeout(() => { timerEndedLock = false; }, 2000);
  stopTimer(); remaining = 0; updateDisplay();
  const isWorkEnd = mode === 'work';
  const willComplete = !isWorkEnd && (completedSets + 1 >= SET_COUNT || isFinalBreak);
  presentEndFeedback(willComplete ? 'complete' : isWorkEnd ? 'work' : 'break');
  if (!osNotified) showSwNotification(willComplete ? 'complete' : isWorkEnd ? 'work' : 'break');
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
function autoSwitchMode(nextMode) { mode = nextMode; totalSeconds = nextMode === 'work' ? WORK_SECONDS : BREAK_SECONDS; remaining = totalSeconds; startTimestamp = null; remainingAtStart = null; updateModeUI(); updateDisplay(); saveState(); start({ requestPermission: false }); }
function switchMode(nextMode) { if (running) pause(); if (completed) { completed = false; completedSets = 0; } mode = nextMode; totalSeconds = nextMode === 'work' ? WORK_SECONDS : BREAK_SECONDS; remaining = totalSeconds; document.getElementById('startBtn').textContent = '開始'; document.getElementById('logText').textContent = ''; updateModeUI(); updateDisplay(); saveState(); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible' || !running) return; recalcRemaining(); if (remaining <= 0) onTimerEnd(); else { updateDisplay(); clearInterval(intervalId); intervalId = setInterval(tick, 1000); } });
function ensureAudioContext() { try { const AudioContextClass = window.AudioContext || window.webkitAudioContext; if (!AudioContextClass) return null; if (!soundCtx || soundCtx.state === 'closed') soundCtx = new AudioContextClass(); if (soundCtx.state === 'suspended') soundCtx.resume().catch(() => {}); return soundCtx; } catch (error) { soundCtx = null; return null; } }
function playSound() { if (soundLooping) return; soundLooping = true; const context = ensureAudioContext(); if (!context) { soundLooping = false; return; } const play = () => { const count = 5, interval = 0.7, duration = 0.5; for (let index = 0; index < count; index += 1) { const oscillator = context.createOscillator(); const gain = context.createGain(); oscillator.connect(gain); gain.connect(context.destination); oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(880, context.currentTime + index * interval); gain.gain.setValueAtTime(0.4, context.currentTime + index * interval); gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + index * interval + duration); oscillator.start(context.currentTime + index * interval); oscillator.stop(context.currentTime + index * interval + duration); } soundLoopTimer = setTimeout(stopSound, count * interval * 1000 + 200); }; if (context.state === 'running') play(); else context.resume().then(play).catch(() => { soundLooping = false; }); }
function stopSound() { soundLooping = false; clearTimeout(soundLoopTimer); const button = document.getElementById('soundTestBtn'); if (button) button.textContent = '通知音をテスト'; }
function toggleTestSound() { const button = document.getElementById('soundTestBtn'); if (soundLooping) stopSound(); else { ensureAudioContext(); playSound(); if (button) button.textContent = '音を止める'; } }
function vibrate(pattern) { try { if ('vibrate' in navigator) navigator.vibrate(pattern); } catch (error) {} }
function clearEndFeedback({ cancelVibration = true } = {}) { clearTimeout(completionNoticeTimer); clearTimeout(backgroundFeedbackTimer); clearTimeout(bannerTimer); document.body.classList.remove('notification-active'); const notice = document.getElementById('completionNotice'); if (notice) notice.classList.remove('show'); const banner = document.getElementById('notifyBanner'); if (banner) banner.classList.remove('show'); if (cancelVibration) vibrate(0); }
function presentEndFeedback(kind) {
  clearEndFeedback({ cancelVibration: false });
  showNotify();
  const notice = document.getElementById('completionNotice');
  const messages = kind === 'complete' ? { eyebrow: 'ALL SETS COMPLETE', title: `${SET_COUNT}セット完了しました`, detail: '', vibration: [700, 250, 700, 250, 1000], duration: 8000 } : kind === 'work' ? { eyebrow: 'FOCUS COMPLETE', title: '作業時間が終了しました', detail: '休憩を開始します', vibration: [500, 200, 500, 200, 500], duration: 5000 } : { eyebrow: 'BREAK COMPLETE', title: '休憩時間が終了しました', detail: '次の作業を開始します', vibration: [300, 150, 300], duration: 5000 };
  document.getElementById('completionEyebrow').textContent = messages.eyebrow; document.getElementById('completionTitle').textContent = messages.title; document.getElementById('completionDetail').textContent = messages.detail;
  notice.classList.add('show'); document.body.classList.add('notification-active'); vibrate(messages.vibration);
  completionNoticeTimer = setTimeout(() => notice.classList.remove('show'), messages.duration);
  backgroundFeedbackTimer = setTimeout(() => document.body.classList.remove('notification-active'), 2000);
}
function showNotify() { const banner = document.getElementById('notifyBanner'); clearTimeout(bannerTimer); banner.textContent = mode === 'work' ? '作業時間が終了しました' : '休憩時間が終了しました'; banner.classList.add('show'); bannerTimer = setTimeout(() => banner.classList.remove('show'), 4000); }
async function init() {
  progressEl = document.getElementById('progressCircle'); progressEl.style.strokeDasharray = CIRCUMFERENCE; progressEl.style.strokeDashoffset = 0;
  loadSettings(); document.getElementById('inputWork').value = WORK_SECONDS / 60; document.getElementById('inputBreak').value = BREAK_SECONDS / 60; document.getElementById('inputSets').value = SET_COUNT; setTabLabels();
  document.getElementById('startBtn').addEventListener('click', toggleTimer); document.getElementById('resetBtn').addEventListener('click', resetTimer); document.getElementById('applyBtn').addEventListener('click', applySettings); document.getElementById('tabWork').addEventListener('click', () => switchMode('work')); document.getElementById('tabBreak').addEventListener('click', () => switchMode('break')); document.getElementById('soundTestBtn').addEventListener('click', toggleTestSound); document.getElementById('notifAllowBtn').addEventListener('click', requestNotificationPermission); document.getElementById('notifLaterBtn').addEventListener('click', () => document.getElementById('permissionBar').classList.add('hidden')); document.getElementById('completionNotice').addEventListener('click', clearEndFeedback);
  await registerSW(); checkNotificationPermission(); const restored = loadState();
  if (restored && running) { recalcRemaining(); if (remaining <= 0) { running = false; remaining = 0; document.getElementById('logText').textContent = '閉じている間にタイマーが終了しました'; saveState(); showNotify(); } else { document.getElementById('startBtn').textContent = '一時停止'; scheduleSwNotification(remaining); intervalId = setInterval(tick, 1000); } }
  if (completed) document.getElementById('startBtn').textContent = 'もう一度'; updateModeUI(); updateDisplay();
}
document.addEventListener('DOMContentLoaded', init);
