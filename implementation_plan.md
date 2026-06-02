# Plano de Implementação Técnica — Donna FIT (Fase 1)

Este documento apresenta o planejamento estratégico e de engenharia detalhado para a execução da **Fase 1 (MVP Operacional — "Recuperando seu Tempo")** do sistema Donna FIT, considerando todas as novas informações operacionais de fluxo, produção e infraestrutura levantadas após a formalização do contrato.

---

## 1. Visão Geral das Novas Premissas Operacionais

A partir do alinhamento pós-fechamento, mapeamos o funcionamento real da operação e estruturamos as soluções correspondentes no sistema:

1. **Fluxo do Olimpio ERP & Notas Fiscais:**
   * *Realidade:* A Donna FIT opera atualmente com o Olimpio ERP. O fluxo consiste em: preencher manualmente o pedido no ERP → emitir nota fiscal → gerar cupom físico em impressora USB → separar o cupom para o entregador.
   * *Solução Fase 1:* Como a emissão fiscal direta não está integrada no MVP (prevista para a Fase 2), estruturaremos um recurso de **"Cópia Rápida de Dados Fiscais"** no Painel Admin. Isso permitirá que o Everson visualize e copie os dados de novos pedidos com um clique para inserção ágil no Olimpio ERP, minimizando o retrabalho manual.

2. **Produção Flutuante por Demandas (Panelas vs. Marmitas):**
   * *Realidade:* A produção de marmitas ocorre de forma coletiva nas panelas, sem um porcionamento estrito anterior na cozinha (os funcionários se servem diretamente das panelas). Isso gera uma quantidade final de marmitas prontas (estoque congelado) variável e imprevisível até o momento do congelamento.
   * *Solução Fase 1:* O controle de estoque não pode depender de estimativas automáticas baseadas em insumos brutos. Implementaremos uma ferramenta de **"Contagem Rápida de Freezer (Ajuste Físico)"** no Painel Admin, onde a Patricia ou o Everson podem contar rapidamente as marmitas no freezer físico e atualizar as quantidades disponíveis para o site com poucos cliques. O Cardápio Digital consumirá este inventário real.

3. **Sistema de Rota Inteligente (Smart Routing):**
   * *Realidade:* O entregador atualmente organiza as entregas manualmente avaliando os cupons físicos. Deseja-se um sistema automatizado para otimizar os trajetos de entrega.
   * *Solução Fase 2 (Roadmap):* Mapeado oficialmente no cronograma de expansão como parte da expedição. O sistema ordenará as entregas do dia geograficamente e fornecerá uma interface amigável para o motorista abrir rotas individuais diretamente no Google Maps ou Waze com um toque.

4. **Infraestrutura Pronta (Serviços de Nuvem):**
   * Contas ativas prontas para deploy:
     * **Supabase:** Banco de dados relacional PostgreSQL e autenticação.
     * **Vercel:** Hospedagem da aplicação web (Next.js).
     * **Registro.br:** Gestão do domínio corporativo.
     * **Asaas:** Gateway financeiro (futuro).
     * **Resend:** Disparo de e-mails operacionais e alertas.
     * **GitHub:** Versionamento de código e CI/CD.
     * **Cloudflare:** DNS, SSL, cache e segurança contra ataques.

5. **Troca do QR Code Físico:**
   * Planejamento para a semana de Go-Live (M6) para gerar um novo QR Code direcionando os rótulos impressos nas marmitas para o novo domínio configurado.

---

## 2. Cronograma de Marcos Contratuais (Milestones)

Conforme estabelecido no contrato assinado, o projeto seguirá um fluxo de 6 marcos de entrega:

| Marco / Etapa | O que será desenvolvido e entregue | Prazo Estimado |
| :--- | :--- | :--- |
| **M0: Kickoff** | Assinatura, alinhamento técnico e setup inicial do workspace. | D+0 |
| **M1: Banco de Dados** | Importação de dados do cardápio existente (~40 SKUs) e modelagem de estoque de combos e avulsos no Supabase. | D+7 |
| **M2: Cardápio & Checkout** | Cardápio Digital funcional, carrinho de compras e envio do pedido formatado via WhatsApp. | D+21 |
| **M3: Gestão de Pedidos** | Painel Administrativo do Everson com listagem em tempo real e atualização de status operacionais. | D+35 |
| **M4: Cozinha & Estoque** | Dashboard da cozinha da Patricia (produção D+1) e baixa automática + tela de ajuste manual rápido de freezer. | D+42 |
| **M5: Testes Assistidos** | Implantação piloto e acompanhamento de testes em ambiente de homologação com a equipe. | D+49 |
| **M6: Go-Live & Treino** | Treinamento dos usuários, publicação definitiva sob domínio próprio e início da operação oficial. | D+56 |

---

## 3. Arquitetura Técnica Proposta (Fase 1)

* **Camada de Interface (Front-End):** Next.js 14 (App Router) com Tailwind CSS e componentes acessíveis Shadcn UI. Totalmente responsivo para Tablet (cozinha) e Desktop (recepção).
* **Banco de Dados & Auth (Back-End):** Supabase PostgreSQL rodando em tempo real (Websockets) para sincronização instantânea de novos pedidos entre recepção e cozinha.
* **Segurança:** RLS (Row Level Security) configurado para garantir que dados de administração e produção só sejam acessíveis por usuários autenticados da equipe.
* **DNS & CDN:** Cloudflare intermediando o tráfego do domínio Registro.br para a Vercel, otimizando o carregamento de imagens de marmitas e garantindo criptografia SSL.

---

## 4. Alinhamento de Próximos Passos (Kickoff)

Quando a execução for iniciada, as atividades preliminares serão:
1. Conectar ao repositório **GitHub** da Donna FIT.
2. Provisionar o projeto **Supabase** e aplicar os esquemas iniciais de tabelas de produtos, estoque e pedidos.
3. Configurar os ambientes de desenvolvimento e homologação na **Vercel** sob proxy da **Cloudflare**.
4. Importar o catálogo de ~40 marmitas ativas da Donna FIT com os preços descritos na Identidade Visual.
