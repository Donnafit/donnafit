# Visual Polish — Demo Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir todos os gaps visuais identificados entre o demo HTML e o projeto Next.js real, sem quebrar funcionalidades existentes.

**Architecture:** Mudanças isoladas por arquivo — CSS global, layout, componentes de catálogo e carrinho. Nenhuma alteração em lógica de negócio, API routes ou banco de dados. Zero emojis; ícones Lucide onde necessário.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, CSS Modules (globals.css), Lucide React

---

## Revisão Pós-Análise — Falsos Positivos Eliminados

Após leitura direta do código (não dos relatórios dos agentes), os seguintes itens foram confirmados como **já implementados**:
- Cart bar ID (`#cart-bar-float`): CartBar.tsx e globals.css são consistentes ✓
- CTA shadow no hover: `hover:shadow-[0_12px_32px_rgba(200,155,60,0.55)]` já está no HeroSection ✓  
- `fade-in-up` nos produtos: ProductCard já aplica a classe com delay escalonado ✓
- Confetti na confirmação: já implementado em confirmacao/page.tsx ✓
- CartDrawer: não está sendo usado em nenhuma rota — ignorar ✓

---

## Task 1: CartBar — Safe-Area-Inset no iOS

**Problema:** `padding: '0 16px 12px'` inline no container sobreescreve o CSS `padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px))`, quebrando o layout em iPhones com notch/home bar.

**Files:**
- Modify: `src/components/cart/CartBar.tsx:32`

- [ ] **Step 1: Corrigir padding inline no container da CartBar**

Em `src/components/cart/CartBar.tsx`, linha 32, alterar:
```tsx
// ANTES
padding: '0 16px 12px',

// DEPOIS — remove padding-bottom inline; CSS #cart-bar-float já cuida do safe-area
paddingLeft: 16,
paddingRight: 16,
```

- [ ] **Step 2: Verificar que a transição hide/show continua funcionando**

Inspecionar no browser que o `.hidden-bar` ainda aplica `translateY(110%)` e a barra some/aparece corretamente ao adicionar items.

- [ ] **Step 3: Commit**
```bash
git add src/components/cart/CartBar.tsx
git commit -m "fix(cart): restore safe-area-inset-bottom padding on iOS"
```

---

## Task 2: DM Sans — Fonte do Body

**Problema:** O demo usa `DM Sans` como fonte principal do corpo. O projeto usa `Inter`. DM Sans tem melhor legibilidade para listas de produtos e formulários.

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Adicionar DM Sans ao layout.tsx**

```tsx
// src/app/layout.tsx
import { DM_Sans, Montserrat } from "next/font/google"

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
})

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
})

// No RootLayout, adicionar dmSans.variable à className do <html>
// E trocar className do <body> de "font-body" para usar a nova fonte
```

- [ ] **Step 2: Atualizar tailwind.config.ts**

```ts
fontFamily: {
  display: ["var(--font-montserrat)", "sans-serif"],
  body: ["var(--font-dm-sans)", "DM Sans", "sans-serif"],
},
```

- [ ] **Step 3: Remover Inter (não mais necessário)**

Remover o import de `Inter` do layout.tsx e remover a variável `--font-inter` do `<html>`.

- [ ] **Step 4: Commit**
```bash
git add src/app/layout.tsx tailwind.config.ts
git commit -m "feat(typography): replace Inter with DM Sans for body font per demo spec"
```

---

## Task 3: HeaderCartButton — Badge 16×16 → 20×20

**Problema:** Badge do contador do carrinho tem 16×16px; o demo especifica 20×20px. Fica pequeno demais para leitura em mobile.

**Files:**
- Modify: `src/components/cart/HeaderCartButton.tsx:68-81`

- [ ] **Step 1: Atualizar tamanho e posicionamento do badge**

```tsx
// src/components/cart/HeaderCartButton.tsx
// Alterar o span do badge de width: 16, height: 16, top: 4, right: 4
// para:
style={{
  position: 'absolute',
  top: 2,
  right: 2,
  width: 20,
  height: 20,
  background: '#C89B3C',
  color: '#fff',
  borderRadius: '50%',
  fontSize: 11,
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
}}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/cart/HeaderCartButton.tsx
git commit -m "fix(header): increase cart badge size from 16 to 20px"
```

---

## Task 4: StockBadge — Integrar "Últimas X unidades" no ProductCard

**Problema:** ProductCard mostra "Esgotado" como texto simples quando `soldOut=true`, mas não exibe o badge "Últimas X" quando estoque está baixo. O componente `StockBadge` existe mas não é usado.

**Context:** O campo no DB é `min_stock_alert` (não `min_alert_quantity`). O tipo `Product` vem de `database.types.ts`.

**Files:**
- Modify: `src/components/catalog/ProductCard.tsx`

- [ ] **Step 1: Importar StockBadge e integrar no card**

No ProductCard, identificar a lógica de `soldOut` e adicionar o badge de estoque baixo na área de imagem:

```tsx
import { StockBadge } from "./StockBadge"

// Na seção de imagem do card (após os badges de categoria/mais pedido):
{/* Badge de estoque — posição inferior direita da imagem */}
{(soldOut || product.stock_quantity <= product.min_stock_alert) && (
  <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 5 }}>
    <StockBadge
      stockQuantity={product.stock_quantity}
      minAlert={product.min_stock_alert}
      isActive={product.is_active}
    />
  </div>
)}
```

- [ ] **Step 2: Atualizar o texto "Esgotado" inline no ProductCard**

O texto "Esgotado" no rodapé do card (onde fica o botão de adicionar) pode ser removido ou mantido. Decidir: se StockBadge já mostra "Esgotado" na imagem, o texto no rodapé é redundante. Manter apenas o StockBadge na imagem; no rodapé mostrar apenas o botão desabilitado com `cursor: not-allowed` e opacidade reduzida no lugar do texto.

- [ ] **Step 3: Commit**
```bash
git add src/components/catalog/ProductCard.tsx
git commit -m "feat(product): integrate StockBadge for low-stock visual indicator"
```

---

## Task 5: Carrinho — Hover Transition no Botão Deletar

**Problema:** Botão de remover item no carrinho (`/carrinho/page.tsx`) tem background `#FEF2F2` mas sem `transition`, fazendo o hover parecer brusco.

**Files:**
- Modify: `src/app/carrinho/page.tsx:125-136`

- [ ] **Step 1: Adicionar transition ao botão de remover**

```tsx
// src/app/carrinho/page.tsx — botão de remover (linha ~125)
style={{
  width: 44, height: 44,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 10,
  background: '#FEF2F2',
  border: 'none', cursor: 'pointer', flexShrink: 0,
  transition: 'background 0.2s ease',  // ADICIONAR
}}
// Adicionar também onMouseEnter/Leave para feedback visual:
onMouseEnter={e => (e.currentTarget.style.background = '#FEE2E2')}
onMouseLeave={e => (e.currentTarget.style.background = '#FEF2F2')}
```

- [ ] **Step 2: Commit**
```bash
git add src/app/carrinho/page.tsx
git commit -m "fix(cart): add hover transition to delete item button"
```

---

## Task 6: HeroSection — Aplicar heroFloat nas Feature Pills

**Problema:** `@keyframes heroFloat` está definido em globals.css mas nenhum elemento usa a animação. As feature pills do hero ficam estáticas; o demo as anima com flutuação sutil.

**Files:**
- Modify: `src/components/catalog/HeroSection.tsx:78-87`

- [ ] **Step 1: Aplicar animação heroFloat nas feature pills**

```tsx
// src/components/catalog/HeroSection.tsx
// No map das feature pills, adicionar animação com delay escalonado:
{[
  { icon: <Utensils .../>, label: 'Comida Fresca' },
  { icon: <Truck .../>, label: 'Entrega Rápida' },
  { icon: <Check .../>, label: 'Pedido Fácil' },
].map((f, i) => (
  <div
    key={f.label}
    style={{
      background: 'rgba(255,255,255,0.1)', borderRadius: 100,
      padding: '6px 14px', fontSize: 12,
      color: 'rgba(255,255,255,0.85)',
      display: 'flex', alignItems: 'center', gap: 6,
      animation: 'heroFloat 3s ease-in-out infinite',
      animationDelay: `${i * 0.4}s`,  // Stagger por índice
    }}
  >
    {f.icon} {f.label}
  </div>
))}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/catalog/HeroSection.tsx
git commit -m "feat(hero): apply heroFloat animation to feature pills with stagger delay"
```

---

## Ordem de Execução Recomendada

1. Task 1 (CartBar safe-area) — crítico para iOS
2. Task 3 (Badge size) — rápido, 2 linhas
3. Task 5 (Delete hover) — rápido, 2 linhas
4. Task 6 (heroFloat) — rápido, 1 propriedade
5. Task 2 (DM Sans) — médio, requer teste visual
6. Task 4 (StockBadge) — médio, requer atenção aos tipos
