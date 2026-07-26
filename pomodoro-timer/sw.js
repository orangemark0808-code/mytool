const CACHE_VERSION = '2026-07-26-05';
let notificationTimer = null;
function notificationContent(kind, setCount) {
  if (kind === 'complete') return { title: 'ポモドーロタイマー', body: `${setCount}セット完了しました` };
  if (kind === 'work') return { title: 'ポモドーロタイマー', body: '作業時間が終了しました\n休憩を開始します' };
  return { title: 'ポモドーロタイマー', body: '休憩時間が終了しました\n次の作業を開始します' };
}
async function showTimerNotification(kind, setCount, shouldVibrate = true) { const content = notificationContent(kind, setCount); const options = { body: content.body, requireInteraction: true, tag: 'pomodoro', renotify: true }; if (shouldVibrate) options.vibrate = kind === 'complete' ? [700,250,700,250,1000] : kind === 'work' ? [500,200,500,200,500] : [300,150,300]; await self.registration.showNotification(content.title, options); }
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(clients.claim()));
self.addEventListener('message', event => {
  const { type } = event.data;
  if (type === 'SCHEDULE') {
    clearTimeout(notificationTimer);
    const { delay, isWork, isFinalBreak } = event.data;
    notificationTimer = setTimeout(async () => { const kind = isFinalBreak ? 'complete' : isWork ? 'work' : 'break'; await showTimerNotification(kind, event.data.setCount); const allClients = await clients.matchAll({ includeUncontrolled: true, type: 'window' }); allClients.forEach(client => client.postMessage({ type: 'TIMER_ENDED', isWork, isFinalBreak })); }, delay);
  }
  if (type === 'SHOW_NOTIFICATION') showTimerNotification(event.data.kind, event.data.setCount, event.data.vibrate !== false);
  if (type === 'CANCEL') { clearTimeout(notificationTimer); notificationTimer = null; }
});
self.addEventListener('notificationclick', event => { event.notification.close(); event.waitUntil(clients.matchAll({ type:'window', includeUncontrolled:true }).then(list => list.length > 0 ? list[0].focus() : clients.openWindow('./'))); });