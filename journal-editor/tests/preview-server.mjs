// Read-only local UI fixture. It never reads configuration, credentials, or real
// journals and is not included in the GitHub Pages artifact.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const files = new Set(['index.html', 'script.js', 'editor-core.mjs', 'markdown.mjs', 'style.css', 'layout-overrides.css']);
const fixture = `state.user={uid:'local-fixture'};state.categories=defaultCategories();state.remoteReady=state.categoriesReady=true;state.drafts=[normalizeDraft({id:'demo',title:'長文編集の確認',body:${JSON.stringify(Array.from({ length: 80 }, (_, index) => `${index + 1}段落目。これは動作確認用の架空の文章です。改行と段落を使いながら長文を編集します。`).join('\n\n'))},createdAt:'2026-10-09T00:00:00Z',updatedAt:'2026-10-09T00:00:00Z'}, {remote:true})];$('authGate').classList.add('hidden');document.querySelector('.header-actions').classList.remove('hidden');$('loginButton').hidden=true;loadDraft('demo');refreshSyncStatus();`;
http.createServer(async (request, response) => {
  const name = new URL(request.url, 'http://localhost').pathname.slice(1) || 'index.html';
  if (!files.has(name)) { response.writeHead(404); response.end('Not found'); return; }
  try {
    let text = await readFile(join(root, name), 'utf8');
    if (name === 'index.html') text = text.replace(/\s*<script src="firebase-config(?:\.local)?\.js"><\/script>/g, '');
    if (name === 'script.js') text = text.replace('void setupFirebase();', fixture);
    response.writeHead(200, { 'Content-Type': name.endsWith('.css') ? 'text/css' : name.endsWith('.html') ? 'text/html' : 'text/javascript', 'Cache-Control': 'no-store' });
    response.end(text);
  } catch { response.writeHead(500); response.end('Fixture error'); }
}).listen(8765, '127.0.0.1', () => console.log('Journal fixture: http://localhost:8765/ (synthetic data only)'));
