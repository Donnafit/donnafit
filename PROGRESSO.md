# Donna FIT — Progresso do Projeto

**Atualizado em:** 02/06/2026  
**Branch:** master  
**Status geral:** Código 100% implementado — aguardando conexão com Supabase real para ir ao ar

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
| Seed — 7 categorias + 43 SKUs | `supabase/seed.sql` | ✅ |
| Variáveis de ambiente (template) | `.env.local` | ✅ (vazio, aguarda credenciais) |

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
| Login admin (Supabase Auth) | `src/app/admin/login/page.tsx` | ✅ |
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

#### 1. Criar projeto no Supabase e preencher `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://XXXXXXXXXXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_WHATSAPP_NUMBER=5541999154720
NEXT_PUBLIC_SITE_URL=https://donnafit.com.br
```

#### 2. Aplicar as migrations no Supabase (SQL Editor — nessa ordem)
1. `supabase/migrations/20260602_001_initial_schema.sql`
2. `supabase/migrations/20260602_002_rls_policies.sql`
3. `supabase/migrations/20260602_003_stock_rpc.sql`

#### 3. Rodar o seed para popular o cardápio
```sql
-- colar o conteúdo de supabase/seed.sql no SQL Editor do Supabase
```

#### 4. Criar usuários admin no Supabase
No painel Supabase → Authentication → Add User:
- `everson@donnafit.com.br` → depois atualizar `profiles.role = 'admin'`
- `patricia@donnafit.com.br` → depois atualizar `profiles.role = 'kitchen'`

SQL para setar os roles após criar os usuários:
```sql
UPDATE profiles SET role = 'admin' WHERE id = (
  SELECT id FROM auth.users WHERE email = 'everson@donnafit.com.br'
);
UPDATE profiles SET role = 'kitchen' WHERE id = (
  SELECT id FROM auth.users WHERE email = 'patricia@donnafit.com.br'
);
```

#### 5. Regenerar tipagem TypeScript do Supabase real
```bash
npx supabase gen types typescript --project-id SEU_PROJECT_ID > src/lib/supabase/database.types.ts
```

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
**Prazo contratual: 17/07/2026**

- [ ] Deploy em ambiente de staging (Vercel preview)
- [ ] Testar fluxo completo: cliente faz pedido → WhatsApp recebe → Everson vê no Kanban → Patricia vê na cozinha → ajuste de freezer reflete no site
- [ ] Testar realtime (< 3s entre pedido e aparecimento no painel)
- [ ] Testar responsividade: mobile (cardápio), tablet (cozinha), desktop (admin)
- [ ] Simular 100+ pedidos com a equipe para validar consistência de estoque
- [ ] Coletar feedback e aplicar ajustes de usabilidade

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
| M1 | Setup Infra & Banco | 05/06/2026 | **✅ Código pronto** |
| M2 | Cardápio & Checkout | 19/06/2026 | **✅ Código pronto** |
| M3 | Gestão de Pedidos | 03/07/2026 | **✅ Código pronto** |
| M4 | Cozinha & Estoque | 10/07/2026 | **✅ Código pronto** |
| M5 | Testes Assistidos | 17/07/2026 | ⏳ Aguarda deploy + Supabase real |
| M6 | Go-Live & Treinamento | 24/07/2026 | ⏳ Aguarda M5 + DNS |
