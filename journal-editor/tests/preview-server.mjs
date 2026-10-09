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
  const requestUrl = new URL(request.url, 'http://localhost');
  const name = requestUrl.pathname.slice(1) || 'index.html';
  const scenario = ['legacy-matched', 'legacy-difference', 'badges'].includes(requestUrl.searchParams.get('scenario')) ? requestUrl.searchParams.get('scenario') : null;
  if (!files.has(name)) { response.writeHead(404); response.end('Not found'); return; }
  try {
    let text = await readFile(join(root, name), 'utf8');
    if (name === 'index.html') text = text.replace(/\s*<script src="firebase-config(?:\.local)?\.js"><\/script>/g, '');
    if (name === 'index.html' && scenario) text = text.replace(/(src="script\.js\?v=[0-9-]+)"/, `$1&scenario=${scenario}"`);
    if (name === 'script.js') {
      const extra = scenario === 'badges'
        ? `state.drafts=[['diary','日記のサンプル','journal-diary','unpublished'],['note-draft','note用の下書き','journal-note','unpublished'],['note-posted','note用の投稿済記事','journal-note','published']].map(([id,title,category,noteStatus])=>normalizeDraft({...state.drafts[0],id,title,category,noteStatus,body:'タグの色と表示名を確認するための架空の記事です。'},{remote:true}));state.currentId=null;showView('list');`
        : scenario ? `state.serverDrafts=state.drafts.map(d=>normalizeDraft(d,{remote:true}));state.serverCategories=defaultCategories();readArray=key=>key===LEGACY_KEYS.drafts?[${scenario === 'legacy-matched' ? '{...state.drafts[0]}' : "{...state.drafts[0],title:'スマホに残った旧記事',body:'この端末だけに残った架空の文章です。'}"}]:key===LEGACY_KEYS.categories?defaultCategories():[];showView('settings');updateMigrationPanel();` : '';
      text = text.replace('void setupFirebase();', fixture + extra);
    }
    response.writeHead(200, { 'Content-Type': name.endsWith('.css') ? 'text/css' : name.endsWith('.html') ? 'text/html' : 'text/javascript', 'Cache-Control': 'no-store' });
    response.end(text);
  } catch { response.writeHead(500); response.end('Fixture error'); }
}).listen(8765, '127.0.0.1', () => console.log('Journal fixture: http://localhost:8765/ (synthetic data only)'));
