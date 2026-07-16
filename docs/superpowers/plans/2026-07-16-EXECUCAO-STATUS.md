# Status de Execução — Lote de Correções/Features (16/07/2026)

> Este arquivo existe pra qualquer sessão (nova ou continuação) saber exatamente
> por onde retomar. Não depende de cache de workflow (esse é "same-session
> only" e pode não sobreviver a uma sessão nova).

## Onde estamos

Spec: `docs/superpowers/specs/2026-07-16-donna-fit-batch-fixes-design.md`
Planos: `docs/superpowers/plans/2026-07-16-grupo-{a-bugs,b-operacional,c1-pagamento-link,c2-dashboard-faturamento,c3-estoque-combos}.md`

**Fase 1 está 100% concluída e mesclada no master.** Fase 2 (C16 — estoque de
arroz + combos) e QA final ainda não começaram.

## ✅ Fase 1 — concluída (9/9 streams mesclados no master)

| Stream | Plano/Task | Observação |
|---|---|---|
| A1 — bairro com complemento | grupo-a-bugs.md Task 1 | Mesclado em sessão anterior |
| A2 — padding do dropdown | grupo-a-bugs.md Task 2 | Mesclado em sessão anterior |
| A3 — filtro de categoria no popup + | grupo-a-bugs.md Task 3 | Mesclado em sessão anterior |
| A4 — auditoria mobile | grupo-a-bugs.md Task 4 | Mesclado em sessão anterior |
| B1 — cozinha/estoque (dupla baixa + status silencioso + qtd editável) | grupo-b-operacional.md Task 1 | Refeito do zero nesta sessão (WIP anterior abandonado). Migration `20260716_024_fix_avulso_double_stock_deduction.sql` criada e **aplicada** no Supabase remoto. |
| B2 — cadastro de produto (ingredientes/preparo/tipo de arroz) | grupo-b-operacional.md Task 2 | Refeito do zero nesta sessão. |
| B3 — frete mínimo de 8 marmitas | grupo-b-operacional.md Task 3 | Implementado nesta sessão (agente não conseguiu commitar sozinho — orquestrador revisou o diff, rodou os testes e commitou). |
| C11 — pagamento com link de cartão | grupo-c1-pagamento-link.md | Migration renumerada para `20260716_025_card_link_payment.sql` (024 já estava em uso pelo B1). **Aplicada parcialmente** — ver nota abaixo sobre `customer_profiles`. |
| C15 — dashboard de faturamento (popup) | grupo-c2-dashboard-faturamento.md | Implementado nesta sessão. `recharts` teve que ser ajustado (API do `Tooltip` mudou na v3, plano foi escrito contra versão mais antiga). |

Master HEAD atual: `7c99d5e` (branch `master`). Working tree tem só o WIP
pré-existente de antes desta sessão (`CheckoutForm.tsx`, `ProfileModal.tsx`,
`proposta-fase-2-donna-fit.md`, `src/app/redefinir-senha/`) — não mexer sem
perguntar ao usuário, como já registrado antes.

## ⚠️ Achado importante: `customer_profiles` não existe no Supabase remoto

Ao aplicar a migration 025 (card_link), a segunda metade (constraint de
`customer_profiles.preferred_payment`) falhou com `relation
"public.customer_profiles" does not exist`. Confirmado via
`information_schema.tables`: o projeto remoto (`flofeotnbjzsydiuohce`,
"DonnaFIT") só tem 9 tabelas (`announcements`, `categories`,
`delivery_zones`, `order_items`, `orders`, `products`, `profiles`,
`stock_movements`, `store_settings`) — **`customer_profiles` nunca foi
criada**, apesar de `supabase/migrations/20260608_006_customer_profiles.sql`
existir localmente e o código (`src/app/api/orders/route.ts`, upsert de
perfil) depender dela.

**Impacto real, mas não crítico:** o upsert de `customer_profiles` está
dentro de um `try/catch` que não falha o pedido (`"Não falha o pedido se o
perfil não salvar"`) — então o checkout funciona normalmente, mas
**nenhum pedido até hoje gravou/atualizou perfil de cliente** (preferências,
histórico, total gasto) nesse projeto remoto. Isso é uma lacuna
pré-existente descoberta nesta sessão, não introduzida por ela.

**O que foi aplicado:** só a parte de `orders.payment_method_check` da
migration 025 (liberando `card_link`) foi aplicada diretamente via `supabase
db query --linked`. A parte de `customer_profiles` ficou de fora — o arquivo
`.sql` no repo continua com o conteúdo completo (documentação correta do que
*deveria* existir), mas não foi rodado por inteiro.

**Decisão pendente do usuário:** rodar a migration `20260608_006` (criar a
tabela) no projeto remoto, ou confirmar que isso é intencional/fora de
escopo. Não decidido nem aplicado nesta sessão — só documentado.

## Descoberta operacional: fluxo de migrations do projeto

O CLI do Supabase está agora **linkado** a este repo
(`npx supabase link --project-ref flofeotnbjzsydiuohce`, precisa relinkar a
cada sessão nova — o estado em `supabase/.temp/` não persiste e agora está
no `.gitignore`). `npx supabase db push` **não é seguro** neste projeto: o
histórico de migrations do CLI está vazio no remoto (todas as 23 migrations
locais anteriores foram aplicadas manualmente via Dashboard → SQL Editor,
nunca via CLI), então `db push` tentaria reaplicar tudo desde o
`001_initial_schema.sql` e provavelmente falharia/duplicaria objetos. O
método usado nesta sessão (autorizado pelo usuário) foi `npx supabase db
query --linked -f <arquivo.sql>` — executa o SQL direto, sem tocar no
histórico de migrations do CLI, equivalente ao que o Dashboard faria.

## 🧹 Limpeza de dados de teste (autorizada pelo usuário)

Havia 6 produtos `[E2E_TEST] Marmita de Teste` duplicados no banco
compartilhado (seeds concorrentes de agentes paralelos em worktrees
diferentes, sem cleanup). Removidos via `db query --linked`, com autorização
explícita do usuário concedida durante esta sessão para continuar usando
`e2e/scripts/seed.mjs`/`cleanup.mjs` livremente daqui pra frente (mesmo
padrão já em uso em sessões anteriores).

## 🐛 Bug de teste encontrado e corrigido

`e2e/checkout-card-link-payment.spec.ts` tinha um double-decode do parâmetro
`wa` (`decodeURIComponent(url.searchParams.get("wa"))` — o `.get()` já
decodifica uma camada). Isso introduzia um `#` literal antes do número do
pedido, que o `URL` parser interpretava como início de fragment, truncando a
mensagem capturada no teste. Bug estava no próprio texto do plano
(`grupo-c1-pagamento-link.md`), não foi introduzido pelo agente. Corrigido
em `fbe51e6` — **não afeta o app real**, só a asserção do teste (o redirect
de WhatsApp de verdade usa a URL corretamente codificada, sem esse decode
extra).

## Regressão e2e pós-merge (rodada completa, master em `7c99d5e`)

36 testes rodados (`admin-pedidos`, `admin-estoque`, `api-orders-integrity`,
`admin-cozinha`, `checkout-delivery-fee`, `checkout-min-delivery`,
`checkout-card-link-payment`, `checkout-pix-discount`, `checkout-rice-choice`,
`admin-revenue-dashboard`) — **todos passando** depois de: (1) corrigir o bug
de double-decode acima, (2) confirmar que 2 falhas de `admin-cozinha` e
`checkout-pix-discount` na primeira rodada eram flakiness por contenção de
recursos (máquina de 2 núcleos rodando a suite inteira de uma vez) — ambas
passaram limpo isoladas.

## ⬜ Worktrees órfãs de sessão anterior — decisão pendente

`.claude/worktrees/wf_708dafe0-0db-5` e `wf_708dafe0-0db-6` (o WIP abandonado
de B1/B2 da sessão passada, agora **totalmente superado** pelo B1/B2 refeitos
e já mesclados nesta sessão) ainda existem em disco. Tentativa de removê-las
foi bloqueada pelo classificador de permissão automático (nunca foram
examinadas nesta sessão antes do pedido de remoção). Seguro remover — o
conteúdo delas é puramente WIP de um trabalho que já foi refeito do zero e
mesclado — mas precisa de confirmação explícita do usuário antes.

## ⬜ Fase 2 — ainda não iniciada

- **C16** — estoque de arroz + sistema de combos
  (`grupo-c3-estoque-combos.md`, o maior e mais arriscado). Depende de B2 já
  ter mesclado os campos de ingrediente/preparo no formulário de produto
  (✅ já mesclado). Recomendo dividir em 2 sub-streams paralelos (estoque de
  arroz vs. sistema de combos) pra usar os 2 núcleos de CPU disponíveis.

## ⬜ QA final — ainda não iniciada

`qa-funcional` + `qa-ui` em paralelo, mais regressão e2e completa
serializada, depois de C16 mesclado.

## Decisões importantes tomadas nesta sessão (não redescobrir)

1. **B2 não implementa o seletor de tipo de arroz de 4 opções** — mantém o
   temporário de 2 opções, com comentário apontando pro C16 (decisão de
   sessão anterior, reconfirmada).
2. **Migrations deste lote foram renumeradas** para evitar colisão: B1 usa
   024, C11 usa 025 (o plano original de C11 também pedia 024).
3. **`customer_profiles` não existe no banco remoto** (achado novo, ver
   seção acima) — decisão de criar ou não a tabela fica para o usuário.
4. **CLI do Supabase deve ser linkado a cada sessão** e `db push` nunca deve
   ser usado neste projeto — usar `db query --linked -f <arquivo>` para
   aplicar SQL direto (ver seção acima).
