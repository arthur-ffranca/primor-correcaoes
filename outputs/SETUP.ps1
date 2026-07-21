# ============================================================================
# SETUP COMPLETO - PRIMOR CORREÇÕES
# EXECUTE ISSO NO SEU PROJETO (abra PowerShell na raiz)
# ============================================================================

param(
    [string]$ProjectPath = (Get-Location)
)

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         SETUP AUTOMÁTICO - PRIMOR CORREÇÕES                 ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Validar se está num repo git
if (-not (Test-Path ".git")) {
    Write-Host "❌ ERRO: Não está em um repositório Git!" -ForegroundColor Red
    Write-Host "Execute este script dentro da pasta raiz do seu projeto" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Repositório Git detectado" -ForegroundColor Green
Write-Host ""

# Menu de opções
Write-Host "O que você quer fazer?" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  Copiar arquivos de OUTPUTS pra cá (faça isso primeiro!)" -ForegroundColor Cyan
Write-Host "2️⃣  Fazer upload dos arquivos pro GitHub" -ForegroundColor Cyan
Write-Host "3️⃣  Aplicar as correções (copiar pra SRC)" -ForegroundColor Cyan
Write-Host "4️⃣  Executar tudo" -ForegroundColor Cyan
Write-Host ""

$choice = Read-Host "Escolha (1-4)"

# ============================================================================
# FUNÇÃO: Copiar arquivos
# ============================================================================
function Copy-OutputsFiles {
    Write-Host ""
    Write-Host "📥 Copiar arquivos..." -ForegroundColor Cyan
    
    # Perguntar onde estão os arquivos
    Write-Host ""
    Write-Host "Onde estão os arquivos que você baixou?" -ForegroundColor Yellow
    Write-Host "Cole o caminho completo (ex: C:\Users\seu-usuario\Downloads\outputs)" -ForegroundColor Gray
    
    $sourcePath = Read-Host "Caminho"
    
    if (-not (Test-Path $sourcePath)) {
        Write-Host "❌ Caminho não encontrado!" -ForegroundColor Red
        return $false
    }
    
    Write-Host "Copiando arquivos..." -ForegroundColor Cyan
    Copy-Item -Path "$sourcePath\*" -Destination "outputs\" -Recurse -Force
    
    Write-Host "✅ Arquivos copiados!" -ForegroundColor Green
    return $true
}

# ============================================================================
# FUNÇÃO: Upload pra GitHub
# ============================================================================
function Upload-ToGitHub {
    Write-Host ""
    Write-Host "📤 Upload pra GitHub..." -ForegroundColor Cyan
    
    if (-not (Test-Path "outputs")) {
        Write-Host "❌ Pasta outputs não existe! Execute primeiro o passo 1" -ForegroundColor Red
        return $false
    }
    
    Write-Host "Adicionando ao Git..." -ForegroundColor Cyan
    git add outputs/ 2>&1
    
    Write-Host "Fazendo commit..." -ForegroundColor Cyan
    git commit -m "docs: adicionar arquivos de correção da Maritaca.AI" 2>&1
    
    Write-Host "Fazendo push..." -ForegroundColor Cyan
    git push 2>&1
    
    Write-Host "✅ Upload concluído!" -ForegroundColor Green
    return $true
}

# ============================================================================
# FUNÇÃO: Aplicar correções
# ============================================================================
function Apply-Corrections {
    Write-Host ""
    Write-Host "⚙️  Aplicar correções..." -ForegroundColor Cyan
    
    if (-not (Test-Path "outputs\src")) {
        Write-Host "❌ Pasta outputs\src não existe!" -ForegroundColor Red
        return $false
    }
    
    Write-Host "Copiando arquivos corrigidos..." -ForegroundColor Cyan
    Copy-Item -Path "outputs\src\*" -Destination "src\" -Recurse -Force
    
    Write-Host "Adicionando ao Git..." -ForegroundColor Cyan
    git add "src/app/api/essays/route.ts" 2>&1
    git add "src/lib/essay/maritaca.ts" 2>&1
    
    Write-Host "Fazendo commit..." -ForegroundColor Cyan
    git commit -F "outputs\COMMIT_MESSAGE.txt" 2>&1
    
    Write-Host "Fazendo push..." -ForegroundColor Cyan
    git push 2>&1
    
    Write-Host "✅ Correções aplicadas!" -ForegroundColor Green
    return $true
}

# ============================================================================
# EXECUTAR OPÇÃO ESCOLHIDA
# ============================================================================

switch ($choice) {
    "1" {
        Copy-OutputsFiles
    }
    "2" {
        Upload-ToGitHub
    }
    "3" {
        Apply-Corrections
    }
    "4" {
        Write-Host "Executando todas as etapas..." -ForegroundColor Yellow
        Copy-OutputsFiles
        if ($?) { Upload-ToGitHub }
        if ($?) { Apply-Corrections }
    }
    default {
        Write-Host "❌ Opção inválida" -ForegroundColor Red
    }
}

# Final
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                        CONCLUÍDO!                           ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "✨ Seu projeto foi atualizado com sucesso!" -ForegroundColor Green
Write-Host ""
