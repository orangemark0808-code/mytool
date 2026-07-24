# Journal Editor

OrangeMania UIに合わせた、ブラウザで動作するMarkdownエディタです。

## 起動方法

`index.html` を直接開かず、ローカルサーバー経由で起動してください。

```powershell
cd C:\Users\antig\mytool\blog-editor
python -m http.server 8080
```

ブラウザで `http://localhost:8080/` を開いてください。`file://` と `127.0.0.1` は使用しません。

## 主な機能

- Markdown入力とリアルタイムプレビュー
- 下書きの自動保存・復元（localStorage）
- 下書き一覧、新規作成、削除確認
- Markdownコピー、`.md`ダウンロード
- note向けの書式付きHTMLコピー（対応ブラウザ）

note編集画面への実機貼り付けは未確認です。
