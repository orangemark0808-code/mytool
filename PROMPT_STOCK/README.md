# PROMPT-STOCK

PROMPT-STOCK は、AIへの依頼文をカテゴリ別に保存して、クリックでコピーできるWebアプリです。

## Firebase設定について

Firebase側の表示名とWebアプリ名は `PROMPT-STOCK` です。

ただし、Firebaseの `projectId` はプロジェクト作成時に決まるIDなので、表示名を変えても変更しません。現在のFirebase接続情報では、`projectId` は `my-toolbox-7c6cb` のまま使います。

## ローカル専用の設定ファイル

Firebaseの設定値は `firebase-config.local.js` に入れています。このファイルは `.gitignore` で除外しているため、GitHubには上げない想定です。

他のPCで使う場合は、`firebase-config.example.js` を参考にして、同じ内容の `firebase-config.local.js` を作成してください。

## GitHub Pagesで同期して使う場合

GitHub PagesでPC・iPadから同じURLを開いて同期したい場合、公開先でもFirebase設定を読める必要があります。

安全性で一番重要なのは、Firebase設定値を隠すことよりも、Firestoreのルールで本人だけが読み書きできるようにすることです。

このフォルダでは、GitHub Actionsで `firebase-config.js` を生成してGitHub Pagesへ公開する形にしています。設定値そのものはリポジトリに保存せず、GitHub Secretsに入れます。

GitHubリポジトリの `Settings` → `Secrets and variables` → `Actions` → `New repository secret` から、以下のSecretsを追加してください。

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_MEASUREMENT_ID`

今回の `FIREBASE_PROJECT_ID` は、Firebaseの表示名ではなく `my-toolbox-7c6cb` を入れてください。

GitHub Pagesは、`Settings` → `Pages` → `Build and deployment` で `GitHub Actions` を選択してください。

公開URLを `/PROMPT_STOCK/` で開く場合にも同期できるように、GitHub Actionsは以下の2か所へ `firebase-config.js` を生成します。

- `dist/firebase-config.js`
- `dist/PROMPT_STOCK/firebase-config.js`

このフォルダをGitHubリポジトリとして使う場合、`.github/workflows/deploy-prompt-stock.yml` がリポジトリ直下にある必要があります。別フォルダをリポジトリとして使っている場合は、以下のファイルをそのリポジトリ直下へ移してください。

- `prompt-copy-app.html`
- `README.md`
- `firebase-config.example.js`
- `.gitignore`
- `.github/workflows/deploy-prompt-stock.yml`

ローカル確認はPowerShellで以下を実行します。

```powershell
.\check-prompt-stock.ps1
```

Firestoreルールは以下のようにしてください。

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/promptCopyApp/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 必要なFirebase設定

Firebase Consoleで以下を有効にしてください。

- Authentication の Googleログイン
- Firestore Database
- Authentication の承認済みドメインに、GitHub Pagesのドメインを追加
