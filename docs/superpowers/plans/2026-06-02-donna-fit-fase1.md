# Donna FIT Fase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Fase 1 MVP Operacional for Donna FIT — a web system replacing WhatsApp as order management, with a customer-facing menu, admin order panel, kitchen production dashboard, and automatic freezer stock control.

**Architecture:** Next.js 14 App Router (TypeScript) on Vercel, backed by Supabase (PostgreSQL + Realtime + Auth + RLS). Public route (`/`) = customer menu + cart + checkout → WhatsApp link. Protected routes (`/admin/*`) = order Kanban, kitchen D+1 view, freezer count. No payment gateway in Phase 1 — PIX/card handled offline, system collects order only.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn UI, Supabase (PostgreSQL + Auth + Realtime + RLS), Zustand (cart state), Vercel (deploy), Cloudflare (DNS/CDN)

**Contract milestones:**
- M1 — 05/06/2026: Infra + DB schema + seed data ← **DUE TOMORROW**
- M2 — 19/06/2026: Cardápio Digital + Checkout + WhatsApp
- M3 — 03/07/2026: Admin panel (Everson) real-time
- M4 — 10/07/2026: Kitchen (Patricia) + Freezer stock
- M5 — 17/07/2026: Assisted QA tests
- M6 — 24/07/2026: Go-live + QR code + training

---

## Business Rules (critical for implementation)

| Rule | Detail |
|------|--------|
| Stock types | `combo` = already in freezer (count-based); `avulso` = daily production (unlimited until out) |
| Stock deduction | Reserved on checkout, confirmed-deducted when admin sets status → `production` |
| Order ID | Format `#DF0001` — sequential 4-digit zero-padded |
| D+1 production | Kitchen view shows items from orders whose `delivery_date = TOMORROW` |
| Olimpio ERP bridge | Admin panel shows "Copiar Dados Fiscais" per order — copies formatted text to clipboard for manual paste into Olimpio |
| Freezer count | Patricia/Everson opens stock screen, types count per SKU, saves → immediately updates customer site availability |
| WhatsApp number | `5541999154720` (no spaces, no +) |
| Brand colors | Primary gold `#C89B3C`, secondary green `#5A6B2A` |

---

## File Structure

```
/ (project root — where .git lives)
├── src/
│   ├── app/
│   │   ├── layout.tsx                   # Root layout: fonts, metadata, providers
│   │   ├── page.tsx                     # Cardápio Digital (public)
│   │   ├── confirmacao/
│   │   │   └── page.tsx                 # Order confirmation + order ID
│   │   └── admin/
│   │       ├── layout.tsx               # Admin layout: sidebar + auth guard
│   │       ├── page.tsx                 # Admin home → redirects to /admin/pedidos
│   │       ├── login/
│   │       │   └── page.tsx             # Login form (Supabase Auth)
│   │       ├── pedidos/
│   │       │   └── page.tsx             # Order Kanban (Everson)
│   │       ├── cozinha/
│   │       │   └── page.tsx             # Kitchen D+1 production list (Patricia)
│   │       └── estoque/
│   │           └── page.tsx             # Freezer count / stock adjustment
│   ├── components/
│   │   ├── catalog/
│   │   │   ├── ProductCard.tsx          # Single product card
│   │   │   ├── CategoryFilter.tsx       # Tab filter bar (Combos, Avulso, etc.)
│   │   │   └── StockBadge.tsx           # "Esgotado" / "Últimas X" badge
│   │   ├── cart/
│   │   │   ├── CartBar.tsx              # Floating bottom bar (mobile-first)
│   │   │   ├── CartDrawer.tsx           # Cart sheet: items + summary + checkout CTA
│   │   │   └── CartItem.tsx             # Row: name, qty +/-, price, remove
│   │   ├── checkout/
│   │   │   ├── CheckoutForm.tsx         # Name, phone, delivery/pickup, PIX/card
│   │   │   └── WhatsAppButton.tsx       # Generates & opens wa.me link
│   │   ├── admin/
│   │   │   ├── AdminSidebar.tsx         # Desktop sidebar nav
│   │   │   ├── AdminBottomNav.tsx       # Mobile bottom nav
│   │   │   ├── OrderKanban.tsx          # 5-column board (pending→cancelled)
│   │   │   ├── OrderCard.tsx            # Kanban card with drag or button advance
│   │   │   ├── OrderModal.tsx           # Order details + status + Olimpio copy
│   │   │   └── FiscalCopyButton.tsx     # "Copiar Dados Fiscais" → clipboard
│   │   └── kitchen/
│   │       ├── ProductionList.tsx       # Grouped SKUs for D+1
│   │       └── FreezerCountForm.tsx     # Input per SKU + save button
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                # createBrowserClient()
│   │   │   ├── server.ts                # createServerClient() for RSC/API routes
│   │   │   └── database.types.ts        # Generated types (via supabase gen types)
│   │   ├── whatsapp.ts                  # buildWhatsAppOrderMessage(order)
│   │   ├── order-id.ts                  # generateOrderNumber() → #DF0001
│   │   └── utils.ts                     # cn(), formatCurrency(), formatDate()
│   ├── hooks/
│   │   ├── useCart.ts                   # Zustand cart store
│   │   └── useRealtimeOrders.ts         # Supabase Realtime subscription hook
│   └── types/
│       └── index.ts                     # Shared TS interfaces
├── supabase/
│   ├── migrations/
│   │   └── 20260602_001_initial_schema.sql
│   └── seed.sql                         # ~40 SKUs from id-visual.md
├── public/
│   └── logo.svg                         # Copied from materiais do cliente/
├── .env.local                           # SUPABASE_URL, SUPABASE_ANON_KEY, etc.
└── package.json
```

---

## MILESTONE 1 — Setup de Infra & Banco de Dados (due 05/06/2026)

### Task 1: Bootstrap Next.js project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts` (via create-next-app)
- Create: `.env.local`
- Create: `src/lib/utils.ts`

- [ ] **Step 1: Run create-next-app in the project root**

```bash
cd "d:/Clientes 2024/Donna FIT"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

When prompted: accept all defaults. This creates `src/app/`, `package.json`, `tsconfig.json`, `tailwind.config.ts`.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr zustand
npm install -D @types/node
```

- [ ] **Step 3: Install Shadcn UI**

```bash
npx shadcn@latest init
```

When prompted: select New York style, use the project's colors (we'll override in step 4).

Add core components:
```bash
npx shadcn@latest add button card badge sheet dialog input label tabs separator skeleton toast
```

- [ ] **Step 4: Configure brand colors in `tailwind.config.ts`**

Extend the config with Donna FIT brand tokens:

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss"
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: "#C89B3C",
          "gold-dark": "#A67D2A",
          green: "#5A6B2A",
          "green-dark": "#3D4A1C",
        },
      },
      fontFamily: {
        display: ["Montserrat", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
export default config
```

- [ ] **Step 5: Create `src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "clsx/tw-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}
```

- [ ] **Step 6: Copy logo to public/**

```bash
cp "d:/Clientes 2024/Donna FIT/materiais do cliente/logo.svg" "d:/Clientes 2024/Donna FIT/public/logo.svg"
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```
Expected: "ready on http://localhost:3000" with default Next.js page.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json next.config.ts tsconfig.json tailwind.config.ts src/ public/ .gitignore
git commit -m "feat(infra): bootstrap Next.js 14 + Tailwind + Shadcn UI"
```

---

### Task 2: Supabase client setup

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `.env.local` (manual — not committed)
- Modify: `src/middleware.ts` (created fresh)

- [ ] **Step 1: Create `.env.local` with Supabase credentials**

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
WHATSAPP_NUMBER=5541999154720
```

(Get values from Supabase Dashboard → Project Settings → API)

- [ ] **Step 2: Create `src/lib/supabase/client.ts`**

```ts
import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "./database.types"

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Create `src/lib/supabase/server.ts`**

```ts
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "./database.types"

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 4: Create `src/middleware.ts`** (protects /admin/* routes)

```ts
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith("/admin") &&
      !request.nextUrl.pathname.startsWith("/admin/login")) {
    const url = request.nextUrl.clone()
    url.pathname = "/admin/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/admin/:path*"],
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/ src/middleware.ts
git commit -m "feat(infra): add Supabase client (browser + server) + auth middleware"
```

---

### Task 3: Database schema migration

**Files:**
- Create: `supabase/migrations/20260602_001_initial_schema.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260602_001_initial_schema.sql

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE public.categories (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PRODUCTS (marmitas)
-- ============================================================
CREATE TABLE public.products (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id      UUID        REFERENCES public.categories(id) ON DELETE SET NULL,
  sku              TEXT        UNIQUE,             -- original menu number (e.g. "04")
  name             TEXT        NOT NULL,
  description      TEXT,
  price            NUMERIC(10,2) NOT NULL,
  image_url        TEXT,
  stock_type       TEXT        NOT NULL DEFAULT 'avulso'
                               CHECK (stock_type IN ('combo', 'avulso')),
  stock_quantity   INT         NOT NULL DEFAULT 0, -- physical count in freezer
  min_stock_alert  INT         NOT NULL DEFAULT 10,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  sort_order       INT         NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ORDER SEQUENCE (for #DF0001 numbers)
-- ============================================================
CREATE SEQUENCE public.order_number_seq START 1;

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE public.orders (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number    TEXT        NOT NULL UNIQUE
                              DEFAULT 'DF' || LPAD(nextval('order_number_seq')::TEXT, 4, '0'),
  customer_name   TEXT        NOT NULL,
  customer_phone  TEXT        NOT NULL,
  delivery_type   TEXT        NOT NULL CHECK (delivery_type IN ('delivery', 'pickup')),
  payment_method  TEXT        NOT NULL CHECK (payment_method IN ('pix', 'card')),
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','production','ready','delivered','cancelled')),
  subtotal        NUMERIC(10,2) NOT NULL,
  total           NUMERIC(10,2) NOT NULL,
  notes           TEXT,
  delivery_date   DATE,       -- D+1: production day for kitchen
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE public.order_items (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id      UUID        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id    UUID        REFERENCES public.products(id) ON DELETE SET NULL,
  product_name  TEXT        NOT NULL,  -- snapshot at order time
  product_sku   TEXT,
  quantity      INT         NOT NULL CHECK (quantity > 0),
  unit_price    NUMERIC(10,2) NOT NULL,
  subtotal      NUMERIC(10,2) NOT NULL GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- ============================================================
-- STOCK MOVEMENTS (audit trail)
-- ============================================================
CREATE TABLE public.stock_movements (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id   UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL
               CHECK (type IN ('reservation','deduction','adjustment','restock','cancellation')),
  quantity     INT         NOT NULL,   -- positive = add, negative = subtract
  reference_id UUID,                   -- order_id for order-related movements
  notes        TEXT,
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id         UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name  TEXT,
  role       TEXT        NOT NULL DEFAULT 'staff'
             CHECK (role IN ('admin', 'kitchen', 'staff')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles(id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

- [ ] **Step 2: Apply migration via Supabase SQL editor OR supabase CLI**

Option A (easiest — Supabase Dashboard):
1. Open Supabase Dashboard → SQL Editor
2. Paste the entire content of `20260602_001_initial_schema.sql`
3. Click "Run"
4. Verify in Table Editor: categories, products, orders, order_items, stock_movements, profiles all created

Option B (supabase CLI):
```bash
npx supabase db push
```

- [ ] **Step 3: Verify tables exist in Supabase Table Editor**

Expected tables: `categories`, `products`, `orders`, `order_items`, `stock_movements`, `profiles`

- [ ] **Step 4: Commit migration file**

```bash
git add supabase/
git commit -m "feat(db): initial schema — products, orders, order_items, stock, profiles"
```

---

### Task 4: RLS Policies

**Files:**
- Create: `supabase/migrations/20260602_002_rls_policies.sql`

- [ ] **Step 1: Create RLS migration**

```sql
-- supabase/migrations/20260602_002_rls_policies.sql

-- Enable RLS on all tables
ALTER TABLE public.categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CATEGORIES: public read, admin write
-- ============================================================
CREATE POLICY "categories_public_read"
  ON public.categories FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "categories_admin_all"
  ON public.categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- PRODUCTS: public read active, admin write
-- ============================================================
CREATE POLICY "products_public_read_active"
  ON public.products FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "products_auth_read_all"
  ON public.products FOR SELECT TO authenticated USING (true);

CREATE POLICY "products_admin_write"
  ON public.products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- ORDERS: anon can insert, authenticated can read/update
-- ============================================================
CREATE POLICY "orders_anon_insert"
  ON public.orders FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "orders_auth_read"
  ON public.orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "orders_auth_update"
  ON public.orders FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- ORDER ITEMS: anon insert (with order), auth read
-- ============================================================
CREATE POLICY "order_items_anon_insert"
  ON public.order_items FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "order_items_auth_read"
  ON public.order_items FOR SELECT TO authenticated USING (true);

-- ============================================================
-- STOCK MOVEMENTS: auth only
-- ============================================================
CREATE POLICY "stock_movements_auth_all"
  ON public.stock_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- PROFILES: users can read their own, admin reads all
-- ============================================================
CREATE POLICY "profiles_own_read"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_admin_read_all"
  ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "profiles_own_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
```

- [ ] **Step 2: Apply via Supabase Dashboard SQL Editor or CLI**

Run the SQL. Verify in Authentication → Policies that each table shows the expected policies.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260602_002_rls_policies.sql
git commit -m "feat(db): RLS policies — public catalog read, anon order insert, auth admin"
```

---

### Task 5: TypeScript types generation

**Files:**
- Create: `src/lib/supabase/database.types.ts`

- [ ] **Step 1: Generate types from Supabase**

```bash
npx supabase gen types typescript \
  --project-id <your-supabase-project-id> \
  --schema public \
  > src/lib/supabase/database.types.ts
```

(Find project ID in Supabase Dashboard → Project Settings → General)

- [ ] **Step 2: Create `src/types/index.ts` with derived app types**

```ts
// src/types/index.ts
import type { Database } from "@/lib/supabase/database.types"

export type Category = Database["public"]["Tables"]["categories"]["Row"]
export type Product = Database["public"]["Tables"]["products"]["Row"]
export type Order = Database["public"]["Tables"]["orders"]["Row"]
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"]
export type StockMovement = Database["public"]["Tables"]["stock_movements"]["Row"]
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]

export type OrderStatus = Order["status"]
export type StockType = Product["stock_type"]
export type DeliveryType = Order["delivery_type"]
export type PaymentMethod = Order["payment_method"]

// Cart types (client-side only, not in DB)
export interface CartItem {
  product: Product
  quantity: number
}

export interface Cart {
  items: CartItem[]
  total: number
  count: number
}

// Order with items (joined query result)
export interface OrderWithItems extends Order {
  order_items: (OrderItem & { product: Product | null })[]
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/database.types.ts src/types/index.ts
git commit -m "feat(types): generate Supabase DB types + app-level type aliases"
```

---

### Task 6: Seed data (~40 SKUs)

**Files:**
- Create: `supabase/seed.sql`

- [ ] **Step 1: Create seed file with all SKUs from id-visual.md**

```sql
-- supabase/seed.sql

-- Categories (must insert before products)
INSERT INTO public.categories (name, slug, sort_order) VALUES
  ('Combos',           'combos',        1),
  ('Pratos Principais','pratos',        2),
  ('Massas',           'massas',        3),
  ('Sopas e Caldos',   'sopas',         4),
  ('Low Carb',         'low-carb',      5),
  ('Vegetariano',      'vegetariano',   6),
  ('Adicionais',       'adicionais',    7);

-- Products — Combos (stock_type = 'combo', avulso count managed by freezer)
WITH cat AS (SELECT id FROM public.categories WHERE slug = 'combos')
INSERT INTO public.products (category_id, name, description, price, stock_type, stock_quantity, min_stock_alert, sort_order)
SELECT cat.id, name, description, price, 'combo', 20, 5, sort_order FROM cat, (VALUES
  ('Combo 10 Sopas',             '2 sopa de abóbora + frango desfiado e queijo + 2 caldos',  129.90, 1),
  ('Combo 10 Refeições',         '',                                                          141.90, 2),
  ('Projeto 5 Dias no Foco',     '10 refeições almoço e jantar',                             143.90, 3),
  ('Combo Premium 10 Refeições', '',                                                          165.90, 4),
  ('Combo Queridinho da Nutri',  '',                                                          199.90, 5),
  ('Combo 12 Refeições + 3 Sopas','',                                                         202.90, 6),
  ('Combo 16 Refeições + 4 Sopas','',                                                         262.90, 7),
  ('Combo 20 Refeições',         '',                                                          289.90, 8)
) AS t(name, description, price, sort_order);

-- Products — Pratos Principais (stock_type = 'avulso')
WITH cat AS (SELECT id FROM public.categories WHERE slug = 'pratos')
INSERT INTO public.products (category_id, sku, name, description, price, stock_type, stock_quantity, sort_order)
SELECT cat.id, sku, name, description, price, 'avulso', 50, sort_order FROM cat, (VALUES
  ('04', 'Estrogonofe de Frango',                     'Com arroz branco e batata palha',                      15.00,  1),
  ('03', 'Estrogonofe de Carne',                      'Com arroz branco e batata palha',                      18.50,  2),
  ('05', 'Estrogonofe de Salmão',                     'Com arroz branco e batata palha',                      16.00,  3),
  (NULL, 'Estrogonofe de Frango com Purê de Mandioquinha','',                                                 16.00,  4),
  ('10', 'Escondidinho de Batata Doce',               'Purê + recheio carne + queijo gratinado',              16.00,  5),
  ('07', 'Escondidinho de Aipim',                     'Com carne moída e queijo (350g)',                      16.50,  6),
  ('43', 'Brasileirinho',                             'Carne moída com arroz e feijão (350g)',                15.00,  7),
  ('47', 'Brasileirinho Fit',                         'Frango isca com cenoura ralada, arroz e feijão (300g)',14.50,  8),
  ('17', 'Frango Xadrez',                             'Cubos, mix de pimentão, champignon',                  15.50,  9),
  ('14', 'Sobrecoxa com Creme de Milho',              'Sobrecoxa de frango desfiada, creme de milho e arroz', 15.00, 10),
  ('37', 'Filé de Tilápia ao Molho Siciliano',        'Mix de legumes e arroz',                               20.00, 11),
  ('49', 'Fricassê de Frango',                        'Com queijo, batata palha e arroz branco',              15.50, 12),
  (NULL, 'Arroz Carreteiro (300g)',                   'Picadinho de carne bovina, bacon, calabresa, cenoura', 15.00, 13),
  (NULL, 'Bife a Rolê com Arroz e Feijão (350g)',     'Bife a rolê (bacon, calabresa e cenoura) molho de tomate',22.00,14),
  (NULL, 'Picadinho de Carne com Legumes na Manteiga','120g carne + 130g legumes',                            17.00, 15),
  ('10b','Moída com Legumes (300g)',                  'Moída refogada com legumes e arroz',                   15.00, 16),
  ('34', 'Moída com Legumes com Purê de Abóbora',     'Moída refogada com legumes e purê de abóbora (350g)', 15.50, 17),
  ('46', 'Mix de Legumes',                            'Cenoura, vagem e grão de bico (150g)',                  4.50, 18),
  ('06', 'Feijoada',                                  'Costelinha suína defumada, paio, calabresa',           15.50, 19)
) AS t(sku, name, description, price, sort_order);

-- Products — Massas
WITH cat AS (SELECT id FROM public.categories WHERE slug = 'massas')
INSERT INTO public.products (category_id, sku, name, description, price, stock_type, stock_quantity, sort_order)
SELECT cat.id, sku, name, description, price, 'avulso', 50, sort_order FROM cat, (VALUES
  ('25', 'Macarrão Integral à Bolonhesa',    'Espaguete, Penne ou parafuso integral ao molho bolonhesa',  16.00, 1),
  ('24', 'Espaguete',                        'Com molho posta desfiada, molho de tomate',                 14.00, 2),
  ('26', 'Nhoque à Bolonhesa',               'Nhoque ao molho bolonhesa e queijo com molho de tomate',    17.00, 3),
  ('31', 'Nhoque ao Molho Branco',           'Nhoque ao molho branco e queijo (350g)',                    15.00, 4),
  (NULL, 'Panqueca de Carne',                '3 panquecas recheio carne, molho de tomate artesanal (300g)',18.00,5)
) AS t(sku, name, description, price, sort_order);

-- Products — Sopas e Caldos
WITH cat AS (SELECT id FROM public.categories WHERE slug = 'sopas')
INSERT INTO public.products (category_id, sku, name, description, price, stock_type, stock_quantity, sort_order)
SELECT cat.id, sku, name, description, price, 'avulso', 50, sort_order FROM cat, (VALUES
  ('23', 'Caldo Verde',      'Creme de batata inglesa, bacon, calabresa e couve (400g)',          14.00, 1),
  ('39', 'Sopa Eslava',      'Creme de batata inglesa com carne bovina e queijo (400g)',          14.00, 2),
  (NULL, 'Caldo de Kenga',   'Creme de cenoura, aipim, batata salsa com frango desfiado',        14.00, 3),
  ('22', 'Sopa de Aipim',    'Creme de aipim com carne bovina desfiada, bacon e queijo',         14.00, 4),
  ('21', 'Sopa de Abóbora',  'Sopa de abóbora com frango desfiado e queijo (400g)',              13.00, 5)
) AS t(sku, name, description, price, sort_order);

-- Products — Adicionais
WITH cat AS (SELECT id FROM public.categories WHERE slug = 'adicionais')
INSERT INTO public.products (category_id, sku, name, description, price, stock_type, stock_quantity, sort_order)
SELECT cat.id, sku, name, description, price, 'avulso', 99, sort_order FROM cat, (VALUES
  ('27', 'Feijão',                  'Feijão preto ou carioca (200g)',  3.50, 1),
  ('46b','Mix de Legumes (150g)',   'Cenoura, vagem e grão de bico',   4.50, 2),
  (NULL, 'Mix de Legumes na Manteiga','150g',                          5.50, 3)
) AS t(sku, name, description, price, sort_order);
```

- [ ] **Step 2: Run seed in Supabase Dashboard SQL Editor**

Paste and run the content of `seed.sql`. Verify in Table Editor:
- `categories`: 7 rows
- `products`: ~40 rows with correct prices and stock types

- [ ] **Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat(db): seed 40 SKUs + 7 categories from Donna FIT menu"
```

---

## MILESTONE 2 — Cardápio Digital & Checkout (due 19/06/2026)

### Task 7: Shared utility functions

**Files:**
- Create: `src/lib/whatsapp.ts`
- Create: `src/lib/order-id.ts`

- [ ] **Step 1: Create `src/lib/whatsapp.ts`**

```ts
import type { CartItem } from "@/types"

interface OrderPayload {
  orderNumber: string
  customerName: string
  customerPhone: string
  deliveryType: "delivery" | "pickup"
  paymentMethod: "pix" | "card"
  items: CartItem[]
  total: number
}

export function buildWhatsAppMessage(order: OrderPayload): string {
  const deliveryLabel = order.deliveryType === "delivery" ? "🚚 Entrega" : "🏪 Retirada"
  const paymentLabel  = order.paymentMethod === "pix"     ? "💳 PIX"    : "💳 Maquininha na entrega"
  const itemLines     = order.items
    .map(({ product, quantity }) =>
      `  • ${quantity}x ${product.name} — R$ ${(product.price * quantity).toFixed(2).replace(".", ",")}`)
    .join("\n")

  return (
    `🍱 *Pedido Donna FIT*\n` +
    `*ID:* #${order.orderNumber}\n\n` +
    `👤 *Cliente:* ${order.customerName}\n` +
    `📱 *Telefone:* ${order.customerPhone}\n\n` +
    `📦 *Itens:*\n${itemLines}\n\n` +
    `💰 *Total:* R$ ${order.total.toFixed(2).replace(".", ",")}\n` +
    `${deliveryLabel}\n` +
    `${paymentLabel}`
  )
}

export function buildWhatsAppURL(message: string): string {
  return `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5541999154720"}?text=${encodeURIComponent(message)}`
}
```

- [ ] **Step 2: Create `src/lib/order-id.ts`**

Note: The actual sequential ID (`#DF0001`) is generated by the DB sequence. The client generates a temporary local ID for the WhatsApp message before the DB insert completes. We use a random 4-digit number for the pre-insert case, then replace with the real DB-generated one on the confirmation page.

```ts
export function generateLocalOrderId(): string {
  const num = Math.floor(1000 + Math.random() * 9000)
  return `DF${num}`
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/whatsapp.ts src/lib/order-id.ts
git commit -m "feat(lib): WhatsApp message builder + order ID generator"
```

---

### Task 8: Cart store (Zustand)

**Files:**
- Create: `src/hooks/useCart.ts`

- [ ] **Step 1: Create `src/hooks/useCart.ts`**

```ts
import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Product, CartItem } from "@/types"

interface CartStore {
  items: CartItem[]
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  total: () => number
  count: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            }
          }
          return { items: [...state.items, { product, quantity: 1 }] }
        })
      },

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
        })),

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.product.id === productId ? { ...i, quantity } : i
          ),
        }))
      },

      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: "donna-fit-cart" }
  )
)
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useCart.ts
git commit -m "feat(cart): Zustand cart store with persist"
```

---

### Task 9: Catalog page (public `/`)

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/catalog/ProductCard.tsx`
- Create: `src/components/catalog/CategoryFilter.tsx`
- Create: `src/components/catalog/StockBadge.tsx`

- [ ] **Step 1: Create `src/components/catalog/StockBadge.tsx`**

```tsx
import { cn } from "@/lib/utils"

interface Props {
  stockQuantity: number
  minAlert: number
  isActive: boolean
}

export function StockBadge({ stockQuantity, minAlert, isActive }: Props) {
  if (!isActive || stockQuantity <= 0) {
    return (
      <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
        Esgotado
      </span>
    )
  }
  if (stockQuantity <= minAlert) {
    return (
      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
        Últimas {stockQuantity}
      </span>
    )
  }
  return null
}
```

- [ ] **Step 2: Create `src/components/catalog/ProductCard.tsx`**

```tsx
"use client"
import Image from "next/image"
import { Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StockBadge } from "./StockBadge"
import { useCart } from "@/hooks/useCart"
import { formatCurrency } from "@/lib/utils"
import type { Product } from "@/types"

interface Props { product: Product }

export function ProductCard({ product }: Props) {
  const { items, addItem, updateQuantity } = useCart()
  const cartItem = items.find((i) => i.product.id === product.id)
  const qty      = cartItem?.quantity ?? 0
  const soldOut  = !product.is_active || product.stock_quantity <= 0

  return (
    <div className={cn(
      "bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3",
      soldOut && "opacity-60"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 leading-tight">{product.name}</p>
          {product.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</p>
          )}
        </div>
        <StockBadge
          stockQuantity={product.stock_quantity}
          minAlert={product.min_stock_alert}
          isActive={product.is_active}
        />
      </div>

      <div className="flex items-center justify-between mt-auto">
        <span className="text-lg font-bold text-brand-gold">
          {formatCurrency(product.price)}
        </span>

        {soldOut ? (
          <span className="text-sm text-gray-400">Indisponível</span>
        ) : qty === 0 ? (
          <Button
            size="sm"
            onClick={() => addItem(product)}
            className="bg-brand-gold hover:bg-brand-gold-dark text-white rounded-xl min-h-[44px]"
          >
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => updateQuantity(product.id, qty - 1)}
              className="h-[44px] w-[44px] rounded-xl border-brand-gold text-brand-gold"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-6 text-center font-semibold">{qty}</span>
            <Button
              size="icon"
              onClick={() => addItem(product)}
              className="h-[44px] w-[44px] rounded-xl bg-brand-gold hover:bg-brand-gold-dark text-white"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
```

- [ ] **Step 3: Create `src/components/catalog/CategoryFilter.tsx`**

```tsx
"use client"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Category } from "@/types"

interface Props {
  categories: Category[]
  active: string
  onChange: (slug: string) => void
}

export function CategoryFilter({ categories, active, onChange }: Props) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 pb-1">
      <Tabs value={active} onValueChange={onChange}>
        <TabsList className="bg-gray-100 rounded-2xl h-auto p-1 gap-1 flex-nowrap">
          <TabsTrigger value="all" className="rounded-xl text-sm px-4 py-2 data-[state=active]:bg-brand-gold data-[state=active]:text-white whitespace-nowrap">
            Todos
          </TabsTrigger>
          {categories.map((cat) => (
            <TabsTrigger
              key={cat.id}
              value={cat.slug}
              className="rounded-xl text-sm px-4 py-2 data-[state=active]:bg-brand-gold data-[state=active]:text-white whitespace-nowrap"
            >
              {cat.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 4: Update `src/app/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server"
import { CategoryFilter } from "@/components/catalog/CategoryFilter"
import { ProductCard } from "@/components/catalog/ProductCard"
import { CartBar } from "@/components/cart/CartBar"
import Image from "next/image"

export const revalidate = 60  // ISR: revalidate every 60s

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("products").select("*, categories(name, slug)")
      .eq("is_active", true).order("sort_order"),
  ])

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Image src="/logo.svg" alt="Donna FIT" width={40} height={40} />
          <div>
            <h1 className="font-display font-black text-gray-900 text-lg leading-tight">DONNA FIT</h1>
            <p className="text-xs text-brand-green font-medium">Alimentação Saudável</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Category filter — client component */}
        <CategoryFilterClient
          categories={categories ?? []}
          products={products ?? []}
        />
      </main>

      <CartBar />
    </div>
  )
}
```

Note: `CategoryFilterClient` wraps `CategoryFilter` + product grid in a `"use client"` component so filter state works. Create `src/components/catalog/CatalogClient.tsx`:

```tsx
"use client"
import { useState, useMemo } from "react"
import { CategoryFilter } from "./CategoryFilter"
import { ProductCard } from "./ProductCard"
import type { Category, Product } from "@/types"

interface Props {
  categories: Category[]
  products: (Product & { categories: { name: string; slug: string } | null })[]
}

export function CatalogClient({ categories, products }: Props) {
  const [active, setActive] = useState("all")

  const filtered = useMemo(() =>
    active === "all"
      ? products
      : products.filter((p) => p.categories?.slug === active),
    [active, products]
  )

  return (
    <>
      <CategoryFilter categories={categories} active={active} onChange={setActive} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  )
}
```

Update `page.tsx` to use `CatalogClient` instead of two separate imports.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/components/catalog/
git commit -m "feat(catalog): public menu page with category filter + product cards"
```

---

### Task 10: Cart components

**Files:**
- Create: `src/components/cart/CartBar.tsx`
- Create: `src/components/cart/CartDrawer.tsx`
- Create: `src/components/cart/CartItem.tsx`

- [ ] **Step 1: Create `src/components/cart/CartItem.tsx`**

```tsx
"use client"
import { Minus, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/hooks/useCart"
import { formatCurrency } from "@/lib/utils"
import type { CartItem as CartItemType } from "@/types"

export function CartItem({ product, quantity }: CartItemType) {
  const { updateQuantity, removeItem } = useCart()

  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-900 truncate">{product.name}</p>
        <p className="text-sm text-brand-gold font-semibold">{formatCurrency(product.price)}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg"
          onClick={() => updateQuantity(product.id, quantity - 1)}>
          {quantity === 1 ? <Trash2 className="h-3 w-3 text-red-500" /> : <Minus className="h-3 w-3" />}
        </Button>
        <span className="w-5 text-center text-sm font-semibold">{quantity}</span>
        <Button size="icon" className="h-8 w-8 rounded-lg bg-brand-gold hover:bg-brand-gold-dark text-white"
          onClick={() => updateQuantity(product.id, quantity + 1)}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <p className="text-sm font-bold w-16 text-right">
        {formatCurrency(product.price * quantity)}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/cart/CartDrawer.tsx`**

```tsx
"use client"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CartItem } from "./CartItem"
import { useCart } from "@/hooks/useCart"
import { formatCurrency } from "@/lib/utils"

interface Props {
  open: boolean
  onClose: () => void
}

export function CartDrawer({ open, onClose }: Props) {
  const { items, total, clearCart } = useCart()
  const router = useRouter()

  function handleCheckout() {
    onClose()
    router.push("/checkout")
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] flex flex-col">
        <SheetHeader className="text-left">
          <SheetTitle>Seu pedido</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-4">
          {items.map((item) => (
            <CartItem key={item.product.id} {...item} />
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-brand-gold">{formatCurrency(total())}</span>
          </div>
          <Button
            className="w-full h-14 text-base font-bold rounded-2xl bg-brand-gold hover:bg-brand-gold-dark text-white"
            onClick={handleCheckout}
          >
            Finalizar Pedido
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 3: Create `src/components/cart/CartBar.tsx`**

```tsx
"use client"
import { useState } from "react"
import { ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CartDrawer } from "./CartDrawer"
import { useCart } from "@/hooks/useCart"
import { formatCurrency } from "@/lib/utils"

export function CartBar() {
  const [open, setOpen] = useState(false)
  const { count, total } = useCart()

  if (count() === 0) return null

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 p-4 z-20">
        <Button
          onClick={() => setOpen(true)}
          className="w-full max-w-2xl mx-auto flex h-14 items-center justify-between rounded-2xl bg-brand-gold hover:bg-brand-gold-dark text-white px-5 shadow-lg"
        >
          <span className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            <span className="font-bold">{count()} {count() === 1 ? "item" : "itens"}</span>
          </span>
          <span className="font-bold text-base">{formatCurrency(total())}</span>
        </Button>
      </div>
      <CartDrawer open={open} onClose={() => setOpen(false)} />
    </>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/cart/
git commit -m "feat(cart): CartBar + CartDrawer + CartItem components"
```

---

### Task 11: Checkout flow + order creation

**Files:**
- Create: `src/app/checkout/page.tsx`
- Create: `src/components/checkout/CheckoutForm.tsx`
- Create: `src/app/confirmacao/page.tsx`
- Create: `src/app/api/orders/route.ts`

- [ ] **Step 1: Create `src/app/api/orders/route.ts`**

```ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { CartItem } from "@/types"

interface OrderBody {
  customerName: string
  customerPhone: string
  deliveryType: "delivery" | "pickup"
  paymentMethod: "pix" | "card"
  items: CartItem[]
  total: number
}

export async function POST(req: Request) {
  const body: OrderBody = await req.json()
  const supabase = await createClient()

  // 1. Validate required fields
  if (!body.customerName || !body.customerPhone || !body.items?.length) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
  }

  // 2. Compute delivery_date = tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const deliveryDate = tomorrow.toISOString().split("T")[0]

  // 3. Create order (order_number auto-generated by DB sequence)
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      customer_name:  body.customerName,
      customer_phone: body.customerPhone,
      delivery_type:  body.deliveryType,
      payment_method: body.paymentMethod,
      status:         "pending",
      subtotal:       body.total,
      total:          body.total,
      delivery_date:  deliveryDate,
    })
    .select("id, order_number")
    .single()

  if (orderErr || !order) {
    console.error("Order insert error:", orderErr)
    return NextResponse.json({ error: "Erro ao criar pedido" }, { status: 500 })
  }

  // 4. Insert order items
  const itemsPayload = body.items.map((item) => ({
    order_id:     order.id,
    product_id:   item.product.id,
    product_name: item.product.name,
    product_sku:  item.product.sku,
    quantity:     item.quantity,
    unit_price:   item.product.price,
  }))

  const { error: itemsErr } = await supabase
    .from("order_items")
    .insert(itemsPayload)

  if (itemsErr) {
    console.error("Order items error:", itemsErr)
    // Order was created — continue anyway, log the error
  }

  // 5. Reserve stock for combo items
  const comboItems = body.items.filter((i) => i.product.stock_type === "combo")
  if (comboItems.length > 0) {
    await Promise.all(
      comboItems.map((item) =>
        supabase.rpc("reserve_stock", {
          p_product_id: item.product.id,
          p_quantity:   item.quantity,
          p_order_id:   order.id,
        })
      )
    )
    // Note: reserve_stock RPC created in Task 12 (stock deduction logic)
  }

  return NextResponse.json({ orderId: order.id, orderNumber: order.order_number })
}
```

- [ ] **Step 2: Create `src/components/checkout/CheckoutForm.tsx`**

```tsx
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useCart } from "@/hooks/useCart"
import { buildWhatsAppMessage, buildWhatsAppURL } from "@/lib/whatsapp"
import { formatCurrency } from "@/lib/utils"

export function CheckoutForm() {
  const router = useRouter()
  const { items, total, clearCart } = useCart()
  const [name, setName]       = useState("")
  const [phone, setPhone]     = useState("")
  const [delivery, setDelivery] = useState<"delivery" | "pickup">("delivery")
  const [payment, setPayment]   = useState<"pix" | "card">("pix")
  const [loading, setLoading]   = useState(false)
  const [errors, setErrors]     = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim())  e.name  = "Nome é obrigatório"
    if (!phone.trim()) e.phone = "Telefone é obrigatório"
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName:  name.trim(),
          customerPhone: phone.trim(),
          deliveryType:  delivery,
          paymentMethod: payment,
          items,
          total: total(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Build WhatsApp message with real order number
      const msg = buildWhatsAppMessage({
        orderNumber:   data.orderNumber,
        customerName:  name.trim(),
        customerPhone: phone.trim(),
        deliveryType:  delivery,
        paymentMethod: payment,
        items,
        total: total(),
      })

      // Open WhatsApp
      window.open(buildWhatsAppURL(msg), "_blank")

      // Clear cart and navigate to confirmation
      clearCart()
      router.push(`/confirmacao?id=${data.orderNumber}`)
    } catch (err) {
      console.error(err)
      setErrors({ submit: "Erro ao enviar pedido. Tente novamente." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div>
        <Label htmlFor="name">Seu nome *</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Como você se chama?" className="mt-1 h-12 rounded-xl" />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>

      {/* Phone */}
      <div>
        <Label htmlFor="phone">WhatsApp *</Label>
        <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
          placeholder="(41) 99999-9999" className="mt-1 h-12 rounded-xl" />
        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
      </div>

      {/* Delivery type */}
      <div>
        <Label>Como prefere receber?</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {(["delivery", "pickup"] as const).map((type) => (
            <button key={type} type="button" onClick={() => setDelivery(type)}
              className={`h-12 rounded-xl border-2 text-sm font-semibold transition-colors
                ${delivery === type
                  ? "border-brand-gold bg-brand-gold/10 text-brand-gold"
                  : "border-gray-200 text-gray-600"}`}>
              {type === "delivery" ? "🚚 Entrega" : "🏪 Retirada"}
            </button>
          ))}
        </div>
      </div>

      {/* Payment method */}
      <div>
        <Label>Forma de pagamento</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {(["pix", "card"] as const).map((method) => (
            <button key={method} type="button" onClick={() => setPayment(method)}
              className={`h-12 rounded-xl border-2 text-sm font-semibold transition-colors
                ${payment === method
                  ? "border-brand-gold bg-brand-gold/10 text-brand-gold"
                  : "border-gray-200 text-gray-600"}`}>
              {method === "pix" ? "💰 PIX" : "💳 Maquininha"}
            </button>
          ))}
        </div>
      </div>

      {/* Order summary */}
      <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
        <p className="font-semibold text-gray-700">Resumo</p>
        {items.map((item) => (
          <div key={item.product.id} className="flex justify-between text-sm text-gray-600">
            <span>{item.quantity}x {item.product.name}</span>
            <span>{formatCurrency(item.product.price * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
          <span>Total</span>
          <span className="text-brand-gold">{formatCurrency(total())}</span>
        </div>
      </div>

      {errors.submit && <p className="text-red-500 text-sm">{errors.submit}</p>}

      <Button type="submit" disabled={loading}
        className="w-full h-14 text-base font-bold rounded-2xl bg-brand-gold hover:bg-brand-gold-dark text-white">
        {loading ? "Enviando..." : "📲 Confirmar e Abrir WhatsApp"}
      </Button>

      <p className="text-xs text-gray-400 text-center">
        Ao confirmar, o WhatsApp da Donna FIT será aberto com seu pedido formatado.
      </p>
    </form>
  )
}
```

- [ ] **Step 3: Create `src/app/checkout/page.tsx`**

```tsx
import { CheckoutForm } from "@/components/checkout/CheckoutForm"

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="font-display font-black text-xl">Finalizar Pedido</h1>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6">
        <CheckoutForm />
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/app/confirmacao/page.tsx`**

```tsx
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

interface Props { searchParams: { id?: string } }

export default function ConfirmacaoPage({ searchParams }: Props) {
  const orderNumber = searchParams.id ?? "—"

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <CheckCircle className="h-20 w-20 text-brand-gold mb-4" />
      <h1 className="font-display font-black text-2xl text-gray-900 mb-2">
        Pedido enviado!
      </h1>
      <p className="text-gray-500 mb-1">Seu pedido foi registrado com sucesso.</p>
      <p className="text-2xl font-bold text-brand-gold mb-6">#{orderNumber}</p>

      <div className="bg-white rounded-2xl p-5 max-w-sm w-full text-left shadow-sm space-y-3 mb-8">
        <p className="text-sm text-gray-600">
          ✅ Seu pedido foi enviado pelo WhatsApp para a equipe Donna FIT.
        </p>
        <p className="text-sm text-gray-600">
          📱 Se o WhatsApp não abriu automaticamente, guarde seu número de pedido <strong>#{orderNumber}</strong> e entre em contato.
        </p>
        <p className="text-sm text-gray-600">
          🍱 Produção: entrega no dia seguinte (D+1).
        </p>
      </div>

      <Button asChild className="rounded-2xl bg-brand-gold hover:bg-brand-gold-dark text-white h-12 px-8">
        <Link href="/">Ver Cardápio</Link>
      </Button>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/checkout/ src/app/confirmacao/ src/app/api/orders/ src/components/checkout/
git commit -m "feat(checkout): order form + API route + WhatsApp redirect + confirmation page"
```

---

## MILESTONE 3 — Painel Admin — Gestão de Pedidos (due 03/07/2026)

### Task 12: Stock deduction RPC + Admin auth

**Files:**
- Create: `supabase/migrations/20260602_003_stock_rpc.sql`
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/layout.tsx`

- [ ] **Step 1: Create stock RPC migration**

```sql
-- supabase/migrations/20260602_003_stock_rpc.sql

-- reserve_stock: called at checkout for combos (reserves freezer stock)
CREATE OR REPLACE FUNCTION public.reserve_stock(
  p_product_id UUID,
  p_quantity   INT,
  p_order_id   UUID
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Deduct from stock
  UPDATE public.products
  SET stock_quantity = stock_quantity - p_quantity
  WHERE id = p_product_id AND stock_quantity >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estoque insuficiente para o produto %', p_product_id;
  END IF;

  -- Audit trail
  INSERT INTO public.stock_movements(product_id, type, quantity, reference_id)
  VALUES (p_product_id, 'reservation', -p_quantity, p_order_id);
END;
$$;

-- deduct_stock: called when admin moves order to 'production' (for avulso items)
CREATE OR REPLACE FUNCTION public.deduct_stock(
  p_product_id UUID,
  p_quantity   INT,
  p_order_id   UUID
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = GREATEST(0, stock_quantity - p_quantity)
  WHERE id = p_product_id;

  INSERT INTO public.stock_movements(product_id, type, quantity, reference_id)
  VALUES (p_product_id, 'deduction', -p_quantity, p_order_id);
END;
$$;

-- adjust_stock: called from freezer count screen
CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_product_id    UUID,
  p_new_quantity  INT,
  p_notes         TEXT DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_old INT;
  v_delta INT;
BEGIN
  SELECT stock_quantity INTO v_old FROM public.products WHERE id = p_product_id;
  v_delta := p_new_quantity - v_old;

  UPDATE public.products SET stock_quantity = p_new_quantity WHERE id = p_product_id;

  INSERT INTO public.stock_movements(product_id, type, quantity, notes, created_by)
  VALUES (p_product_id, 'adjustment', v_delta, p_notes, auth.uid());
END;
$$;
```

Apply via Supabase SQL Editor.

- [ ] **Step 2: Create `src/app/admin/login/page.tsx`**

```tsx
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Image from "next/image"

export default function LoginPage() {
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError("Email ou senha incorretos"); setLoading(false); return }
    router.push("/admin/pedidos")
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-xl">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.svg" alt="Donna FIT" width={60} height={60} />
          <h1 className="font-display font-black text-xl mt-3">Área Administrativa</h1>
          <p className="text-sm text-gray-500 mt-1">Donna FIT</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-12 rounded-xl" required />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 h-12 rounded-xl" required />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" disabled={loading}
            className="w-full h-12 rounded-xl bg-brand-gold hover:bg-brand-gold-dark text-white font-bold">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create 4 admin users in Supabase Dashboard**

Go to Authentication → Users → Invite user (or Add user):
- `everson@donnafit.com.br` → role: `admin`
- `patricia@donnafit.com.br` → role: `kitchen`
- (2 more staff as needed)

After creating, go to SQL Editor and set their roles:
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'everson@donnafit.com.br');

UPDATE public.profiles
SET role = 'kitchen'
WHERE id = (SELECT id FROM auth.users WHERE email = 'patricia@donnafit.com.br');
```

- [ ] **Step 4: Create `src/app/admin/layout.tsx`**

```tsx
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { AdminBottomNav } from "@/components/admin/AdminBottomNav"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/admin/login")

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <AdminSidebar />
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        {children}
      </main>
      <AdminBottomNav />
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260602_003_stock_rpc.sql src/app/admin/
git commit -m "feat(admin): login page + admin layout + stock RPCs"
```

---

### Task 13: Real-time orders hook + Admin navigation

**Files:**
- Create: `src/hooks/useRealtimeOrders.ts`
- Create: `src/components/admin/AdminSidebar.tsx`
- Create: `src/components/admin/AdminBottomNav.tsx`

- [ ] **Step 1: Create `src/hooks/useRealtimeOrders.ts`**

```ts
"use client"
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { OrderWithItems } from "@/types"

export function useRealtimeOrders() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*, product:products(*))")
      .not("status", "eq", "cancelled")
      .order("created_at", { ascending: false })
      .limit(100)

    setOrders((data as OrderWithItems[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchOrders()

    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchOrders)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders, supabase])

  const updateStatus = useCallback(async (orderId: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", orderId)
    // Realtime will trigger re-fetch
  }, [supabase])

  return { orders, loading, updateStatus }
}
```

- [ ] **Step 2: Create `src/components/admin/AdminSidebar.tsx`**

```tsx
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ChefHat, Package, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Image from "next/image"

const NAV = [
  { href: "/admin/pedidos",  label: "Pedidos",  icon: LayoutDashboard },
  { href: "/admin/cozinha",  label: "Cozinha",  icon: ChefHat },
  { href: "/admin/estoque",  label: "Estoque",  icon: Package },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  return (
    <aside className="hidden md:flex flex-col w-56 bg-gray-900 text-white min-h-screen">
      <div className="p-5 flex items-center gap-3 border-b border-gray-800">
        <Image src="/logo.svg" alt="Donna FIT" width={32} height={32} />
        <span className="font-display font-black text-sm text-brand-gold">DONNA FIT</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
              ${pathname === href ? "bg-brand-gold text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-800">
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white w-full transition-colors">
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Create `src/components/admin/AdminBottomNav.tsx`**

```tsx
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ChefHat, Package } from "lucide-react"

const NAV = [
  { href: "/admin/pedidos", label: "Pedidos", icon: LayoutDashboard },
  { href: "/admin/cozinha", label: "Cozinha", icon: ChefHat },
  { href: "/admin/estoque", label: "Estoque", icon: Package },
]

export function AdminBottomNav() {
  const pathname = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors
            ${pathname === href ? "text-brand-gold" : "text-gray-400"}`}>
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useRealtimeOrders.ts src/components/admin/AdminSidebar.tsx src/components/admin/AdminBottomNav.tsx
git commit -m "feat(admin): realtime orders hook + sidebar + mobile bottom nav"
```

---

### Task 14: Order Kanban + Fiscal Copy (Olimpio ERP bridge)

**Files:**
- Create: `src/app/admin/pedidos/page.tsx`
- Create: `src/components/admin/OrderKanban.tsx`
- Create: `src/components/admin/OrderCard.tsx`
- Create: `src/components/admin/OrderModal.tsx`
- Create: `src/components/admin/FiscalCopyButton.tsx`

- [ ] **Step 1: Create `src/components/admin/FiscalCopyButton.tsx`**

This button generates formatted text for pasting into Olimpio ERP, replacing manual lookup.

```tsx
"use client"
import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { OrderWithItems } from "@/types"

interface Props { order: OrderWithItems }

export function FiscalCopyButton({ order }: Props) {
  const [copied, setCopied] = useState(false)

  function buildFiscalText(order: OrderWithItems): string {
    const lines = [
      `DADOS FISCAIS — Pedido #${order.order_number}`,
      `Data: ${new Date(order.created_at).toLocaleDateString("pt-BR")}`,
      `Cliente: ${order.customer_name}`,
      `Fone: ${order.customer_phone}`,
      ``,
      `ITENS:`,
      ...order.order_items.map(
        (item) => `  ${item.quantity}x ${item.product_name} — R$ ${(item.unit_price * item.quantity).toFixed(2)}`
      ),
      ``,
      `TOTAL: R$ ${order.total.toFixed(2)}`,
      `Pagamento: ${order.payment_method === "pix" ? "PIX" : "Cartão/Maquininha"}`,
      `Entrega: ${order.delivery_type === "delivery" ? "Entrega" : "Retirada"}`,
    ]
    return lines.join("\n")
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildFiscalText(order))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement("textarea")
      el.value = buildFiscalText(order)
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}
      className="gap-2 border-brand-gold text-brand-gold hover:bg-brand-gold/10">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copiado!" : "Copiar Dados Fiscais"}
    </Button>
  )
}
```

- [ ] **Step 2: Create `src/components/admin/OrderCard.tsx`**

```tsx
"use client"
import { ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { OrderWithItems, OrderStatus } from "@/types"

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending:    "Pendente",
  production: "Produção",
  ready:      "Pronto",
  delivered:  "Entregue",
  cancelled:  "Cancelado",
}

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending:    "bg-yellow-100 text-yellow-800",
  production: "bg-blue-100 text-blue-800",
  ready:      "bg-green-100 text-green-800",
  delivered:  "bg-gray-100 text-gray-500",
  cancelled:  "bg-red-100 text-red-600",
}

interface Props {
  order: OrderWithItems
  onClick: () => void
}

export function OrderCard({ order, onClick }: Props) {
  return (
    <button onClick={onClick}
      className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-brand-gold transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-gray-900">#{order.order_number}</p>
          <p className="text-sm text-gray-600 mt-0.5">{order.customer_name}</p>
          <p className="text-xs text-gray-400 mt-1">{formatDate(order.created_at)}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 mt-1 shrink-0" />
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLOR[order.status as OrderStatus]}`}>
          {STATUS_LABEL[order.status as OrderStatus]}
        </span>
        <span className="font-bold text-brand-gold">{formatCurrency(order.total)}</span>
      </div>
    </button>
  )
}
```

- [ ] **Step 3: Create `src/components/admin/OrderModal.tsx`**

```tsx
"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { FiscalCopyButton } from "./FiscalCopyButton"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { OrderWithItems, OrderStatus } from "@/types"

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending:    "production",
  production: "ready",
  ready:      "delivered",
}

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pending:    "▶ Iniciar Produção",
  production: "✅ Marcar como Pronto",
  ready:      "🚚 Confirmar Entrega",
}

interface Props {
  order: OrderWithItems | null
  onClose: () => void
  onUpdateStatus: (orderId: string, status: string) => void
}

export function OrderModal({ order, onClose, onUpdateStatus }: Props) {
  if (!order) return null

  const nextStatus = NEXT_STATUS[order.status as OrderStatus]
  const nextLabel  = NEXT_LABEL[order.status as OrderStatus]

  return (
    <Dialog open={!!order} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Pedido #{order.order_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Customer info */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-1">
            <p className="font-semibold">{order.customer_name}</p>
            <p className="text-sm text-gray-600">📱 {order.customer_phone}</p>
            <p className="text-sm text-gray-600">
              {order.delivery_type === "delivery" ? "🚚 Entrega" : "🏪 Retirada"}
            </p>
            <p className="text-sm text-gray-600">
              {order.payment_method === "pix" ? "💰 PIX" : "💳 Maquininha"}
            </p>
            <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
          </div>

          {/* Items */}
          <div>
            <p className="font-semibold mb-2">Itens</p>
            {order.order_items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm py-1.5 border-b last:border-0">
                <span className="text-gray-700">{item.quantity}x {item.product_name}</span>
                <span className="font-medium">{formatCurrency(item.unit_price * item.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-base pt-2 mt-1">
              <span>Total</span>
              <span className="text-brand-gold">{formatCurrency(order.total)}</span>
            </div>
          </div>

          <Separator />

          {/* Olimpio ERP helper */}
          <div>
            <p className="text-xs text-gray-500 mb-2">
              Copie os dados abaixo para lançar no Olimpio ERP antes de emitir o cupom:
            </p>
            <FiscalCopyButton order={order} />
          </div>

          {/* Status advance */}
          {nextStatus && nextLabel && (
            <Button
              className="w-full h-12 rounded-2xl bg-brand-gold hover:bg-brand-gold-dark text-white font-bold"
              onClick={() => { onUpdateStatus(order.id, nextStatus); onClose() }}
            >
              {nextLabel}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Create `src/components/admin/OrderKanban.tsx`**

```tsx
"use client"
import { useState } from "react"
import { OrderCard } from "./OrderCard"
import { OrderModal } from "./OrderModal"
import type { OrderWithItems, OrderStatus } from "@/types"

const COLUMNS: { status: OrderStatus; label: string; color: string }[] = [
  { status: "pending",    label: "🟡 Pendente",  color: "border-t-yellow-400" },
  { status: "production", label: "🔵 Produção",  color: "border-t-blue-400" },
  { status: "ready",      label: "🟢 Pronto",    color: "border-t-green-400" },
  { status: "delivered",  label: "✅ Entregue",  color: "border-t-gray-400" },
]

interface Props {
  orders: OrderWithItems[]
  onUpdateStatus: (orderId: string, status: string) => void
}

export function OrderKanban({ orders, onUpdateStatus }: Props) {
  const [selected, setSelected] = useState<OrderWithItems | null>(null)

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4">
        {COLUMNS.map(({ status, label, color }) => {
          const colOrders = orders.filter((o) => o.status === status)
          return (
            <div key={status} className={`bg-gray-900 rounded-2xl border-t-4 ${color} min-h-[200px]`}>
              <div className="p-3 border-b border-gray-800">
                <p className="text-sm font-bold text-white">{label}</p>
                <p className="text-xs text-gray-400">{colOrders.length} pedido{colOrders.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="p-3 space-y-3">
                {colOrders.map((order) => (
                  <OrderCard key={order.id} order={order} onClick={() => setSelected(order)} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <OrderModal
        order={selected}
        onClose={() => setSelected(null)}
        onUpdateStatus={onUpdateStatus}
      />
    </>
  )
}
```

- [ ] **Step 5: Create `src/app/admin/pedidos/page.tsx`**

```tsx
"use client"
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders"
import { OrderKanban } from "@/components/admin/OrderKanban"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"

export default function PedidosPage() {
  const { orders, loading, updateStatus } = useRealtimeOrders()

  const pending   = orders.filter((o) => o.status === "pending").length
  const today     = orders.filter((o) => {
    const d = new Date(o.created_at)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  })
  const todayRevenue = today.reduce((s, o) => s + Number(o.total), 0)

  return (
    <div className="text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">Gestão de Pedidos</h1>
        <div className="flex gap-4 mt-3">
          <div className="bg-gray-800 rounded-xl px-4 py-2">
            <p className="text-xs text-gray-400">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-400">{pending}</p>
          </div>
          <div className="bg-gray-800 rounded-xl px-4 py-2">
            <p className="text-xs text-gray-400">Hoje</p>
            <p className="text-2xl font-bold text-white">{today.length}</p>
          </div>
          <div className="bg-gray-800 rounded-xl px-4 py-2">
            <p className="text-xs text-gray-400">Faturamento</p>
            <p className="text-xl font-bold text-brand-gold">{formatCurrency(todayRevenue)}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl bg-gray-800" />)}
        </div>
      ) : (
        <OrderKanban orders={orders} onUpdateStatus={updateStatus} />
      )}
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/pedidos/ src/components/admin/
git commit -m "feat(admin): order Kanban + real-time status + Olimpio ERP fiscal copy button"
```

---

## MILESTONE 4 — Cozinha & Estoque (due 10/07/2026)

### Task 15: Kitchen production dashboard (D+1)

**Files:**
- Create: `src/app/admin/cozinha/page.tsx`
- Create: `src/components/kitchen/ProductionList.tsx`

- [ ] **Step 1: Create `src/components/kitchen/ProductionList.tsx`**

```tsx
"use client"
import { useState } from "react"
import { Check } from "lucide-react"
import type { OrderWithItems } from "@/types"

interface ProductionItem {
  productId: string
  productName: string
  productSku: string | null
  totalQuantity: number
}

interface Props { orders: OrderWithItems[] }

export function ProductionList({ orders }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set())

  // Aggregate quantities by product for D+1 orders
  const items: ProductionItem[] = Object.values(
    orders
      .flatMap((o) => o.order_items)
      .reduce((acc, item) => {
        const key = item.product_id ?? item.product_name
        if (!key) return acc
        if (!acc[key]) {
          acc[key] = {
            productId:     key,
            productName:   item.product_name,
            productSku:    item.product_sku,
            totalQuantity: 0,
          }
        }
        acc[key].totalQuantity += item.quantity
        return acc
      }, {} as Record<string, ProductionItem>)
  ).sort((a, b) => b.totalQuantity - a.totalQuantity)

  const done = checked.size
  const total = items.length

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="bg-gray-800 rounded-2xl p-4">
        <div className="flex justify-between mb-2">
          <p className="text-sm font-medium text-gray-300">Progresso da produção</p>
          <p className="text-sm font-bold text-white">{done}/{total}</p>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-gold rounded-full transition-all"
            style={{ width: total ? `${(done / total) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item) => {
          const isDone = checked.has(item.productId)
          return (
            <button
              key={item.productId}
              onClick={() => setChecked((prev) => {
                const next = new Set(prev)
                isDone ? next.delete(item.productId) : next.add(item.productId)
                return next
              })}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-colors text-left
                ${isDone ? "border-green-500 bg-green-500/10" : "border-gray-700 bg-gray-800 hover:border-gray-600"}`}
            >
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border-2
                ${isDone ? "bg-green-500 border-green-500" : "bg-gray-700 border-gray-600"}`}>
                {isDone
                  ? <Check className="h-6 w-6 text-white" />
                  : <span className="text-2xl font-black text-white">{item.totalQuantity}</span>
                }
              </div>
              <div>
                <p className={`text-[18px] font-bold leading-tight ${isDone ? "text-green-400 line-through" : "text-white"}`}>
                  {item.productName}
                </p>
                {item.productSku && (
                  <p className="text-xs text-gray-400 mt-0.5">SKU #{item.productSku}</p>
                )}
              </div>
              {!isDone && (
                <span className="ml-auto text-3xl font-black text-brand-gold">{item.totalQuantity}x</span>
              )}
            </button>
          )
        })}
      </div>

      {done === total && total > 0 && (
        <div className="bg-green-500/20 border border-green-500 rounded-2xl p-4 text-center">
          <p className="text-green-400 font-bold text-lg">🎉 Produção completa!</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/app/admin/cozinha/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server"
import { ProductionList } from "@/components/kitchen/ProductionList"
import type { OrderWithItems } from "@/types"

export const revalidate = 30

export default async function CozinhaPage() {
  const supabase = await createClient()

  // D+1 = tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split("T")[0]

  const { data: orders } = await supabase
    .from("orders")
    .select("*, order_items(*, product:products(*))")
    .eq("delivery_date", tomorrowStr)
    .not("status", "eq", "cancelled")
    .order("created_at")

  const tomorrowLabel = tomorrow.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "2-digit"
  })

  return (
    <div className="text-white p-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Painel da Cozinha</h1>
        <p className="text-sm text-gray-400 mt-1">
          Produção para amanhã — <span className="text-brand-gold font-medium capitalize">{tomorrowLabel}</span>
        </p>
        <p className="text-2xl font-black text-white mt-2">
          {(orders ?? []).reduce((sum, o) =>
            sum + (o as OrderWithItems).order_items.reduce((s, i) => s + i.quantity, 0), 0)
          } marmitas no total
        </p>
      </div>

      {!orders?.length ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-3">🍱</p>
          <p>Nenhum pedido para amanhã ainda.</p>
        </div>
      ) : (
        <ProductionList orders={orders as OrderWithItems[]} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/cozinha/ src/components/kitchen/ProductionList.tsx
git commit -m "feat(kitchen): D+1 production list with progress tracking"
```

---

### Task 16: Freezer stock management (Patricia's screen)

**Files:**
- Create: `src/app/admin/estoque/page.tsx`
- Create: `src/components/kitchen/FreezerCountForm.tsx`

- [ ] **Step 1: Create `src/components/kitchen/FreezerCountForm.tsx`**

```tsx
"use client"
import { useState } from "react"
import { Save, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import type { Product } from "@/types"

interface Props {
  products: Product[]
  onSaved: () => void
}

export function FreezerCountForm({ products, onSaved }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>(
    Object.fromEntries(products.map((p) => [p.id, p.stock_quantity]))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()

    await Promise.all(
      products.map((p) =>
        supabase.rpc("adjust_stock", {
          p_product_id:   p.id,
          p_new_quantity: counts[p.id] ?? p.stock_quantity,
          p_notes:        "Contagem física do freezer",
        })
      )
    )

    setSaving(false)
    setSaved(true)
    setTimeout(() => { setSaved(false); onSaved() }, 1500)
  }

  return (
    <div className="space-y-3">
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
        <p className="text-yellow-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Informe a quantidade exata de cada item no freezer. O cardápio será atualizado imediatamente após salvar.
        </p>
      </div>

      {products.map((product) => {
        const qty      = counts[product.id] ?? 0
        const isLow    = qty <= product.min_stock_alert && qty > 0
        const isEmpty  = qty === 0

        return (
          <div key={product.id}
            className={`flex items-center gap-4 bg-gray-800 rounded-2xl p-4 border-2 transition-colors
              ${isEmpty ? "border-red-500/50" : isLow ? "border-yellow-500/50" : "border-gray-700"}`}>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm leading-tight">{product.name}</p>
              {product.sku && <p className="text-xs text-gray-400 mt-0.5">SKU #{product.sku}</p>}
              {isEmpty && <p className="text-xs text-red-400 mt-1">⚠ Esgotado — aparece como indisponível no cardápio</p>}
              {isLow && !isEmpty && <p className="text-xs text-yellow-400 mt-1">⚡ Estoque baixo</p>}
            </div>
            <Input
              type="number"
              min={0}
              max={999}
              value={counts[product.id] ?? 0}
              onChange={(e) => setCounts((prev) => ({ ...prev, [product.id]: parseInt(e.target.value) || 0 }))}
              className="w-20 text-center text-lg font-bold h-12 rounded-xl bg-gray-700 border-gray-600 text-white"
            />
          </div>
        )
      })}

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-14 rounded-2xl bg-brand-gold hover:bg-brand-gold-dark text-white font-bold text-base mt-2"
      >
        <Save className="h-5 w-5 mr-2" />
        {saving ? "Salvando..." : saved ? "✅ Salvo!" : "Salvar Contagem do Freezer"}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/app/admin/estoque/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server"
import { FreezerCountForm } from "@/components/kitchen/FreezerCountForm"

export const revalidate = 0  // always fresh for stock

export default async function EstoquePage() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")

  return (
    <div className="text-white p-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Controle de Estoque</h1>
        <p className="text-sm text-gray-400 mt-1">
          Faça a contagem física do freezer e atualize as quantidades disponíveis.
        </p>
      </div>

      <FreezerCountForm
        products={products ?? []}
        onSaved={() => {/* page will revalidate on next request */}}
      />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/estoque/ src/components/kitchen/FreezerCountForm.tsx
git commit -m "feat(stock): freezer count form — Patricia's manual stock adjustment screen"
```

---

## MILESTONE 5 — Testes Assistidos (17/07/2026)

### Task 17: QA checklist (no code — execution guide)

- [ ] **Simulate 20+ orders from mobile (375px) + tablet (768px) + desktop**
  - Verify WhatsApp link opens correctly on real device
  - Verify order appears in Kanban within 3 seconds (Realtime)
  - Verify stock decrements for combo items

- [ ] **Fiscal copy test**
  - Create order, open in admin, click "Copiar Dados Fiscais"
  - Paste into text editor — confirm all fields present
  - Test in Olimpio ERP: paste and fill form manually, verify it saves time

- [ ] **Freezer count stress test**
  - Set combo item to 0 in stock
  - Verify it shows as "Esgotado" on customer site (within 60s ISR)
  - Set back to 5, verify it re-appears

- [ ] **Kitchen D+1 test**
  - Create 3 orders for tomorrow's date
  - Open /admin/cozinha — verify all items aggregated correctly
  - Check off each item, verify progress bar fills to 100%

- [ ] **Auth test**
  - Open /admin without login → should redirect to /admin/login
  - Login with Patricia (kitchen role) → should reach /admin/cozinha
  - Login with Everson (admin role) → should reach /admin/pedidos

---

## MILESTONE 6 — Go-Live (24/07/2026)

### Task 18: QR Code generation + final deploy

**Files:**
- Create: `src/app/admin/qrcode/page.tsx`

- [ ] **Step 1: Install QR code library**

```bash
npm install qrcode.react
npm install -D @types/qrcode.react
```

- [ ] **Step 2: Create `src/app/admin/qrcode/page.tsx`**

```tsx
"use client"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://donnafit.com.br"

export default function QRCodePage() {
  function handlePrint() { window.print() }

  return (
    <div className="text-white p-4">
      <h1 className="text-xl font-bold mb-6">QR Code para Rótulos</h1>

      <div className="bg-white rounded-3xl p-8 max-w-sm mx-auto text-center">
        <QRCodeSVG
          value={SITE_URL}
          size={200}
          bgColor="#FFFFFF"
          fgColor="#1A1A1A"
          level="H"
          className="mx-auto"
        />
        <p className="text-gray-700 font-medium mt-4 text-sm">{SITE_URL}</p>
        <p className="text-gray-500 text-xs mt-1">Faça seu pedido aqui!</p>
      </div>

      <Button onClick={handlePrint}
        className="w-full max-w-sm mx-auto mt-6 flex h-12 rounded-2xl bg-brand-gold hover:bg-brand-gold-dark text-white font-bold">
        🖨 Imprimir QR Code
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Configure production environment on Vercel**

In Vercel Dashboard → Project → Environment Variables, add:
```
NEXT_PUBLIC_SUPABASE_URL     = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
SUPABASE_SERVICE_ROLE_KEY     = eyJ...
NEXT_PUBLIC_WHATSAPP_NUMBER   = 5541999154720
NEXT_PUBLIC_SITE_URL          = https://donnafit.com.br
```

- [ ] **Step 4: Configure DNS on Cloudflare**

In Cloudflare → DNS → Add record:
- Type: `CNAME`
- Name: `@` (or `www`)
- Target: `cname.vercel-dns.com`
- Proxy: enabled (orange cloud)

In Vercel → Project → Domains → Add `donnafit.com.br`

- [ ] **Step 5: Final smoke test on production URL**
  - Open `https://donnafit.com.br` on mobile → catalog loads, cart works, WhatsApp opens
  - Open `https://donnafit.com.br/admin` → redirects to login
  - Login → Kanban shows no orders (empty state, not error)

- [ ] **Step 6: Training session checklist**

  Everson:
  - [ ] Demonstrate: receive WhatsApp notification + open Kanban
  - [ ] Demonstrate: advance order status + fiscal copy to Olimpio
  - [ ] Show: how to activate/deactivate products

  Patricia:
  - [ ] Demonstrate: open /admin/cozinha on tablet — see tomorrow's list
  - [ ] Demonstrate: check off items as they're packed
  - [ ] Demonstrate: freezer count → update numbers → customer site refreshes

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "feat: M6 go-live — QR code page + production deploy config"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|---|---|
| Cardápio Digital com ~40 SKUs | Tasks 6, 9 |
| Filtro por categoria | Task 9 |
| Carrinho + checkout | Tasks 10, 11 |
| Link WhatsApp formatado com ID | Tasks 7, 11 |
| Painel admin real-time | Tasks 13, 14 |
| Status Kanban (Pendente→Entregue) | Task 14 |
| Olimpio ERP — Copiar Dados Fiscais | Task 14 |
| Dashboard cozinha D+1 | Task 15 |
| Freezer count manual | Task 16 |
| Baixa automática de estoque | Task 12 (RPC) |
| Alerta estoque baixo | Task 16 (UI) + Task 3 (min_stock_alert field) |
| Autenticação por login/senha | Task 12 |
| RLS — público só lê cardápio, anon insere pedidos | Task 4 |
| Deploy Vercel + Cloudflare DNS | Task 18 |
| QR Code para rótulos | Task 18 |
| Supabase Realtime | Task 13 |
| 4 usuários (Everson admin, Patricia kitchen) | Task 12 |
| Tablet cozinha + PC recepção (responsivo) | Tasks 9, 14, 15, 16 |

### No placeholders found ✅

### Type consistency ✅
- `OrderWithItems` defined in `src/types/index.ts:18` and used in tasks 14, 15, 16
- `OrderStatus` union used consistently in `OrderCard`, `OrderModal`, `OrderKanban`
- `CartItem` defined in `src/types/index.ts:13` and used in `useCart`, `CheckoutForm`, API route
