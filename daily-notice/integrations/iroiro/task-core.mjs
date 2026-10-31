// Firestoreや画面に依存しない、タスクの日付・状態・並び順。
export const TASK_STATUS_LABELS = Object.freeze({todo:'未着手',doing:'進行中',done:'完了'});
export const TASK_PRIORITY_LABELS = Object.freeze({high:'高',normal:'通常',low:'低'});

export function validTaskDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const [year,month,day]=value.split('-').map(Number);
  if(year<1)return false;
  const date=new Date(0);
  date.setFullYear(year,month-1,day);date.setHours(0,0,0,0);
  return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day;
}

export function localDateKey(date=new Date()){
  return`${String(date.getFullYear()).padStart(4,'0')}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

export function normalizeTask(value={}){
  const raw=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const items=(Array.isArray(raw.items)?raw.items:[]).filter(item=>item&&typeof item==='object'&&!Array.isArray(item)).map((item,index)=>({id:String(item.id||`task-item-${index}`),text:String(item.text||''),checked:Boolean(item.checked),order:index}));
  return{
    status:Object.hasOwn(TASK_STATUS_LABELS,raw.status)?raw.status:'todo',
    priority:Object.hasOwn(TASK_PRIORITY_LABELS,raw.priority)?raw.priority:'normal',
    dueDate:validTaskDate(raw.dueDate)?raw.dueDate:'',
    items,
  };
}

export function taskIsOverdue(task,today=localDateKey()){
  return task?.status!=='done'&&validTaskDate(task?.dueDate)&&task.dueDate<today;
}

export function compareTaskDue(a,b){
  // 並び替え中にチェック項目の配列まで複製しない。
  const first=a||{},second=b||{};
  const done=Number(first.status==='done')-Number(second.status==='done');
  if(done)return done;
  const date=(validTaskDate(first.dueDate)?first.dueDate:'9999-99-99').localeCompare(validTaskDate(second.dueDate)?second.dueDate:'9999-99-99');
  if(date)return date;
  const rank={high:0,normal:1,low:2};
  return (Object.hasOwn(rank,first.priority)?rank[first.priority]:1)-(Object.hasOwn(rank,second.priority)?rank[second.priority]:1);
}

export function taskProgress(task){
  let total=0,done=0;
  for(const item of Array.isArray(task?.items)?task.items:[]){
    if(!item||!String(item.text||'').trim())continue;
    total++;if(item.checked)done++;
  }
  return{total,done};
}
