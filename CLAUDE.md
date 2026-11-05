# mytool

## journal-editor の確認手順

画面（HTML・CSS・表示まわりのJS）を変更したら、公開（マージ）前に次を実行する。

```bash
node --test journal-editor/tests/core.test.mjs journal-editor/tests/integration.test.mjs journal-editor/tests/publish.test.mjs
node journal-editor/tests/screenshots.mjs
```

- `screenshots.mjs` は Android・iPad（縦・横）・PC の画面サイズで撮影し、`journal-editor/tests/screenshots/` に保存する。
- 変更した部分の画像を自分で見て確認し、要点の画像を利用者に送る。
- 利用者は Android・iPad・PC で使っている。実機との細かな差はありうるので、最終確認は利用者に実機でお願いする。
- 画面を変えたら `index.html`・`script.js` のバージョン番号（`?v=` と `VERSION`）を更新する。
