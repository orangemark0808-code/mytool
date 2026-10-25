// Three-way merge of the existing note fields. No extra Firestore fields.
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const equal = (a,b) => {
  if(a===b)return true;
  if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((v,i)=>equal(v,b[i]));
  if(record(a)&&record(b))return Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&equal(a[k],b[k]));
  return false;
};
const copy = value => value === undefined ? undefined : structuredClone(value);
const conflict = () => { throw Object.assign(new Error('別の端末で同じ内容が変更されました。入力を保持して保存を止めています。'), {code:'edit-conflict'}); };
const withoutOrder = item => Object.fromEntries(Object.entries(item).filter(([key])=>key!=='order'));

function mergeItems(base,local,remote) {
  const valid = list => list.every(x=>record(x)&&typeof x.id==='string'&&x.id)&&new Set(list.map(x=>x.id)).size===list.length;
  if(![base,local,remote].every(valid))return conflict();
  const b=new Map(base.map(x=>[x.id,withoutOrder(x)])),l=new Map(local.map(x=>[x.id,withoutOrder(x)])),r=new Map(remote.map(x=>[x.id,withoutOrder(x)]));
  const result=new Map();
  for(const id of new Set([...b.keys(),...l.keys(),...r.keys()])) {
    const item=mergeValue(b.get(id),l.get(id),r.get(id));
    if(item!==undefined)result.set(id,item);
  }
  const order = list => list.map(x=>x.id).filter(id=>b.has(id)&&result.has(id));
  const original=base.map(x=>x.id).filter(id=>result.has(id)),lo=order(local),ro=order(remote);
  const localMoved=!equal(original,lo),remoteMoved=!equal(original,ro);
  if(localMoved&&remoteMoved&&!equal(lo,ro))return conflict();
  const sequence=localMoved?local:remote;
  const ids=[...new Set([...sequence.map(x=>x.id),...local.map(x=>x.id),...remote.map(x=>x.id)])];
  return ids.filter(id=>result.has(id)).map((id,order)=>({...result.get(id),order}));
}

function mergeValue(base,local,remote) {
  if(equal(local,base))return copy(remote);
  if(equal(remote,base)||equal(local,remote))return copy(local);
  if(Array.isArray(local)&&Array.isArray(remote)&&Array.isArray(base))return mergeItems(base,local,remote);
  if(record(local)&&record(remote)&&(base===undefined||base===null||record(base))) {
    const out={};
    for(const key of new Set([...Object.keys(base||{}),...Object.keys(local),...Object.keys(remote)])) {
      const value=mergeValue(base?.[key],local[key],remote[key]);
      if(value!==undefined)Object.defineProperty(out,key,{value,writable:true,enumerable:true,configurable:true});
    }
    return out;
  }
  return conflict();
}

export function mergeNoteData(base,local,remote) {
  // URLs are derived from the merged content by the caller.
  const strip = note => Object.fromEntries(Object.entries(note).filter(([key])=>key!=='urls'));
  return mergeValue(strip(base),strip(local),strip(remote));
}
