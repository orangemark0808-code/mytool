import { MANGA_STATUSES, MANGA_GENRES, MANGA_TYPES, mangaTags, normalizeMangaRow, buildMangaCsv } from './manga-core.mjs?v=2026.10.22-7';

// 共通の保存処理は呼び出し側に任せ、漫画フォームの表示と入力を担当する。
export function createMangaEditor({element:$,getNote,isMangaNote,ensureManga,onChange,syncNote,escapeHtml}){
  let activePage=0,renderedNote=null;
  const options=(values,current)=>[...new Set([...values,current])].map(value=>`<option value="${escapeHtml(value)}" ${value===current?'selected':''}>${escapeHtml(value||'空白')}</option>`).join('');
  function render(){
    const note=getNote();if(!isMangaNote(note))return;
    if(renderedNote!==note){activePage=0;renderedNote=note;$('mangaPages').innerHTML=''}
    const manga=ensureManga(note);
    $('mangaStatusInput').innerHTML=options(MANGA_STATUSES,manga.status);
    $('mangaGenreInput').innerHTML=options(MANGA_GENRES,manga.genre);
    $('mangaStatusInput').value=manga.status;$('mangaGenreInput').value=manga.genre;
    $('mangaTagsInput').value=manga.tags.join(', ');
    $('mangaCsvStatus').textContent='';renderPages();
  }
  function renderPages(){
    const note=getNote();if(!isMangaNote(note))return;
    const manga=ensureManga(note);activePage=Math.min(activePage,manga.pages.length-1);
    const collapsed=new Set([...$('mangaPages').querySelectorAll('details:not([open])')].map(page=>Number(page.dataset.mangaPage)));
    $('mangaPageCount').value=manga.pages.length;
    $('mangaPages').innerHTML=manga.pages.map((page,p)=>`<details class="manga-page" data-manga-page="${p}" ${collapsed.has(p)?'':'open'}><summary>ページ${p+1} <span>${page.rows.length}コマ</span></summary><div class="manga-page-body">${page.rows.map((row,r)=>`<div class="manga-row" data-manga-row="${r}"><div class="manga-row-basic"><label>コマ<input data-manga-field="panel" value="${escapeHtml(row.panel)}" aria-label="ページ${p+1} コマ${r+1} コマID" inputmode="numeric"></label><label>人物名や状況<input data-manga-field="actor" value="${escapeHtml(row.actor)}" aria-label="ページ${p+1} コマ${r+1} 人物名や状況"></label><label>区分<select data-manga-field="type" aria-label="ページ${p+1} コマ${r+1} 区分">${options(MANGA_TYPES,row.type)}</select></label></div><label>詳細<textarea data-manga-field="detail" rows="3" aria-label="ページ${p+1} コマ${r+1} 詳細">${escapeHtml(row.detail)}</textarea></label><label>参照・補足<textarea data-manga-field="reference" rows="2" aria-label="ページ${p+1} コマ${r+1} 参照・補足">${escapeHtml(row.reference)}</textarea></label><div class="manga-row-actions"><button type="button" data-manga-action="up" aria-label="ページ${p+1} コマ${r+1}を上へ" ${r===0?'disabled':''}>↑ 上へ</button><button type="button" data-manga-action="down" aria-label="ページ${p+1} コマ${r+1}を下へ" ${r===page.rows.length-1?'disabled':''}>↓ 下へ</button><button type="button" data-manga-action="copy" aria-label="ページ${p+1} コマ${r+1}を複製">複製</button><button type="button" data-manga-action="remove" aria-label="ページ${p+1} コマ${r+1}を削除">削除</button></div></div>`).join('')}<button type="button" class="add-item-button" data-manga-action="add-row">＋ コマ追加</button></div></details>`).join('');
  }
  function sync(){
    const note=getNote();if(!isMangaNote(note))return;
    const manga=ensureManga(note);
    manga.status=MANGA_STATUSES.includes($('mangaStatusInput').value)?$('mangaStatusInput').value:MANGA_STATUSES[0];
    manga.genre=$('mangaGenreInput').value;manga.tags=mangaTags($('mangaTagsInput').value);
  }
  function focusRow(p,r){
    const page=$('mangaPages').querySelector(`[data-manga-page="${p}"]`);if(!page)return;
    page.open=true;page.querySelector(`[data-manga-row="${r}"] [data-manga-field="detail"]`)?.focus();
  }
  function addRow(p=activePage){
    const manga=ensureManga(getNote()),page=manga.pages[p];if(!page)return;
    activePage=p;page.rows.push(normalizeMangaRow({panel:String(page.rows.length+1)}));renderPages();onChange();focusRow(p,page.rows.length-1);
  }
  function rowInput(event){
    const field=event.target.dataset.mangaField;
    if(!['panel','actor','type','detail','reference'].includes(field)||!isMangaNote(getNote()))return;
    const p=Number(event.target.closest('[data-manga-page]').dataset.mangaPage),r=Number(event.target.closest('[data-manga-row]').dataset.mangaRow);
    const row=ensureManga(getNote()).pages[p]?.rows[r];if(!row)return;
    activePage=p;row[field]=event.target.value;onChange();
  }
  async function exportCsv(copy){
    syncNote();const note=getNote();if(!isMangaNote(note))return;
    if(!note.title.trim()){$('mangaTitleError').hidden=false;$('noteTitleInput').focus();return}
    const csv=buildMangaCsv(note.title,ensureManga(note));
    try{
      if(copy){await navigator.clipboard.writeText(csv);if(getNote()===note)$('mangaCsvStatus').textContent='CSVをコピーしました。';return}
      const blob=new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download=`${note.title.replace(/[\\/:*?"<>|]/g,'_').slice(0,80)}.csv`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);
      $('mangaCsvStatus').textContent='CSVを書き出しました。';
    }catch(error){if(getNote()===note)$('mangaCsvStatus').textContent=`CSVを書き出せませんでした: ${error.message}`}
  }
  function bind(){
    ['mangaStatusInput','mangaGenreInput','mangaTagsInput'].forEach(id=>{$(id).oninput=onChange;$(id).onchange=onChange});
    $('mangaAddPageButton').onclick=()=>{const manga=ensureManga(getNote());manga.pages.push({pageNumber:manga.pages.length+1,rows:[normalizeMangaRow()]});activePage=manga.pages.length-1;renderPages();onChange();focusRow(activePage,0)};
    $('mangaAddRowButton').onclick=()=>addRow();
    $('mangaPages').oninput=rowInput;$('mangaPages').onchange=event=>{if(event.target.tagName==='SELECT')rowInput(event)};
    $('mangaPages').onfocusin=event=>{const page=event.target.closest('[data-manga-page]');if(page)activePage=Number(page.dataset.mangaPage)};
    $('mangaPages').onclick=event=>{
      const button=event.target.closest('[data-manga-action]');if(!button||!isMangaNote(getNote()))return;
      const p=Number(button.closest('[data-manga-page]').dataset.mangaPage),action=button.dataset.mangaAction;
      if(action==='add-row'){addRow(p);return}
      const r=Number(button.closest('[data-manga-row]').dataset.mangaRow),rows=ensureManga(getNote()).pages[p].rows;
      if(action==='up'&&r>0)[rows[r-1],rows[r]]=[rows[r],rows[r-1]];
      if(action==='down'&&r<rows.length-1)[rows[r+1],rows[r]]=[rows[r],rows[r+1]];
      if(action==='copy')rows.splice(r+1,0,{...rows[r]});
      if(action==='remove'){rows.splice(r,1);if(!rows.length)rows.push(normalizeMangaRow())}
      activePage=p;renderPages();onChange();
    };
    $('mangaCopyCsvButton').onclick=()=>exportCsv(true);$('mangaDownloadCsvButton').onclick=()=>exportCsv(false);
  }
  return{bind,render,sync};
}
