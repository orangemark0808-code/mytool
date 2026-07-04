# ミタモノキロク (MITAMONO)

ミタモノキロクは、視聴した映画・ドラマを記録するWebアプリです。

- Googleログイン（Firebase Authentication）
- Firestoreにクラウド保存（1記録 = 1ドキュメント、`users/{uid}/mitamono/{autoId}`）
- TMDBからポスター画像・原題・種類・IMDBリンクを自動取得

## Firebase設定について

Firebaseプロジェクトは [PROMPT_STOCK](../PROMPT_STOCK/) と同じ `my-toolbox-7c6cb` を再利用します。

## ローカル専用の設定ファイル

以下のファイルは `.gitignore` で除外されており、GitHubには上げない想定です。

- `firebase-config.local.js`: Firebaseの設定値（`window.MITAMONO_FIREBASE_CONFIG`）
- `tmdb-config.local.js`: TMDB APIキー（`window.MITAMONO_TMDB_KEY`）

他のPCで使う場合は、`firebase-config.example.js` / `tmdb-config.example.js` を参考に、同じ形式のファイルを作成してください。

TMDB APIキーは [TMDBの設定ページ](https://www.themoviedb.org/settings/api) から取得できる「APIキー（v3 auth）」を使用します。

## GitHub Pagesで同期して使う場合

GitHub PagesでPC・iPadから同じURLを開いて同期したい場合、公開先でも設定値を読める必要があります。

設定値そのものはリポジトリに保存せず、GitHub Secretsに入れます。GitHubリポジトリの `Settings` → `Secrets and variables` → `Actions` → `New repository secret` から、以下のSecretsを追加してください。

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_MEASUREMENT_ID`
- `TMDB_API_KEY`

`FIREBASE_PROJECT_ID` には `my-toolbox-7c6cb` を入れてください（PROMPT_STOCKと共通）。

GitHub Pagesは、`Settings` → `Pages` → `Build and deployment` で `GitHub Actions` を選択してください。

このリポジトリでは、MITAMONOは以下のURLで公開します。

- `https://orangemark0808-code.github.io/mytool/MITAMONO/`

GitHub Actionsは、`dist/MITAMONO/firebase-config.js` と `dist/MITAMONO/tmdb-config.js` をSecretsから生成して公開します。

### TMDB APIキーの取り扱いについて

TMDBキーは公開静的サイトのため、ブラウザの通信に露出します。個人用・読み取り専用キーであれば許容範囲ですが、心配な場合はTMDBアカウント設定からキーをローテーションできます。

## 必要なFirebase設定

Firebase Consoleで以下を有効にしてください（PROMPT_STOCKで設定済みの場合は不要）。

- Authentication の Googleログイン
- Firestore Database
- Authentication の承認済みドメインに、GitHub Pagesのドメインを追加

## Firestoreルール

既存の `promptCopyApp` 用ルールは残したまま、`mitamono` 用のルールを追記してください。

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/promptCopyApp/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/mitamono/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## データモデル

Firestoreパス: `users/{uid}/mitamono/{autoId}`（1記録 = 1ドキュメント）

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `title` | string | タイトル |
| `originalTitle` | string | 原題 |
| `platform` | string | 媒体（Amazon / Netflix / ... / その他自由入力） |
| `kind` | string | `Drama` または `Movie` |
| `watchStart` | string | 視聴開始日（`YYYY-MM-DD`） |
| `watchEnd` | string | 視聴終了日（`YYYY-MM-DD`） |
| `url` | string | 視聴先URL |
| `imdbUrl` | string | IMDBリンク |
| `reactions` | string[] | 視聴リアクション（複数選択） |
| `review` | string | 感想（複数行） |
| `posterUrl` | string | ポスター画像URL、または手動アップロード時のdata URL |
| `tmdbId` | number/string | TMDBの作品ID（任意） |
| `tmdbType` | string | `movie` または `tv`（任意） |
| `createdAt` | number | 作成日時（UnixTimeミリ秒） |
| `updatedAt` | number | 更新日時（UnixTimeミリ秒） |

## JSONインポート

ヘッダーの「インポート」ボタンから、上記フィールドのキーを持つJSON配列（`.json`ファイル、または貼り付け）を取り込めます。未指定のキーは空として扱われます。重複チェックは行わず、そのまま新規ドキュメントとして追加されます。

## ローカル確認

`firebase-config.local.js` と `tmdb-config.local.js` を作成したうえで、`index.html` をブラウザで開いてください（`file://` でも動作しますが、Googleログインのポップアップなどは `http(s)://` での確認を推奨します）。
