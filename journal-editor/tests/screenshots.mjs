// Android・iPad・PC の画面サイズで確認用の画面を撮影する。
// 確認サーバー（preview-server.mjs）の架空データだけを使い、Firebaseや実際のJournalには接続しない。
// 使い方: node journal-editor/tests/screenshots.mjs [保存先フォルダ]
// 保存先の既定は journal-editor/tests/screenshots/（Gitには含めない）。
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.argv[2] || join(here, 'screenshots'));
const base = 'http://localhost:8765/';

let playwright;
try { playwright = createRequire(import.meta.url)('playwright'); }
catch {
  console.error('Playwright が見つかりません。Claude Code のクラウド環境では最初から使えます。手元のPCで使う場合は npm install playwright と npx playwright install chromium を実行してください。');
  process.exit(1);
}
const { chromium, devices } = playwright;

const targets = [
  ['android', devices['Pixel 7']],
  ['ipad', devices['iPad Pro 11']],
  ['ipad-landscape', devices['iPad Pro 11 landscape']],
  ['pc', { viewport: { width: 1280, height: 800 } }],
];

// 撮影する場面。page は Playwright のページ。
const click = (selector) => async (page) => { await page.click(selector); };
const scenes = [
  ['editor', '', async () => {}],
  ['home', '?scenario=books', async () => {}],
  ['diary-list', '?scenario=books', click('[data-open-book="diary"]')],
  ['note-list', '?scenario=books', click('[data-open-book="note"]')],
  ['note-subcategory', '?scenario=books', async (page) => { await page.click('[data-open-book="note"]'); await page.click('[data-sub-filter="c-drama"]'); }],
  ['new-note', '?scenario=books', click('[data-new-book="note"]')],
  ['new-diary', '?scenario=books', click('[data-new-book="diary"]')],
  ['note-editor', '?scenario=books', async (page) => { await page.click('[data-open-book="note"]'); await page.click('[data-edit="n1"]'); await page.evaluate(() => document.activeElement?.blur()); }],
  ['settings-categories', '?scenario=books', async (page) => { await page.click('#settingsButton'); await page.evaluate(() => document.querySelector('.category-panel').scrollIntoView()); }],
  ['all-list', '?scenario=badges', async () => {}],
  ['image-preview', '?scenario=images', click('#previewTab')],
  // 実際の縮小処理を通すため、ブラウザで作った大きめのPNGを「画像」から選ぶ。
  ['image-added', '?scenario=images', async (page) => {
    const data = await page.evaluate(() => { const canvas = Object.assign(document.createElement('canvas'), { width: 3000, height: 2000 }); const context = canvas.getContext('2d'); const gradient = context.createLinearGradient(0, 0, 3000, 2000); gradient.addColorStop(0, '#ef7d22'); gradient.addColorStop(1, '#3f8a5c'); context.fillStyle = gradient; context.fillRect(0, 0, 3000, 2000); context.fillStyle = '#fff'; context.font = '200px sans-serif'; context.fillText('追加した画像', 200, 1100); return canvas.toDataURL('image/png').split(',')[1]; });
    await page.evaluate(() => { const body = document.getElementById('bodyInput'); body.setSelectionRange(body.value.length, body.value.length); });
    await page.setInputFiles('#imageFileInput', { name: 'sample.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') });
    await page.waitForFunction(() => (document.getElementById('bodyInput').value.match(/journal-image:/g) || []).length === 2, null, { timeout: 10000 });
    // 追加後は本文にカーソルが戻り、スマホでは入力モードになるので「完了」で抜けてからプレビューを開く。
    await page.evaluate(() => { document.getElementById('finishInputButton').click(); document.getElementById('previewTab').click(); });
    await page.waitForTimeout(400);
    await page.evaluate(() => { const figures = document.querySelectorAll('.journal-image'); figures[figures.length - 1]?.scrollIntoView(); });
    await page.waitForTimeout(400);
  }],
];

async function startServer() {
  const server = spawn(process.execPath, [join(here, 'preview-server.mjs')], { stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((ready, fail) => {
    server.once('exit', (code) => fail(new Error(`確認サーバーが起動できませんでした（終了コード ${code}）。ポート8765が使用中かもしれません。`)));
    server.stdout.on('data', (chunk) => { if (String(chunk).includes('localhost:8765')) ready(); });
  });
  return server;
}

const server = await startServer();
const problems = [];
try {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  for (const [device, options] of targets) {
    for (const [scene, query, action] of scenes) {
      const context = await browser.newContext(options);
      const page = await context.newPage();
      page.on('pageerror', (error) => problems.push(`${device}/${scene}: ${error.message}`));
      await page.goto(base + query);
      await page.waitForTimeout(600);
      // 本文にフォーカスがあるとスマホでは入力モードになりタイトル部が隠れるため、外してから撮る。
      await page.evaluate(() => document.activeElement?.blur());
      await action(page);
      await page.waitForTimeout(300);
      const width = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (width > 1) problems.push(`${device}/${scene}: 横にはみ出しています（${width}px）`);
      await page.screenshot({ path: join(outDir, `${device}-${scene}.png`) });
      await context.close();
    }
  }
  await browser.close();
} finally {
  server.kill();
}

console.log(`保存先: ${outDir}`);
if (problems.length) { console.error(`気になる点:\n- ${problems.join('\n- ')}`); process.exitCode = 1; }
else console.log('画面エラー・横はみ出しはありませんでした。');
