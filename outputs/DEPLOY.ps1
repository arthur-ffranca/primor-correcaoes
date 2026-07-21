# ============================================================================
# SCRIPT DE DEPLOY - PRIMOR CORREÇÕES
# Execute dentro da raiz do seu projeto no PowerShell
# ============================================================================

Write-Host "🚀 INICIANDO DEPLOY..." -ForegroundColor Green
Write-Host ""

# 1. Criar estrutura de pastas
Write-Host "📁 Criando estrutura de pastas..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path "outputs\src\app\api\essays" -Force | Out-Null
New-Item -ItemType Directory -Path "outputs\src\lib\essay" -Force | Out-Null
Write-Host "✅ Pastas criadas" -ForegroundColor Green

# 2. Adicionar ao Git
Write-Host ""
Write-Host "📝 Adicionando ao Git..." -ForegroundColor Cyan
git add outputs/
Write-Host "✅ Arquivos adicionados" -ForegroundColor Green

# 3. Fazer commit
Write-Host ""
Write-Host "💾 Fazendo commit..." -ForegroundColor Cyan
git commit -m "docs: adicionar arquivos de correção da Maritaca.AI"
Write-Host "✅ Commit realizado" -ForegroundColor Green

# 4. Push
Write-Host ""
Write-Host "🔼 Fazendo push para GitHub..." -ForegroundColor Cyan
git push
Write-Host "✅ Push realizado" -ForegroundColor Green

# 5. Status final
Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "✅ DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Próximo passo:" -ForegroundColor Yellow
Write-Host "1. cp outputs/src/* src/ -Recurse" -ForegroundColor White
Write-Host "2. git add src/app/api/essays/route.ts, src/lib/essay/maritaca.ts" -ForegroundColor White
Write-Host "3. git commit -F outputs/COMMIT_MESSAGE.txt" -ForegroundColor White
Write-Host "4. git push" -ForegroundColor White
