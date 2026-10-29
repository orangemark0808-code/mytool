import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './harness.mjs';

function setup(task=false){
  const h=harness(),input={dataset:task?{taskItem:'0'}:{item:'0'}};
  h.context.document.querySelector=()=>null;
  h.context.document.querySelectorAll=selector=>selector==='[data-item]'?[input]:[];
  h.run(`categories=[{id:'tasks',name:'タスク'}];openEditor(normalizeNote('note',{title:'調味料',type:'checklist',categoryId:'${task?'tasks':''}',items:[{id:'a',text:'クミン'}]}));bindTaskEvents()`);
  return {h,input,container:h.element(task?'taskItemsList':'itemsList'),count:()=>h.run(task?'editingNote.task.items.length':'editingNote.items.length'),key:event=>task?h.element('taskItemsList').onkeydown(event):input.onkeydown(event)};
}
for(const task of [false,true])test(`${task?'タスク':'通常'}チェックリストは変換Enterで追加せず、確定後のEnterで1行追加する`,()=>{
  const {h,input,container,count,key}=setup(task);let prevented=0;
  const event={key:'Enter',target:input,preventDefault:()=>prevented++};
  key({...event,isComposing:true});key({...event,isComposing:false,keyCode:229});key({...event,which:229});assert.equal(count(),1);assert.equal(prevented,0);
  container.oncompositionstart({target:input});key(event);assert.equal(count(),1);
  container.oncompositionend({target:input});key(event);assert.equal(count(),2);assert.equal(prevented,1);
  assert.equal(h.run(task?'editingNote.task.items[0].text':'editingNote.items[0].text'),'クミン');
});
