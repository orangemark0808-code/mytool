import { taskImport } from './task-refresh.mjs';
import { foodImport } from './meal-plan.mjs';
export const SERVER_LINK_ORIGIN = 'https://orangemark0808-code.github.io';
export const SERVER_LINK_URL = SERVER_LINK_ORIGIN + '/mytool/iroiro/dashboard-sync.html?v=2026-10-29-15';
const date = value => value === null || typeof value === 'string' && Number.isFinite(Date.parse(value));
const message = value => value === null || typeof value === 'string' && value.length <= 1000;
export function parseServerLinkResult(value, now = Date.now()) {
  const connection = value?.connection;
  if (!connection || !['unlinked','connected','reconnect'].includes(connection.state) || !date(connection.connectedAt) || !date(connection.expiresAt) || !date(connection.lastSuccessAt) || !message(connection.error)) return null;
  let data = null;
  if (value.data !== null) {
    const raw = value.data, time = Date.parse(raw?.fetchedAt);
    if (!Number.isFinite(time) || time > now + 300000 || raw.food?.fetchedAt !== raw.fetchedAt || raw.tasks?.lastSuccessAt !== raw.fetchedAt) return null;
    // Stored data is allowed to be old, but is always labelled by its real
    // acquisition time. Validate it without pretending it was freshly read.
    const tasks = taskImport({fetchedAt: raw.fetchedAt, notes: raw.tasks?.notes}, time);
    const food = foodImport(raw.food, time);
    if (!tasks || !food) return null;
    data = {fetchedAt: raw.fetchedAt, tasks, food};
  }
  if (value.error !== undefined && !message(value.error)) return null;
  return {connection: {state: connection.state, connectedAt: connection.connectedAt, expiresAt: connection.expiresAt, lastSuccessAt: connection.lastSuccessAt, error: connection.error}, data, cached: value.cached === true, busy: value.busy === true, needsConnection: value.needsConnection === true, error: value.error || null};
}
export function acceptsLinkCredential(event, peer, requestId) {
  return Boolean(peer && event.source === peer && event.origin === SERVER_LINK_ORIGIN && event.data?.requestId === requestId && event.data.type === 'iroiro-server-link-credential' && typeof event.data.idToken === 'string' && event.data.idToken.length > 0 && event.data.idToken.length <= 20000 && typeof event.data.refreshToken === 'string' && event.data.refreshToken.length > 0 && event.data.refreshToken.length <= 20000);
}
