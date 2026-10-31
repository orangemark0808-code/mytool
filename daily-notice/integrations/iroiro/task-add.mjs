// Append using the existing iroiro schema and the authenticated user's paths.
export function validateAddition(value) {
  if(!value||typeof value.group!=='string'||typeof value.text!=='string'||
     typeof value.operationId!=='string'||!/^[a-f0-9-]{36}$/.test(value.operationId))throw new Error('invalid-input');
  const group=value.group.trim(),text=value.text.trim();
  if(!group||!text||group.length>200||text.length>2000)throw new Error('invalid-input');
  return{group,text,operationId:value.operationId};
}
// Firestore maps have no field order: Listen and BatchGet may serialize the
// same snapshot differently. Keep array order and exact Timestamp precision.
const same = (a,b) => {
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
  if(typeof a.isEqual==='function')return a.isEqual(b);
  if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((value,i)=>same(value,b[i]));
  const keys=Object.keys(a);
  return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&same(a[key],b[key]));
};
const millis = value => value?.toMillis?.() ?? (Date.parse(value)||0);
const hasChecklist = data => data.type==='checklist'||Array.isArray(data.task?.items);

export async function appendTask({auth,firestore:f,taskModule,db},input) {
  const {group,text,operationId}=validateAddition(input),uid=auth.currentUser?.uid;
  if(!uid)throw Object.assign(new Error('auth-required'),{code:'auth/no-current-user'});
  const active=()=>{if(auth.currentUser?.uid!==uid)throw Object.assign(new Error('account-changed'),{code:'auth/account-changed'});};
  const settingsRef=f.doc(db,'users',uid,'iroiroSettings','main');
  const notesRef=f.collection(db,'users',uid,'iroiroNotes');
  // The existing settings updatedAt serializes additions, including two clients
  // creating the same group. No lock/revision documents or schema fields.
  for(let attempt=0;attempt<5;attempt++) {
    active();
    const settings=await f.getDocFromServer(settingsRef);
    const matches=settings.exists()&&Array.isArray(settings.data().categories)?settings.data().categories.filter(c=>c?.name?.trim()==='タスク'&&typeof c.id==='string'):[];
    if(matches.length!==1)throw new Error('task-category-not-unique');
    const categoryId=matches[0].id;
    const found=await f.getDocsFromServer(f.query(notesRef,f.where('categoryId','==',categoryId),f.limit(501)));
    if(found.size>500)throw new Error('too-large');
    const candidates=found.docs.filter(d=>d.data().title?.trim()===group&&hasChecklist(d.data()));
    const target=f.doc(notesRef); // Stable throughout SDK transaction retries.
    try {
      await f.runTransaction(db,async tx=>{
        const currentSettings=await tx.get(settingsRef);active();
        if(!currentSettings.exists()||!same(currentSettings.data(),settings.data()))throw new Error('retry-addition');
        const current=await Promise.all(candidates.map(d=>tx.get(d.ref)));
        active();
        const usable=current.filter(d=>d.exists()&&d.data().categoryId===categoryId&&d.data().title?.trim()===group&&hasChecklist(d.data()));
        for(const doc of usable) {
          const data=doc.data(),items=data.task?.items||data.items||[];
          const duplicate=items.find(item=>item?.id===operationId);
          if(duplicate){if(duplicate.text!==text)throw new Error('operation-conflict');return;}
        }
        const latest=usable.sort((a,b)=>millis(b.data().updatedAt)-millis(a.data().updatedAt)||a.id.localeCompare(b.id))[0];
        if(candidates.length&&!latest)throw new Error('retry-addition');
        const item={id:operationId,text,checked:false,order:0};
        if(latest) {
          const data=latest.data();
          if(data.task!=null&&(!Array.isArray(data.task.items)||typeof data.task!=='object'))throw new Error('invalid-data');
          const items=data.task?.items??data.items??[];
          if(!Array.isArray(items)||items.length>=500)throw new Error('too-large');
          if(items.some(i=>!i||typeof i.id!=='string'||typeof i.text!=='string'||typeof i.checked!=='boolean'))throw new Error('invalid-data');
          item.order=items.length;
          const task=data.task?{...data.task,items:[...items,item]}:{...taskModule.normalizeTask(),items:[...items,item]};
          tx.update(latest.ref,{task,updatedAt:f.serverTimestamp()});
        }else {
          tx.set(target,{title:group,type:'checklist',content:'',items:[item],contentByType:{text:''},itemsByType:{bullet:[],checklist:[item]},categoryId,
            task:{...taskModule.normalizeTask(),items:[item]},manga:null,urls:[],isPinned:false,schemaVersion:3,
            createdAt:f.serverTimestamp(),updatedAt:f.serverTimestamp()});
        }
        tx.update(settingsRef,{updatedAt:f.serverTimestamp()});
      });
      active();return;
    }catch(error){if(error.message!=='retry-addition'||attempt===4)throw error;}
  }
}
