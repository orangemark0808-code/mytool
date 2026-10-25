import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeNoteData} from '../note-concurrency.mjs';
import {appendTask} from '../task-add.mjs';
import * as taskModule from '../task-core.mjs';
import {harness} from './harness.mjs';
const item=(id,text=id)=>({id,text,checked:false,order:0});
const path=id=>`users/test-user/iroiroNotes/${id}`;
const settings='users/test-user/iroiroSettings/main';
const id1='11111111-1111-4111-8111-111111111111',id2='22222222-2222-4222-8222-222222222222';
const note=(title='グループ')=>({title,type:'checklist',categoryId:'tasks',content:'補足',items:[item('old')],task:{status:'doing',priority:'high',dueDate:'2026-10-30',items:[item('old')]},updatedAt:'2026-10-24T00:00:00Z'});
function adapter(initial=[]) {
 const store=new Map([[settings,{categories:[{id:'tasks',name:'タスク'}],updatedAt:'initial'}],...initial]),versions=new Map(),writes=[];
 let counter=0,clock=0;
 const ref=p=>({path:p,id:p.split('/').at(-1)});
 const snap=target=>{const data=structuredClone(store.get(target.path));return{ref:target,id:target.id,exists:()=>data!==undefined,data:()=>structuredClone(data)};};
 const auth={currentUser:{uid:'test-user'}};
 const f={
  doc:(...parts)=>parts.length===1?ref(`${parts[0].path}/new-${++counter}`):ref(parts.slice(1).join('/')),
  collection:(_, ...parts)=>ref(parts.join('/')),
  query:(ref,...filters)=>({ref,filters}),where:(...x)=>x,limit:x=>x,
  getDocFromServer:async target=>snap(target),
  getDocsFromServer:async q=>({size:[...store].filter(([p,d])=>p.startsWith(q.ref.path+'/')&&d.categoryId===q.filters[0][2]).length,
   docs:[...store].filter(([p,d])=>p.startsWith(q.ref.path+'/')&&d.categoryId===q.filters[0][2]).map(([p])=>snap(ref(p)))}),
  serverTimestamp:()=>`2026-10-25T00:00:${String(++clock).padStart(2,'0')}Z`,
  runTransaction:async(_,callback)=>{
   for(let attempt=0;attempt<10;attempt++) {
    const reads=new Map(),pending=[];
    const result=await callback({get:async r=>{reads.set(r.path,versions.get(r.path)||0);return snap(r);},
      set:(r,d)=>pending.push([r,d,false]),update:(r,d)=>pending.push([r,d,true])});
    await new Promise(setImmediate);
    if([...reads].some(([p,v])=>(versions.get(p)||0)!==v))continue;
    for(const [r,d,merge] of pending){store.set(r.path,merge?{...store.get(r.path),...structuredClone(d)}:structuredClone(d));versions.set(r.path,(versions.get(r.path)||0)+1);writes.push(r.path);}
    return result;
   }throw new Error('transaction-contention');
  },
 };
 return{auth,firestore:f,db:{},taskModule,store,writes};
}

test('既存グループの末尾に追加し、設定・本文・作成日・元の項目を保持する',async()=>{
 const original={...note(),createdAt:'created',custom:'keep'},a=adapter([[path('n'),original]]);
 await appendTask(a,{group:' グループ ',text:' 新項目 ',operationId:id1});
 const saved=a.store.get(path('n'));
 assert.deepEqual(saved.task.items,[item('old'),{...item(id1,'新項目'),order:1}]);
 assert.equal(saved.content,original.content);assert.equal(saved.createdAt,'created');assert.equal(saved.custom,'keep');
 for(const k of ['status','priority','dueDate'])assert.equal(saved.task[k],original.task[k]);
 assert.deepEqual(saved.items,original.items);assert.notEqual(saved.updatedAt,original.updatedAt);
});
test('新規グループを既存スキーマと同じ初期値で作成する',async()=>{
 const a=adapter();await appendTask(a,{group:'新規',text:'作業',operationId:id1});
 const saved=[...a.store.values()].find(x=>x.title==='新規');
 assert.equal(saved.type,'checklist');assert.equal(saved.categoryId,'tasks');assert.equal(saved.schemaVersion,3);
 assert.equal(saved.task.status,'todo');assert.equal(saved.task.priority,'normal');assert.equal(saved.task.dueDate,'');
 assert.deepEqual(saved.items,saved.task.items);assert.deepEqual(saved.itemsByType.checklist,saved.task.items);
 assert.deepEqual(Object.keys(saved).sort(),['title','type','content','items','contentByType','itemsByType','categoryId','task','manga','urls','isPinned','schemaVersion','createdAt','updatedAt'].sort());
});
test('題名が同じなら更新日の新しいグループを選び、別カテゴリーへ追加しない',async()=>{
 const a=adapter([[path('a'),note()],[path('b'),{...note(),updatedAt:'2026-10-25T00:00:00Z'}],[path('c'),{...note(),categoryId:'other',updatedAt:'2026-10-26T00:00:00Z'}]]);
 await appendTask(a,{group:'グループ',text:'作業',operationId:id1});
 assert.equal(a.store.get(path('a')).task.items.length,1);assert.equal(a.store.get(path('b')).task.items.length,2);assert.equal(a.store.get(path('c')).task.items.length,1);
});
test('同時に同じ新規グループへ追加しても1メモに両方の項目が残る',async()=>{
 const a=adapter();await Promise.all([appendTask(a,{group:'同時',text:'一',operationId:id1}),appendTask(a,{group:'同時',text:'二',operationId:id2})]);
 const notes=[...a.store.values()].filter(x=>x.title==='同時');assert.equal(notes.length,1);
 assert.deepEqual(notes[0].task.items.map(x=>x.text).sort(),['一','二']);
});
test('結果不明の追加を同じ操作IDで再試行しても二重追加しない',async()=>{
 const a=adapter(),input={group:'再試行',text:'一',operationId:id1};await appendTask(a,input);const count=a.writes.length;
 await appendTask(a,input);assert.equal(a.writes.length,count);
 assert.equal([...a.store.values()].find(x=>x.title==='再試行').task.items.length,1);
});
test('未ログイン・空欄・不正な既存項目・カテゴリー不明では書き込まない',async()=>{
 for(const kind of ['auth','input','data','category']) {
  const a=adapter([[path('n'),note()]]);let input={group:'グループ',text:'作業',operationId:id1};
  if(kind==='auth')a.auth.currentUser=null;
  if(kind==='input')input.text=' ';
  if(kind==='data')a.store.get(path('n')).task.items=[null];
  if(kind==='category')a.store.get(settings).categories=[];
  await assert.rejects(appendTask(a,input));assert.equal(a.writes.length,0,kind);
 }
});
test('チェックリスト旧形式も元の配列を残して専用タスクへ追加する',async()=>{
 const original=note();delete original.task;const a=adapter([[path('n'),original]]);
 await appendTask(a,{group:'グループ',text:'作業',operationId:id1});
 assert.equal(a.store.get(path('n')).task.items.length,2);assert.deepEqual(a.store.get(path('n')).items,original.items);
});
test('別端末の追記と手元の編集をID単位で統合する',()=>{
 const base=note(),local=structuredClone(base),remote=structuredClone(base);
 local.content='手元で補足変更';local.task.items[0].checked=true;remote.task.items.push({...item('new'),order:1});
 const result=mergeNoteData(base,local,remote);
 assert.equal(result.content,'手元で補足変更');assert.equal(result.task.items[0].checked,true);assert.equal(result.task.items[1].id,'new');
 assert.deepEqual(base,note(),'引数を書き換えない');
});
test('同じ項目の異なる編集・削除と編集の競合を上書きしない',()=>{
 const base=note(),local=structuredClone(base),remote=structuredClone(base);
 local.task.items[0].text='手元';remote.task.items[0].text='別端末';
 assert.throws(()=>mergeNoteData(base,local,remote),{code:'edit-conflict'});
 local.task.items=[];assert.throws(()=>mergeNoteData(base,local,remote),{code:'edit-conflict'});
});
test('実際の編集保存で別端末の追加を維持し、再保存後も消さない',async()=>{
 const original=note(),h=harness([[path('n'),original]]);h.context.original=original;
 h.run("categories=[{id:'tasks',name:'タスク'}];openEditor(normalizeNote('n',original))");
 h.element('noteContentInput').value='手元の補足';h.run('syncEditingNoteFromForm();scheduleSave()');
 h.store.get(path('n')).task.items.push({...item('remote'),order:1});
 assert.equal(await h.run('requestSave()'),true);
 assert.equal(h.store.get(path('n')).task.items.length,2);assert.equal(h.run('editingNote.task.items.length'),2);
 h.element('noteContentInput').value='次の補足';h.run('syncEditingNoteFromForm();scheduleSave()');
 assert.equal(await h.run('requestSave()'),true);assert.equal(h.store.get(path('n')).task.items.length,2);
});
test('実際の競合保存は失敗し、入力と別端末の項目を両方保持する',async()=>{
 const original=note(),h=harness([[path('n'),original]]);h.context.original=original;
 h.run("categories=[{id:'tasks',name:'タスク'}];openEditor(normalizeNote('n',original));editingNote.task.items[0].text='手元';scheduleSave()");
 h.store.get(path('n')).task.items[0].text='別端末';
 assert.equal(await h.run('requestSave()'),false);assert.equal(h.run('editingNote.task.items[0].text'),'手元');
 assert.equal(h.store.get(path('n')).task.items[0].text,'別端末');assert.match(h.element('saveStatus').textContent,/入力を保持/);
});

test('保存待ち中の項目追加と別端末の追加も保持して、次の保存へ引き継ぐ',async()=>{
 const original=note(),h=harness([[path('n'),original]]);h.context.original=original;
 h.run("categories=[{id:'tasks',name:'タスク'}];openEditor(normalizeNote('n',original))");
 h.element('noteContentInput').value='補足変更';h.run('syncEditingNoteFromForm();scheduleSave()');
 h.store.get(path('n')).task.items.push({...item('remote'),order:1});
 let release;h.beforeWrite=()=>new Promise(resolve=>{release=resolve;});
 const saving=h.run('requestSave()');await new Promise(setImmediate);
 h.run("editingNote.task.items.push({id:'local',text:'手元追加',checked:false,order:1});scheduleSave()");
 release();h.beforeWrite=null;await saving;await h.run("requestSave()");
 assert.deepEqual(h.store.get(path('n')).task.items.map(x=>x.id).sort(),['local','old','remote']);
 assert.deepEqual(Array.from(h.run('editingNote.task.items.map(x=>x.id).sort()')),['local','old','remote']);
});

test('旧チェックリストの編集と別端末からの専用タスク追記も統合する',async()=>{
 const original=note();delete original.task;const h=harness([[path('n'),original]]);h.context.original=original;
 h.run("categories=[{id:'tasks',name:'タスク'}];openEditor(normalizeNote('n',original));editingNote.task.items[0].checked=true;scheduleSave()");
 h.store.get(path('n')).task={status:'todo',priority:'normal',dueDate:'',items:[item('old'),{...item('remote'),order:1}]};
 assert.equal(await h.run('requestSave()'),true);
 assert.equal(h.store.get(path('n')).task.items.length,2);assert.equal(h.store.get(path('n')).task.items[0].checked,true);
});
