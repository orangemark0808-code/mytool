# ネタキロク

漫画ネタをGoogleログインユーザーごとに保存し、ネタ単位でCSVダウンロード/コピーできる静的Webアプリです。

## 公開URL

`https://orangemark0808-code.github.io/mytool/netakiroku/`

## Firebase設定

本番用のFirebase接続情報はリポジトリに保存しません。GitHub Actionsで `firebase-config.js` を生成し、`window.NETAKIROKU_FIREBASE_CONFIG` として読み込みます。

ローカル確認では `firebase-config.example.js` を参考に `firebase-config.local.js` を作成してください。このファイルは `.gitignore` 対象です。

必要なGitHub Actions Secrets:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_MEASUREMENT_ID`

## Firestore

ネタ本文:

`users/{uid}/netakiroku/{netaId}`

設定:

`users/{uid}/netakirokuSettings/main`

Firestore Rules例:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/netakiroku/{netaId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/netakirokuSettings/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## ローカル確認

PowerShellでリポジトリ直下から以下を実行し、ブラウザで `http://localhost:8000/netakiroku/` を開きます。

```powershell
python -m http.server 8000
```
