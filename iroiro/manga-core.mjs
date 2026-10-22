// ネタキロクと同じページ・コマ構成。Firestoreや画面には依存しない。
export const MANGA_STATUSES=Object.freeze(['ネタ作成中','漫画未作成','漫画作成済み','ボツ']);
export const MANGA_GENRES=Object.freeze(['AI制作','日常','仕事','制作裏話','メモ']);
export const MANGA_TYPES=Object.freeze(['','(状)','(PC)','(心)','(M)','(叫)','(回)']);
const record=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
export function mangaTags(value){
  return [...new Set((Array.isArray(value)?value:String(value||'').split(/[,、\n]/)).map(tag=>String(tag).trim()).filter(Boolean))];
}
export function normalizeMangaRow(value={}){
  const row=record(value);
  return{panel:String(row.panel??'1'),actor:String(row.actor??''),type:MANGA_TYPES.includes(row.type)?row.type:'',detail:String(row.detail??''),reference:String(row.reference??'')};
}
export function normalizeManga(value={}){
  const raw=record(value),source=Array.isArray(raw.pages)&&raw.pages.length?raw.pages:[{}];
  const pages=source.filter(page=>page&&typeof page==='object'&&!Array.isArray(page)).map((page,index)=>({pageNumber:index+1,rows:(Array.isArray(page.rows)&&page.rows.length?page.rows:[{}]).filter(row=>row&&typeof row==='object'&&!Array.isArray(row)).map(normalizeMangaRow)}));
  if(!pages.length)pages.push({pageNumber:1,rows:[]});
  for(const page of pages)if(!page.rows.length)page.rows.push(normalizeMangaRow());
  return{status:MANGA_STATUSES.includes(raw.status)?raw.status:MANGA_STATUSES[0],genre:String(raw.genre??MANGA_GENRES[0]),tags:mangaTags(raw.tags),pages};
}
export function mangaSearchText(manga){
  const data=manga||normalizeManga();
  return[data.status,data.genre,...data.tags,...data.pages.flatMap(page=>page.rows.flatMap(row=>[row.panel,row.actor,row.type,row.detail,row.reference]))].join('\n');
}
export function mangaHasContent(manga){
  return Boolean(manga&&(manga.tags.some(tag=>tag.trim())||manga.pages.some(page=>page.rows.some(row=>[row.actor,row.type,row.detail,row.reference].some(value=>value.trim())||row.panel.trim()&&row.panel.trim()!=='1'))));
}
function csvCell(value){
  let text=String(value??'');
  // 表計算ソフトで、入力した文章が数式として実行されるのを防ぐ。
  if(/^[\s]*[=+\-@]/.test(text))text="'"+text;
  return/[",\r\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text;
}
export function buildMangaCsv(title,manga){
  const pages=normalizeManga(manga).pages;
  return pages.flatMap((page,pageIndex)=>page.rows.map((row,rowIndex)=>[pageIndex===0&&rowIndex===0?title:'',rowIndex===0?pageIndex+1:'',row.panel,row.actor,row.type,row.detail,row.reference].map(csvCell).join(','))).join('\r\n');
}
