# Descoberta — Donna FIT

> Registro consolidado da reunião / levantamento.  
> **Data do registro:** maio/2026  
> **Proposta alvo:** envio ainda hoje ou neste fim de semana.

---

## 1. Identificação

| Campo | Resposta |
|-------|----------|
| Cliente | **Donna FIT** |
| Segmento | Marmitas fitness |
| Volume atual | **~2.000 marmitas/semana** (operação no limite) |
| Meta | Aumentar pedidos e **expandir operação** (mais funcionários na cozinha) |
| Decisor — Everson | Gestão completa: entrega, compras, financeiro |
| Decisor — Patricia | Cozinha, atendimento, compras, pedidos, financeiro, marketing e redes |
| Usuários do sistema | **~4 pessoas** |
| Dispositivos | **Tablet/celular na cozinha** + **computador na loja/recepção** |

---

## 2. Top 3 dores (prioridade do cliente)

| # | Dor | Detalhe |
|---|-----|---------|
| **1** | **Atendimento / pedidos** | WhatsApp trava; fluxo precisa ser **elegante e simples**; bugs de duplicidade/quantidade (confirmam manualmente no WhatsApp) |
| **2** | **Gerenciamento de estoque** | Sem gestão hoje; precisa ser **automático**, organizado, atualizar **no momento do pedido**; combos (produzidas) vs avulsos (produção diária) |
| **3** | *(implícita)* **Organização da cozinha** | Na segunda-feira querem **fluxo organizado na cozinha** + estoque funcional (não citada como “dor #3” verbalmente, mas é prioridade de dashboard) |

---

## 3. Operação e pedidos

| Campo | Resposta |
|-------|----------|
| Canal de pedido | **Somente WhatsApp** |
| Tipos de venda | **Combos, avulso, pacote** |
| Assinatura mensal | **Não compensa** — fora do escopo |
| Cardápio | **~40 tipos** de marmitas (modelos fixos + novidades ocasionais) |
| Produção / entrega | **D+1** (1 dia de produção); prazo pode variar com volume de pedidos |
| Entrega | **Própria** (motorista contratado) + **retirada na loja** |
| Roteirização atual | **Manual** pelo entregador ao coletar os cupons impressos |
| Gestão de picos | **Não existe** hoje |
| Cancelamento | **Manual** a pedido do cliente; impacto baixo (sobra gira rápido) |
| Materiais disponíveis | **Acesso ao cardápio**; **sem fotos/registro de estoque** (não há gestão) |

---

## 4. Estoque e produção

| Campo | Resposta |
|-------|----------|
| Ficha técnica | **A criar** — organizada, sempre visível e navegável |
| Sobra / validade | Quase não sobra; pedidos saem antes do vencimento |
| SKUs de insumo | **Dezenas** |
| Compras hoje | Patricia compra **de cabeça**, olhando o que resta |
| Compras desejadas | Sistema **inteligente e visual** |
| Regra de estoque | Atualizar **no momento do pedido** pelo cliente |
| Combo | Marmitas **já produzidas** |
| Avulso | Estoque com **produção diária** |
| Pós-produção | **Dashboard da cozinha** para gerenciar após produzir |
| Realidade da Produção | **Por demanda, mas sem controle estrito da quantidade individual produzida**. Como os funcionários se servem diretamente das panelas e não das marmitas individuais, a quantidade final de marmitas disponíveis no freezer é variável. O sistema deve permitir ajustes fáceis de estoque físico no freezer. |

---

## 5. Financeiro e pagamentos

| Campo | Resposta |
|-------|----------|
| Sistema atual | **Olimpio ERP** |
| Emissão de Notas | Pedido preenchido manualmente no Olimpio ERP → Nota Fiscal emitida no sistema antes do cupom → Emissão de cupom fiscal em impressora USB separada → Retirada manual do cupom para entrega |
| Sistema financeiro hoje | Controle via maquininha / PIX + Olimpio ERP |
| Financeiro desejado | **Completo**: gastos, faturamento, equipe, insumos |
| Formas de pagamento | **PIX pelo WhatsApp antes do pedido** + **na entrega** (débito, crédito, vale alimentação, VR etc.) — **ambas devem continuar** |
| Comprovantes | Cupom fiscal gerado pela impressora USB |
| Fluxo de compras | Notas **lançadas no momento da entrega** |

---

## 6. Tecnologia e benchmark

| Campo | Resposta |
|-------|----------|
| Anota Aí | **Testaram** — insatisfação com **sistema e suporte** (principal queixa) |
| Integrações fase 1 | **WhatsApp** |
| App nativo | Não necessário — web em tablet + PC |
| Infraestrutura nova criada | **Supabase**, **Vercel**, **Registro.br**, **Asaas**, **Resend**, **GitHub**, **Cloudflare** |

---

## 7. Expectativas comerciais

| Campo | Resposta |
|-------|----------|
| Prazo | Sem data rígida; **no próximo mês é possível** ter algo rodando **se fecharem proposta** |
| Modelo desejado | **Por etapas** — pagamento do serviço **e** implementação |
| Orçamento | Sabem que é **investimento elevado**; preferem **fases** |
| Proposta | **Fechada e Assinada!** Contrato formalizado em 29/05/2026. |

---

## 8. Escopo sugerido (Must / Fase 2)

### Fase 1 — Operação (Must — prioridade imediata)

- [x] Fluxo de **pedidos** (combo, avulso, pacote) — substituir dependência do WhatsApp como “sistema”
- [x] **Cardápio** (~40 itens)
- [x] **Estoque** automático (combo + avulso) com tela para ajuste e contagem física rápida (freezer) devido à produção flutuante
- [x] **Dashboard cozinha** (fluxo pós-produção, organização segunda-feira)
- [x] **Produção D+1** (lista do dia)
- [x] **Integração WhatsApp** (canal atual)
- [x] Usuários e permissões (~4 pessoas)
- [x] Tablet cozinha + PC recepção (web responsivo)

### Fase 2 — Gestão

- [ ] **Fichas técnicas** completas (criação + navegação)
- [ ] **Compras inteligentes** (sugestão visual a partir do estoque)
- [ ] Lançamento de **notas na entrega**
- [ ] **Financeiro**: gastos, faturamento, equipe, insumos
- [ ] **Expedição** (motorista próprio + retirada) com **Sistema de Rota Inteligente** (ordenação automática das entregas, sem necessidade do motorista digitar ou verificar manualmente a ordem)
- [ ] **Emissão de Notas Fiscais** integrada (avaliação técnica de integração com Olimpio ERP ou emissão direta)

### Fase 3 — Escala

- [ ] Dashboard gerencial avançado (CMV, margem, volume)
- [ ] Integrações adicionais (pagamentos no sistema, contador, etc.)
- [ ] Suporte à **expansão** (mais funcionários, volume acima de 2k/semana)
- [ ] Multi-unidade (se aplicável)

### Fora do escopo (acordado)

- Assinatura mensal recorrente
- App nativo iOS/Android (fase 1)
- Paridade total Anota Aí no dia 1

---

## 9. O que mostrar na proposta

**Segunda-feira (dor do cliente traduzida em entrega):**

1. Tela de **produção do dia** organizada (cozinha)
2. **Estoque funcional** em tempo real (combo + avulso)
3. Fila de **pedidos** clara (menos WhatsApp como “planilha”)

**Comparativo honesto:**

- Anota Aí: rápido e barato mensal, mas **não serviu** (fluxo + suporte)
- Custom por fases: investimento maior, fluxo **exato da Donna FIT**, paga em organização e escala

---

## 10. Pendências para confirmar na proposta ou call rápido

- [x] Emissão de **NF** pela Donna FIT ou só comprovante do cliente? **Confirmado: Emissão de NF via Olimpio ERP no fluxo de pedidos atual.**
- [ ] Ticket médio por combo/avulso/pacote (para metas no dossiê)
- [ ] Dia(s) de pico na semana (ainda não levantado)
- [x] Trocar o QR code da tela da marmita (rótulos físicos) para apontar para o novo site da Donna FIT.

---

*Documento vivo — atualizar após envio da proposta e feedback do cliente.*
