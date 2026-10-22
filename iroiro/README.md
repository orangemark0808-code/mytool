# イロイロキロク

カード型メモアプリです。公開時の想定URLは `https://orangemark0808-code.github.io/mytool/iroiro/` です。

## Firebase設定

`firebase-config.example.js` を参考に `firebase-config.local.js` へFirebase Web設定を入れてください。実値はGitに含めません。公開時はGitHub Actionsが同等の `firebase-config.js` を生成する構成を想定しています（現時点ではActionsは未変更）。

Firestore保存先は `users/{uid}/iroiroNotes/{noteId}`、カテゴリー設定は `users/{uid}/iroiroSettings/main` です。

## バックアップと移行

- 復元時は既存メモを残し、同じIDのメモをバックアップ内容で更新します。
- カテゴリーは最新のFirestore設定とID単位で統合します。既存カテゴリーを残し、同じIDはバックアップ内容で更新します。
- 復元するメモ・カテゴリーのIDは英数字、`_`、`-` の1〜1500文字に限定します。カテゴリーIDの `all`、予約形式の `__...__`、重複IDは使えません。
- 関連リンクは保存済みのURLキャッシュを使用せず、本文からHTTP/HTTPSのURLを再生成します。
- ローカルメモの移行では保存先IDを固定し、移行済みのメモを上書きしません。途中で失敗した場合は再試行できます。
- カテゴリー統合と移行にはFirestoreのトランザクションを使うため、オンライン接続が必要です。

## 回帰テスト

Node.js 18以降で、次を実行します。FirebaseやGoogleアカウントへの接続は不要です。

```sh
node --test iroiro/tests/regression.test.mjs
```

上記のコマンドは `mytool` フォルダーで実行してください。保存待ち中の追加編集、不正なバックアップ、カテゴリーの統合、途中失敗した移行の再試行を確認します。
