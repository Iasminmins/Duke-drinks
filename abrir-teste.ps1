# Sobe tudo para testar no computador:
#   - o sistema (C:\Duke drinks, branch saas-multitenant) usando o banco de TESTE
#   - o site de venda (esta pasta) em http://localhost:5500
# O Duke que está no ar (Vercel + banco de produção) não é tocado.

$app  = "C:\Duke drinks"
$site = $PSScriptRoot

Write-Host ""
Write-Host "Comandou - ambiente de teste" -ForegroundColor Cyan
Write-Host ""

# 1) o sistema precisa estar na branch do SaaS
$branch = (git -C $app branch --show-current) 2>$null
if ($branch -ne "saas-multitenant") {
  Write-Host "O projeto do sistema esta na branch '$branch'." -ForegroundColor Yellow
  Write-Host "Para testar o SaaS rode antes:  git -C `"$app`" switch saas-multitenant"
  Read-Host "Enter para sair"
  exit 1
}

# 2) banco de TESTE (nunca o de producao)
$linha = Get-Content "$app\.env.teste.local" -ErrorAction SilentlyContinue | Where-Object { $_ -like "DATABASE_URL=*" } | Select-Object -First 1
if (-not $linha) {
  Write-Host "Nao achei DATABASE_URL em $app\.env.teste.local" -ForegroundColor Red
  Read-Host "Enter para sair"
  exit 1
}
$db = $linha.Substring("DATABASE_URL=".Length).Trim()
$hostDb = ([uri]($db -replace '^postgres(ql)?://', 'http://')).Host
Write-Host "Banco de teste: $hostDb"

# 3) janela do sistema (porta 3000)
$sistema = @"
Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
`$env:DATABASE_URL = '$db'
`$env:PLATAFORMA_SENHA = 'teste-local-123'
`$env:NEXT_PUBLIC_SITE_URL = 'http://localhost:5500'
`$env:NEXT_PUBLIC_APP_DOMAIN = 'localhost:3000'
`$env:ALLOW_DEMO_RESET = 'false'
`$Host.UI.RawUI.WindowTitle = 'Comandou - sistema (banco de TESTE)'
Set-Location '$app'
npm run dev
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $sistema

# 4) janela do site de venda (porta 5500)
$siteCmd = "`$Host.UI.RawUI.WindowTitle = 'Comandou - site de venda'; Set-Location '$site'; node servidor-local.mjs"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $siteCmd

# 5) espera o sistema responder e abre o navegador
Write-Host "Esperando o sistema iniciar..."
for ($i = 0; $i -lt 60; $i++) {
  try { Invoke-WebRequest "http://localhost:3000/cadastro" -UseBasicParsing -TimeoutSec 5 | Out-Null; break } catch { Start-Sleep 2 }
}
Start-Process "http://localhost:5500"

Write-Host ""
Write-Host "Pronto. Enderecos:" -ForegroundColor Green
Write-Host "  Site de venda ........ http://localhost:5500"
Write-Host "  Cadastro ............. http://localhost:3000/cadastro"
Write-Host "  Painel da plataforma . http://localhost:3000/plataforma  (senha: teste-local-123)"
Write-Host "  Um negocio ........... http://<endereco>.localhost:3000  (ex.: burger-teste)"
Write-Host ""
Write-Host "Para parar, feche as duas janelas que abriram."
Start-Sleep 4
