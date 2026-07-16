# Donna FIT — Lote de Correções e Features (Jul/2026)

## Contexto

Lista de 17 pedidos do cliente cobrindo bugs de checkout/WhatsApp, correções operacionais
(cozinha, cadastro de produto) e três features novas (pagamento com link, dashboard de
faturamento, sistema de combos/variação de estoque por tipo de arroz). Triagem feita via
exploração do código (ver achados por item abaixo) + clarificação direta com o cliente.

Execução em 3 fases, na ordem: **Grupo A (bugs diretos) → Grupo B (ajustes operacionais) →
Grupo C (features novas)**.

---

## Grupo A — Bugs diretos

### A1. Desconto PIX mostrando 5%
- **Hoje:** `settings.pix_discount_rate` no Supabase (padrão 2%), aplicado em
  `CheckoutForm.tsx`, `src/app/api/orders/route.ts:115-118` e exibido em
  `src/app/admin/(protected)/configuracoes/page.tsx:38`.
- **Fix:** localizar onde "5%" está fixo (texto estático, valor salvo antigo no banco, ou
  cálculo duplicado fora do fluxo acima) e garantir uma única fonte de verdade
  (`pix_discount_rate`) em todos os pontos de exibição/cálculo.

### A2/A6. Bairro não reconhecido (com ou sem complemento)
- **Hoje:** `src/lib/deliveryZones.ts` (`matchDeliveryZone`, substring match numa lista
  conhecida) + `src/lib/geocoding.ts` (`geocodeToBairro`, fallback via Nominatim).
- **Fix:** separar complemento (ex: "Sobrado Verde", "Apto 12", "Casa 2") do logradouro
  antes de tentar casar contra a lista de bairros ou consultar o Nominatim. Adicionar
  parsing mais robusto do texto de endereço livre (heurística: tudo depois do número ou
  depois do primeiro hífen que não seja o próprio bairro é complemento).

### A3. Emojis quebrando na mensagem do WhatsApp
- **Hoje:** `buildWhatsAppMessage` em `src/lib/whatsapp.ts` monta a string com emojis
  literais; `buildWhatsAppURL` aplica `encodeURIComponent` uma vez.
- **Fix:** investigar o caller em `CheckoutForm.tsx` — suspeita de dupla codificação ou
  de o link `wa.me` ser aberto de forma que corrompe UTF-8. Corrigir no ponto exato do
  bug (não reescrever `whatsapp.ts` se não for a causa).

### A4. Forçar cache-bust do deploy
- Forçar que a versão publicada mais recente (que já inclui os fixes deste lote) chegue
  a todos os usuários sem depender de cache de CDN/browser/PWA. Ação de deploy/infra —
  não é mudança de código de produto.

### A8. Padding da seta em dropdowns
- **Hoje:** não há um componente `Select` compartilhado; cada tela reimplementa seu
  próprio dropdown (`EstoqueClient.tsx`, `ManualClient.tsx`, `AnunciosClient.tsx`,
  `configuracoes/page.tsx`), todos com o ícone de seta colado na borda.
- **Fix:** padronizar o padding direito do botão/ícone em cada uma dessas implementações
  (fix pontual e repetido, não extração de componente novo — fora de escopo deste lote).

### A10. Botão "+" de categoria não funciona
- **Hoje:** o botão existe no filtro de categorias do cardápio admin, mas só há leitura
  (`.from("categories").select(...)`); não há escrita/criação.
- **Fix:** implementar a ação de criar categoria (modal simples: nome) e persistir no
  Supabase, atualizando a lista de categorias sem reload da página.

### A17. Auditoria de responsividade mobile (novo, adicionado nesta rodada)
- Cliente reportou padding quebrado e títulos vazando do card em telas mobile,
  espalhados por várias telas do admin/cardápio.
- **Abordagem:** agente de frontend dedicado faz varredura visual (viewport mobile) nas
  telas principais (cardápio, checkout, admin: pedidos/Kanban, estoque, cozinha,
  configurações) e corrige overflow/padding onde encontrar, antes ou em paralelo aos
  outros itens de Grupo A.

---

## Grupo B — Ajustes operacionais

### B5/B9. Painel da cozinha — quantidade editável + controles de status
- **Hoje:** duas telas distintas:
  - `KitchenClient.tsx` + `/api/kitchen/produce`: registra produção, soma
    `stock_quantity`.
  - `OrderModal.tsx`/`OrderKanban.tsx`: avança status do pedido (Iniciar Produção →
    Pronto).
- **Fix:**
  1. Adicionar campo de quantidade **digitável** (além dos botões +/-) em ambas as
     telas onde fizer sentido — opção do usuário, não substitui os botões.
  2. Debugar e corrigir os controles de avanço de status que não respondem (Kanban).
  3. **Verificação obrigatória:** garantir que a integração estoque ↔ pedidos continua
     correta após as mudanças — reserva no checkout (combo) e baixa na produção
     (avulso/individual) precisam bater com o `stock_quantity` real, sem dupla baixa ou
     baixa perdida. QA funcional roda um teste de ponta a ponta neste fluxo antes de
     fechar a fase.

### B7/B12/B13. Consolidar campos no cadastro de produto
- **Hoje:** `EstoqueClient.tsx` (produto: nome, descrição, preço, SKU, categoria, tipo
  de estoque, quantidade, etc.) e `ManualClient.tsx` (só `prep_instructions`, isolado).
- **Fix:** mover ingredientes e modo de preparo para dentro do formulário de cadastro de
  produto em `EstoqueClient.tsx` (deixam de ficar isolados em `ManualClient.tsx`).
  Adicionar seleção de tipo de arroz (nenhum / só integral / só branco / ambos) — detalhe
  de implementação descrito em C16a abaixo, pois compartilha o mesmo formulário.

### B14. Aviso de frete mínimo (8 marmitas)
- Frete só é oferecido a partir de 8 marmitas no carrinho. Adicionar aviso fixo visível
  no cardápio (perto do resumo do carrinho) e no checkout (perto da seleção de entrega),
  e bloquear a opção de entrega com mensagem clara se o carrinho tiver menos que 8.

---

## Grupo C — Features novas

### C11. Pagamento com link de cartão
- Nova opção de pagamento no checkout: "Cartão (link de pagamento)", ao lado das
  existentes (PIX, Dinheiro, etc.).
- Mostra aviso: o link de pagamento será enviado manualmente pelo WhatsApp após a
  confirmação do pedido.
- **Sem desconto** (mesmo tratamento de Dinheiro/Cartão na entrega — só PIX tem
  desconto).
- Entra na mensagem do WhatsApp como forma de pagamento escolhida, para o atendente
  saber que precisa mandar o link manualmente.

### C15. Dashboard de faturamento (popup)
- **Gatilho:** clique no tile "Faturamento" em `AdminHero.tsx:143` (hoje estático, sem
  `onClick`), na tela de Pedidos.
- **Filtros:** Hoje / 7 dias / 30 dias / Personalizado (intervalo de datas).
- **Conteúdo:** total de pedidos, total de marmitas vendidas, faturamento no período, e
  um gráfico com 2 séries (faturamento e quantidade de pedidos) ao longo do tempo.
- **Implementação:** nova API route agregando pedidos por dia dentro do período
  filtrado; biblioteca de gráfico leve (Recharts — projeto ainda não usa nenhuma lib de
  gráfico, será a primeira).

### C16a. Estoque por tipo de arroz (integral/branco)
- **Hoje:** só existe `rice_integral_available` (booleano) no produto — não há estoque
  separado por tipo, e a escolha do cliente no checkout não desconta de nada específico.
- **Fix:** no cadastro de produto, opção: nenhum arroz / só integral / só branco / ambos.
  - Nenhum ou um só tipo → segue como hoje, um único campo de quantidade.
  - Ambos → dois campos de quantidade (integral e branco), armazenados como duas
    colunas simples no produto (`rice_stock_integral`, `rice_stock_branco`) — não é um
    sistema de variação genérico, é específico para os dois tipos de arroz.
- **Fluxo do cliente no checkout continua idêntico** (pergunta o tipo, sem mudança
  visível); a baixa de estoque no pedido passa a mirar a variante certa (respeitando o
  timing combo/individual já existente).

### C16b. Sistema de combos (maior mudança estrutural)
- **Hoje:** `stock_type: "combo" | "avulso"` controla **quando** desconta o estoque
  (checkout vs. produção) — não tem relação com o produto ser um pacote de vários itens.
- **Novo modelo:** `stock_type` passa a significar **composição**:
  - **Individual** — produto único, com seu próprio `stock_quantity` (substitui o
    conceito de "avulso"; a distinção de timing checkout/produção deixa de existir como
    per Item 16 clarificado — todo produto individual usa um único controle de estoque
    "completo").
  - **Combo** — pacote de vários produtos individuais. Não tem `stock_quantity` própria;
    seu estoque é sempre derivado do estoque dos componentes. Todo combo continua sendo
    uma linha normal na tabela `products` (aparece no cardápio, tem preço, categoria
    etc.) — só ganha uma composição associada.
- **Nova tabela `combo_items`:** `combo_product_id`, `component_product_id`, `quantity`.
- **Cadastro:** ao marcar "Combo", escolher os produtos individuais componentes + a
  quantidade de cada um; opção de copiar a composição de um combo já existente como
  ponto de partida e ajustar.
- **Baixa de estoque:** ao vender um combo, decrementa o estoque de cada componente
  individualmente (não existe estoque próprio do combo a decrementar).
- Combos hoje já vendidos no cardápio precisam ser migrados para o novo modelo
  (associar composição aos combos existentes) como parte da implementação — não pode
  quebrar os combos já ativos.

---

## Verificação transversal (todas as fases)

- Qualquer mudança em B5/B9, C16a ou C16b precisa de teste de ponta a ponta no fluxo
  **estoque ↔ pedido**: reserva/baixa correta, sem dupla contagem, refletindo em tempo
  real no painel de estoque e no painel da cozinha.
- A17 (auditoria mobile) é validada visualmente (viewport mobile) pelo QA de UI antes de
  fechar cada fase que tocar telas visuais.

## Fora de escopo (explicitamente)
- Sistema de variação genérico (tamanhos, sabores etc.) além do caso específico do
  arroz.
- Extração de um componente `Select` compartilhado (o fix de A8 é pontual, tela por
  tela).
- Gateway de pagamento automatizado para o cartão com link (C11) — o link continua
  sendo enviado manualmente pelo atendente via WhatsApp, sem integração com processador
  de pagamento.
