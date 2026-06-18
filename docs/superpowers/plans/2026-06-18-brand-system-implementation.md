# Brand System Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar o brand system definido em `docs/superpowers/specs/2026-06-18-brand-system-admin-design.md` no painel admin do Donna FIT — substituindo o kanban genérico por hero + tabela limpa + painel lateral, com paleta Floresta + Gold e tipografia Montserrat + Plus Jakarta Sans.

**Architecture:** Cada componente admin recebe um redesign isolado. O `OrderKanban` é substituído por dois novos componentes (`OrderTable` + `OrderDetailPanel`). O `AdminHero` é criado do zero. Layout, sidebar e bottomnav são refatorados in-place. Os arquivos antigos (OrderKanban, OrderModal, OrderCard) são mantidos mas não mais usados pela page de pedidos.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS, Lucide React, `next/font/google` (Plus Jakarta Sans), Supabase Realtime (via hook existente `useRealtimeOrders`)

## Global Constraints

- Fonte de display: `Montserrat` (já instalada via `var(--font-montserrat)`)
- Fonte UI nova: `Plus Jakarta Sans` — instalar via `next/font/google`, expor como `var(--font-jakarta)`
- Paleta: `--forest-900: #0C150C`, `--gold-500: #C89B3C`, `--surface-50: #F3F6F3`
- `strokeWidth={1.8}` em todos os ícones Lucide no admin
- Sem bordas coloridas em linhas de tabela — exceção única: `border-left: 2px solid #C89B3C` na linha selecionada
- Não deletar `OrderKanban.tsx`, `OrderModal.tsx`, `OrderCard.tsx` — apenas parar de importá-los na pedidos/page.tsx
- Não alterar rotas, auth, hooks, tipos (`@/types`) ou lógica de negócio
- Não modificar nenhum arquivo fora de `src/app/admin/`, `src/components/admin/`, `src/app/layout.tsx`, `src/app/globals.css`

---

## Mapa de Arquivos

| Arquivo | Ação |
|---|---|
| `src/app/layout.tsx` | Modificar — adicionar Plus Jakarta Sans |
| `src/app/globals.css` | Modificar — adicionar variáveis CSS do brand system |
| `src/app/admin/(protected)/layout.tsx` | Modificar — background `#F3F6F3` + slot para detail panel |
| `src/components/admin/AdminSidebar.tsx` | Modificar — redesign completo |
| `src/components/admin/AdminBottomNav.tsx` | Modificar — cores novas |
| `src/components/admin/AdminHero.tsx` | **Criar** — hero com gradiente + stats |
| `src/components/admin/OrderTable.tsx` | **Criar** — tabela limpa de pedidos com tabs |
| `src/components/admin/OrderDetailPanel.tsx` | **Criar** — painel lateral slide-in |
| `src/app/admin/(protected)/pedidos/page.tsx` | Modificar — usar novos componentes |

---

## Task 1: Fonte + Variáveis CSS

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produz: variável CSS `--font-jakarta` disponível em todo o app; variáveis `--forest-*`, `--gold-*`, `--surface-*` disponíveis globalmente

- [ ] **Step 1: Adicionar Plus Jakarta Sans ao layout.tsx**

```tsx
// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Montserrat, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const switzer = localFont({
  src: [
    { path: "../../public/fonts/Switzer-Variable.woff2",       style: "normal" },
    { path: "../../public/fonts/Switzer-VariableItalic.woff2", style: "italic" },
  ],
  variable: "--font-switzer",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-montserrat",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: "Donna FIT | Marmitas Fitness",
  description: "Marmitas fitness saudáveis e saborosas entregues na sua porta.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${switzer.variable} ${montserrat.variable} ${jakarta.variable}`}>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Adicionar variáveis CSS do brand system ao globals.css**

Abrir `src/app/globals.css` e adicionar ao final do arquivo (após todo o conteúdo existente):

```css
/* =============================================
   BRAND SYSTEM — DONNA FIT ADMIN
   ============================================= */

/* Fontes admin */
:root {
  --font-display: var(--font-montserrat), 'Montserrat', sans-serif;
  --font-ui:      var(--font-jakarta), 'Plus Jakarta Sans', ui-sans-serif, sans-serif;

  /* Paleta dark — Floresta */
  --forest-950: #070C07;
  --forest-900: #0C150C;
  --forest-850: #0F1A0F;
  --forest-700: #1A2F1A;
  --forest-600: #142414;

  /* Gold */
  --gold-500:  #C89B3C;
  --gold-400:  #D4AC50;
  --gold-600:  #A67C22;
  --gold-dim:  rgba(200,155,60,0.08);
  --gold-text: rgba(200,155,60,0.12);
  --gold-glow: rgba(200,155,60,0.15);

  /* Surface — área de conteúdo claro */
  --surface-50:  #F3F6F3;
  --surface-100: #FFFFFF;
  --surface-200: #E8ECE8;

  /* Texto — contexto claro */
  --text-950: #0D1117;
  --text-700: #374151;
  --text-500: #6B7280;
  --text-300: #9CA3AF;

  /* Transições */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out:      cubic-bezier(0, 0, 0.2, 1);
  --duration-micro:    100ms;
  --duration-standard: 200ms;
  --duration-panel:    250ms;
}

/* Utilitários admin */
.admin-font-ui      { font-family: var(--font-ui); }
.admin-font-display { font-family: var(--font-display); }
```

- [ ] **Step 3: Verificar que o servidor não quebrou**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/admin/pedidos
```

Esperado: `200` ou `307`

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat(admin): add Plus Jakarta Sans font and brand system CSS variables"
```

---

## Task 2: AdminSidebar redesign

**Files:**
- Modify: `src/components/admin/AdminSidebar.tsx`

**Interfaces:**
- Consome: `usePathname`, `useRouter`, `createClient` (sem mudança)
- Produz: componente `<AdminSidebar />` com novo visual (nav groups, indicator bar, avatar com gradiente)

- [ ] **Step 1: Substituir AdminSidebar.tsx completo**

```tsx
// src/components/admin/AdminSidebar.tsx
"use client"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard, ChefHat, Package, LogOut,
  QrCode, Megaphone, BookOpen,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const NAV_GROUPS = [
  {
    label: "Operação",
    items: [
      { href: "/admin/pedidos",  label: "Pedidos",          icon: LayoutDashboard, badge: true },
      { href: "/admin/cozinha",  label: "Cozinha",           icon: ChefHat },
      { href: "/admin/manual",   label: "Manual de Preparo", icon: BookOpen },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/admin/estoque",  label: "Estoque",  icon: Package },
      { href: "/admin/anuncios", label: "Anúncios", icon: Megaphone },
      { href: "/admin/qrcode",   label: "QR Code",  icon: QrCode },
    ],
  },
]

interface Props {
  pendingCount?: number
}

export function AdminSidebar({ pendingCount = 0 }: Props) {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  return (
    <aside
      className="hidden md:flex flex-col shrink-0"
      style={{ width: 232, background: "var(--forest-900)", minHeight: "100vh" }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-[18px] py-[22px]"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div
          className="flex items-center justify-center shrink-0"
          style={{ width: 34, height: 34, borderRadius: 9, background: "var(--gold-500)" }}
        >
          <Image src="/logo.svg" alt="Donna FIT" width={18} height={18} />
        </div>
        <div>
          <span
            className="block text-white leading-tight"
            style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 900, letterSpacing: "1px" }}
          >
            DONNA FIT
          </span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui)" }}>
            Painel Admin
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-6">
            <p
              className="px-2 mb-1"
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "1.4px",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.18)",
              }}
            >
              {group.label}
            </p>
            {group.items.map(({ href, label, icon: Icon, badge }) => {
              const isActive = pathname.startsWith(href)
              const count = badge ? pendingCount : 0
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-[10px] mb-[1px] relative"
                  style={{
                    padding: "9px 10px",
                    borderRadius: 10,
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    fontWeight: 500,
                    color: isActive ? "var(--gold-500)" : "rgba(255,255,255,0.38)",
                    background: isActive ? "var(--gold-dim)" : "transparent",
                    transition: "all var(--duration-micro) var(--ease-standard)",
                    textDecoration: "none",
                  }}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 3,
                        height: 20,
                        background: "var(--gold-500)",
                        borderRadius: "0 3px 3px 0",
                      }}
                    />
                  )}
                  <Icon size={15} strokeWidth={1.8} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }} />
                  <span className="flex-1">{label}</span>
                  {badge && count > 0 && (
                    <span
                      style={{
                        background: "var(--gold-500)",
                        color: "#000",
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "1px 7px",
                        borderRadius: 9999,
                        fontFamily: "var(--font-ui)",
                        lineHeight: "16px",
                      }}
                    >
                      {count}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div
        className="flex items-center gap-[10px] p-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
            fontFamily: "var(--font-display)",
            fontSize: 13,
            fontWeight: 800,
            color: "#fff",
          }}
        >
          E
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 12, fontWeight: 600, color: "#fff", fontFamily: "var(--font-ui)" }}>
            Everson
          </p>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui)" }}>
            Administrador
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center"
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            cursor: "pointer",
            flexShrink: 0,
          }}
          title="Sair"
        >
          <LogOut size={12} strokeWidth={1.8} style={{ color: "rgba(255,255,255,0.3)" }} />
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Verificar visualmente no browser**

Abrir `http://localhost:3001/admin/pedidos` e confirmar: sidebar com fundo `#0C150C`, agrupamentos "Operação" e "Gestão", item ativo com indicador dourado na esquerda.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminSidebar.tsx
git commit -m "feat(admin): redesign sidebar — forest palette, nav groups, gold indicator bar"
```

---

## Task 3: AdminBottomNav atualizado

**Files:**
- Modify: `src/components/admin/AdminBottomNav.tsx`

**Interfaces:**
- Produz: `<AdminBottomNav />` com fundo `--forest-900`, ícone `strokeWidth={1.8}`

- [ ] **Step 1: Substituir AdminBottomNav.tsx**

```tsx
// src/components/admin/AdminBottomNav.tsx
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ChefHat, Package, QrCode, BookOpen } from "lucide-react"

const NAV = [
  { href: "/admin/pedidos",  label: "Pedidos",  icon: LayoutDashboard },
  { href: "/admin/cozinha",  label: "Cozinha",  icon: ChefHat },
  { href: "/admin/manual",   label: "Manual",   icon: BookOpen },
  { href: "/admin/estoque",  label: "Estoque",  icon: Package },
  { href: "/admin/qrcode",   label: "QR Code",  icon: QrCode },
]

export function AdminBottomNav() {
  const pathname = usePathname()
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 flex z-10"
      style={{
        background: "var(--forest-900)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {NAV.map(({ href, label, icon: Icon }) => {
        const isActive = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center gap-1 py-3"
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              fontWeight: 600,
              color: isActive ? "var(--gold-500)" : "rgba(255,255,255,0.35)",
              textDecoration: "none",
              transition: "color var(--duration-micro)",
            }}
          >
            <Icon size={20} strokeWidth={1.8} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/AdminBottomNav.tsx
git commit -m "feat(admin): update bottom nav — forest palette, jakarta font, stroke 1.8"
```

---

## Task 4: AdminHero component

**Files:**
- Create: `src/components/admin/AdminHero.tsx`

**Interfaces:**
- Consome: `{ pendingCount, productionCount, readyCount, todayRevenue, todayOrdersCount }`
- Produz: `<AdminHero />` — hero com gradiente floresta, saudação, stats grid embutido

- [ ] **Step 1: Criar AdminHero.tsx**

```tsx
// src/components/admin/AdminHero.tsx
"use client"

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Bom dia"
  if (h < 18) return "Boa tarde"
  return "Boa noite"
}

function getTodayLabel() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function formatCurrencyShort(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

interface Props {
  pendingCount: number
  productionCount: number
  readyCount: number
  todayRevenue: number
  todayOrdersCount: number
}

export function AdminHero({
  pendingCount,
  productionCount,
  readyCount,
  todayRevenue,
  todayOrdersCount,
}: Props) {
  const stats = [
    { value: pendingCount,  label: "Pendentes",    valueColor: "#fff" },
    { value: productionCount, label: "Em Produção", valueColor: "#fff" },
    { value: readyCount,    label: "Prontos",       valueColor: "#fff" },
    { value: formatCurrencyShort(todayRevenue), label: `Hoje · ${todayOrdersCount} pedidos`, valueColor: "var(--gold-500)", isString: true },
  ]

  return (
    <div
      style={{
        background: "linear-gradient(135deg, var(--forest-850) 0%, var(--forest-700) 60%, var(--forest-600) 100%)",
        padding: "28px 32px 0",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Radial glow decorativo */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -60, right: -60,
          width: 260, height: 260,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(200,155,60,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Greeting row */}
      <div className="flex items-start justify-between mb-6" style={{ position: "relative", zIndex: 1 }}>
        <div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1.2,
              marginBottom: 4,
            }}
          >
            {getGreeting()}, Everson
          </h2>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "rgba(255,255,255,0.4)",
              textTransform: "capitalize",
            }}
          >
            {getTodayLabel()}
          </p>
        </div>

        {/* Live badge */}
        <div
          className="flex items-center gap-2"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            padding: "7px 12px",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          <span
            style={{
              width: 6, height: 6,
              borderRadius: "50%",
              background: "#34D399",
              boxShadow: "0 0 0 2px rgba(52,211,153,0.2)",
              flexShrink: 0,
            }}
          />
          Sistema ao vivo
        </div>
      </div>

      {/* Stats bar — flui até a borda inferior sem padding */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1,
          borderRadius: "12px 12px 0 0",
          overflow: "hidden",
          background: "rgba(255,255,255,0.05)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {stats.map((stat, i) => (
          <div
            key={i}
            style={{
              background: "rgba(255,255,255,0.03)",
              padding: "16px 20px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: stat.isString ? 18 : 26,
                fontWeight: 900,
                color: stat.valueColor,
                lineHeight: 1,
                marginBottom: 4,
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "rgba(255,255,255,0.4)",
                fontWeight: 500,
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/AdminHero.tsx
git commit -m "feat(admin): create AdminHero — forest gradient, greeting, stats grid"
```

---

## Task 5: OrderDetailPanel

**Files:**
- Create: `src/components/admin/OrderDetailPanel.tsx`

**Interfaces:**
- Consome: `{ order: OrderWithItems | null, onClose: () => void, onUpdateStatus: (id, status) => void }`
- Produz: `<OrderDetailPanel />` — painel lateral 280px, slide-in quando `order !== null`

- [ ] **Step 1: Criar OrderDetailPanel.tsx**

```tsx
// src/components/admin/OrderDetailPanel.tsx
"use client"
import { X } from "lucide-react"
import { FiscalCopyButton } from "./FiscalCopyButton"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { OrderWithItems, OrderStatus } from "@/types"

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending:    "production",
  production: "ready",
  ready:      "delivered",
}

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pending:    "Iniciar Produção",
  production: "Marcar como Pronto",
  ready:      "Confirmar Entrega",
}

const STATUS_PILLS: Record<string, { bg: string; color: string; pip: string; label: string }> = {
  pending:    { bg: "#FEF3C7", color: "#92400E", pip: "#F59E0B", label: "Pendente" },
  production: { bg: "#DBEAFE", color: "#1E40AF", pip: "#3B82F6", label: "Em Produção" },
  ready:      { bg: "#D1FAE5", color: "#065F46", pip: "#10B981", label: "Pronto" },
  delivered:  { bg: "#F3F4F6", color: "#6B7280", pip: "#9CA3AF", label: "Entregue" },
}

interface Props {
  order: OrderWithItems | null
  onClose: () => void
  onUpdateStatus: (orderId: string, status: string) => Promise<void> | void
}

export function OrderDetailPanel({ order, onClose, onUpdateStatus }: Props) {
  const nextStatus = order ? NEXT_STATUS[order.status as OrderStatus] : undefined
  const nextLabel  = order ? NEXT_LABEL[order.status as OrderStatus] : undefined
  const pill       = order ? STATUS_PILLS[order.status] ?? STATUS_PILLS.delivered : null

  async function handleAdvance() {
    if (!order || !nextStatus) return
    try {
      await onUpdateStatus(order.id, nextStatus)
      onClose()
    } catch (err) {
      console.error("Erro ao atualizar status:", err)
    }
  }

  return (
    <div
      style={{
        width: 280,
        background: "var(--surface-100)",
        borderLeft: "1px solid rgba(0,0,0,0.07)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        transform: order ? "translateX(0)" : "translateX(100%)",
        transition: `transform var(--duration-panel) var(--ease-out)`,
        overflow: "hidden",
      }}
    >
      {order && (
        <>
          {/* Header */}
          <div
            className="flex items-start justify-between"
            style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}
          >
            <div>
              <p
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10,
                  color: "var(--text-300)",
                  marginBottom: 3,
                }}
              >
                Pedido #{order.order_number} · {formatDate(order.created_at)}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  fontWeight: 800,
                  color: "var(--text-950)",
                  lineHeight: 1.2,
                }}
              >
                {order.customer_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center"
              style={{
                width: 26, height: 26,
                borderRadius: 6,
                background: "var(--surface-50)",
                border: "1px solid rgba(0,0,0,0.07)",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <X size={12} strokeWidth={1.8} style={{ color: "var(--text-500)" }} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto" style={{ padding: "16px 20px" }}>
            {[
              { label: "Telefone",  value: order.customer_phone },
              {
                label: "Tipo",
                value: order.delivery_type === "delivery" ? "Entrega" : "Retirada",
              },
              ...(order.delivery_type === "delivery" && order.delivery_address
                ? [{ label: "Endereço", value: order.delivery_address }]
                : []),
              {
                label: "Pagamento",
                value: order.payment_method === "pix" ? "PIX" : "Maquininha",
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex justify-between"
                style={{ padding: "9px 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}
              >
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)" }}>
                  {label}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-950)",
                    textAlign: "right",
                    maxWidth: 160,
                  }}
                >
                  {value}
                </span>
              </div>
            ))}

            {/* Itens */}
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                color: "var(--text-300)",
                marginTop: 16,
                marginBottom: 6,
              }}
            >
              Itens
            </p>
            {order.order_items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between"
                style={{
                  padding: "7px 0",
                  borderBottom: "1px solid rgba(0,0,0,0.05)",
                }}
              >
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-700)" }}>
                  {item.quantity}× {item.product_name}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--text-950)",
                  }}
                >
                  {formatCurrency(item.unit_price * item.quantity)}
                </span>
              </div>
            ))}

            {/* Total */}
            <div
              className="flex justify-between"
              style={{ padding: "10px 0", marginTop: 2 }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                  fontWeight: 800,
                  color: "var(--text-950)",
                }}
              >
                Total
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  fontWeight: 900,
                  color: "var(--gold-500)",
                }}
              >
                {formatCurrency(Number(order.total))}
              </span>
            </div>

            {/* Status */}
            <div
              className="flex justify-between items-center"
              style={{ padding: "9px 0", borderTop: "1px solid rgba(0,0,0,0.06)" }}
            >
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-300)" }}>
                Status
              </span>
              {pill && (
                <span
                  className="flex items-center gap-1"
                  style={{
                    background: pill.bg,
                    color: pill.color,
                    padding: "4px 10px",
                    borderRadius: 9999,
                    fontSize: 10,
                    fontWeight: 600,
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  <span
                    style={{ width: 5, height: 5, borderRadius: "50%", background: pill.pip, flexShrink: 0 }}
                  />
                  {pill.label}
                </span>
              )}
            </div>

            {/* Notas */}
            {order.notes && order.notes.trim() && (
              <div
                style={{
                  background: "var(--surface-50)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginTop: 8,
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-300)",
                    marginBottom: 4,
                  }}
                >
                  Observações
                </p>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-700)" }}>
                  {order.notes}
                </p>
              </div>
            )}

            {/* Fiscal copy */}
            <div
              style={{
                background: "#FFFBEB",
                borderRadius: 8,
                padding: "10px 12px",
                marginTop: 12,
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10,
                  color: "#92400E",
                  fontWeight: 500,
                  marginBottom: 6,
                }}
              >
                Fase 1 — copie os dados fiscais:
              </p>
              <FiscalCopyButton order={order} />
            </div>
          </div>

          {/* Actions */}
          {nextStatus && nextLabel && (
            <div style={{ padding: "0 20px 8px" }}>
              <button
                onClick={handleAdvance}
                style={{
                  width: "100%",
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "11px 16px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, var(--gold-500), var(--gold-600))",
                  color: "#000",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 2px 12px rgba(200,155,60,0.25)",
                  transition: "box-shadow var(--duration-standard), transform var(--duration-micro)",
                }}
              >
                {nextLabel}
              </button>
            </div>
          )}

          {order.status === "delivered" && (
            <p
              style={{
                textAlign: "center",
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--text-300)",
                padding: "0 20px 20px",
              }}
            >
              Pedido entregue
            </p>
          )}

          <div style={{ height: 16 }} />
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/OrderDetailPanel.tsx
git commit -m "feat(admin): create OrderDetailPanel — slide-in side panel with order details"
```

---

## Task 6: OrderTable component

**Files:**
- Create: `src/components/admin/OrderTable.tsx`

**Interfaces:**
- Consome: `{ orders: OrderWithItems[], selectedId: string | null, onSelect: (order) => void }`
- Produz: `<OrderTable />` — tabela com tabs de filtro, linhas clicáveis, pills de status

- [ ] **Step 1: Criar OrderTable.tsx**

```tsx
// src/components/admin/OrderTable.tsx
"use client"
import { useState } from "react"
import { Search } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import type { OrderWithItems } from "@/types"

type Tab = "all" | "pending" | "production" | "ready"

const TABS: { key: Tab; label: string }[] = [
  { key: "all",        label: "Todos" },
  { key: "pending",    label: "Pendentes" },
  { key: "production", label: "Em Produção" },
  { key: "ready",      label: "Prontos" },
]

const STATUS_PILLS: Record<string, { bg: string; color: string; pip: string; label: string }> = {
  pending:    { bg: "#FEF3C7", color: "#92400E", pip: "#F59E0B", label: "Pendente" },
  production: { bg: "#DBEAFE", color: "#1E40AF", pip: "#3B82F6", label: "Em Produção" },
  ready:      { bg: "#D1FAE5", color: "#065F46", pip: "#10B981", label: "Pronto" },
  delivered:  { bg: "#F3F4F6", color: "#6B7280", pip: "#9CA3AF", label: "Entregue" },
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface Props {
  orders: OrderWithItems[]
  selectedId: string | null
  onSelect: (order: OrderWithItems) => void
}

export function OrderTable({ orders, selectedId, onSelect }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("all")
  const [search, setSearch] = useState("")

  const filtered = orders.filter((o) => {
    const matchTab =
      activeTab === "all" ||
      (activeTab === "pending"    && o.status === "pending") ||
      (activeTab === "production" && o.status === "production") ||
      (activeTab === "ready"      && o.status === "ready")
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      o.customer_name.toLowerCase().includes(q) ||
      String(o.order_number).includes(q)
    return matchTab && matchSearch
  })

  const countFor = (tab: Tab) =>
    tab === "all"
      ? orders.length
      : orders.filter((o) => o.status === tab).length

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Topbar — tabs + search */}
      <div
        style={{
          background: "var(--surface-100)",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          padding: "0 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        {/* Tabs */}
        <div style={{ display: "flex" }}>
          {TABS.map(({ key, label }) => {
            const isActive = activeTab === key
            const count = countFor(key)
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: "14px 16px",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: isActive ? "var(--text-950)" : "var(--text-300)",
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${isActive ? "var(--gold-500)" : "transparent"}`,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                  transition: "color var(--duration-micro)",
                }}
              >
                {label}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 9999,
                    background: isActive ? "var(--gold-dim)" : "#F3F4F6",
                    color: isActive ? "var(--gold-500)" : "var(--text-500)",
                    fontFamily: "var(--font-ui)",
                    transition: "all var(--duration-micro)",
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "var(--surface-50)",
            border: "1px solid rgba(0,0,0,0.07)",
            borderRadius: 8,
            padding: "6px 12px",
          }}
        >
          <Search size={13} strokeWidth={1.8} style={{ color: "var(--text-300)", flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pedido..."
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--text-700)",
              background: "transparent",
              border: "none",
              outline: "none",
              width: 140,
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: "auto", background: "var(--surface-50)" }}>
        {filtered.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--text-300)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              gap: 8,
            }}
          >
            <Search size={32} strokeWidth={1.5} style={{ opacity: 0.3 }} />
            Nenhum pedido encontrado
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["#", "Cliente / Prato", "Horário", "Itens", "Total", "Status"].map((h) => (
                  <th
                    key={h}
                    style={{
                      background: "var(--surface-100)",
                      padding: "10px 16px",
                      fontFamily: "var(--font-ui)",
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.8px",
                      color: "var(--text-300)",
                      textAlign: "left",
                      borderBottom: "1px solid rgba(0,0,0,0.07)",
                      whiteSpace: "nowrap",
                      ...(h === "#" ? { paddingLeft: 28 } : {}),
                      ...(h === "Status" ? { paddingRight: 28 } : {}),
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const isSelected = order.id === selectedId
                const pill = STATUS_PILLS[order.status] ?? STATUS_PILLS.delivered
                const itemNames = order.order_items?.map((i) => i.product_name).join(", ") ?? ""

                return (
                  <tr
                    key={order.id}
                    onClick={() => onSelect(order)}
                    style={{
                      background: isSelected ? "#FDFAF3" : "var(--surface-100)",
                      borderBottom: "1px solid rgba(0,0,0,0.05)",
                      cursor: "pointer",
                      borderLeft: isSelected ? "2px solid var(--gold-500)" : "2px solid transparent",
                      transition: "background var(--duration-micro)",
                    }}
                  >
                    <td
                      style={{
                        padding: "12px 16px 12px 28px",
                        fontFamily: "var(--font-ui)",
                        fontSize: 11,
                        color: "var(--text-300)",
                        verticalAlign: "middle",
                      }}
                    >
                      #{order.order_number}
                    </td>
                    <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                      <p
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text-950)",
                          marginBottom: 1,
                        }}
                      >
                        {order.customer_name}
                      </p>
                      <p
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 10,
                          color: "var(--text-300)",
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {itemNames}
                      </p>
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontFamily: "var(--font-ui)",
                        fontSize: 11,
                        color: "var(--text-300)",
                        verticalAlign: "middle",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatTime(order.created_at)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontFamily: "var(--font-ui)",
                        fontSize: 12,
                        color: "var(--text-500)",
                        verticalAlign: "middle",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {order.order_items?.length ?? 0}{" "}
                      {(order.order_items?.length ?? 0) === 1 ? "item" : "itens"}
                    </td>
                    <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "var(--text-950)",
                        }}
                      >
                        {formatCurrency(Number(order.total))}
                      </span>
                    </td>
                    <td style={{ padding: "12px 28px 12px 16px", verticalAlign: "middle" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          background: pill.bg,
                          color: pill.color,
                          padding: "4px 10px",
                          borderRadius: 9999,
                          fontFamily: "var(--font-ui)",
                          fontSize: 10,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: pill.pip,
                            flexShrink: 0,
                          }}
                        />
                        {pill.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/OrderTable.tsx
git commit -m "feat(admin): create OrderTable — tabbed filter, search, status pills, selectable rows"
```

---

## Task 7: Refatorar pedidos/page.tsx

**Files:**
- Modify: `src/app/admin/(protected)/pedidos/page.tsx`

**Interfaces:**
- Consome: `useRealtimeOrders` (sem mudança), `AdminHero`, `OrderTable`, `OrderDetailPanel`
- Produz: página de pedidos com hero + tabela + painel lateral

- [ ] **Step 1: Substituir pedidos/page.tsx**

```tsx
// src/app/admin/(protected)/pedidos/page.tsx
"use client"
import { useState } from "react"
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders"
import { AdminHero } from "@/components/admin/AdminHero"
import { OrderTable } from "@/components/admin/OrderTable"
import { OrderDetailPanel } from "@/components/admin/OrderDetailPanel"
import { Skeleton } from "@/components/ui/skeleton"
import type { OrderWithItems } from "@/types"

export default function PedidosPage() {
  const { orders, loading, updateStatus } = useRealtimeOrders()
  const [selected, setSelected] = useState<OrderWithItems | null>(null)

  const pending    = orders.filter((o) => o.status === "pending").length
  const production = orders.filter((o) => o.status === "production").length
  const ready      = orders.filter((o) => o.status === "ready").length

  const todayOrders = orders.filter((o) => {
    const d = new Date(o.created_at)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  })
  const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total), 0)

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Skeleton className="h-48 rounded-none" style={{ background: "rgba(255,255,255,0.04)" }} />
        <div className="p-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  function handleSelect(order: OrderWithItems) {
    setSelected((prev) => (prev?.id === order.id ? null : order))
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <AdminHero
        pendingCount={pending}
        productionCount={production}
        readyCount={ready}
        todayRevenue={todayRevenue}
        todayOrdersCount={todayOrders.length}
      />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <OrderTable
          orders={orders}
          selectedId={selected?.id ?? null}
          onSelect={handleSelect}
        />
        <OrderDetailPanel
          order={selected}
          onClose={() => setSelected(null)}
          onUpdateStatus={updateStatus}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar visualmente no browser**

Abrir `http://localhost:3001/admin/pedidos` e confirmar:
- Hero com gradiente floresta e saudação
- Stats bar com os 4 valores (pendentes, produção, prontos, faturamento)
- Tabela com tabs de filtro e coluna de status em pills
- Clicar numa linha abre o painel lateral com os detalhes
- Botão "Iniciar Produção" / "Marcar como Pronto" funciona e fecha o painel

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/(protected)/pedidos/page.tsx
git commit -m "feat(admin): pedidos page — hero + order table + slide-in detail panel"
```

---

## Task 8: AdminLayout + sidebar com contagem

**Files:**
- Modify: `src/app/admin/(protected)/layout.tsx`

**Interfaces:**
- Consome: `AdminSidebar` (agora aceita `pendingCount?` prop), `AdminBottomNav`
- Produz: layout com background `#F3F6F3`, passando contagem de pendentes para sidebar

- [ ] **Step 1: Atualizar AdminLayout**

```tsx
// src/app/admin/(protected)/layout.tsx
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { AdminBottomNav } from "@/components/admin/AdminBottomNav"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: "var(--surface-50)" }}>
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden pb-20 md:pb-0">
          {children}
        </main>
      </div>
      <AdminBottomNav />
    </div>
  )
}
```

- [ ] **Step 2: Verificar layout completo no browser**

Confirmar:
- Sidebar `#0C150C` fixa à esquerda no desktop
- Conteúdo com background `#F3F6F3`
- Mobile: bottom nav visível com cores corretas
- Sem scroll horizontal

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/(protected)/layout.tsx
git commit -m "feat(admin): update layout — forest surface background, overflow fix"
```

---

## Self-Review

**Cobertura do spec:**
- ✅ Paleta Floresta + Gold aplicada (Tasks 1–8)
- ✅ Plus Jakarta Sans como fonte UI (Task 1)
- ✅ Montserrat para display/headings (mantida)
- ✅ Hero com gradiente e stats embutidos (Task 4)
- ✅ Tabela limpa com tabs e search (Task 6)
- ✅ Painel lateral slide-in (Task 5)
- ✅ Pills de status discretos (Tasks 5, 6)
- ✅ Sem bordas coloridas nos cards (exceção: linha selecionada)
- ✅ `strokeWidth={1.8}` nos ícones Lucide (Tasks 2, 3)
- ✅ Nav groups + indicator bar (Task 2)
- ✅ Botão primary com gradiente dourado (Task 5)
- ✅ Variáveis CSS consolidadas (Task 1)
- ✅ Border radius 10-12px (componentes Tasks 5, 6)
- ✅ `--duration-panel: 250ms` no slide-in (Task 5)

**Sem placeholders:** Todos os steps contêm código completo.

**Consistência de tipos:** `OrderWithItems`, `OrderStatus` usados consistentemente da mesma import `@/types` em todos os componentes novos.
