$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $root
$htmlPath = Join-Path $root "prompt-copy-app.html"
if (-not (Test-Path -LiteralPath $htmlPath)) {
  $htmlPath = Join-Path $root "index.html"
}
$localConfigPath = Join-Path $root "firebase-config.local.js"
$workflowPath = Join-Path $repoRoot ".github\workflows\deploy-prompt-stock.yml"

if (-not (Test-Path -LiteralPath $htmlPath)) {
  throw "prompt-copy-app.html が見つかりません。"
}

if (-not (Test-Path -LiteralPath $workflowPath)) {
  throw ".github\workflows\deploy-prompt-stock.yml が見つかりません。"
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
