import {readFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';

const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (account !== '1329ff2a51a1994d2bc91d563267bdc4' || !token) {
  throw new Error('Cloudflareの公開設定を確認してください。');
}
const config = JSON.parse(await readFile('backend/wrangler.jsonc', 'utf8'));
if (config.name !== 'daily-notice-api') throw new Error('公開先Workerが一致しません。');
const metadata = {
  main_module: 'worker.mjs',
  compatibility_date: config.compatibility_date,
  keep_bindings: ['secret_text'],
  bindings: Object.entries(config.vars).map(([name, text]) => ({name, type: 'plain_text', text})),
};
const form = new FormData();
form.set('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}), 'metadata.json');
form.set('worker.mjs', new Blob([await readFile('.worker-dist/worker.mjs')],
  {type: 'application/javascript+module'}), 'worker.mjs');
const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/daily-notice-api`, {
  method: 'PUT', headers: {Authorization: `Bearer ${token}`}, body: form,
  redirect: 'error', signal: AbortSignal.timeout(60000),
});
const result = await response.json();
if (!response.ok || !result.success) {
  const codes = (result.errors ?? []).map(error => error.code).join(',');
  throw new Error(`Workerの公開に失敗しました（HTTP ${response.status}; code ${codes}）。`);
}
const origin = 'https://daily-notice-api.orangemark0808.workers.dev';
let healthy = false;
for (let attempt = 0; attempt < 8; attempt++) {
  try {
    const health = await fetch(origin + '/health', {redirect: 'error', signal: AbortSignal.timeout(5000)});
    const body = await health.json().catch(() => null);
    if (health.ok && body?.ok === true) { healthy = true; break; }
  } catch {}
  if (attempt < 7) await delay(2000);
}
if (!healthy) throw new Error('公開後の稼働確認に失敗しました。');
const unauthenticated = await fetch(origin + '/api/meals?tool=pan', {redirect: 'error', signal: AbortSignal.timeout(15000)});
if (unauthenticated.status !== 401) throw new Error('本人認証の保護を確認できません。');
console.log('daily-notice-apiを公開しました。稼働と未認証アクセスの拒否を確認しました。');
