# Detalhamento Técnico — Fase 1: MVP Operacional

**Objetivo:** Organizar o fluxo de entrada de pedidos e a rotina da cozinha, eliminando a dependência do WhatsApp como ferramenta de gestão.

---

## 1. Módulo: Cardápio Digital (Experiência do Cliente)
Este será o portal de entrada dos pedidos. Focado em simplicidade e velocidade.

*   **Página Inicial de Produtos:** Listagem categorizada (Combos, Avulsos, Pacotes).
*   **Gestão de Disponibilidade:** O item desaparece ou fica como "Esgotado" automaticamente quando o estoque acaba.
*   **Carrinho de Compras:** Revisão de itens e cálculo automático de valor.
*   **Checkout Simplificado:** 
    *   Coleta de Nome e Telefone.
    *   Opção de Entrega ou Retirada.
    *   Seleção de Forma de Pagamento (PIX ou Maquininha na Entrega).
*   **Finalização via WhatsApp:** O sistema gera um link que abre o WhatsApp da Donna FIT com o resumo do pedido formatado + ID único.

---

## 2. Módulo: Painel Administrativo (Gestão do Everson)
A central de controle para quem está na recepção/gestão.

*   **Listagem de Pedidos em Tempo Real:** Visualização de todos os pedidos que entraram pelo Cardápio.
*   **Filtros de Status:** Pendente, Em Produção, Pronto, Entregue, Cancelado.
*   **Impressão de Resumo:** Botão para gerar uma "etiqueta/comprovante" simples para grampear na sacola.
*   **Gestão de Catálogo:** Botão rápido para ativar/desativar produtos conforme o freezer.

---

## 3. Módulo: Dashboard da Cozinha (Gestão da Patricia)
Uma visão focada em "o que precisa ser feito agora".

*   **Visão de Produção D+1:** O sistema soma todos os itens dos pedidos confirmados para o dia seguinte.
    *   *Exemplo:* "Total para amanhã: 45 Frangos com Batata, 30 Patinhos com Arroz Integral".
*   **Status de Preparo:** A equipe marca o que já foi embalado, dando baixa no painel de gestão.

---

## 4. Módulo: Estoque de Produtos Acabados
Controle do que já está pronto para venda no freezer.

*   **Contagem e Ajuste de Freezer (Físico):** Uma tela dedicada no painel de administração onde a Patricia ou o Everson podem fazer uma contagem rápida física (inventário manual simples) e inserir as quantidades reais das marmitas disponíveis no freezer. Isso resolve o problema das quantidades variáveis resultantes da produção por panela sem porcionamento rígido prévio.
*   **Inventário de Marmitas (Digital):** O cadastro digital de cada SKU (tipo de marmita) disponível para compra no site, refletindo sempre os ajustes do freezer.
*   **Baixa Automática:** O estoque do freezer é reservado temporariamente no momento que o cliente finaliza o pedido e subtraído definitivamente na confirmação de pagamento.
*   **Alerta de Estoque Baixo:** Aviso visual no painel e indicação no Cardápio Digital quando um item atinge o nível crítico (ex: menos de 10 unidades), induzindo a nova rodada de produção na cozinha.

---

## 5. Infraestrutura e Segurança
*   **Hospedagem em Nuvem:** Acesso de qualquer lugar (PC, Tablet ou Celular).
*   **Autenticação Simples:** Login e senha para os sócios e funcionários.
*   **Banco de Dados Real-time:** Sincronização instantânea entre os dispositivos.

---

### O que esta fase resolve imediatamente?
1.  **Fim das mensagens perdidas:** Nenhum pedido "some" no histórico do WhatsApp.
2.  **Fim da venda sem estoque:** Não há mais o stress de ligar para o cliente avisando que a marmita acabou.
3.  **Fim da contagem manual:** A Patricia sabe exatamente quanto produzir sem precisar somar pedidos no papel.
