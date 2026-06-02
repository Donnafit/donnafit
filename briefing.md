# Briefing — Cliente Marmitas Fitness

> Documento de preparação para reunião de descoberta, escopo e orçamento.  
> Atualizado com base na análise do [Organizador de Contexto](https://organizador-contexto.lovable.app/) e benchmark do [Anota Aí](https://anota.ai/home/).

**Cliente ativo:** **Donna FIT** · descoberta concluída (maio/2026)  
**Documentos relacionados:** [`roteiro-reuniao.md`](./roteiro-reuniao.md) · [`descoberta-donna-fit.md`](./descoberta-donna-fit.md) · [`proposta-donna-fit.md`](./proposta-donna-fit.md)

---

## Sumário

1. [Contexto do cliente](#1-contexto-do-cliente)
1b. [Donna FIT — dados confirmados](#1b-donna-fit--dados-confirmados-na-reunião)
2. [Ferramenta de referência — Dossiê do Cliente](#2-ferramenta-de-referência--dossiê-do-cliente)
3. [Benchmark — Anota Aí](#3-benchmark--anota-aí)
4. [Roteiro da reunião](#4-roteiro-da-reunião)
5. [Módulos do sistema (checklist de escopo)](#5-módulos-do-sistema-checklist-de-escopo)
6. [Perguntas que transmitem profissionalismo](#6-perguntas-que-transmitem-profissionalismo)
7. [O que preencher no dossiê hoje](#7-o que-preencher-no-dossiê-hoje)
8. [Precificação — cenário tradicional vs cenário atual (2026)](#8-precificação--cenário-tradicional-vs-cenário-atual-2026)
9. [Modelo de proposta pós-reunião](#9-modelo-de-proposta-pós-reunião)
10. [Notas técnicas](#10-notas-técnicas)

---

## 1. Contexto do cliente

| Indicador | Estimativa |
|-----------|------------|
| Segmento | Alimentício — marmitas fitness |
| Volume | ~2.000 unidades/semana |
| Média diária | ~285/dia (7 dias) ou ~400/dia (5 dias úteis) |
| Perfil operacional | Produção em lote + assinatura/rotina (não restaurante à la carte) |

### Necessidade declarada

Sistema completo de gestão com:

- Pedidos
- Financeiro
- Compras e recebimento de mercadorias
- Dashboard operacional e gerencial

Referência de mercado: **Anota Aí** (app conhecido no setor de delivery/restaurante).

### Dores típicas nesse porte

- Pedidos espalhados (WhatsApp, planilha, anotações)
- Produção sem visão consolidada do dia
- Compra desalinhada com o cardápio da semana
- Financeiro atrasado ou paralelo ao operacional
- Ausência de dashboard (CMV, margem, volume, inadimplência)

### Quando faz sentido sistema customizado vs SaaS

| Critério | Anota Aí (SaaS) | Sistema customizado |
|----------|-----------------|---------------------|
| Prazo para operar | Dias / semanas | Semanas / poucos meses |
| Custo recorrente | Baixo (~R$ 220–330/mês) | Manutenção mensal moderada |
| Fluxo | Delivery/restaurante genérico | Assinatura semanal, rotas, lote, fichas técnicas |
| Adequação | Boa se aceitarem adaptar processo | Ideal se o processo da marmita for o diferencial |

Com ~2.000 marmitas/semana, o volume **justifica investimento em software** — desde que elimine horas de planilha, erro de produção e desperdício de compra.

### Necessidades específicas de marmita fitness (levantar na reunião)

- Planos semanais / assinatura recorrente
- Cardápio rotativo por dia da semana
- Produção em lote (lista do dia, etiquetas)
- Rotas de entrega ou retirada
- Ficha técnica / BOM por refeição
- Controle de validade e sobra
- CMV e margem por marmita ou por plano

---

## 1b. Donna FIT — dados confirmados na reunião

> Substituem estimativas genéricas da seção 1 para o cliente ativo.

| Indicador | Confirmado |
|-----------|------------|
| Empresa | **Donna FIT** |
| Decisores | **Everson** (gestão, entrega, compras, financeiro) · **Patricia** (cozinha, pedidos, atendimento, compras, financeiro, marketing) |
| Volume | **~2.000 marmitas/semana** — operação **no limite**; meta: **aumentar pedidos** e **expandir** (mais funcionários na cozinha) |
| Canal de pedido | **Somente WhatsApp** |
| Modelo de venda | **Combos, avulso, pacote** — **assinatura mensal não compensa** |
| Cardápio | **~40 tipos** (fixos + novidades ocasionais) |
| Produção / entrega | **D+1**; entrega **própria** (motorista contratado) + **retirada na loja** |
| Roteirização | **Smart Routing (Fase 2)** — ordenação automática sem digitação manual |
| Estoque | **Combo** (produzido) + **avulso** (diário). Baixa automática no pedido + tela de ajuste manual rápido devido à produção flutuante por panelas. |
| Pagamentos | PIX antes (WhatsApp) + na entrega (débito, crédito, VA, VR) — **ambos mantidos** |
| Sistema Atual | **Olimpio ERP** (digitação manual de pedidos → emissão de NF → cupom em impressora USB) |
| Financeiro hoje | Controle simplificado via maquininhas + Olimpio ERP; desejam financeiro completo na Fase 2 |
| Anota Aí | **Testaram** — insatisfação com **sistema e suporte** |
| Usuários / devices | **~4 pessoas**; tablet/celular (cozinha) + PC (loja/recepção) |
| Infraestrutura | Contas novas prontas: **Supabase**, **Vercel**, **Registro.br**, **Asaas**, **Resend**, **GitHub**, **Cloudflare** |
| Integração fase 1 | **WhatsApp** |

### Dores confirmadas (ordem)

1. **Atendimento e pedidos** — WhatsApp trava; fluxo simples; duplicidade/quantidade errada  
2. **Gerenciamento de estoque** — automático, organizado, atualização no pedido com ajuste para contagem física flutuante  
3. **Organização da cozinha** — fluxo na segunda-feira + dashboard pós-produção  

### Escopo acordado por fase

| Fase | Módulos |
|------|---------|
| **1 — Agora** | Pedidos, cardápio, estoque combo/avulso com ajuste de freezer, produção D+1, dashboard cozinha, WhatsApp, usuários, infraestrutura Supabase/Vercel |
| **2** | Fichas técnicas, compras inteligentes, financeiro completo, expedição com **Roteirização Inteligente**, integração/avaliação do Olimpio ERP para NFs |
| **3** | Dashboard gerencial (CMV, margem), integrações adicionais de pagamentos, suporte à escala de expansão |
| **Fora** | Assinatura mensal, app nativo (fase 1) |

### Pendências

- [ ] Ticket médio (combo / avulso / pacote)  
- [ ] Emissão de NF pela Donna FIT vs comprovante do cliente  
- [ ] Dias de pico na semana  
- [ ] Faturamento mensal e CMV  

---

## 2. Ferramenta de referência — Dossiê do Cliente

**URL:** https://organizador-contexto.lovable.app/  
**Título:** Dossiê do Cliente — Digital Architect

### Aparência e UX

- Layout editorial, fundo claro (bege/cinza), tipografia forte
- Visual de consultoria executiva — organizado, espaçamento generoso
- Barra superior: logo "DOSSIÊ", breadcrumb (`/ CLIENTE`), status `SINCRONIZADO`
- Indicadores à direita: **% de preenchimento** e **número de seções (09)**
- Navegação por abas numeradas em grid (duas linhas)
- Botões de ação: **Salvar**, **Exportar HTML**, **Exportar PDF**

### Estrutura — 9 abas

| # | Aba | Campos / conteúdo |
|---|-----|-------------------|
| 01 | **Presença Digital** | Instagram, site, Google Meu Negócio, endereço, grupo WhatsApp, pasta Google Drive |
| 02 | **Marca** | Descrição, valores, diferenciais, produtos e serviços |
| 03 | **Comunicação** | Tom de voz, público-alvo (demografia, dores, jornada) |
| 04 | **Mercado** | Concorrentes (links/observações), informações relevantes (histórico, sazonalidade) |
| 05 | **Contatos** | Nome, cargo, WhatsApp, telefone, e-mail |
| 06 | **Comercial** | Valor mensal (R$), início do projeto |
| 07 | **Arquivos** | Upload (.txt, .docx, .pdf, .vtt), materiais de marca, roteiros de referência |
| 08 | **Branding** | Paleta de cores (nome + hex), logos (PNG, SVG, AI…) |
| 09 | **Metas** | CPA alvo, ROAS mínimo, ticket médio, taxa de conversão, taxa por hora |

### Como usar neste projeto

O dossiê serve para **descoberta e relacionamento** na reunião de hoje — **não** é o ERP em si.

- Preencher durante/após a reunião
- Exportar PDF para arquivo do cliente
- Alimentar escopo e proposta comercial

**Sugestão:** criar mentalmente uma aba extra **"Operação"** (volume/dia, dias de produção, canais, integrações) — anotar à mão ou em documento separado até adaptar a ferramenta.

---

## 3. Benchmark — Anota Aí

**Site:** https://anota.ai/home/

### Posicionamento

"Sistema completo para restaurantes" — delivery, salão e balcão. +50 mil estabelecimentos.

### Funcionalidades principais

- Robô de atendimento (WhatsApp, Facebook, Instagram) com IA
- Cardápio digital
- Painel de pedidos centralizado (iFood, WhatsApp, Instagram)
- PDV / pedidos em balcão
- QR Code para mesas
- App para garçom / comanda digital
- Gestão: estoque, caixa, emissão NFC-e
- Pagamento online (PIX, cartão, carteiras digitais)
- Marketing e integração com anúncios

### Planos (referência — site, maio/2026)

| Plano | Preço mensal* | Perfil |
|-------|---------------|--------|
| Start | R$ 219,99 | Gestão de pedidos e atendimento |
| Advanced | R$ 254,99 | Gestão mais completa |
| Premium | R$ 329,99 | Atendimento + fidelização |

\* Valores exibidos no site; sujeitos a alteração e condições comerciais.

- **Sem taxa por pedido** no plano mensal
- Teste grátis ~7 dias, sem cartão
- Custo anual aproximado: **R$ 2.600 – R$ 4.000**

### Limitações para marmita fitness em escala

- Fluxo pensado para pedido avulso / delivery, não necessariamente **plano semanal fixo**
- Produção em lote e fichas técnicas podem exigir adaptação ou não existir nativamente
- Rotas e logística de assinatura podem ficar em planilha paralela

---

## 4. Roteiro da reunião

> **Donna FIT:** roteiro executado e respostas preenchidas em [`roteiro-reuniao.md`](./roteiro-reuniao.md).

**Duração sugerida:** 60–90 minutos

### Abertura (5 min)

- Objetivo: entender a operação atual e o que significa "sistema completo" para eles
- Deixar claro: hoje é **descoberta**; proposta formal vem depois com escopo fechado

### Bloco A — Operação e pedidos (20 min)

1. Como o cliente pede hoje? (WhatsApp, site, app, balcão, assinatura fixa?)
2. Pedido é **avulso** ou **plano semanal/mensal**?
3. Quantos cardápios por semana? Há variação de proteína/acompanhamento?
4. Quem confirma pagamento antes da produção?
5. Entrega própria, motoboy terceirizado ou só retirada?
6. Quais dias concentram volume (picos)?

### Bloco B — Produção e estoque (15 min)

7. Produção é D-1 ou no mesmo dia?
8. Existe ficha técnica (gramagem por marmita)?
9. Como controlam validade e sobra?
10. Quantos SKUs de insumo? Compra diária ou semanal?

### Bloco C — Financeiro e compras (15 min)

11. Emitem NF? (NFC-e, NF-e B2B?)
12. Formas de pagamento: PIX, cartão, recorrência?
13. Fluxo de compras: quem aprova? Pedido de compra vs nota de entrada?
14. Precisam de fluxo de caixa, DRE, contas a pagar/receber?

### Bloco D — Tecnologia e expectativas (10 min)

15. Já usaram Anota Aí ou similar? O que faltou?
16. Quantos usuários? (cozinha, expedição, admin, financeiro)
17. App mobile obrigatório ou web responsivo basta?
18. Integrações obrigatórias: WhatsApp, iFood, gateway de pagamento, contador?

### Fechamento (5 min)

- Resumir as 3 maiores dores em voz alta
- Combinar envio de proposta (MVP + completo) em X dias úteis
- Definir quem é o **dono do projeto** do lado do cliente

---

## 5. Módulos do sistema (checklist de escopo)

Usar na reunião — marcar **Must** / **Fase 2** / **Não precisa**:

```
[ ] Pedidos (B2C assinatura + avulso)
[ ] Cardápio / planos semanais
[ ] Produção do dia (lista por lote, etiquetas)
[ ] Expedição / rotas de entrega
[ ] Estoque e insumos
[ ] Compras (sugestão → pedido → recebimento)
[ ] Financeiro (caixa, AP/AR, conciliação)
[ ] Dashboard (volume, CMV, margem, inadimplência)
[ ] Emissão de nota fiscal
[ ] Integração WhatsApp
[ ] Integração pagamentos (PIX, cartão)
[ ] Multi-unidade / franquia
[ ] App mobile nativo
```

**Donna FIT — resultado:**

```
[Must]  Pedidos (combo + avulso + pacote)
[Must]  Cardápio (~40 marmitas)
[Não]   Assinatura mensal recorrente
[Must]  Produção do dia (D+1) + dashboard cozinha
[Fase2] Expedição / rotas (motorista próprio)
[Must]  Estoque combo (produzido) + avulso (diário)
[Fase2] Compras inteligentes + recebimento (nota na entrega)
[Fase2] Financeiro completo
[Fase2] Dashboard gerencial (CMV, margem)
[Fase2] Emissão nota fiscal (confirmar escopo)
[Must]  Integração WhatsApp
[Fase2] Pagamentos no sistema (maquininha/PIX continuam fora na Fase 1)
[Fase2] Multi-unidade / expansão
[Não]   App mobile nativo (web tablet + PC)
```

---

## 6. Perguntas que transmitem profissionalismo

1. *"Se amanhã o sistema sumisse, qual processo quebraria primeiro?"*
2. *"Qual erro hoje mais custa dinheiro: pedido errado, compra a mais ou falta de insumo?"*
3. *"O que vocês precisam ver no dashboard toda segunda-feira?"*
4. *"Preferem um SaaS pronto em poucas semanas ou um sistema sob medida com o fluxo exato da marmita?"*
5. *"Quem será o responsável interno por alimentar e validar o sistema?"*

---

## 7. O que preencher no dossiê hoje

| Aba | O que anotar para este cliente |
|-----|-------------------------------|
| 02 Marca | **Donna FIT** — marmitas fitness; ~40 itens; combos/avulso/pacote; meta: crescer volume |
| 04 Mercado | Testaram **Anota Aí** (não adequou); canal **só WhatsApp** |
| 05 Contatos | **Everson** (gestão, entrega, compras, financeiro) · **Patricia** (cozinha, pedidos, marketing) |
| 06 Comercial | Preencher na proposta: Fase 1 **R$ 22–28k** · Fases 1+2 **R$ 38–48k** |
| 09 Metas | Meta: **>2.000 marmitas/semana**; CMV a definir (fichas técnicas na Fase 2) |
| Extra Operação | ~2.000/sem; D+1; estoque no pedido; combo vs avulso; 4 usuários; tablet + PC |

> Detalhamento completo: `descoberta-donna-fit.md`

---

## 8. Precificação — cenário tradicional vs cenário atual (2026)

### Por que os valores "de agência" caíram

Hoje é mais rápido e barato **construir** com:

- Stacks prontas (Supabase, Next.js, Lovable, Cursor, templates)
- Componentes UI (shadcn, etc.)
- IA acelerando CRUD, telas e integrações simples

Isso **não significa** que o projeto vale zero — significa que você compete menos em "horas de digitação" e mais em:

- Entender a operação do cliente
- Arquitetar o fluxo certo (marmita ≠ restaurante)
- Entregar algo que **funciona na cozinha** no dia a dia
- Suporte, correção, hospedagem e evolução

**Regra prática:** cobrar pelo **valor para o negócio** e pelo **pacote entregue**, não só por hora de código.

---

### Comparativo de mercado (referência)

| Opção | Investimento | Observação |
|-------|--------------|------------|
| Anota Aí | ~R$ 2.600 – 4.000/ano | Rápido, genérico |
| Agência tradicional (2020–2024) | R$ 90k – 180k | Escopo completo, prazo longo |
| **Desenvolvimento enxuto com IA (2026)** | **R$ 25k – 70k** | Realista para freelancer/small studio |
| SaaS + customizações pontuais | R$ 5k – 20k | Se aceitarem adaptar ao Anota Aí |

---

### Faixas sugeridas para VOCÊ cobrar (realista 2026)

Considerando que você entrega com stack moderna + IA, sem custo de agência grande:

#### Opção A — MVP operacional (recomendado para começar)

**O quê:** pedidos + cardápio/planos + painel produção do dia + usuários básicos + dashboard simples

| Item | Faixa |
|------|-------|
| Projeto | **R$ 18.000 – 35.000** |
| Prazo | 4–8 semanas |
| Manutenção | R$ 800 – 2.000/mês |

#### Opção B — Gestão completa (pedidos + compras + financeiro básico + dashboard)

| Item | Faixa |
|------|-------|
| Projeto | **R$ 35.000 – 55.000** |
| Prazo | 8–14 semanas |
| Manutenção | R$ 1.500 – 3.500/mês |

#### Opção C — Paridade forte com Anota Aí + custom marmita (integrações, fiscal, app)

| Item | Faixa |
|------|-------|
| Projeto | **R$ 55.000 – 85.000** |
| Prazo | 12–20 semanas |
| Manutenção | R$ 2.500 – 5.000/mês |

---

### O que falar na reunião (âncora honesta)

> *"Com as ferramentas de hoje dá para entregar bem mais rápido do que há alguns anos. Para o tamanho da operação de vocês, um sistema sob medida na primeira fase costuma ficar na faixa de **R$ 20 mil a R$ 35 mil** para colocar pedidos e produção rodando; o pacote completo com financeiro e compras fica mais na faixa de **R$ 40 mil a R$ 55 mil**, em etapas. Isso ainda é um investimento maior que um Anota Aí mensal, mas vocês ganham o fluxo exato da marmita — e em escala de 2 mil unidades/semana isso costuma se pagar em organização e menos desperdício."*

Não feche valor fixo na primeira reunião sem escopo fechado.

---

### Modelo de fases (vendável e seguro para você)

| Fase | Entrega | Faixa 2026 |
|------|---------|------------|
| **1 — Operação** | Pedidos, planos, produção do dia, login/equipe | R$ 18k – 30k |
| **2 — Gestão** | Compras, recebimento, estoque, financeiro básico | R$ 12k – 22k |
| **3 — Escala** | Dashboard avançado, integrações, fiscal, refinamentos | R$ 8k – 18k |

**Pagamento sugerido:** 40% início · 30% entrega fase 1 · 30% restante por marcos

**Manutenção:** incluir hospedagem + correções; evoluir features grandes à parte

---

### Quando NÃO subprecificar

- Cliente exige NFC-e, multi-unidade, app nativo iOS/Android desde o dia 1
- Integração WhatsApp oficial (API Meta) com custo e burocracia
- Migração de dados históricos complexa
- SLA 24/7 ou treinamento presencial de equipe grande

Nesses casos, subir para a **Opção C** ou cobrar aditivos por escopo.

---

### Cálculo interno rápido (planilha mental)

| Módulo | Horas estimadas (com IA) |
|--------|--------------------------|
| Discovery + UX leve | 15–25 h |
| Auth + usuários + permissões | 8–15 h |
| Pedidos + cardápio/planos | 25–45 h |
| Produção do dia | 15–30 h |
| Dashboard básico | 10–20 h |
| Compras + recebimento | 20–35 h |
| Financeiro básico | 20–35 h |
| Deploy + testes + treinamento | 15–25 h |

**Total MVP (fase 1):** ~80–130 h  
**Total completo (fases 1+2):** ~140–220 h

Com **R$ 150–250/h efetiva** (valor justo para dev experiente usando IA):  
→ MVP **R$ 12k – 32k** · Completo **R$ 21k – 55k**

Arredonde para cima no orçamento comercial (+ margem de risco e reuniões).

---

## 9. Modelo de proposta pós-reunião

Enviar em até 3–5 dias úteis:

1. **Resumo executivo** — 3 dores + 3 resultados esperados  
2. **Escopo por fase** — tabela Must / Fase 2  
3. **Duas opções de investimento** — MVP (Fase 1) vs Pacote 1+2  
4. **Comparativo** — Anota Aí (~R$ 300/mês) vs custom (investimento único + manutenção)  
5. **Prazo e marcos** — datas realistas  
6. **O que NÃO está incluso** — fiscal avançado, app nativo, integrações não listadas  
7. **Próximo passo** — assinatura + kickoff

---

## 10. Notas técnicas

- Análise da ferramenta de referência feita via inspeção do app em maio/2026
- Preços Anota Aí: conferir no site antes de citar na proposta final
- Firecrawl: para automação futura de pesquisa web, rodar `firecrawl login --browser`
- Reunião **Donna FIT** realizada — maio/2026; registro abaixo sincronizado com `roteiro-reuniao.md`
- Proposta: `proposta-donna-fit.md`

---

## Registro pós-reunião

**Cliente:** Donna FIT · **Status:** descoberta concluída · **Proposta:** pendente de envio (alvo: hoje ou fim de semana)

| Campo | Resposta |
|-------|----------|
| Nome / empresa | **Donna FIT** |
| Decisor | **Everson** (gestão, entrega, compras, financeiro) · **Patricia** (cozinha, pedidos, atendimento, marketing) |
| Volume confirmado/semana | **~2.000 marmitas/semana** (no limite; querem expandir) |
| Canais de pedido hoje | **Somente WhatsApp** |
| Maior dor #1 | **Atendimento e pedidos** (WhatsApp trava; fluxo elegante; duplicidade/quantidade) |
| Maior dor #2 | **Gerenciamento de estoque** (automático; baixa no pedido; combo + avulso) |
| Maior dor #3 | **Organização da cozinha** (fluxo segunda-feira + dashboard pós-produção) |
| Já usou Anota Aí? | **Sim** — feedback: **sistema e suporte** não atenderam (principal queixa) |
| Must have (módulos) | Pedidos (combo/avulso/pacote), cardápio (~40), estoque automático, produção D+1, dashboard cozinha, integração WhatsApp, ~4 usuários, tablet + PC |
| Fase 2 | Fichas técnicas, compras inteligentes, financeiro completo (gastos, faturamento, equipe, insumos), expedição/rotas, NF |
| Orçamento mental do cliente | **Investimento elevado** aceito; preferem **etapas** (pagamento + implementação) |
| Prazo desejado | **Próximo mês** possível para Fase 1 **se fecharem** proposta |
| Proposta enviada em | *Pendente* |
| Valor proposto (MVP / completo) | Fase 1: **R$ 22.000 – 28.000** · Fases 1+2: **R$ 38.000 – 48.000** (ver `proposta-donna-fit.md`) |

### Materiais recebidos / disponíveis

| Material | Status |
|----------|--------|
| Cardápio | **Sim** — temos acesso |
| Planilha de pedidos | *Não recebido* |
| Ficha técnica | **A criar** (Fase 2) |
| Prints WhatsApp | *Não recebido* |
| Fotos de estoque | **Não** — sem gestão hoje |

### Próximos passos

- [ ] Enviar `proposta-donna-fit.md` (hoje ou fim de semana)  
- [ ] Confirmar emissão de NF vs comprovante do cliente  
- [ ] Call 30 min pós-proposta (opcional)  
- [ ] Kickoff Fase 1 se fechar  

---

*Briefing gerado para apoio à reunião comercial e definição de escopo — projeto Dossiê do Cliente. Última atualização: Donna FIT · maio/2026.*
