# AI献立の生成サーバー

## 予定の自動更新

`calendar-sync.mjs` はGoogle Calendarの読み取り専用権限で本人の予定を取得し、Firebase Authenticationで本人を確認してからFirestoreの既存スナップショットを条件付き更新します。取得エラーや競合時にはタスクなどを消しません。GoogleのクライアントID・クライアントシークレット・リフレッシュトークンはCloudflareの `GOOGLE_CALENDAR_CLIENT_ID`、`GOOGLE_CALENDAR_CLIENT_SECRET`、`GOOGLE_CALENDAR_REFRESH_TOKEN` という暗号化Secretに保存します。認証情報や予定の内容をリポジトリやログに記載しないでください。

CloudflareのCron Trigger `25 20 * * *` は日本時間の毎朝5:25です。CronはCloudflareのWorker設定で管理し、GitHub Actionsのコード公開とは別に確認してください。日時の正確な実行は保証されません。カレンダーの接続が失効した場合はGoogleで再認証が必要です。

GitHub Pagesとは分離したCloudflare Workerです。ChatGPTログインやSites専用の認証ヘッダーには依存しません。コードは同じGitHubリポジトリから修正できます。

Firebase IDトークンをGoogleのaccounts:lookupで検証し、本人UID・メール・Googleプロバイダー・audience・issuer・期限を確認します。食材はサーバーがFirestoreから再取得します。保存先はPagesと同じ本人専用meta領域です。Firestoreの条件付きatomic commitで、複数端末の同時生成・リクエスト重複・1日10回制限を扱います。

公開には本人のCloudflareアカウントが必要です。アカウントが未接続なら、そのログインが終わるまでデプロイしません。

## GitHubからの自動公開

リポジトリルートの `.github/workflows/deploy-daily-notice-api.yml` が、`main` の生成サーバー関連ファイルの変更をテストし、`daily-notice-api` へ公開します。GitHub Actionsの画面から手動実行もできます。フロントだけの変更は既存のPages公開ワークフローが扱います。

公開処理はesbuildで単一モジュールを作り、`ci/deploy-worker.mjs` からCloudflare公式のWorker Upload APIでこのWorkerだけを更新します。既存の `secret_text` バインディングを保持し、ドメイン・ルート・アカウント権限は変更しません。公開後に `/health` と未認証リクエストの401を確認します。

GitHubのRepository Secret `DAILY_NOTICE_CLOUDFLARE_API_TOKEN` には、CloudflareでこのWorkerだけを対象にした `Individual Workers Editor` トークンを登録します。OpenAIキーをGitHubへ登録する必要はありません。`OPENAI_API_KEY` と `FIREBASE_API_KEY` はCloudflareのランタイムSecretに保存し、通常のコード公開では保持します。

FirebaseのWeb APIキーは、Pages公開でも使う既存のGitHub Secret `FIREBASE_API_KEY` と同じ値を公開時に同期します。OpenAIキーは同期対象に含めず、Cloudflareに保存済みの値を保持します。

## CLIでの公開

```sh
cd daily-notice
npx --yes esbuild@0.27.3 backend/worker.mjs --bundle --format=esm --platform=browser --target=es2022 --outfile=.worker-dist/worker.mjs
node ci/deploy-worker.mjs
npx wrangler secret put FIREBASE_API_KEY --config backend/wrangler.jsonc
npx wrangler secret put OPENAI_API_KEY --config backend/wrangler.jsonc
```

手動公開でも上記の限定トークンとアカウントIDを環境変数 `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` から読みます。通常はGitHub Actionsを使ってください。

キーを引数・ソース・ログ・公開設定ファイルへ貼り付けないでください。既存キーを引き継ぐ場合も、秘密値はCloudflareの暗号化Secretだけへ登録します。FirebaseのWeb APIキーは既存Web設定と同じものです。

配信後、公開URLをフロントの `lib/api-config.ts の DAILY_NOTICE_API_ORIGIN` として設定します。管理用キーやOpenAIキーはこの公開設定へ含めません。

Googleの公式仕様: https://firebase.google.com/docs/firestore/reference/rest/v1/Precondition

Cloudflareの公式仕様: https://developers.cloudflare.com/api/resources/workers/subresources/scripts/methods/update/
