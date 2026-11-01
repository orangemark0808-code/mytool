# 今日のお知らせ — GitHub Pages版

予定、イロイロキロクのタスク、食材からの献立、メモをまとめたデイリーボードです。ChatGPTへのログインは不要です。

- 公開URL: https://orangemark0808-code.github.io/mytool/daily-notice/
- ソース: この `daily-notice/` ディレクトリ
- 実装: React + TypeScript + Vite。独自AIエディターやSitesプラグインは不要です。
- 認証・保存: 既存FirebaseプロジェクトのGoogleログイン、Firestore。本人UIDを `lib/firebase-client.mjs` で確認します。Firestore側の既存ルールも本人UIDのパスだけを許可します。

## 修正・確認

Node.js 22.13以降で、このディレクトリを開きます。

```sh
npm ci
npm test
npm run typecheck
npm run dev
npm run build
```

ローカルでは `index.html` のFirebase設定スクリプトを、同じプロジェクトのWeb設定を持つローカルファイルへ差し替えるか、mytoolのルートから共通設定を配信します。FirebaseのWeb設定は管理者秘密鍵ではありません。管理者鍵・Google refresh token・OpenAI秘密鍵はソースやブラウザーに置きません。

`main` に反映するとmytoolの既存GitHub Actionsがテストとビルドを行い、ほかのツールと一緒にPagesへ公開します。`dist/` は自動生成物です。直接編集しません。

## ファイルの役割

- `app/dashboard.tsx`, `app/globals.css`: ボードの見た目とメモ編集
- `lib/firebase-client.mjs`: 認証、本人確認、Firestoreの参照先
- `lib/pages-data.mjs`: タスク・食材・メモ・スナップショット
- `lib/pages-store.mjs`: メモの競合防止と古いデータの上書き防止
- `lib/calendar.mjs`: 本人が操作して接続するGoogleカレンダーの読み取り
- `lib/migrate.mjs`: 秘密情報を含まない移行・バックアップ
- `lib/meal-plan.mjs`, `lib/meal-tools.mjs`: 通常献立と調理器具の手順
- `lib/client-api.ts`, `hooks/use-ai-meals.ts`: 保存済みAI献立と任意の生成サーバーへの接続
- `integrations/iroiro/`: 既存スキーマに合わせたタスク追加・食材読み取り

## データと移行

Firestoreの `users/{本人UID}/meta/` に `dailyNoticeMemo`, `dailyNoticeSnapshot`, `dailyNoticeMealpan`, `dailyNoticeMealsteamer`, `dailyNoticeMealrede` を保存します。イロイロキロクのメモ本体やカテゴリー構造は変更しません。タスク追加だけは明示操作時に元のタスクへ追加します。

「設定・データ移行」から `daily-notice-export-v1` JSONを読み込めます。既存のメモと献立は上書きせず、予定とタスクは取得時刻を比較して新しい方を保持します。JSONの認証情報などは受け取っても保存しません。実データのJSONをGitHubへコミットしないでください。

毎朝の更新では `daily-notice-calendar-v1` JSONを同じ移行欄へ渡せます。形式は `{ "format": "daily-notice-calendar-v1", "calendar": { "date": "YYYY-MM-DD", "lastSuccessAt": "取得日時のISO文字列", "lastAttemptAt": "取得日時のISO文字列", "error": null, "events": [] } }` です。タスク・メモ・献立を触らず、予定の取得時刻だけを比較して更新します。取得失敗は空の予定として渡しません。

Googleカレンダー接続は既存Googleログインへ読み取りスコープを追加し、アクセストークンを画面のメモリーだけに持ちます。ページを閉じた後の更新は別途スケジューラーが必要です。バックアップや手動取得はChatGPTに依存しません。

## AI献立の生成

GitHub Pagesは静的配信のため、AI献立の新規生成はCloudflare Worker `daily-notice-api` が担当します。`public/runtime-config.js` に公開接続先を設定しています。保存済み献立と通常候補は新規生成せず表示できます。ページを開くだけではOpenAI APIを呼び出しません。

生成サーバーのコードも同じリポジトリの `backend/` から修正できます。`main` の関連ファイルを変更すると `.github/workflows/deploy-daily-notice-api.yml` がテスト後にCloudflareへ自動公開します。設定と手動公開の方法は `backend/README.md` を参照してください。

サーバーはFirebase IDトークンの署名・audience・issuer・期限・本人UIDを検証し、食材をサーバー側で再取得して生成・検証・保存します。`window.DAILY_NOTICE_API_ORIGIN` にはHTTPSのそのサーバーだけを設定します。OpenAIキーをここへ設定しないでください。既存Sitesの認証ヘッダーをそのまま信用する実装にはしません。

## 他のAIへの依頼例

「orangemark0808-code/mytool の daily-notice ディレクトリを修正してください。READMEとAGENTS.mdを読み、npm test、npm run typecheck、npm run buildで確認してください。本人の保存データや秘密鍵はGitに入れないでください。」
