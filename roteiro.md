# Roteiro da reunião — Marmitas Fitness

**Duração:** 60–90 min  
**Objetivo:** descoberta (não fechar preço nem escopo na hora). Proposta formal depois, com escopo fechado.

> Baseado no [briefing.md](./briefing.md). Documento para conduzir a reunião de descoberta, escopo e orçamento.

---

## Antes de entrar (2 min)

- Abra o [Dossiê do Cliente](https://organizador-contexto.lovable.app/) em uma aba (para anotar ao vivo).
- Tenha o checklist de módulos (seção abaixo) em papel ou segunda tela.
- Não prometa valor fixo hoje — só faixas se perguntarem, e sempre com “depende do escopo”.

---

## 1. Abertura (5 min)

**O que dizer:**

> “Obrigado pelo tempo. O objetivo de hoje é entender como vocês operam hoje — pedidos, produção, compras e financeiro — e o que vocês chamam de ‘sistema completo’. Não é reunião para fechar contrato: é descoberta. Depois eu monto uma proposta com MVP e pacote completo, em X dias úteis. No final, quero sair com as três maiores dores de vocês e quem será o dono do projeto aí dentro.”

**Perguntas rápidas de aquecimento:**

- “Me conta em uma frase: o que vocês fazem e para quem?”
- “Quantas marmitas por semana vocês produzem hoje? (confirmar se ~2.000 bate)”

**Transição:**

> “Vou seguir na ordem: pedidos → produção → financeiro/compras → tecnologia. Se algo não fizer sentido para vocês, me interrompe.”

---

## 2. Bloco A — Operação e pedidos (20 min)

**Contexto (opcional, 1 frase):**

> “Com o volume de vocês, pedido espalhado costuma virar erro de produção e retrabalho. Quero mapear o caminho do pedido até a marmita sair.”

| # | Pergunta | Por que perguntar |
|---|----------|-------------------|
| 1 | Como o cliente pede hoje? WhatsApp, site, app, balcão, planilha? | Canais e integrações |
| 2 | É pedido avulso ou plano semanal/mensal fixo? | Define se é “restaurante” ou assinatura |
| 3 | Quantos cardápios por semana? Varia proteína/acompanhamento por dia? | Cardápio rotativo |
| 4 | Quem confirma pagamento antes de ir para produção? | Regra de negócio crítica |
| 5 | Entrega própria, motoboy terceirizado ou só retirada? | Módulo expedição/rotas |
| 6 | Quais dias concentram volume? Tem pico? | Capacidade e dashboard |

**Perguntas de aprofundamento (use 2–3 conforme a resposta):**

- “O cliente escolhe o dia da semana ou vocês montam o pacote?”
- “Tem pausa/cancelamento de assinatura? Como controlam?”
- “Já aconteceu pedido duplicado ou marmita errada por falha de comunicação?”

**Anotar no dossiê:** aba extra **Operação** — canais, volume/dia, dias de pico.

**Transição:**

> “Entendi o fluxo de pedido. Agora quero ver como isso vira lista de produção na cozinha.”

---

## 3. Bloco B — Produção e estoque (15 min)

| # | Pergunta | Por que perguntar |
|---|----------|-------------------|
| 7 | Produção é D-1 ou no mesmo dia? | Agenda e painel “produção do dia” |
| 8 | Existe ficha técnica (gramagem por marmita)? Onde está? | BOM / CMV |
| 9 | Como controlam validade e sobra? | Perda e relatórios |
| 10 | Quantos SKUs de insumo? Compra diária ou semanal? | Estoque e compras |

**Perguntas extras (profissionalismo):**

- *“Se amanhã o sistema sumisse, qual processo quebraria primeiro?”*
- *“Qual erro hoje mais custa dinheiro: pedido errado, compra a mais ou falta de insumo?”*

**Anotar:** produção D-0/D-1, ficha técnica sim/não, controle de sobra.

**Transição:**

> “Produção clara. Agora o dinheiro e a compra de insumo.”

---

## 4. Bloco C — Financeiro e compras (15 min)

| # | Pergunta | Por que perguntar |
|---|----------|-------------------|
| 11 | Emitem NF? NFC-e, NF-e B2B? | Módulo fiscal |
| 12 | PIX, cartão, recorrência? Quem cobra inadimplência? | Pagamentos e AR |
| 13 | Fluxo de compras: quem aprova? Pedido de compra vs nota de entrada? | Módulo compras |
| 14 | Precisam de fluxo de caixa, DRE, contas a pagar/receber? | Escopo financeiro |

**Pergunta estratégica:**

- *“O que vocês precisam ver no dashboard toda segunda-feira?”* (volume, CMV, margem, inadimplência)

**Anotar na aba 09 Metas (adaptado):** meta marmitas/semana, CMV alvo %, ticket por plano.

**Transição:**

> “Por último: o que vocês já tentaram de sistema e o que é obrigatório na solução.”

---

## 5. Bloco D — Tecnologia e expectativas (10 min)

| # | Pergunta | Por que perguntar |
|---|----------|-------------------|
| 15 | Já usaram Anota Aí ou similar? O que faltou ou irritou? | Benchmark e posicionamento |
| 16 | Quantos usuários? (cozinha, expedição, admin, financeiro) | Permissões |
| 17 | App mobile nativo obrigatório ou web no celular resolve? | Escopo e prazo |
| 18 | Integrações obrigatórias: WhatsApp, iFood, gateway, contador? | Fase 2 vs Must |

**Pergunta decisiva (use com calma):**

- *“Preferem um SaaS pronto em poucas semanas ou um sistema sob medida com o fluxo exato da marmita?”*

Se citarem Anota Aí, você pode resumir (sem atacar):

> “O Anota Aí é forte para delivery/restaurante, plano na faixa de ~R$ 220–330/mês, sem taxa por pedido. Para marmita em escala, o que costuma faltar é plano semanal fixo, produção em lote e ficha técnica — por isso muitos clientes no seu porte avaliam custom ou híbrido.”

**Pergunta de governança:**

- *“Quem será o responsável interno por alimentar e validar o sistema?”*

**Anotar:** abas 04 Mercado (concorrentes, Anota Aí), 05 Contatos (decisor + operação).

---

## 6. Checklist de escopo (10 min) — conduzir junto

Mostre a lista e peça para marcarem **Must / Fase 2 / Não precisa**:

```
[ ] Pedidos (assinatura + avulso)
[ ] Cardápio / planos semanais
[ ] Produção do dia (lista, etiquetas)
[ ] Expedição / rotas
[ ] Estoque e insumos
[ ] Compras (sugestão → pedido → recebimento)
[ ] Financeiro (caixa, AP/AR)
[ ] Dashboard (volume, CMV, margem, inadimplência)
[ ] Nota fiscal
[ ] WhatsApp
[ ] Pagamentos (PIX, cartão)
[ ] Multi-unidade / franquia
[ ] App mobile nativo
```

**O que dizer:**

> “Isso vira o escopo da proposta. Tudo que for Must entra na primeira fase ou no pacote que vocês priorizarem; o resto fica Fase 2 com prazo e investimento separados.”

---

## 7. Investimento — só se perguntarem (5 min, opcional)

**Não feche valor fixo.** Use âncora honesta:

> “Com as ferramentas de hoje dá para entregar mais rápido que há alguns anos. Para a operação de vocês, a primeira fase — pedidos e produção rodando — costuma ficar na faixa de **R$ 20 mil a R$ 35 mil**. O pacote com compras e financeiro básico fica mais na faixa de **R$ 40 mil a R$ 55 mil**, em etapas. É mais que um Anota Aí mensal, mas vocês ganham o fluxo exato da marmita; em ~2 mil unidades/semana isso costuma se pagar em organização e menos desperdício. O número exato eu mando na proposta depois que fecharmos o Must have.”

**Comparativo rápido (se pedirem “e o Anota Aí?”):**

| | Anota Aí | Custom |
|--|----------|--------|
| Prazo | Dias/semanas | Semanas/poucos meses |
| Custo | ~R$ 2,6k–4k/ano | Investimento + manutenção |
| Adequação | Delivery genérico | Assinatura, lote, fichas |

---

## 8. Fechamento (5 min)

**Resumir em voz alta:**

> “Deixa eu repetir o que entendi: a dor número 1 é [___], a 2 é [___], a 3 é [___]. O Must have de vocês é [___]. O dono do projeto aí é [nome].”

**Combinar próximos passos:**

> “Vou enviar proposta em [3–5] dias úteis com: resumo das dores, escopo por fase (MVP vs completo), duas opções de investimento, prazo e o que não está incluso. Vocês revisam e marcamos um call de 30 min para dúvidas.”

**Pedir materiais (se fizer sentido):**

- Cardápio da semana, planilha de pedidos, exemplo de ficha técnica
- Acesso ou prints do fluxo atual (WhatsApp, planilha)

**Despedida:**

> “Alguma coisa importante que não perguntei?”

---

## Frases prontas para situações comuns

| Situação | O que dizer |
|----------|-------------|
| Cliente quer tudo no dia 1 | “Dá para desenhar tudo, mas recomendo fase 1 operação e fase 2 gestão — assim vocês usam em 4–8 semanas e o resto não atrasa o que mais dói.” |
| “Quanto custa?” no minuto 5 | “Prefiro fechar escopo em 40 min e te mando faixa certa; senão chuto alto ou baixo e ninguém ganha.” |
| Só querem o mais barato | “O Anota Aí pode resolver parte; se o diferencial é plano semanal e produção em lote, o custom se paga em escala — na proposta coloco as duas opções lado a lado.” |
| Pedem app nativo + fiscal + WhatsApp API | “Tudo possível, mas isso sobe para fase 3 ou aditivo — não entra no MVP sem impactar prazo e investimento.” |

---

## O que preencher no Dossiê durante a reunião

| Aba | Anotar |
|-----|--------|
| 02 Marca | Público, ticket por plano, diferencial |
| 04 Mercado | Concorrentes, Anota Aí / iFood / só WhatsApp |
| 05 Contatos | Decisor, cozinha, compras |
| 06 Comercial | Deixar em branco hoje |
| 09 Metas | Marmitas/semana, CMV alvo, recompra |
| Extra Operação | Volume/dia, dias produção, canais, integrações |

Ao final: **Exportar PDF** do dossiê para arquivo do cliente.

---

## Registro pós-reunião (preencher em 10 min)

| Campo | Resposta |
|-------|----------|
| Nome / empresa | |
| Decisor | |
| Volume/semana confirmado | |
| Canais de pedido | |
| Dor #1 / #2 / #3 | |
| Anota Aí? Feedback | |
| Must have | |
| Fase 2 | |
| Orçamento mental do cliente | |
| Prazo desejado | |
| Proposta enviada em | |

---

## Proposta pós-reunião (lembrete)

Enviar em **3–5 dias úteis**:

1. Resumo — 3 dores + 3 resultados
2. Escopo Must / Fase 2
3. Duas opções — MVP (Fase 1) vs Fases 1+2
4. Comparativo Anota Aí vs custom
5. Prazo e marcos
6. O que **não** está incluso
7. Próximo passo — assinatura + kickoff

---

*Roteiro gerado para apoio à reunião comercial — projeto Dossiê do Cliente.*
