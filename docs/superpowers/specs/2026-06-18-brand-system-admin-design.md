# Brand System — Donna FIT Admin
> Versão 1.0 · Junho 2026 · Aprovado via sessão de brainstorming visual

---

## Resumo das Decisões

| Dimensão | Decisão |
|---|---|
| Layout | Hero gradiente + tabela limpa + painel lateral deslizante |
| Paleta | Floresta escuro + Dourado — cores do logo Donna FIT |
| Tom | Premium Refinado — cantos 10-12px, sentence case, gradiente no CTA |
| Tipografia display | Montserrat (headings, valores, marca) |
| Tipografia UI | Plus Jakarta Sans (nav, tabelas, botões, body) |
| Referências | Flup (tabela + painel), Bizee (hero), Crextio (cards e pills) |

---

## 1. Paleta de Cores

### 1.1 Dark — Sidebar e Hero

```css
--forest-950: #070C07;   /* background raiz da página */
--forest-900: #0C150C;   /* sidebar background */
--forest-850: #0F1A0F;   /* sidebar hover / active bg */
--forest-700: #1A2F1A;   /* hero gradient mid */
--forest-600: #142414;   /* hero gradient end */
```

**Gradiente do Hero:**
```css
background: linear-gradient(135deg, #0F1A0F 0%, #1A2F1A 60%, #142414 100%);
```

**Radial glow (canto superior direito do hero):**
```css
background: radial-gradient(circle, rgba(200,155,60,0.12) 0%, transparent 70%);
```

---

### 1.2 Gold — Acento Primário

```css
--gold-500:  #C89B3C;               /* cor primária — ícones, badges, active */
--gold-400:  #D4AC50;               /* hover do gold */
--gold-600:  #A67C22;               /* gradient end do botão primary */
--gold-dim:  rgba(200,155,60,0.08); /* fundo de botão ghost */
--gold-glow: rgba(200,155,60,0.15); /* glow nos estados ativos */
--gold-text: rgba(200,155,60,0.12); /* fundo de badge/nav active no dark */
```

**Regra de uso:** ouro aparece em no máximo 3 elementos por tela ao mesmo tempo — indicador de nav ativo, valor monetário em destaque, e botão primary. Não usar como fundo de área grande.

---

### 1.3 Surface — Área de Conteúdo (light)

```css
--surface-50:  #F3F6F3;  /* background do conteúdo principal */
--surface-100: #FFFFFF;  /* cards, topbar, tabela */
--surface-200: #E8ECE8;  /* bordas, divisores */
--surface-300: #D1D5D1;  /* bordas de input */
```

---

### 1.4 Texto

**Contexto claro (área de conteúdo):**
```css
--text-950: #0D1117;  /* heading principal */
--text-700: #374151;  /* texto de corpo */
--text-500: #6B7280;  /* label secundário */
--text-300: #9CA3AF;  /* placeholder, info terciária */
```

**Contexto escuro (sidebar/hero):**
```css
--text-dark-100: rgba(255,255,255,0.85); /* texto principal */
--text-dark-400: rgba(255,255,255,0.38); /* nav items inativos */
--text-dark-200: rgba(255,255,255,0.20); /* labels de seção */
--text-dark-080: rgba(255,255,255,0.08); /* divisores */
```

---

### 1.5 Status Semântico

Usado exclusivamente em pills de status de pedidos. Jamais como cor de borda lateral de cards.

| Status | Pill bg | Pill text | Pip color |
|---|---|---|---|
| Pendente | `#FEF3C7` | `#92400E` | `#F59E0B` |
| Em Produção | `#DBEAFE` | `#1E40AF` | `#3B82F6` |
| Pronto | `#D1FAE5` | `#065F46` | `#10B981` |
| Entregue | `#F3F4F6` | `#6B7280` | `#9CA3AF` |

**No contexto dark (hero stats, sidebars):**

| Status | bg | text |
|---|---|---|
| Pendente | `rgba(245,158,11,0.10)` | `#D97706` |
| Em Produção | `rgba(96,165,250,0.08)` | `#60A5FA` |
| Pronto | `rgba(52,211,153,0.08)` | `#34D399` |
| Entregue | `rgba(255,255,255,0.04)` | `rgba(255,255,255,0.25)` |

---

## 2. Tipografia

### 2.1 Fontes

```
Display / Marca:  Montserrat  (Google Fonts)
UI / Corpo:       Plus Jakarta Sans  (Google Fonts)
```

**Importação:**
```html
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Variáveis CSS:**
```css
--font-display: 'Montserrat', sans-serif;
--font-ui:      'Plus Jakarta Sans', ui-sans-serif, sans-serif;
```

---

### 2.2 Escala Tipográfica

| Token | Fonte | Tamanho | Peso | Uso |
|---|---|---|---|---|
| `display-xl` | Montserrat | 28–32px | 900 | Valores KPI grandes |
| `display-lg` | Montserrat | 20–22px | 800 | Valores monetários, contadores |
| `heading-page` | Montserrat | 16–18px | 800 | Título de página no topbar |
| `heading-section` | Montserrat | 13–14px | 700 | Título de seção, subtítulo de card |
| `label-caps` | Plus Jakarta Sans | 9–10px | 700 | Cabeçalhos de tabela, nav group labels |
| `body` | Plus Jakarta Sans | 13–14px | 400–500 | Texto de corpo, descrições |
| `body-sm` | Plus Jakarta Sans | 11–12px | 500 | Nav items, table cells secundários |
| `micro` | Plus Jakarta Sans | 9–10px | 600 | Pills, badges, timestamps |

**Regras:**
- `label-caps`: sempre `text-transform: uppercase; letter-spacing: 1.2px`
- Valores monetários em tabelas: `font-family: var(--font-display); font-weight: 700`
- Nunca usar Montserrat abaixo de `font-weight: 700`

---

## 3. Layout e Estrutura

### 3.1 Shell Principal

```
┌──────────────┬──────────────────────────────────────┐
│              │  HERO (gradiente escuro, ~180px)     │
│   SIDEBAR    │──────────────────────────────────────│
│   232px      │  TOPBAR (tabs + search, ~48px)       │
│   dark       │──────────────────────────────────────│
│              │  TABELA DE PEDIDOS                   │
│              │                        ┌────────────┐│
│              │                        │  PAINEL    ││
│              │                        │  DETALHE   ││
│              │                        │  280px     ││
└──────────────┴────────────────────────┴────────────┘
```

| Zona | Largura | Background |
|---|---|---|
| Sidebar | 232px (fixed) | `#0C150C` |
| Hero | flex | gradiente floresta |
| Content | flex-1 | `#F3F6F3` |
| Detail panel | 280px (slide-in) | `#FFFFFF` |

---

### 3.2 Espaçamento

```css
/* Base unit: 4px */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;

/* Padding de seção */
--padding-page:    24px 28px;  /* conteúdo principal */
--padding-hero:    28px 32px;  /* hero */
--padding-card:    14px 16px;  /* cards KPI */
--padding-sidebar: 16px 12px;  /* nav */
```

---

## 4. Border Radius

```css
--radius-sm:  6px;   /* badges retangulares, icons bg (quando sharp) */
--radius-md:  10px;  /* botões, inputs, nav items */
--radius-lg:  12px;  /* cards KPI, modal, detail sections */
--radius-xl:  14px;  /* painéis, containers grandes */
--radius-pill: 9999px; /* pills de status, badges de contagem */
```

---

## 5. Componentes

### 5.1 Sidebar

**Logo area:**
- Padding: `22px 18px 20px`
- Borda inferior: `1px solid rgba(255,255,255,0.05)`
- Logo mark: 34×34px, `border-radius: 9px`, background `#C89B3C`

**Nav groups:**
- Group label: 9px, `var(--font-ui)`, weight 700, uppercase, `letter-spacing: 1.4px`, color `rgba(255,255,255,0.18)`
- Nav item inativo: `color: rgba(255,255,255,0.38)`, padding `9px 10px`, radius `10px`
- Nav item ativo: `background: rgba(200,155,60,0.08)`, `color: #C89B3C`
- Indicator bar (ativo): `position:absolute; left:0; width:3px; height:20px; background:#C89B3C; border-radius: 0 3px 3px 0`
- Badge de contagem: `background: #C89B3C; color: #000; border-radius: 9999px; font-size: 9px; font-weight: 700; padding: 1px 7px`

**User footer:**
- Borda superior: `1px solid rgba(255,255,255,0.05)`
- Avatar: 34×34px, `border-radius: 99px`, `background: linear-gradient(135deg, #C89B3C, #A67C22)`

---

### 5.2 Hero

```css
.hero {
  background: linear-gradient(135deg, #0F1A0F 0%, #1A2F1A 60%, #142414 100%);
  padding: 28px 32px 0;
  position: relative;
  overflow: hidden;
}

/* Radial glow decorativo */
.hero::before {
  content: '';
  position: absolute;
  top: -60px; right: -60px;
  width: 260px; height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(200,155,60,0.12) 0%, transparent 70%);
  pointer-events: none;
}
```

**Greeting:**
- "Boa tarde, Everson" — Montserrat 900 22px `#fff`
- Subtítulo — Plus Jakarta Sans 400 13px `rgba(255,255,255,0.40)`

**Stats bar (embutida no hero, sem padding inferior — flui direto para o content):**
- Grid 4 colunas, gap `1px`, `background: rgba(255,255,255,0.05)` (o gap)
- Cada célula: `background: rgba(255,255,255,0.03)`, padding `16px 20px`
- Valor: Montserrat 900 26px `#fff` (monetário: `#C89B3C`)
- Label: Plus Jakarta Sans 500 11px `rgba(255,255,255,0.40)`

---

### 5.3 Topbar do Conteúdo

```css
.topbar {
  background: #fff;
  border-bottom: 1px solid rgba(0,0,0,0.07);
  padding: 0 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
}
```

**Tabs:**
- Inativo: Plus Jakarta Sans 600 12px `#9CA3AF`, `border-bottom: 2px solid transparent`
- Ativo: `color: #0D1117`, `border-bottom-color: #C89B3C`
- Tab count: `background: rgba(200,155,60,0.10); color: #C89B3C` quando ativo

---

### 5.4 Tabela de Pedidos

```css
.table th {
  font-family: var(--font-ui);
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.8px;
  color: #9CA3AF;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid rgba(0,0,0,0.07);
}

.table td {
  padding: 12px 16px;
  font-family: var(--font-ui);
  font-size: 12px; color: #6B7280;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  vertical-align: middle;
}

/* Linha selecionada */
.table tr.selected {
  background: #FDFAF3;
  border-left: 2px solid #C89B3C; /* única exceção de borda colorida — linha selecionada */
}

/* Nome do cliente */
.cell-name strong { font-size: 13px; font-weight: 600; color: #111827; }
.cell-name span   { font-size: 10px; color: #9CA3AF; }

/* Valor monetário */
.cell-price { font-family: var(--font-display); font-size: 12px; font-weight: 700; color: #111827; }
```

---

### 5.5 Pills de Status

```css
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-family: var(--font-ui);
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.status-pill .pip {
  width: 5px; height: 5px;
  border-radius: 9999px;
  flex-shrink: 0;
}
```

---

### 5.6 Botões

```css
/* Primary — CTA principal (ex: "Iniciar Produção") */
.btn-primary {
  font-family: var(--font-display);
  font-size: 12px; font-weight: 700;
  padding: 10px 20px; border-radius: 10px;
  background: linear-gradient(135deg, #C89B3C, #A67C22);
  color: #000; border: none; cursor: pointer;
  box-shadow: 0 2px 12px rgba(200,155,60,0.25);
  transition: box-shadow 0.2s, transform 0.15s;
}
.btn-primary:hover {
  box-shadow: 0 4px 20px rgba(200,155,60,0.35);
  transform: translateY(-1px);
}

/* Ghost — ação secundária visível */
.btn-ghost {
  font-family: var(--font-ui);
  font-size: 12px; font-weight: 600;
  padding: 10px 20px; border-radius: 10px;
  background: rgba(200,155,60,0.07);
  color: #C89B3C;
  border: 1px solid rgba(200,155,60,0.15);
  cursor: pointer;
  transition: background 0.15s;
}

/* Secondary — ação neutra / cancelar */
.btn-secondary {
  font-family: var(--font-ui);
  font-size: 12px; font-weight: 500;
  padding: 10px 20px; border-radius: 10px;
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.6);
  border: 1px solid rgba(255,255,255,0.10);
  cursor: pointer;
}

/* Secondary em contexto claro */
.btn-secondary--light {
  background: #F9FAFB;
  color: #374151;
  border-color: #E5E7EB;
}
```

---

### 5.7 Cards KPI (no hero dark)

```css
.kpi-card {
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 14px 16px;
}

.kpi-value {
  font-family: var(--font-display);
  font-size: 22px; font-weight: 900;
  color: #fff; line-height: 1;
  margin-bottom: 3px;
}
.kpi-value--gold { color: #C89B3C; }

.kpi-label {
  font-family: var(--font-ui);
  font-size: 10px; font-weight: 500;
  color: rgba(255,255,255,0.35);
}

/* Ícone do KPI */
.kpi-icon {
  width: 30px; height: 30px;
  border-radius: 8px;
}
```

---

### 5.8 Painel de Detalhe (slide-in)

```css
.detail-panel {
  width: 280px;
  background: #fff;
  border-left: 1px solid rgba(0,0,0,0.07);
  transform: translateX(100%);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.detail-panel.open {
  transform: translateX(0);
}
```

**Botão de ação primária no painel:**
- Usa `.btn-primary` com largura 100%
- Margem: `14px 20px 8px`

---

### 5.9 Inputs

```css
.input {
  font-family: var(--font-ui);
  font-size: 12px; font-weight: 400;
  padding: 9px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.08); /* dark */
  background: rgba(255,255,255,0.04);       /* dark */
  color: rgba(255,255,255,0.45);
  outline: none;
  transition: border-color 0.15s;
}
.input:focus {
  border-color: rgba(200,155,60,0.5);
  box-shadow: 0 0 0 3px rgba(200,155,60,0.08);
}

/* Contexto claro */
.input--light {
  background: #fff;
  border-color: #E5E7EB;
  color: #111827;
}
.input--light:focus {
  border-color: #C89B3C;
}
```

---

## 6. Iconografia

**Biblioteca:** Lucide React (já instalada)

```css
/* Stroke padrão — mais refinado que o default (2px) */
stroke-width: 1.8

/* Tamanhos por contexto */
--icon-nav:    15px   /* sidebar */
--icon-body:   14px   /* tabelas, pills, botões */
--icon-kpi:    13px   /* cards KPI */
--icon-action: 18px   /* botões standalone, topbar */
```

**Regra:** nunca usar ícones filled (preenchidos) no admin — sempre outline com stroke 1.8.

---

## 7. Sombras

```css
--shadow-sm:   0 1px 3px rgba(0,0,0,0.08);              /* cards light */
--shadow-md:   0 4px 12px rgba(0,0,0,0.10);             /* modals, dropdowns */
--shadow-lg:   0 8px 32px rgba(0,0,0,0.18);             /* painéis */
--shadow-gold: 0 2px 12px rgba(200,155,60,0.25);        /* btn primary */
--shadow-gold-hover: 0 4px 20px rgba(200,155,60,0.35);  /* btn primary hover */
```

---

## 8. Animações e Transições

```css
/* Curva padrão */
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out:      cubic-bezier(0, 0, 0.2, 1);
--ease-in:       cubic-bezier(0.4, 0, 1, 1);

/* Durações */
--duration-micro:    100ms;  /* hover de cor, active state */
--duration-standard: 200ms;  /* hover de elevação, fade */
--duration-panel:    250ms;  /* slide-in do painel lateral */
--duration-modal:    300ms;  /* modais, overlays */
```

**Regras:**
- Hover em cards: `transform: translateY(-1px)` + shadow increase, `200ms ease-out`
- Slide-in painel: `translateX(100%) → translateX(0)`, `250ms ease-out`
- Fade de pills/badges ao mudar status: `200ms ease-standard`
- Nunca animar `width` ou `height` diretamente — usar `transform: scale()` ou `max-height`

---

## 9. Variáveis CSS Consolidadas (globals.css)

```css
:root {
  /* Cores dark */
  --forest-950: #070C07;
  --forest-900: #0C150C;
  --forest-850: #0F1A0F;
  --forest-700: #1A2F1A;
  --forest-600: #142414;

  /* Gold */
  --gold-500: #C89B3C;
  --gold-400: #D4AC50;
  --gold-600: #A67C22;
  --gold-dim: rgba(200,155,60,0.08);
  --gold-text: rgba(200,155,60,0.12);
  --gold-glow: rgba(200,155,60,0.15);

  /* Surface */
  --surface-50:  #F3F6F3;
  --surface-100: #FFFFFF;
  --surface-200: #E8ECE8;

  /* Texto claro */
  --text-950: #0D1117;
  --text-700: #374151;
  --text-500: #6B7280;
  --text-300: #9CA3AF;

  /* Texto dark */
  --text-dark-100: rgba(255,255,255,0.85);
  --text-dark-400: rgba(255,255,255,0.38);
  --text-dark-200: rgba(255,255,255,0.20);

  /* Tipografia */
  --font-display: 'Montserrat', sans-serif;
  --font-ui:      'Plus Jakarta Sans', ui-sans-serif, sans-serif;

  /* Raios */
  --radius-sm:   6px;
  --radius-md:   10px;
  --radius-lg:   12px;
  --radius-xl:   14px;
  --radius-pill: 9999px;

  /* Sombras */
  --shadow-sm:         0 1px 3px rgba(0,0,0,0.08);
  --shadow-md:         0 4px 12px rgba(0,0,0,0.10);
  --shadow-lg:         0 8px 32px rgba(0,0,0,0.18);
  --shadow-gold:       0 2px 12px rgba(200,155,60,0.25);
  --shadow-gold-hover: 0 4px 20px rgba(200,155,60,0.35);

  /* Transições */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out:      cubic-bezier(0, 0, 0.2, 1);
  --duration-micro:    100ms;
  --duration-standard: 200ms;
  --duration-panel:    250ms;
  --duration-modal:    300ms;
}
```

---

## 10. Próximos Passos

1. **Aplicar variáveis CSS** em `globals.css` — substituir os valores inline existentes
2. **Instalar Plus Jakarta Sans** via `next/font/google` — substituir `Inter`
3. **Refatorar `AdminSidebar.tsx`** — aplicar nova escala tipográfica, nav groups, indicator bar
4. **Refatorar `pedidos/page.tsx`** — substituir kanban por tabela + painel lateral
5. **Criar hero component** — `AdminHero.tsx` com gradiente e stats embutidos
6. **Refatorar `AdminLayout.tsx`** — background `--surface-50`, detail panel slot
7. **Padronizar ícones** — `strokeWidth={1.8}` em todos os Lucide do admin
