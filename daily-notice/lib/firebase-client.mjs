// Firebase Web configuration is public; access is enforced by Firebase Auth and
// existing owner-scoped Firestore rules. No admin keys or refresh tokens here.
export const OWNER_UID = 'hTULUx4EdSUTDej6ZA4EznFwjSC3';
let pending;
export async function firebaseClient() {
  pending ??= (async()=>{
    const config=window.IROIRO_FIREBASE_CONFIG;
    if(!config?.apiKey||!config?.projectId)throw Error('Google接続の設定を読み込めませんでした。');
    const base='https://www.gstatic.com/firebasejs/10.12.5/';
    const [apps,a,f]=await Promise.all(['firebase-app.js','firebase-auth.js','firebase-firestore.js'].map(file=>import(/* @vite-ignore */ base+file)));
    const app=apps.getApps()[0]||apps.initializeApp(config),auth=a.getAuth(app);
    await auth.authStateReady();
    return {auth,a,f,db:f.getFirestore(app),firestore:f};
  })().catch(error=>{pending=null;throw error;});
  return pending;
}
export async function ownerClient(){const c=await firebaseClient();if(c.auth.currentUser?.uid!==OWNER_UID)throw Error('ご本人のGoogleアカウントでログインしてください。');return c;}
export async function login(){const c=await firebaseClient();const result=await c.a.signInWithPopup(c.auth,new c.a.GoogleAuthProvider());if(result.user.uid!==OWNER_UID){await c.a.signOut(c.auth);throw Error('ご本人のGoogleアカウントを選んでください。');}return result.user;}
export async function logout(){const c=await firebaseClient();await c.a.signOut(c.auth);}
export function privateRef(c,name){return c.f.doc(c.db,'users',OWNER_UID,'meta','dailyNotice'+name);}
export async function readPrivate(name){const c=await ownerClient(),result=await c.f.getDocFromServer(privateRef(c,name));return result.exists()?result.data():null;}
export async function writePrivate(name,data){const c=await ownerClient();await c.f.setDoc(privateRef(c,name),data);}
