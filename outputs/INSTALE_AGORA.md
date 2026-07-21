# ⚡ INSTALE AGORA

## Passo 1: No seu projeto
```powershell
mkdir outputs
```

## Passo 2: Copie esta pasta pra lá
```
outputs/ (da pasta que você baixou)
    ↓
seu-projeto/outputs/
```

## Passo 3: No PowerShell do seu projeto
```powershell
git add outputs/
git commit -m "docs: adicionar arquivos de correção da Maritaca.AI"
git push
```

## Passo 4: Quando quiser aplicar
```powershell
# Copie os arquivos corrigidos pro lugar certo
cp outputs/src/* src/ -Recurse

# Commit
git add src/app/api/essays/route.ts, src/lib/essay/maritaca.ts
git commit -F outputs/COMMIT_MESSAGE.txt
git push
```

## Pronto! ✅

Seu projeto agora tem:
- ✅ Erro handling corrigido
- ✅ Logging detalhado
- ✅ Mensagens de erro específicas

---

**Dúvidas?** Leia `REVISAO_COMPLETA.md`
