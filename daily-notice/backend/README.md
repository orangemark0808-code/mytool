# AI献立の生成サーバー

GitHub Pagesとは分離したCloudflare Workerです。ChatGPTログインやSites専用の認証ヘッダーには依存しません。コードは同じGitHubリポジトリから修正できます。

Firebase IDトークンをGoogleのaccounts:lookupで検証し、本人UID・メール・Googleプロバイダー・audience・issuer・期限を確認します。食材はサーバーがFirestoreから再取得します。保存先はPagesと同じ本人専用meta領域です。Firestoreの条件付きatomic commitで、複数端末の同時生成・リクエスト重複・1日10回制限を扱います。

公開には本人のCloudflareアカウントが必要です。アカウントが未接続なら、そのログインが終わるまでデプロイしません。

```sh
cd daily-notice
npx wrangler deploy --config backend/wrangler.jsonc
npx wrangler secret put FIREBASE_API_KEY --config backend/wrangler.jsonc
npx wrangler secret put OPENAI_API_KEY --config backend/wrangler.jsonc
```

キーを引数・ソース・ログ・公開設定ファイルへ貼り付けないでください。既存キーを引き継ぐ場合も、秘密値はCloudflareの暗号化Secretだけへ登録します。FirebaseのWeb APIキーは既存Web設定と同じものです。

配信後、公開URLをフロントの `window.DAILY_NOTICE_API_ORIGIN` として設定します。管理用キーやOpenAIキーはこの公開設定へ含めません。

Googleの公式仕様: https://firebase.google.com/docs/firestore/reference/rest/v1/Precondition
