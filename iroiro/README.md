# イロイロキロク

カード型メモアプリです。公開時の想定URLは `https://orangemark0808-code.github.io/mytool/iroiro/` です。

## Firebase設定

`firebase-config.example.js` を参考に `firebase-config.local.js` へFirebase Web設定を入れてください。実値はGitに含めません。公開時はGitHub Actionsが同等の `firebase-config.js` を生成する構成を想定しています（現時点ではActionsは未変更）。

Firestore保存先は `users/{uid}/iroiroNotes/{noteId}`、カテゴリー設定は `users/{uid}/iroiroSettings/main` です。
