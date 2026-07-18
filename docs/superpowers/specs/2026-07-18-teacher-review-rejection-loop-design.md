# Fluxo de ajuste da revisão pela professora

## Contexto

Hoje a correção segue um caminho linear: a professora envia a redação, a IA gera uma pré-revisão, e a professora aprova para liberar histórico e download. Esse fluxo funciona para revisões boas, mas ainda não cobre o caso em que a professora discorda da análise, sente falta de um apontamento ou quer calibrar a IA antes da versão final.

## Objetivo

Criar um fluxo em que a professora continue no comando da avaliação. A IA pode sugerir uma nova versão, mas a professora precisa revisar e aprovar antes de qualquer correção virar final.

## Escopo

- Adicionar uma ação de pedir ajuste da IA na tela de revisão.
- Permitir que a professora escreva uma orientação curta para a nova revisão.
- Permitir no máximo 3 versões de revisão por redação.
- Permitir que a professora adicione um apontamento manual estruturado na tabela de maiores descontos.
- Manter histórico de versões da revisão para auditoria pedagógica.
- Continuar liberando download somente depois da aprovação final.

## Fora de escopo

- Acesso de alunos.
- Comentários colaborativos entre múltiplos professores.
- Edição livre linha a linha de todos os itens gerados pela IA.
- Workflow de contestação por estudante.

## Fluxo proposto

1. A redação entra como revisão preliminar.
2. A professora analisa a transcrição, a nota sugerida e os maiores descontos.
3. Se concordar, clica em `Aprovar revisão`.
4. Se discordar, clica em `Pedir ajuste da IA`.
5. O sistema abre um campo para a professora explicar o ajuste desejado.
6. A IA gera uma nova versão usando a redação, a transcrição atual, a revisão anterior e a orientação da professora.
7. A nova versão aparece como `Revisão 2`, sem apagar a anterior.
8. A professora pode pedir outro ajuste até chegar em `Revisão 3`.
9. Ao chegar em 3 revisões, o botão de nova revisão da IA fica bloqueado com uma mensagem clara.
10. A professora pode aprovar a versão atual ou adicionar um apontamento manual estruturado.
11. Ao aprovar, o sistema salva a versão final e libera o pacote de download.

## Modelo de dados sugerido

Criar uma entidade de versão de revisão ligada à redação:

- `essaySubmissionId`: redação relacionada.
- `versionNumber`: número sequencial da revisão.
- `source`: `ia_inicial`, `ia_ajustada` ou `manual`.
- `teacherInstruction`: orientação enviada pela professora para a IA, quando houver.
- `transcriptionSnapshot`: transcrição usada naquela versão.
- `issuesPayload`: tabela de erros daquela versão.
- `criterionScoresPayload`: notas por critério daquela versão.
- `totalRawScore`: nota total no formato Unicamp.
- `total1000Score`: nota convertida para 1000.
- `teacherNotes`: observação manual opcional.
- `createdAt`: data de criação.

Cada item em `issuesPayload` pode ter uma origem:

- `source`: `ia` ou `professora`.
- `sourceLabel`: texto exibível, por exemplo `Sugerido pela IA` ou `Feito pela professora`.

Quando a professora adiciona um apontamento manual, ele deve entrar na mesma tabela existente de maiores descontos, com os campos:

- `quote`: trecho relacionado; se for um comentário geral, exibir `Apontamento geral`.
- `category`: categoria técnica escolhida pela professora, como `Ortografia`, `Acentuação`, `Concordância`, `Coesão e coerência`, `Propósito` ou `Gênero`.
- `scoreImpact`: desconto definido pela professora.
- `explanation`: por que tirou nota.
- `teacherComment`: comentário da professora.
- `source`: `professora`.
- `sourceLabel`: `Feito pela professora`.

A entidade `FinalReview` continua existindo, mas passa a apontar para a versão aprovada ou copiar o conteúdo dela no momento da aprovação.

## Interface

Na lateral da tela de revisão, a área de decisão deve ter três ações:

- `Aprovar revisão`: salva a versão atual como final.
- `Pedir ajuste da IA`: abre um campo de orientação e gera nova versão.
- `Adicionar apontamento da professora`: abre um formulário com categoria, desconto, por que tirou nota e comentário.

A tela deve mostrar qual versão está sendo lida, por exemplo `Revisão 1`, `Revisão 2` e `Revisão 3`, e permitir consultar versões anteriores sem confundir com a versão atual.

O apontamento manual deve aparecer anexado à tabela já existente, com uma marcação visual simples como `Feito pela professora`. A descrição deve deixar claro que aquele item não foi gerado pela IA.

## Regras da IA

A segunda revisão deve receber a redação original, a transcrição preservada, a revisão anterior e a orientação da professora. A IA deve obedecer à regra zero do produto: nada exibível à professora pode aparecer em inglês.

A IA não pode aprovar sozinha. Ela apenas gera nova sugestão.

O sistema não deve chamar a IA depois da terceira revisão da mesma redação.

## Segurança e auditoria

O fluxo continua restrito à professora autenticada. Cada versão deve ficar associada ao usuário dono da redação, para impedir acesso cruzado. O histórico de versões permite auditar por que uma nota mudou entre a revisão inicial e a final.

## Critérios de aceite

- A professora consegue pedir nova revisão sem perder a primeira versão.
- Cada redação permite no máximo 3 revisões.
- A nova revisão considera explicitamente a orientação escrita pela professora.
- A professora consegue adicionar um apontamento manual com categoria, desconto, por que tirou nota e comentário.
- O apontamento manual aparece anexado à mesma tabela de erros, marcado como `Feito pela professora`.
- O download só fica disponível depois da aprovação.
- A tabela final não exibe chaves internas nem termos em inglês.
- O histórico registra versões suficientes para explicar mudanças de nota.
