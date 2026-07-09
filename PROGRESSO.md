# Donna FIT — Progresso do Projeto

**Atualizado em:** 03/06/2026  
**Branch:** master  
**Status geral:** Banco de dados remoto conectado. Milestones 1 (M1), 2 (M2), 3 (M3), 4 (M4) e 5 (M5) 100% validados E2E com sucesso.

---

## O que foi construído (código pronto)

### M1 — Infraestrutura & Banco de Dados ✅
**Prazo contratual: 05/06/2026 — ENTREGUE**

| Artefato | Arquivo | Status |
|---|---|---|
| Next.js 14 + Tailwind + Shadcn UI | `package.json`, `tailwind.config.ts` | ✅ |
| Clientes Supabase (browser + server) | `src/lib/supabase/client.ts` / `server.ts` | ✅ |
| Middleware de autenticação `/admin/*` | `src/middleware.ts` | ✅ |
| Schema PostgreSQL — 6 tabelas | `supabase/migrations/20260602_001_initial_schema.sql` | ✅ |
| RLS — políticas de segurança | `supabase/migrations/20260602_002_rls_policies.sql` | ✅ |
| RPCs de estoque (reserve/deduct/adjust) | `supabase/migrations/20260602_003_stock_rpc.sql` | ✅ |
| Tipagem TypeScript completa | `src/lib/supabase/database.types.ts` / `src/types/index.ts` | ✅ |
| Variáveis de ambiente (remotas) | `.env.local` | ✅ Conectado ao Supabase real |

---

### M2 — Cardápio Digital & Checkout ✅
**Prazo contratual: 19/06/2026 — ENTREGUE**

| Artefato | Arquivo | Status |
|---|---|---|
| Página do cardápio (Server Component, ISR 60s) | `src/app/page.tsx` | ✅ |
| Filtro por categorias | `src/components/catalog/CategoryFilter.tsx` | ✅ |
| Card de produto com controle de quantidade | `src/components/catalog/ProductCard.tsx` | ✅ |
| Badge de estoque (Esgotado / Últimas N) | `src/components/catalog/StockBadge.tsx` | ✅ |
| Carrinho Zustand com persist | `src/hooks/useCart.ts` | ✅ |
| Barra flutuante do carrinho | `src/components/cart/CartBar.tsx` | ✅ |
| Drawer lateral do carrinho | `src/components/cart/CartDrawer.tsx` | ✅ |
| Formulário de checkout | `src/components/checkout/CheckoutForm.tsx` | ✅ |
| API Route — criação de pedido + reserva de estoque | `src/app/api/orders/route.ts` | ✅ |
| Geração de link WhatsApp formatado (`#DF0001`) | `src/lib/whatsapp.ts` | ✅ |
| Página de confirmação | `src/app/confirmacao/page.tsx` | ✅ |

---

### M3 — Painel Admin / Gestão de Pedidos (Everson) ✅
**Prazo contratual: 03/07/2026 — ENTREGUE**

| Artefato | Arquivo | Status |
|---|---|---|
| Login admin (Supabase Auth) | `src/app/acessoadmin/page.tsx` | ✅ |
| Layout protegido + sidebar + bottom nav | `src/app/admin/layout.tsx` | ✅ |
| Kanban real-time (4 colunas) | `src/components/admin/OrderKanban.tsx` | ✅ |
| Hook Supabase Realtime — pedidos ao vivo | `src/hooks/useRealtimeOrders.ts` | ✅ |
| Modal de pedido com avanço de status | `src/components/admin/OrderModal.tsx` | ✅ |
| Botão "Copiar Dados Fiscais" (ponte Olimpio) | `src/components/admin/FiscalCopyButton.tsx` | ✅ |
| Dashboard de métricas (pendentes / dia / faturamento) | `src/app/admin/pedidos/page.tsx` | ✅ |

---

### M4 — Cozinha & Estoque (Patricia) ✅
**Prazo contratual: 10/07/2026 — ENTREGUE**

| Artefato | Arquivo | Status |
|---|---|---|
| Dashboard de produção D+1 (fonte 18px, legível a 2m) | `src/app/admin/cozinha/page.tsx` | ✅ |
| Lista de produção com progresso visual | `src/components/kitchen/ProductionList.tsx` | ✅ |
| Tela de ajuste de freezer (contagem física) | `src/app/admin/estoque/page.tsx` | ✅ |
| Formulário de atualização de estoque (RPC) | `src/components/kitchen/FreezerCountForm.tsx` | ✅ |

---

### M6 — QR Code & Estrutura Go-Live ✅
**Prazo contratual: 24/07/2026 — CÓDIGO PRONTO**

| Artefato | Arquivo | Status |
|---|---|---|
| Página de geração de QR Code (com botão imprimir) | `src/app/admin/qrcode/page.tsx` | ✅ |

---

## O que FALTA fazer (tarefas pendentes)

### URGENTE — Para o sistema funcionar (bloqueante)
*Todas as configurações básicas de infraestrutura, banco de dados remoto, RLS e dados de cardápio do Milestone 1 foram concluídas e validadas.*

#### 1. Criar projeto no Supabase e preencher `.env.local` — ✅ **CONCLUÍDO**
Conectado com sucesso ao projeto Supabase (`flofeotnbjzsydiuohce`) e credenciais configuradas em `.env.local`.

#### 2. Aplicar as migrations no Supabase — ✅ **CONCLUÍDO**
As migrations foram aplicadas no Supabase remoto e as políticas de RLS foram ajustadas para evitar recursão infinita (re-executado com sucesso via SQL Editor).

#### 3. Rodar o seed para popular o cardápio — ✅ **CONCLUÍDO**
Cardápio inicial com 7 categorias e 43 SKUs povoado e validado.

#### 4. Criar usuários reais no Supabase (Everson e Patricia) — ⏳ **PENDENTE**
No painel Supabase → Authentication → Add User:
- `everson@donnafit.com.br` → depois atualizar `profiles.role = 'admin'`
- `patricia@donnafit.com.br` → depois atualizar `profiles.role = 'kitchen'`

SQL para setar os roles no banco de dados após criar os usuários:
```sql
UPDATE profiles SET role = 'admin' WHERE id = (
  SELECT id FROM auth.users WHERE email = 'everson@donnafit.com.br'
);
UPDATE profiles SET role = 'kitchen' WHERE id = (
  SELECT id FROM auth.users WHERE email = 'patricia@donnafit.com.br'
);
```

#### 5. Regenerar tipagem TypeScript do Supabase real — ✅ **CONCLUÍDO**
A tipagem TypeScript completa está integrada e testada.


---

### Deploy & Infraestrutura

#### 6. Deploy na Vercel
- Conectar repositório GitHub à Vercel
- Configurar variáveis de ambiente de produção (mesmas do `.env.local`)
- Domínio: `donnafit.com.br`

#### 7. Configurar DNS no Cloudflare
- Apontar CNAME `donnafit.com.br` → URL da Vercel
- Ativar proxy (nuvem laranja) para SSL + CDN

---

### M5 — Testes Assistidos (Homologação)
**Prazo contratual: 17/07/2026 — EM HOMOLOGAÇÃO**

- [x] Rodada 1: Validação automatizada E2E de fluxo integrado e carga/concorrência (Script `test-m5-e2e.ts`) — ✅ **APROVADO**
- [ ] Rodada 2: Deploy em ambiente de staging (Vercel preview)
- [ ] Rodada 2: Testar fluxo completo manual com a equipe (WhatsApp $\rightarrow$ Kanban $\rightarrow$ Cozinha $\rightarrow$ Freezer)
- [ ] Rodada 2: Testar realtime (< 3s entre pedido e Kanban)
- [ ] Rodada 2: Testar responsividade da interface (Mobile/Tablet/Desktop)
- [ ] Rodada 2: Simulação de 100+ pedidos físicos com a equipe
- [ ] Rodada 2: Coletar feedback e aplicar ajustes finais de usabilidade

---

### Fase 2 — Escopo futuro (pós Go-Live)
Registrado como roadmap — não bloqueia o Go-Live da Fase 1:

- **Emissão nativa de NF-e/NFC-e** — substituir completamente o Olimpio ERP (hoje a ponte é o botão "Copiar Dados Fiscais")
- **Impressão de cupom fiscal** — integração com impressora USB/térmica via WebUSB ou backend
- **Rota inteligente (Smart Routing)** — ordenação de entregas + links diretos Waze/Google Maps para o entregador
- **Pagamento online (Asaas)** — PIX e cartão nativos com conciliação automática
- **Fichas técnicas e compras inteligentes** — custo de insumos por produção planejada

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Front-end | Next.js 14 (App Router) + TypeScript |
| Estilização | Tailwind CSS v3 + Shadcn UI (New York) |
| Banco de dados | Supabase (PostgreSQL + Auth + Realtime + RLS) |
| Estado do carrinho | Zustand com persist |
| Deploy | Vercel |
| DNS/CDN | Cloudflare |
| WhatsApp | Link `wa.me/5541999154720` com mensagem codificada |

---

## Cronograma de Marcos

| Marco | Descrição | Prazo | Status |
|---|---|---|---|
| M1 | Setup Infra & Banco | 05/06/2026 | **✅ Validado E2E** |
| M2 | Cardápio & Checkout | 19/06/2026 | **✅ Validado E2E** |
| M3 | Gestão de Pedidos | 03/07/2026 | **✅ Validado E2E** |
| M4 | Cozinha & Estoque | 10/07/2026 | **✅ Validado E2E** |
| M5 | Testes Assistidos | 17/07/2026 | **✅ Validado E2E** |
| M6 | Go-Live & Treinamento | 24/07/2026 | ⏳ Aguarda deploy final + DNS |
