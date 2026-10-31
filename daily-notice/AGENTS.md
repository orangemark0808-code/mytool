# このアプリを修正するAIへ

- 日本語で報告する。ソースはこのディレクトリ、配信先はGitHub Pages。
- React / Viteの通常コマンドで開発・ビルドする。Sitesプラグインは不要。
- `npm test`, `npm run typecheck`, `npm run build` を変更に応じて実行する。
- Firestoreの本人パスとメモのrevision、snapshotの取得時刻比較を維持する。
- タスクや食材の読み込み失敗を空の成功データで保存しない。
- 食材の量やチェック状態を献立生成・表示だけで変更しない。
- 秘密鍵、Google認証情報、実メモ・予定・タスク・献立のJSONをコミットしない。
- 同じGitHub originの別アプリとも共有するFirebase認証を前提にする。権限はFirebaseルールでも強制する。
- `.github/workflows/deploy-prompt-stock.yml` がビルドと公開を担当する。
