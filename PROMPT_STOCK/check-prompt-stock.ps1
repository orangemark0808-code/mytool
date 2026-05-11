$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $root
$rootIndexPath = Join-Path $repoRoot "index.html"
$htmlPath = Join-Path $root "prompt-copy-app.html"
if (-not (Test-Path -LiteralPath $htmlPath)) {
  $htmlPath = Join-Path $root "index.html"
}
$localConfigPath = Join-Path $root "firebase-config.local.js"
$workflowPath = Join-Path $repoRoot ".github\workflows\deploy-prompt-stock.yml"

if (-not (Test-Path -LiteralPath $htmlPath)) {
  throw "prompt-copy-app.html が見つかりません。"
}

if (-not (Test-Path -LiteralPath $rootIndexPath)) {
  throw "リポジトリ直下の index.html が見つかりません。"
}

if (-not (Test-Path -LiteralPath $workflowPath)) {
  throw ".github\workflows\deploy-prompt-stock.yml が見つかりません。"
}

$workflow = Get-Content -LiteralPath $workflowPath -Raw
if ($workflow -notmatch 'cp "index\.html" "dist/index\.html"') {
  throw "workflow がトップページ用 index.html を dist/index.html にコピーしていません。"
}
if ($workflow -match 'cp "PROMPT_STOCK/index\.html" "dist/index\.html"') {
  throw "workflow が PROMPT_STOCK 本体を dist/index.html にコピーしています。"
}
if ($workflow -notmatch "dist/PROMPT_STOCK/firebase-config\.js") {
  throw "workflow が PROMPT_STOCK 配下の firebase-config.js を生成していません。"
}

$rootIndex = Get-Content -LiteralPath $rootIndexPath -Raw
if ($rootIndex -notmatch "PROMPT_STOCK/index\.html") {
  throw "トップページ index.html に PROMPT_STOCK へのリンクがありません。"
}
if ($rootIndex -match 'id="promptForm"') {
  throw "トップページ index.html が PROMPT_STOCK 本体に置き換わっています。"
}

$html = Get-Content -LiteralPath $htmlPath -Raw
if ($html -notmatch "firebase-config\.js") {
  throw "GitHub Pages用の firebase-config.js 読み込みがありません。"
}

if ($html -notmatch "PROMPT_STOCK_FIREBASE_CONFIG") {
  throw "PROMPT_STOCK_FIREBASE_CONFIG の参照がありません。"
}

if (Test-Path -LiteralPath $localConfigPath) {
  $localConfig = Get-Content -LiteralPath $localConfigPath -Raw
  if ($localConfig -notmatch 'projectId:\s*"my-toolbox-7c6cb"') {
    throw "firebase-config.local.js の projectId が my-toolbox-7c6cb ではありません。"
  }
}

node -e "`$h=require('fs').readFileSync(process.argv[1],'utf8'); `$m=[...`$h.matchAll(/<script>([\s\S]*?)<\/script>/g)]; `$s=`$m.at(-1)[1]; new Function(`$s); console.log('script syntax ok')" $htmlPath
if ($LASTEXITCODE -ne 0) {
  throw "JavaScriptの構文チェックに失敗しました。"
}

Write-Host "PROMPT-STOCK の公開前チェックが完了しました。"
