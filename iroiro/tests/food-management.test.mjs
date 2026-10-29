import test from 'node:test';
import assert from 'node:assert/strict';
import { harness,tick } from './harness.mjs';
import { normalizeFoodList,foodInventoryId } from '../food-core.mjs';
import { defaultFoodPresets,readFoodPresets,validateFoodPresets } from '../food-presets.mjs';

const rootId=foodInventoryId('food'),notePath=`users/test-user/iroiroNotes/${rootId}`,settingsPath='users/test-user/iroiroSettings/main';
const categories=[{id:'food',name:'食材',color:'#38A169'},{id:'app',name:'アプリ',color:'#FF7F00'}];
const original={title:'食材',categoryId:'food',foodList:normalizeFoodList({items:[{id:'a',name:'豚こま肉',quantity:'300',unit:'g',storage:'chilled',memo:'開封済み',expiryKind:'useBy',expiryDate:'2026-11-01'}]})};
function setup(settings={categories,otherSetting:'残す'}){const h=harness([[notePath,original],[settingsPath,settings]]);h.context.foodCategories=categories;h.context.original=original;h.run(`categories=foodCategories;notes=[normalizeNote('${rootId}',original)];openFoodInventory('food')`);return h}
function stage(h,patch){h.context.inlinePatch=patch;assert.equal(h.run("foodEditor.stageInline('a',inlinePatch)"),true)}
function choose(h,name){h.run('foodEditor.bind()');h.element('foodPresetChoices').onchange({target:{dataset:{foodPreset:name},checked:true}})}

test('未設定は現在の12品を引き継ぎ、保存済みの空配列は空のまま扱う',()=>{
  assert.equal(readFoodPresets(undefined).length,12);assert.deepEqual(readFoodPresets([]),[]);
  const copy=defaultFoodPresets();copy[0].quantity='1';assert.equal(defaultFoodPresets()[0].quantity,'300');
});

test('カテゴリーの初期化でも保存済みの定番設定と他の設定を消さない',async()=>{
  const custom=defaultFoodPresets();custom[0].quantity='180';const h=harness([[settingsPath,{foodPresets:custom,otherSetting:'残す'}]]);
  h.context.onSnapshot=(ref,callback)=>{if(ref===settingsPath)callback({exists:()=>true,data:()=>structuredClone(h.store.get(settingsPath))});return()=>{}};
  await h.run("handleAuth({uid:'test-user'})");await tick();
  assert.equal(h.store.get(settingsPath).foodPresets[0].quantity,'180');assert.equal(h.store.get(settingsPath).otherSetting,'残す');assert.ok(h.store.get(settingsPath).categories.length>0);
});

test('定番の量・単位・保存場所・名前とIDの重複を保存前に検証する',()=>{
  const item=defaultFoodPresets()[0];
  for(const patch of [{quantity:'1/0'},{quantity:'0'},{unit:''},{storage:'constructor'},{name:''},{id:'../bad'}])assert.throws(()=>validateFoodPresets([{...item,...patch}]));
  assert.throws(()=>validateFoodPresets([item,{...item,id:'other'}]));assert.throws(()=>validateFoodPresets([item,{...item,name:'他の名前'}]));
  assert.equal(validateFoodPresets([{...item,quantity:'１／２',unit:'玉'}])[0].quantity,'1/2');
});

test('定番の追加・編集・並べ替え・削除を設定だけに保存し、在庫とカテゴリーを保持する',async()=>{
  const h=setup();h.run("foodPresetManager.open();foodPresetManager.change('usual-1','quantity','180');foodPresetManager.action('usual-1','down');foodPresetManager.action('usual-3','remove');newPresetId=foodPresetManager.add();foodPresetManager.change(newPresetId,'name','カニカマ');foodPresetManager.change(newPresetId,'quantity','3');foodPresetManager.change(newPresetId,'unit','本')");
  assert.equal(await h.run('foodPresetManager.save()'),true);const saved=h.store.get(settingsPath);
  assert.deepEqual(saved.categories,categories);assert.equal(saved.otherSetting,'残す');assert.deepEqual(h.store.get(notePath),original);
  assert.equal(saved.foodPresets[0].name,'鶏もも肉');assert.equal(saved.foodPresets.find(item=>item.name==='豚こま肉').quantity,'180');assert.ok(!saved.foodPresets.some(item=>item.id==='usual-3'));
  assert.equal(saved.foodPresets.at(-1).name,'カニカマ');assert.equal(saved.foodPresets.at(-1).unit,'本');assert.equal(h.writes.length,1);
  choose(h,'豚こま肉');h.run('foodEditor.addSelectedPresets()');assert.equal(h.run('editingNote.foodList.items[0].quantity'),'300');assert.equal(h.run('editingNote.foodList.items[1].quantity'),'180');
});

test('定番のキャンセルは保存せず、空の設定も保存後に12品へ復活しない',async()=>{
  const h=setup();h.run("foodPresetManager.open();foodPresetManager.change('usual-1','quantity','150')");assert.equal(h.run('foodPresetManager.canClose()'),false);h.run('foodPresetManager.close()');assert.equal(h.writes.length,0);
  h.run('foodPresetManager.open();for(const item of defaultFoodPresets())foodPresetManager.action(item.id,\'remove\')');assert.equal(await h.run('foodPresetManager.save()'),true);assert.deepEqual(h.store.get(settingsPath).foodPresets,[]);
  h.context.savedSettings=h.store.get(settingsPath);h.run('applyRemoteFoodPresets(savedSettings)');assert.equal(h.run('foodPresets.length'),0);assert.deepEqual(h.store.get(notePath),original);
});

test('定番が別端末で変更された場合は黙って上書きせず、入力を保持する',async()=>{
  const h=setup();h.run("foodPresetManager.open();foodPresetManager.change('usual-1','quantity','150')");const remote=defaultFoodPresets();remote[0].quantity='200';h.store.set(settingsPath,{categories,foodPresets:remote});
  assert.equal(await h.run('foodPresetManager.save()'),false);assert.equal(h.store.get(settingsPath).foodPresets[0].quantity,'200');assert.equal(h.run('foodPresetManager.canClose()'),false);assert.match(h.element('foodPresetManagerStatus').textContent,/保存するか/);
});

test('定番保存は最新のカテゴリーを保ち、保存失敗後に同じ内容で再試行できる',async()=>{
  const h=setup();h.run("foodPresetManager.open();foodPresetManager.change('usual-1','storage','frozen')");const latestCategories=[...categories,{id:'new',name:'新カテゴリー'}];h.store.set(settingsPath,{categories:latestCategories,otherSetting:'最新'});
  h.beforeWrite=()=>{throw Error('offline')};assert.equal(await h.run('foodPresetManager.save()'),false);assert.equal(h.store.get(settingsPath).foodPresets,undefined);assert.equal(h.element('foodPresetManagerFields').disabled,false);
  h.beforeWrite=null;assert.equal(await h.run('foodPresetManager.save()'),true);assert.deepEqual(h.store.get(settingsPath).categories,latestCategories);assert.equal(h.store.get(settingsPath).otherSetting,'最新');assert.equal(h.store.get(settingsPath).foodPresets[0].storage,'frozen');
});

test('定番の保存中は連打と閉じるを止め、完了後に閉じられる',async()=>{
  const h=setup();h.run("foodPresetManager.open();foodPresetManager.change('usual-1','quantity','150')");let release;h.beforeWrite=()=>new Promise(resolve=>release=resolve);
  const saving=h.run('foodPresetManager.save()');await tick();assert.equal(await h.run('foodPresetManager.save()'),false);await h.run('closeEditor()');assert.equal(h.element('editorDialog').open,true);assert.equal(h.element('foodPresetManagerFields').disabled,true);
  release();assert.equal(await saving,true);await h.run('closeEditor()');assert.equal(h.element('editorDialog').open,false);
});

test('別端末の定番設定を受け取り、次に選択する食材へ適用する',()=>{
  const h=setup(),custom=defaultFoodPresets();custom[0].quantity='180';custom[0].storage='frozen';h.context.customSettings={foodPresets:custom};h.run('applyRemoteFoodPresets(customSettings)');choose(h,'豚こま肉');h.run('foodEditor.addSelectedPresets()');
  assert.equal(h.run('editingNote.foodList.items[1].quantity'),'180');assert.equal(h.run('editingNote.foodList.items[1].storage'),'frozen');assert.deepEqual(h.store.get(notePath),original);
});

test('一覧の量・単位・保存場所だけを変更し、ID・名前・期限・メモを保って保存する',async()=>{
  const h=setup();stage(h,{quantity:'１／２',unit:'玉',storage:'frozen'});assert.equal(h.run("foodEditor.commitInline('a')"),true);await h.run('closeEditor()');
  const item=h.store.get(notePath).foodList.items[0];assert.equal(item.id,'a');assert.equal(item.name,'豚こま肉');assert.equal(item.quantity,'1/2');assert.equal(item.unit,'玉');assert.equal(item.storage,'frozen');assert.equal(item.memo,'開封済み');assert.equal(item.expiryDate,'2026-11-01');
});

test('量は入力中に保存せず、閉じるときに確定し、空欄も保存できる',async()=>{
  const h=setup();stage(h,{quantity:''});assert.equal(h.run('editingNote.foodList.items[0].quantity'),'300');assert.equal(h.writes.length,0);await h.run('closeEditor()');assert.equal(h.store.get(notePath).foodList.items[0].quantity,'');assert.equal(h.element('editorDialog').open,false);
});

test('不正な量は保存せず入力を保持し、修正後に同じ項目へ保存できる',async()=>{
  const h=setup();stage(h,{quantity:'1/0'});assert.equal(h.run("foodEditor.commitInline('a')"),false);h.run('foodEditor.render()');assert.ok(h.element('foodItemsList').innerHTML.includes('value="1/0"'));await h.run('closeEditor()');assert.equal(h.element('editorDialog').open,true);assert.equal(h.writes.length,0);
  stage(h,{quantity:'150'});assert.equal(h.run("foodEditor.commitInline('a')"),true);await h.run('closeEditor()');assert.equal(h.store.get(notePath).foodList.items[0].quantity,'150');
});

test('一覧編集中に同じ値が別端末で変わったら保存を止め、取り消しで最新値に戻る',()=>{
  const h=setup();stage(h,{quantity:'150'});h.run("editingNote.foodList.items[0].quantity='200'");assert.equal(h.run("foodEditor.commitInline('a')"),false);assert.equal(h.run('editingNote.foodList.items[0].quantity'),'200');assert.equal(h.run('foodEditor.canClose()'),false);
  h.run('foodEditor.cancelInline()');assert.equal(h.run('foodEditor.canClose()'),true);assert.equal(h.run('editingNote.foodList.items[0].quantity'),'200');
});

test('別の項目フィールドの変更を保持し、行削除後の未確定入力も安全に取り消せる',()=>{
  const h=setup();stage(h,{quantity:'150'});h.run("editingNote.foodList.items[0].memo='別端末のメモ'");assert.equal(h.run("foodEditor.commitInline('a')"),true);assert.equal(h.run('editingNote.foodList.items[0].memo'),'別端末のメモ');
  stage(h,{quantity:'100'});h.run('editingNote.foodList.items=[]');assert.equal(h.run("foodEditor.commitInline('a')"),false);assert.match(h.element('foodError').textContent,/削除/);h.run('foodEditor.cancelInline()');assert.equal(h.run('foodEditor.canClose()'),true);
});

test('一覧の行全体では編集フォームを開かず、明示した詳細ボタンだけを使う',()=>{
  const h=setup();h.run('foodEditor.bind()');const html=h.element('foodItemsList').innerHTML;assert.match(html,/data-food-inline="quantity"/);assert.match(html,/data-food-inline="storage"/);assert.match(html,/>詳細<\/button>/);assert.doesNotMatch(html,/class="food-item-open"/);
  h.element('foodItemsList').onclick({target:{closest:()=>null}});assert.equal(h.element('foodItemNameInput').value,'');
});

test('一覧の不正な保存場所を拒否し、未確定入力を持つ項目の削除で入力を残さない',()=>{
  const h=setup();stage(h,{storage:'constructor'});assert.equal(h.run("foodEditor.commitInline('a')"),false);assert.equal(h.run('editingNote.foodList.items[0].storage'),'chilled');h.run('foodEditor.cancelInline()');
  stage(h,{quantity:'abc'});h.run('editingNote.foodList.items[0].checked=true;foodEditor.deleteChecked()');assert.equal(h.run('foodEditor.canClose()'),true);assert.equal(h.run('editingNote.foodList.items.length'),0);
});

test('定番設定をバックアップで復元でき、旧バックアップでは現在の定番設定を消さない',async()=>{
  const custom=defaultFoodPresets();custom[0].quantity='180';const h=setup({categories,foodPresets:custom});h.context.raw={app:'iroiro',backupFormatVersion:1,data:{notes:[],settings:{categories}}};
  h.run('pendingBackup=validateBackup(raw)');await h.run('restorePendingBackup()');assert.equal(h.store.get(settingsPath).foodPresets[0].quantity,'180');
  h.context.raw.data.settings.foodPresets=[];h.run('pendingBackup=validateBackup(raw)');await h.run('restorePendingBackup()');assert.deepEqual(h.store.get(settingsPath).foodPresets,[]);
  h.context.raw.data.settings.foodPresets=[{...custom[0],quantity:'bad'}];assert.throws(()=>h.run('validateBackup(raw)'));
});

test('定番の保存待ち中にアカウントが変わっても次のアカウントへ書き込まない',async()=>{
  const h=setup();h.run("foodPresetManager.open();foodPresetManager.change('usual-1','quantity','180')");let reject;h.beforeWrite=()=>new Promise((resolve,fail)=>reject=fail);
  const saving=h.run('foodPresetManager.save()');await tick();h.run("currentUser={uid:'other-user'};foodPresetManager.reset()");h.element('foodPresetManagerStatus').textContent='別のアカウント';reject(Error('offline'));
  assert.equal(await saving,false);assert.equal(h.element('foodPresetManager').hidden,true);assert.equal(h.element('foodPresetManagerStatus').textContent,'別のアカウント');assert.equal(h.store.get(settingsPath).foodPresets,undefined);assert.equal(h.store.has('users/other-user/iroiroSettings/main'),false);
});

test('管理画面と一覧の名前・単位はHTMLを実行せず表示し、不正な設定は保存しない',async()=>{
  const h=setup();h.run("foodPresetManager.open();foodPresetManager.change('usual-1','name','<img src=x onerror=alert(1)>');foodPresetManager.action('usual-1','down')");
  assert.ok(!h.element('foodPresetManagerRows').innerHTML.includes('<img src=x'));assert.match(h.element('foodPresetManagerRows').innerHTML,/&lt;img/);
  h.run("foodPresetManager.change('usual-1','quantity','1/0')");assert.equal(await h.run('foodPresetManager.save()'),false);assert.equal(h.writes.length,0);
});
