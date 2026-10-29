import { foodInventoryFromSources, parseFoodQuantity } from './food-core.mjs';

// Read-only export of the stock actually shown by Iroiro, including legacy imports.
// Preset settings, note bodies, credentials, and unrelated categories never leave.
export async function readFoodInventory({auth,firestore,db}) {
  if(!auth.currentUser)throw Object.assign(new Error('auth-required'),{code:'auth/no-current-user'});
  const owner=auth.currentUser.uid;
  const settings=await firestore.getDocFromServer(firestore.doc(db,'users',owner,'iroiroSettings','main'));
  const matches=(Array.isArray(settings.data()?.categories)?settings.data().categories:[]).filter(item=>typeof item?.name==='string'&&item.name.trim()==='食材'&&typeof item.id==='string');
  if(matches.length!==1)throw new Error('food-category-not-unique');
  const categoryId=matches[0].id;
  const result=await firestore.getDocsFromServer(firestore.query(firestore.collection(db,'users',owner,'iroiroNotes'),firestore.where('categoryId','==',categoryId),firestore.limit(501)));
  if(result.size>500||auth.currentUser?.uid!==owner)throw new Error('invalid-result');
  const sources=result.docs.map(document=>({...document.data(),id:document.id}));
  const items=foodInventoryFromSources(categoryId,sources).foodList.items.filter(item=>!item.checked&&item.quantity!=='0').map(item=>{
    if(!item.name.trim()||item.name.length>120||item.quantity.length>40||item.unit.length>20||item.quantity&&parseFoodQuantity(item.quantity)===null)throw new Error('invalid-food');
    return {id:item.id,name:item.name,quantity:item.quantity,unit:item.unit,storage:item.storage,useSoon:item.useSoon,expiryKind:item.expiryKind,expiryDate:item.expiryDate};
  });
  const payload={fetchedAt:new Date().toISOString(),items};
  if(items.length>1000||new TextEncoder().encode(JSON.stringify(payload)).byteLength>490000)throw new Error('too-large');
  return payload;
}
