# Status de Execução — Lote de Correções/Features (16/07/2026)

## ✅ 17/07/2026 — QA final concluído, lote fechado (com 1 item adiado)

QA final rodou (`qa-funcional` + `qa-ui` em paralelo, achados verificados
manualmente). 4 bugs novos encontrados além do que já estava documentado:

1. **BLOCKER, corrigido** — todo produto `combo` aparecia como "Esgotado" no
   cardápio (front checava `stock_quantity`, que o C16 zerou pra combo).
   Corrigido em `ProductCard.tsx`/`ProductDetailClient.tsx`: combo só trava
   por `is_active` agora.
2. **ALTO, corrigido** — frete mínimo de 8 marmitas só existia no front;
   `/api/orders` aceitava entrega com 1 item via request direta. Checagem
   espelhada adicionada na API.
3. **ALTO, corrigido** — `stripAddressComplement` perdia o bairro quando ele
   vinha *depois* do complemento no texto (ex: "100, Apto 12, Boqueirão").
   Reescrito pra remover só o trecho do complemento, preservando o resto da
   string dos dois lados.
4. **BLOCKER, NÃO corrigido — decisão explícita do usuário** — cancelar
   pedido não devolve estoque reservado (`stock_movements` já prevê os
   enums `'restock'`/`'cancellation'` desde a migration inicial, mas nunca
   foi implementado nenhum trigger/RPC). Usuário decidiu deixar pra ajuste
   manual depois ("esse é complexo pois pode ser ajustado manualmente
   depois") — não mexer nisso sem novo pedido explícito.

Commits: `4e71c6d` (fix pendente de seed.mjs) e `5737aac` (os 3 fixes acima
+ testes). Regressão e2e completa rodada 2x (85 testes): 82 passando, 3
falhas sempre nos mesmos 3 testes (`admin-configuracoes`,
`admin-manual` x2) por contenção de recursos da máquina de 2 núcleos —
confirmado limpo quando rodados isolados, não é regressão real.

**Lote considerado fechado.** Únicos itens em aberto, todos por decisão do
usuário/dono do negócio, não por falta de trabalho: item 4 acima, tabela
`customer_profiles` ausente no remoto, e dado de `stock_quantity` real do
cardápio precisando revisão (efeito do limiar de 50).


> Este arquivo existe pra qualquer sessão (nova ou continuação) saber exatamente
> por onde retomar. Não depende de cache de workflow (esse é "same-session
> only" e pode não sobreviver a uma sessão nova).

## Onde estamos

Spec: `docs/superpowers/specs/2026-07-16-donna-fit-batch-fixes-design.md`
Planos: `docs/superpowers/plans/2026-07-16-grupo-{a-bugs,b-operacional,c1-pagamento-link,c2-dashboard-faturamento,c3-estoque-combos}.md`

**Fase 1 e Fase 2 (C16) estão 100% concluídas e mescladas no master, com
regressão e2e completa passando (40/40 testes).** Só falta QA final.
Master em `e450cef`.

## ✅ Fase 2 — C16 (estoque de arroz + combos) concluída

Implementada como stream único serial (não dividida em 2, ao contrário do
que a Fase 1 tinha planejado — ver "Decisões" abaixo), mesclada no master
com 3 conflitos reais em `EstoqueClient.tsx` (resolvidos à mão: `stock_type`
virou `"combo" | "individual"`, o seletor antigo "Tipo de Arroz Servido" (2
opções, do B2) foi substituído pelo novo "Estoque de Arroz" (4 opções, do
C16), `rice_integral_available` deixou de ser editável direto e passou a
ser derivado de `rice_stock_mode`).

**Migrations aplicadas:** `20260716_026_rice_stock_and_combo_items.sql`
(aditiva: colunas de arroz + tabela `combo_items` + RPC
`reserve_rice_stock`) e `20260716_027_individual_stock_type_rename.sql`
(rename `avulso`→`individual`, remove trigger/função antigos de baixa-na-
produção, zera `stock_quantity` de combos existentes). **Bug real
encontrado e corrigido na 027**: a ordem original dos statements (UPDATE
antes de trocar a CHECK constraint) fazia a constraint ANTIGA rejeitar o
próprio UPDATE que tentava migrar os dados — corrigido invertendo a ordem
(DROP da constraint antiga → UPDATE dos dados → ADD da constraint nova).
Confirmado aplicado: 49 produtos `individual`, 8 `combo`, trigger removido,
`combo_items`/`reserve_rice_stock` existem.

**Bug real encontrado em `e2e/scripts/seed.mjs`**: ainda inseria
`stock_type: "avulso"` (valor não mais aceito pela constraint) — corrigido
para `"individual"`. Outros ~10 arquivos de spec e2e ainda têm o literal
`"avulso"` dentro do corpo de itens de pedido enviado a `POST /api/orders`,
mas isso é inofensivo — `route.ts` nunca lê esse campo do payload do
cliente (sempre revalida contra o banco via `freshById`), só `seed.mjs`
fazia um INSERT direto com esse valor.

**Ajustado no merge/regressão**: `admin-estoque.spec.ts` (2 testes —
seletor de arroz novo + produto novo nasce "Combo" por padrão agora, então
precisa trocar pra "Individual" antes de ver o seletor de arroz),
`api-orders-integrity.spec.ts` (teste antigo de combo assumia que combo
descontava a própria `stock_quantity` no checkout — modelo mudou, agora só
desconta componentes via `combo_items`; combo sem composição não desconta
nada), `admin-cozinha.spec.ts` (locator do botão "Registrar" ficou
ambíguo — ver próxima seção sobre o motivo).

## ⚠️ Mudança adicional pedida pelo usuário durante a Fase 2: limiar de baixo estoque 10→50

O usuário pediu (fora do escopo dos planos originais) pra aumentar o
padrão de alerta de baixo estoque de 10 para 50 marmitas. Aplicado via
`supabase/migrations/20260716_028_min_stock_alert_default_50.sql`: muda o
`DEFAULT` da coluna e atualiza os 56 produtos que ainda estavam no valor
padrão antigo (10→50); produtos já customizados manualmente (ex: combos em
5) não foram tocados. Também atualizados os defaults do formulário em
`EstoqueClient.tsx`.

**Efeito colateral real descoberto:** boa parte do cardápio (48 de 50
produtos `individual`) tem `stock_quantity` gravado como exatamente `50`
no banco (provavelmente valor de seed nunca ajustado pra refletir estoque
físico real) — com o novo limiar também em 50, a comparação
`stock_quantity <= min_stock_alert` (já existente, não é nova) passou a
marcar quase o cardápio inteiro como "baixo estoque" na tela da cozinha e
no painel de estoque. Isso **não é um bug de código** (o comparador
sempre foi `<=`, o problema é a coincidência dos dois valores ficarem
iguais) — é um sinal de que os números de `stock_quantity` reais
provavelmente precisam ser conferidos/atualizados pelo dono do negócio no
painel admin. Não tentei adivinhar/corrigir os valores reais de estoque —
isso é dado operacional, não decisão técnica.

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

## Regressão e2e pós-merge (rodada completa, master em `e450cef`)

40 testes rodados (`admin-pedidos`, `admin-estoque`, `api-orders-integrity`,
`api-orders-stock-variants`, `admin-cozinha`, `checkout-delivery-fee`,
`checkout-min-delivery`, `checkout-card-link-payment`, `checkout-pix-discount`,
`checkout-rice-choice`, `admin-revenue-dashboard`) — **40/40 passando**.
Flakiness por contenção de recursos observada em alguns testes ao rodar a
suite inteira de uma vez (máquina de 2 núcleos) — sempre passaram limpo
quando isolados; não é regressão real.

## ⬜ Worktrees órfãs de sessão anterior — decisão pendente

`.claude/worktrees/wf_708dafe0-0db-5` e `wf_708dafe0-0db-6` (o WIP abandonado
de B1/B2 da sessão passada, agora **totalmente superado** pelo B1/B2 refeitos
e já mesclados nesta sessão) ainda existem em disco. Tentativa de removê-las
foi bloqueada pelo classificador de permissão automático (nunca foram
examinadas nesta sessão antes do pedido de remoção). Seguro remover — o
conteúdo delas é puramente WIP de um trabalho que já foi refeito do zero e
mesclado — mas precisa de confirmação explícita do usuário antes.

## ⬜ QA final — em andamento

`qa-funcional` + `qa-ui` em paralelo, mais regressão e2e completa
serializada. Único item restante do lote inteiro.

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
5. **C16 não foi dividido em 2 sub-streams paralelos** (arroz vs. combos),
   ao contrário do que a Fase 1 tinha recomendado — o plano real tem as
   Tasks 2/3 e 4/5 explicitamente sequenciais (uma task substitui o bloco
   de código que a anterior criou, no mesmo arquivo), então rodou como 1
   stream serial único. Só descoberto ao ler o plano por completo.
6. **Migrations do C16 renumeradas** de 024/025 (como o plano original
   pedia) para 026/027, já que 024/025 foram usados pelo B1/C11 nesta
   mesma sessão. Nova migration 028 (limiar de estoque 10→50, pedido do
   usuário) não faz parte de nenhum plano original.
7. **Limiar de baixo estoque agora em 50** — ver seção própria acima sobre
   o efeito colateral nos dados reais de `stock_quantity`.
