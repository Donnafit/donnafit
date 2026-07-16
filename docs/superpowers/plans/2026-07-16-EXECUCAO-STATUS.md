# Status de Execução — Lote de Correções/Features (16/07/2026)

> Este arquivo existe pra qualquer sessão (nova ou continuação) saber exatamente
> por onde retomar. Não depende de cache de workflow (esse é "same-session
> only" e pode não sobreviver a uma sessão nova).

## Onde estamos

Spec: `docs/superpowers/specs/2026-07-16-donna-fit-batch-fixes-design.md`
Planos: `docs/superpowers/plans/2026-07-16-grupo-{a-bugs,b-operacional,c1-pagamento-link,c2-dashboard-faturamento,c3-estoque-combos}.md`

Execução organizada em 9 streams paralelos (Fase 1) + 1 stream maior depois
(Fase 2, C16) + QA final. Cada stream = 1 task de um dos planos, rodado por
um agente especializado isolado em git worktree.

## ✅ Concluído e JÁ MESCLADO no master (não precisa refazer)

| Stream | Plano/Task | Commit no master | Observação |
|---|---|---|---|
| A1 — bairro com complemento | grupo-a-bugs.md Task 1 | `f2360e2` | 1 teste ajustado (endereço real na divisa de 2 bairros — Nominatim varia, mantido frete fixo) |
| A2 — padding do dropdown | grupo-a-bugs.md Task 2 | `610f3cd` | OK, sem pendência |
| A3 — filtro de categoria no popup + | grupo-a-bugs.md Task 3 | `8a41789` | O bug do `dropdownRef` compartilhado, corrigido |
| A4 — auditoria mobile | grupo-a-bugs.md Task 4 | `5908b5d` | Nenhum overflow encontrado nas 7 telas — nada precisou ser corrigido, só o teste de regressão ficou |

Master HEAD atual: `2a3a375` (branch `master`, working tree limpo exceto as
mudanças pré-existentes de antes desta sessão: `CheckoutForm.tsx`,
`ProfileModal.tsx`, `tsconfig.tsbuildinfo`, e os arquivos não rastreados
`proposta-fase-2-donna-fit.md` e `src/app/redefinir-senha/` — nenhum desses é
desta sessão, não mexer neles sem perguntar ao usuário).

## 🟡 Em andamento, NÃO commitado, NÃO mesclado (WIP abandonado de propósito)

Dois agentes estavam no meio do trabalho quando a Fase 1 foi pausada. O
trabalho **não foi perdido** (as worktrees continuam no disco), mas também
**não foi commitado** — mais seguro redo-lo do zero na próxima sessão do que
tentar recuperar um meio-de-implementação.

- **B1 — cozinha/estoque** (grupo-b-operacional.md Task 1): worktree em
  `.claude/worktrees/wf_708dafe0-0db-5`. Mudanças não commitadas em
  `EstoqueClient.tsx`, `useRealtimeOrders.ts`, 3 specs e2e, mais uma migration
  nova já criada: `supabase/migrations/20260716_024_fix_avulso_double_stock_deduction.sql`.
- **B2 — cadastro de produto** (grupo-b-operacional.md Task 2, SEM o seletor de
  arroz — ver nota abaixo): worktree em `.claude/worktrees/wf_708dafe0-0db-6`.
  Mudanças não commitadas em `EstoqueClient.tsx` e `admin-estoque.spec.ts`.

**Recomendação ao retomar:** ignorar essas duas worktrees (não precisa nem
remover, mas também não reaproveitar) e relançar B1 e B2 do zero via novos
agentes — os planos são idempotentes, redo-los do zero é mais simples e mais
seguro que tentar recuperar estado parcial de outra sessão.

## ⬜ Nunca chegou a rodar (na fila quando pausei)

- **B3** — aviso de frete mínimo de 8 marmitas (grupo-b-operacional.md Task 3)
- **C11** — pagamento com link de cartão (grupo-c1-pagamento-link.md, plano inteiro)
- **C15** — dashboard de faturamento (grupo-c2-dashboard-faturamento.md, plano inteiro)

## ⬜ Fase 2 — ainda não iniciada (depende da Fase 1 completa)

- **C16** — estoque de arroz + sistema de combos (grupo-c3-estoque-combos.md,
  o maior e mais arriscado). Depende de B2 já ter mesclado os campos de
  ingrediente/preparo no formulário de produto antes de começar (C16 estende o
  mesmo formulário). Recomendo dividir em 2 sub-streams paralelos nesta fase
  (estoque de arroz vs. sistema de combos) pra usar os 2 núcleos de CPU
  disponíveis — ver decisão registrada na conversa.

## Decisões importantes tomadas nesta sessão (não redescobrir, já foram validadas)

1. **B2 não implementa o seletor de tipo de arroz** (o de 2 opções do plano
   original) — isso é substituído pelo seletor real de 4 opções em C16a. B2
   faz só ingredientes + modo de preparo.
2. **Item "botão + de categoria" (A10)** foi originalmente mal diagnosticado
   (achamos que a feature não existia) — o usuário corrigiu: o botão existe,
   o bug real é o filtro não aplicar ao clicar dentro do popup. Já corrigido
   (A3 acima). Não reabrir esse diagnóstico.
3. **Máquina tem só 2 núcleos de CPU** — o scheduler do Workflow já limita a
   2 agentes verdadeiramente simultâneos. Não adianta lançar mais de 2 em
   paralelo achando que vai acelerar; steady-state real é 2 por vez.
4. **Testes e2e usam um Supabase de TESTE compartilhado** (não confundir com
   produção — ver `.env.local`, `store_name: "Donna FIT Teste..."`). Quando
   múltiplos agentes rodam `seed.mjs` ao mesmo tempo, o produto de fixture
   `[E2E_TEST] Marmita de Teste — não remover manualmente` pode duplicar,
   quebrando testes que usam `getByRole` por nome exato (achado repetido por
   2 agentes diferentes). Isso é uma fragilidade pré-existente da suíte, não
   um bug introduzido por esta sessão — mas vale corrigir (`admin-estoque.spec.ts`
   deveria selecionar pelo SKU único, não pelo nome) antes ou durante a QA final.
5. **A4/A17 (mobile)** já estava resolvido antes mesmo desta sessão começar
   (provavelmente pelo commit `6c6e5a1` anterior) — não há fix de CSS
   pendente aqui, só o teste de regressão ficou.
6. **Item 4 do ticket original ("forçar reflash")** ainda depende do usuário
   checar o dashboard da Vercel e o Supabase de produção (ele confirmou ter
   acesso) — ver checklist que passei a ele no chat. Não é tarefa de agente.

## Como retomar

1. Relançar via Workflow (script novo, ou reaproveitar
   `docs/superpowers/plans` como referência) cobrindo: B1, B2, B3, C11, C15
   (Fase 1 restante) → merge → C16 dividido em 2 (Fase 2) → merge → QA final
   (`qa-funcional` + `qa-ui` em paralelo + regressão e2e completa serializada).
2. Master já está em `2a3a375` com A1-A4 mesclados — a próxima Fase 1 não
   precisa incluir essas 4 tasks de novo.
