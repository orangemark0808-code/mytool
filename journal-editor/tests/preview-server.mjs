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
  const scenario = ['legacy-matched', 'legacy-difference', 'badges', 'trash', 'books', 'images'].includes(requestUrl.searchParams.get('scenario')) ? requestUrl.searchParams.get('scenario') : null;
  if (!files.has(name)) { response.writeHead(404); response.end('Not found'); return; }
  try {
    let text = await readFile(join(root, name), 'utf8');
    if (name === 'index.html') text = text.replace(/\s*<script src="firebase-config(?:\.local)?\.js"><\/script>/g, '');
    if (name === 'index.html' && scenario) text = text.replace(/(src="script\.js\?v=[0-9-]+)"/, `$1&scenario=${scenario}"`);
    if (name === 'script.js') {
      // books: ホーム（日記・noteの2つの入口）と、入口の中のカテゴリを確認する架空データ。
      const books = `state.categories=[...defaultCategories(),...[['c-trip','旅行','diary'],['c-work','仕事','diary'],['c-drama','ドラマ感想','note'],['c-book','本の感想','note']].map(([id,name,book],index)=>({id,name,book,order:index+2,updatedAt:'2026-11-01T00:00:00.000Z',deleted:false}))];state.drafts=[['d1','週末の散歩','journal-diary','unpublished','2026-11-03'],['d2','京都旅行 一日目','c-trip','unpublished','2026-11-02'],['d3','新しい案件の打ち合わせ','c-work','unpublished','2026-11-01'],['d4','分類のない古いメモ',null,'unpublished','2026-10-20'],['n1','【ドラマ感想】秋の新作｜静かに沁みる','c-drama','unpublished','2026-11-04'],['n2','読書記録：短編集','c-book','published','2026-10-28'],['n3','noteの下書き','journal-note','unpublished','2026-10-25']].map(([id,title,category,noteStatus,date])=>normalizeDraft({...state.drafts[0],id,title,category,categoryName:'',noteStatus,createdAt:date+'T09:00:00Z',updatedAt:date+'T12:00:00Z',body:'入口とカテゴリを確認するための架空の記事です。実際のJournalは使用していません。'},{remote:true}));state.currentId=state.editorDraftId=null;showView('home');`;
      // images: 画像の表示と追加を、架空の画像と端末内だけの保存先で確認する。
      const sample = `data:image/svg+xml;charset=utf-8,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'><defs><linearGradient id='g' x2='1' y2='1'><stop offset='0' stop-color='#ffd7b0'/><stop offset='1' stop-color='#9fd3b5'/></linearGradient></defs><rect width='1200' height='800' fill='url(#g)'/><circle cx='900' cy='250' r='120' fill='#fff8e8'/><text x='80' y='700' font-size='72' fill='#3a2a1a' font-family='sans-serif'>架空の画像</text></svg>")}`;
      const images = books + `const fakeImages=new Map([['11111111-sample',${JSON.stringify(sample)}]]);imageStore={ready:()=>true,put:async(id,record)=>{fakeImages.set(id,record.data);},get:async(id)=>fakeImages.has(id)?{data:fakeImages.get(id)}:null};state.drafts.unshift(normalizeDraft({...state.drafts[0],id:'img1',title:'画像つきの記事',category:'c-drama',body:'写真を貼った記事の確認です。\\n\\n![画像](journal-image:11111111-sample)\\n\\n画像のあとの文章です。'},{remote:true}));loadDraft('img1');`;
      const extra = scenario === 'images' ? images : scenario === 'books' ? books : scenario === 'trash'
        ? `state.drafts=[['trash-one','削除確認サンプルA','journal-diary','unpublished'],['trash-two','削除確認サンプルB','journal-note','published'],['trash-three','残す記事サンプルC','journal-diary','unpublished'],['active-sample','一覧に残す記事','journal-diary','unpublished']].map(([id,title,category,noteStatus])=>normalizeDraft({...state.drafts[0],id,title,category,noteStatus,deletedAt:id==='active-sample'?null:'2026-10-09T00:00:00Z',body:'動作確認用の架空の記事です。実際のJournalは使用していません。'},{remote:true}));const mockRecords=new Map(state.drafts.map(d=>[d.id,{...d}]));state.firebase={collection:()=>({firestore:{}}),doc:(_ref,id)=>({id}),runTransaction:async(_db,fn)=>{const staged=[];const result=await fn({get:async({id})=>({id,exists:()=>mockRecords.has(id),data:()=>mockRecords.get(id)}),delete:({id})=>staged.push(()=>mockRecords.delete(id)),set:({id},record)=>staged.push(()=>mockRecords.set(id,{...record}))});staged.forEach(commit=>commit());return result;}};state.firebaseReady=true;state.db={};state.serverDrafts=state.drafts.map(d=>({...d}));state.currentId=state.editorDraftId=null;state.showTrash=true;showView('list');refreshSyncStatus();`
        : scenario === 'badges'
        ? `state.drafts=[['diary','日記のサンプル（競合コピー）（復元）（復元）','journal-diary','unpublished','2026-10-03T00:00:00Z','2026-10-09T00:00:00Z'],['note-draft','note用の下書き','journal-note','unpublished','2026-10-08T00:00:00Z','2026-10-08T00:00:00Z'],['note-posted','note用の投稿済記事','journal-note','published','2026-10-06T00:00:00Z','2026-10-11T00:00:00Z']].map(([id,title,category,noteStatus,createdAt,updatedAt])=>normalizeDraft({...state.drafts[0],id,title,category,noteStatus,createdAt,updatedAt,pinnedAt:id==='diary'?'2026-10-10T00:00:00Z':null,body:'タグの色と並び順を確認するための架空の記事です。'},{remote:true}));state.currentId=null;showView('list');`
        : scenario ? `state.serverDrafts=state.drafts.map(d=>normalizeDraft(d,{remote:true}));state.serverCategories=defaultCategories();readArray=key=>key===LEGACY_KEYS.drafts?[${scenario === 'legacy-matched' ? '{...state.drafts[0]}' : "{...state.drafts[0],title:'スマホに残った旧記事',body:'この端末だけに残った架空の文章です。'}"}]:key===LEGACY_KEYS.categories?defaultCategories():[];showView('settings');updateMigrationPanel();` : '';
      text = text.replace('void setupFirebase();', fixture + extra + 'state.draftsCurrent=state.categoriesCurrent=true;state.serverDrafts=state.drafts.map(d=>({...d}));refreshSyncStatus();');
    }
    response.writeHead(200, { 'Content-Type': name.endsWith('.css') ? 'text/css' : name.endsWith('.html') ? 'text/html' : 'text/javascript', 'Cache-Control': 'no-store' });
    response.end(text);
  } catch { response.writeHead(500); response.end('Fixture error'); }
}).listen(8765, '127.0.0.1', () => console.log('Journal fixture: http://localhost:8765/ (synthetic data only)'));
