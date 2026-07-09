# Donna FIT — Mapa de Fluxos, Ações e Decisões do Usuário

Catálogo exaustivo de tudo que um usuário (cliente ou equipe) pode fazer dentro do
cardápio (storefront) e do painel administrativo — incluindo caminhos felizes,
caminhos alternativos e situações raras/extremas. Serve como referência de QA,
roteiro de testes manuais e mapa de comportamento real do sistema (não do que
"deveria" acontecer, mas do que o código hoje realmente faz).

Convenção: 🐛 marca um comportamento que é provavelmente um bug ou lacuna real
encontrada no código, não apenas uma situação de uso.

---

## PARTE 1 — CARDÁPIO (storefront)

### 1.1 Chegada ao site / primeira impressão

- Acessa `/` direto (sem parâmetro) → vê catálogo completo.
- Acessa `/?cat=slug` (link de campanha, QR Code impresso, WhatsApp) → catálogo já filtrado na categoria.
- Acessa com uma categoria que não existe mais (`?cat=categoria-removida`) → `resolveId` não encontra, cai em `null`, mostra "Todos" sem avisar que o link estava desatualizado.
- Chega via QR Code (impresso pela aba QR Code do admin) → cai direto na home.
- Chega num horário fora do funcionamento (antes das 10h ou depois das 22h) → nada no storefront acusa isso hoje; só o painel admin mostra "Restaurante Fechado". Cliente pode navegar e finalizar pedido normalmente mesmo com a loja "fechada".
- Anúncio no topo rotaciona a cada 4s automaticamente — usuário não interage, só lê.
- Primeira renderização em conexão lenta: hero com imagem de fundo borrada pode demorar a carregar; produtos aparecem via Server Component (sem skeleton dedicado).

### 1.2 Navegação / descoberta de produtos

- Clica em item do menu superior (Combos/Marmitas/Massas/Sopas) → filtra categoria, rola até a seção de produtos.
- Clica em chip de categoria na barra de filtro → filtra instantaneamente (client-side).
- Clica em "Todos" → remove filtro de categoria.
- Categorias além das 5 visíveis (desktop) ou 2 visíveis (mobile) → abre dropdown "+" com o restante.
- Categoria sem nenhum produto ativo → grid vazio, `EmptyState` com botão "Ver todos os produtos".
- Digita termo na busca da barra de filtro → filtra em tempo real por nome/descrição, desliga o filtro de categoria automaticamente.
- Abre o modal de busca (ícone de lupa no header, só desktop) → digita, aguarda debounce de 280ms → resultados vêm do Supabase (não do array já carregado).
- Busca com menos de 2 caracteres → não dispara consulta nenhuma.
- Busca sem resultado → estado vazio dedicado.
- Navega resultados da busca com teclado (setas + Enter) → seleciona e rola até o produto na página, sem navegar de fato (fecha modal, `scrollIntoView`).
- No mobile, tenta buscar → não há ícone de busca na barra do header; precisa abrir o menu hambúrguer primeiro.
- 🐛 Clica numa categoria pelo header vs. por um chip: hoje ambos são client-side e instantâneos (corrigido nesta sessão); antes disso um caminho fazia round-trip ao servidor e o outro não.

### 1.3 Produto no card / grid

- Passa o mouse sobre o card (desktop) → leve elevação + zoom da imagem.
- Clica no nome/imagem do card → vai para `/produto/[id]`.
- Clica no botão "+" (adicionar) → item entra no carrinho, ícone dá feedback (checkmark dourado por 900ms).
- Produto já no carrinho → card mostra stepper (−/qtd/+) em vez do botão de adicionar.
- Clica "+" repetidamente sem limite → 🐛 nada impede adicionar mais unidades do que existe em estoque; não há checagem de `stock_quantity` no clique.
- Produto esgotado (`stock_quantity<=0` ou inativo) → mostra `StockBadge` "Esgotado" no lugar do botão, card com opacidade reduzida.
- Produto com estoque baixo (`<= min_stock_alert`) → badge "Últimas N".
- Produto é o "Mais Pedido" (`sort_order===1`) → badge dourado, mas isso é ordenação manual do admin, não uma métrica real de vendas.
- Imagem do produto falha ao carregar → `onError` troca para `/marmita.jpg` (fallback genérico).

### 1.4 Página de produto (`/produto/[id]`)

- Acessa produto inativo ou removido → `notFound()`, página 404 padrão do Next.
- Vê badge de categoria sobreposto na imagem (decorativo, não clicável).
- Clica em "Cardápio" no breadcrumb → volta pra home.
- Produto com `description` contendo "ALÉRGICOS:" e um padrão de porção → página separa automaticamente em cards de "Descrição", "Porções" e "Alérgicos".
- Produto sem esse padrão de texto → tudo cai só no card de descrição geral (parser silenciosamente não separa nada). 🐛 Depende de convenção de texto que o admin pode não seguir.
- Estoque entre 1 e 5 unidades → badge vermelho "Últimas N unidades!" ao lado do preço.
- Clica "Adicionar ao carrinho" → pulso de 1.2s "Adicionado!" antes de virar stepper.
- Já tem o produto no carrinho → vê direto o stepper e o valor total daquele item "no carrinho".
- Reduz quantidade até 0 no stepper → item é removido do carrinho por completo (não fica "0 no carrinho").
- Produto esgota enquanto está na tela (outra aba compra o último) → nada atualiza em tempo real; usuário só descobre ao tentar de novo/recarregar.
- 🐛 Nenhum teto de quantidade no stepper — pode adicionar mais unidades do que o estoque real permite.

### 1.5 Carrinho

- Abre carrinho pela barra flutuante inferior (`CartBar`) → abre `CartDrawer` lateral.
- Abre carrinho pelo ícone no header → mesmo drawer.
- Carrinho vazio → `CartBar` fica escondida; drawer mostra estado vazio com botão "Ver Cardápio".
- Ajusta quantidade de um item no drawer → some/atualiza total em tempo real.
- Remove item do drawer → contagem e subtotal recalculam.
- Fecha o drawer sem finalizar → carrinho persiste (localStorage via zustand), sobrevive a reload e a fechar o navegador.
- Reabre o site dias depois com carrinho antigo salvo → 🐛 itens podem estar com preço ou estoque desatualizado; nada revalida antes do checkout.
- Clica "Finalizar Pedido" **sem estar logado** → abre modal de login/cadastro em vez de ir para checkout, guarda intenção (`donna-fit-checkout-intent`) para redirecionar depois do login.
- Clica "Finalizar Pedido" **logado** → vai direto para `/checkout`.
- Clica "Finalizar Pedido" no instante exato em que a sessão ainda está resolvendo (`loading`) → botão simplesmente não faz nada até resolver (corrigido nesta sessão; antes podia pular o login).
- Vê aviso "Pague no PIX e ganhe 5% de desconto" dentro do drawer, antes mesmo de chegar no checkout.
- Carrinho aberto em duas abas simultaneamente → 🐛 nenhuma sincronização em tempo real entre abas; a última a escrever no localStorage "vence".

### 1.6 Autenticação (modal de perfil/login do cliente)

- Abre modal de perfil sem estar logado → vê abas "Entrar"/"Cadastrar".
- **Login**: e-mail ou senha em branco → erro local, sem chamar API.
- **Login**: credenciais erradas, e-mail inexistente ou e-mail não confirmado → sempre a mesma mensagem genérica "E-mail ou senha incorretos." (sem distinguir os casos).
- **Login bem-sucedido** com intenção de checkout pendente → redireciona automaticamente para `/checkout` após 150ms.
- **Login bem-sucedido** sem intenção pendente → mostra tela de perfil.
- **Cadastro**: campo vazio → "Preencha todos os campos."
- **Cadastro**: senha curta (<6) → bloqueado, com medidor de força de senha ao vivo (fraca/boa/forte por tamanho, não por complexidade real).
- **Cadastro**: e-mail já usado → Supabase retorna erro contendo "already"; mapeado para "Este e-mail já está cadastrado." 🐛 depende de string em inglês do Supabase — frágil se a mensagem mudar.
- **Cadastro bem-sucedido** e confirmação de e-mail desativada no projeto → login automático, vai direto pro perfil.
- **Cadastro bem-sucedido** e confirmação de e-mail exigida → mensagem "Verifique seu e-mail", volta pra tela de login sozinho em 3s.
- Nenhum bloqueio de telefone duplicado — só e-mail é único.
- **Esqueci minha senha**: campo vazio → "Digite seu e-mail."
- **Esqueci minha senha**: qualquer outro caso (e-mail existe, não existe, ou a chamada falha por rede) → sempre mostra "E-mail enviado!" — 🐛 o retorno da chamada é ignorado, então falhas reais de rede/envio são invisíveis ao usuário.
- 🐛 Não foi encontrada nenhuma página de destino para o link mágico de redefinição de senha (`/reset-password` ou similar) — o fluxo de "esqueci a senha" pode terminar num link quebrado.
- **Editar perfil**: nome obrigatório; telefone e endereço opcionais.
- **Editar perfil**: envia foto maior que 2MB → bloqueado no cliente antes de tentar o upload.
- **Editar perfil**: upload falha (rede, permissão do bucket) → "Erro ao enviar imagem. Tente novamente."
- **Editar perfil**: salva com sucesso → mensagem de sucesso, volta ao perfil em 1.5s.
- **Logout**: limpa sessão e campos de login; não limpa campos de cadastro/esqueci-senha (pouco relevante na prática, já que a modal reabre do zero).

### 1.7 Histórico de pedidos (dentro do modal de perfil)

- Abre "Meus Pedidos" → lista pedidos anteriores do usuário logado.
- Vê status de um pedido em rota de entrega (`out_for_delivery`) → 🐛 aparece como "Aguardando" na lista, porque esse status não tem entrada própria no mapa de labels do cliente (cai no fallback de `pending`).
- Clica "Pedir novamente" → busca produtos atuais pelos IDs do pedido antigo e reabastece o carrinho com preço/estoque **atuais**, não os do pedido original — cliente não é avisado que o preço pode ter mudado.
- Produto do pedido antigo foi excluído do catálogo → 🐛 aquele item é silenciosamente pulado no "pedir novamente", sem aviso.
- Clica "Remover do histórico" → 🐛 remove só da tela local; não existe chamada à API. Reabrir o modal traz o pedido de volta.

### 1.8 Checkout

- Chega ao checkout com carrinho vazio (ex.: limpou em outra aba) → o formulário ainda carrega, mas o botão de confirmar fica desabilitado (`cartItems.length===0`); a API também rejeitaria com 400 se chegasse a ser chamado.
- **Convidado (não logado)**: campos vêm de um rascunho salvo em `localStorage` (`donna-fit-guest`), se existir.
- **Logado**: campos de nome/telefone/endereço vêm do perfil salvo (`user_metadata`); se já tem endereço salvo, "Entrega" já vem pré-selecionado.
- Digita nome sem sobrenome ou com menos de 4 caracteres → erro "Informe nome e sobrenome (mínimo 4 caracteres)".
- Digita telefone com menos de 10 dígitos → erro "Informe um número válido com DDD"; campo é mascarado automaticamente `(XX) XXXXX-XXXX`.
- Escolhe "Retirada" → sem custo de entrega, campo de endereço nem aparece.
- Escolhe "Entrega" → soma R$15 de frete; endereço vira obrigatório (mín. 10 caracteres).
- Escolhe "PIX" → 5% de desconto aplicado no total, mostra a chave PIX como texto (não copiável com um clique).
- Escolhe "Maquininha" → paga na entrega/retirada, sem desconto.
- Algum item do carrinho tem "arroz" na descrição → ao confirmar, abre modal obrigatório "Tipo de Arroz" (Integral/Branco) para cada item de arroz antes de liberar o botão final.
- Modal de arroz aberto e usuário clica "Voltar ao checkout" → cancela sem enviar o pedido.
- Confirma o pedido → chama a API, que **recalcula tudo no servidor** ignorando o total calculado no cliente.
- 🐛 O preço unitário de cada item, porém, **não** é revalidado contra o banco — o servidor confia no `product.price` que veio no corpo da requisição (preço "congelado" no momento em que o item entrou no carrinho).
- Pedido tem produto do tipo "combo" e o estoque acabou entre a montagem do carrinho e o clique em confirmar → 🐛 a reserva de estoque falha no banco, mas o erro é engolido silenciosamente (`Promise.allSettled` sem checar resultado) — o pedido é criado normalmente mesmo assim, cliente recebe confirmação como se estivesse tudo certo.
- Pedido tem produto do tipo "avulso" → 🐛 estoque nunca é verificado nem debitado no momento da compra, only via ajuste manual no admin — pode vender infinitamente além do estoque real.
- Falha de rede ao enviar (`fetch` falha) → mensagem de erro genérica em caixa vermelha acima do botão, formulário permanece preenchido para nova tentativa.
- Clica em confirmar duas vezes rapidamente → 🐛 sem debounce real além do `loading` visual; nenhuma chave de idempotência é enviada à API — risco de pedido duplicado em conexões instáveis.
- Envio bem-sucedido → abre WhatsApp em nova aba com a mensagem pronta.
- Navegador bloqueia o pop-up do WhatsApp → 🐛 nenhuma detecção/aviso; usuário só percebe que nada abriu.
- Salvamento do resumo do pedido em `localStorage` falha (modo anônimo/privado, cota cheia) → erro é engolido silenciosamente; página de confirmação simplesmente não mostra o resumo.
- Usuário logado → tenta salvar o endereço no perfil automaticamente; se falhar, também é silencioso.
- Depois de enviar → carrinho é limpo e navega para `/confirmacao`.

### 1.9 Confirmação do pedido

- Chega em `/confirmacao?order=ID&wa=link` → mostra número do pedido e um botão para reabrir o WhatsApp manualmente (cobre o caso do pop-up bloqueado).
- Chega em `/confirmacao` sem parâmetros (ex.: recarregou a página, ou voltou pelo histórico do navegador) → tenta recuperar o último pedido salvo em `localStorage`; se não achar, mostra "—" no número do pedido.
- Clica "Fazer novo pedido" → volta pra home.
- Confete e animação de check tocam uma vez no carregamento da página; um recarregamento reinicia a animação, uma navegação client-side (SPA) pode não reiniciar.

---

## PARTE 2 — PAINEL ADMINISTRATIVO

### 2.1 Acesso / login administrativo (`/acessoadmin`)

- Acessa `/admin/*` sem estar logado → middleware redireciona para `/acessoadmin`.
- Acessa `/admin/*` logado, mas sem perfil com cargo `admin`/`kitchen` (ex.: é `staff` ou `customer`) → middleware também redireciona pra `/acessoadmin`, mesmo já autenticado.
- Login com senha errada → "E-mail ou senha incorretos."
- Login com conta válida mas sem função autorizada → autentica, checa o cargo, **desloga de novo automaticamente** e mostra "Essa conta não tem acesso ao painel administrativo."
- Login bem-sucedido com cargo válido → vai para `/admin/pedidos`.
- 🐛 Não existe "esqueci minha senha" nesta tela — um admin que esquece a senha não tem caminho de autoatendimento aqui (diferente do modal do cliente).
- Acessa a URL antiga `/admin/login` (antes do rename desta sessão) → middleware redireciona pra `/acessoadmin` em vez de 404 ou tela morta.
- Acessa `/admin` (raiz, sem subpágina) → redireciona automaticamente para `/admin/pedidos`.

### 2.2 Navegação geral do painel

- Desktop: usa a sidebar lateral (recolhe/expande).
- Mobile: usa a barra inferior fixa (Pedidos/Cozinha/Entrega/Estoque/Manual).
- Mobile: não há acesso direto a Configurações, Anúncios ou QR Code pela barra inferior — só pelo círculo de perfil acima da saudação (adicionado nesta sessão), que abre o mesmo menu popover usado no desktop.
- Clica no círculo de avatar → abre popover com Perfil / Configurações / Anúncios / QR Code / Sair.
- Troca de aba pelo menu → o próprio middleware roda de novo a cada navegação (checa sessão + cargo em toda troca de aba), adicionando uma pequena latência de rede antes mesmo da página carregar seus próprios dados.
- Alterna modo escuro no popover de perfil → aplica/remove classe `dark` no `<html>`.
- Edita nome no popover → agora persiste de verdade em `profiles.full_name` (corrigido nesta sessão); antes só existia em estado local e nunca era salvo.
- Edita foto no popover → 🐛 preview local (`URL.createObjectURL`) apenas; nunca é enviada a lugar nenhum — some ao recarregar a página.
- E-mail mostrado no popover de edição → agora é o e-mail real da conta logada (corrigido nesta sessão); antes era um texto fixo igual para qualquer conta.

### 2.3 Pedidos (`/admin/pedidos`)

- Vê métricas no topo: Pendentes, Em Separação, Liberados, Faturamento do dia.
- Alterna entre visão "Lista" e "Kanban".
- Filtra por aba de status (Pendente/Em preparo/Pronto/Entregue/Todos, com contadores).
- Busca por nome/telefone/número do pedido.
- Avança status de um pedido pelo botão de próximo passo (rótulo muda conforme o tipo de entrega: "Iniciar Separação" → "Liberar Pedido" → "Saiu para Entrega"/"Confirmar Retirada" → "Confirmar Entrega").
- 🐛 A troca de status é feita direto do cliente para o Supabase, sem rota de API e sem validar se o pulo de estado faz sentido (ex.: nada tecnicamente impede pular de "Pendente" direto pra "Entregue" chamando a função errada).
- Falha ao atualizar status (rede, permissão) → reverte otimisticamente, mas só loga no console — 🐛 admin não vê nenhum aviso de que a ação falhou.
- Pedido é cancelado → desaparece da lista imediatamente (a query base já exclui `cancelled`).
- Realtime: qualquer mudança na tabela de pedidos (de qualquer origem) dispara um refetch completo de até 100 pedidos — não incremental.
- Clica duas vezes rápido no botão de avançar status → 🐛 nenhum `disabled` durante a chamada; pode disparar duas atualizações em sequência.

### 2.4 Cozinha (`/admin/cozinha`)

- Vê 3 métricas: Esgotados, Estoque baixo, Produzidos hoje.
- Vê lista "Precisam de reposição" (esgotados + estoque baixo juntos, mais urgentes primeiro).
- Busca produto pelo campo de "Registrar Produção".
- Seleciona produto + quantidade → clica "Registrar" → soma ao estoque via rota de API dedicada (`/api/kitchen/produce`), fica registrado em "Produção de hoje".
- Usa o atalho "preencher rápido" numa linha de reposição → adiciona uma leva pré-definida sem precisar digitar.
- 🐛 Existe um componente de "finalizar produção" (`ProductionList.tsx`) com checklist e botão de finalizar que chama uma rota (`/api/kitchen/finalize`) que **não existe** — é código morto, nunca é importado em lugar nenhum; se algum dia for religado, vai quebrar com 404.

### 2.5 Estoque (`/admin/estoque`)

- Vê métricas: Total, Em estoque, Estoque baixo, Esgotado.
- Busca por nome ou SKU.
- Filtra por categoria/status (conforme os controles da tela).
- Ajusta quantidade direto na linha (stepper −/+) → grava via `adjust_stock` (ajuste absoluto, não incremental, mas a UI apresenta como incremento de 1 em 1).
- Clica no lápis de um produto → abre modal completo de edição (nome, preço, categoria, estoque mínimo, tipo, imagem, ativo/inativo).
- Cria novo produto → mesmo modal, em modo criação.
- Faz upload de imagem no modal → vai para o bucket `products-images` do Supabase Storage.
- Arrasta uma imagem para a área de upload → mesmo resultado (drag-and-drop suportado).
- Envia arquivo que não é imagem → upload é ignorado silenciosamente (`if (!file.type.startsWith("image/")) return`).
- Desativa um produto (`is_active=false`) → some do cardápio público, mas continua aparecendo no Estoque/Manual do admin.
- Card no mobile: nome + status "OK/Baixo/Esgotado" agrupados, barra de estoque esticada, foto+nome/código+stepper na linha de baixo (ajustado nesta sessão).
- Foto do produto não carrega → cai no ícone de caixa (`Package`) genérico; código e URL da imagem estão corretos no banco, a falha é do host externo (Google Drive) recusando o hotlink, não um bug da aplicação.

### 2.6 Manual de Preparo (`/admin/manual`)

- Busca produto na barra lateral.
- Abre categoria (acordeão) → expande/recolhe lista de produtos daquela categoria.
- Clica num produto → vê modo de preparo, foto, descrição/ingredientes no painel de detalhe.
- Produto sem instrução de preparo cadastrada → estado vazio dedicado ("Nenhuma instrução de preparo cadastrada").
- Clica "Editar" (adicionado nesta sessão) → abre edição inline de foto e modo de preparo.
- Salva edição → grava direto em `products.image_url` / `products.prep_instructions`.
- Cancela edição → descarta alterações não salvas.
- Mobile: lista e detalhe agora são duas telas separadas (lista → toca no produto → detalhe em tela cheia → botão "Voltar").

### 2.7 Rota de Entrega (`/admin/rota-entrega`)

- Só mostra pedidos com `delivery_type==="delivery"` **e** endereço preenchido — retiradas nunca aparecem aqui.
- Seção "Para entregar": pedidos com status "Liberado" ou "Em Rota".
- Seção "Entregues": pedidos com status "Entregue".
- 🐛 O rótulo "Entregues hoje" não filtra por data de verdade — mostra todos os pedidos entregues carregados (até 100 mais recentes), não só os de hoje.
- Clica "Navegar" → abre Google Maps com o endereço do pedido em nova aba.
- Clica no ícone de telefone → abre discador (`tel:`) com o número do cliente.
- Avança status ("Saiu para Entrega" → "Confirmar Entrega") → mesmo mecanismo de `updateStatus` direto no Supabase.
- 🐛 Erro ao avançar status aqui também só vai pro console — sem aviso visual pro entregador/admin.
- Pedido entregue → cartão fica esmaecido, sem botão de ação nenhum (não existe "desfazer entrega").
- Nenhum pedido pendente de entrega → estado vazio "Nenhuma entrega pendente".

### 2.8 Anúncios (`/admin/anuncios`)

- Digita novo aviso e aperta Enter (ou clica "Adicionar") → cria com `is_active=true`.
- Tenta adicionar com o campo vazio → botão fica desabilitado.
- Clica no ícone de olho → ativa/desativa o aviso (aparece/some da rotação pública) sem excluir.
- Clica na lixeira → **exclui direto, sem nenhuma confirmação** ("tem certeza?" não existe).
- 🐛 Existe uma alcinha de "arrastar para reordenar" (`GripVertical`) em cada linha, mas não tem nenhuma lógica de drag-and-drop implementada — é só visual, não faz nada.
- Roda dessincronizado: ao adicionar, a lista não atualiza otimisticamente (só depois do refresh do servidor); ao ativar/excluir, atualiza na hora.

### 2.9 QR Code (`/admin/qrcode`)

- Vê o QR Code apontando para a URL pública do site.
- Clica "Imprimir QR Code" → agora imprime **só o card do QR Code** (corrigido nesta sessão); antes imprimia a tela inteira (cabeçalho, sidebar etc. junto).

### 2.10 Configurações (`/admin/configuracoes`)

- Edita nome do admin, nome da loja, WhatsApp, horário de abertura/fechamento.
- Clica "Salvar alterações" → 🐛 **não salva nada de verdade**. Só troca o texto do botão pra "Salvo!" por 2.5s e depois volta ao normal — é 100% estado local, zero chamada de rede. Recarregar a página reseta tudo pro valor padrão.
- Alterna o toggle "Som ao receber pedido" → 🐛 visualmente parece ligado, mas não tem nenhum `onClick`/handler — clicar não faz absolutamente nada.
- Texto na tela afirma que o horário configurado aqui reflete automaticamente no badge "Aberto/Fechado" do painel → 🐛 isso não é verdade hoje; o badge usa constantes fixas no código (`OPEN_HOUR`/`CLOSE_HOUR`), não o que é digitado nesta tela.

---

## PARTE 3 — Cenários sistêmicos / entre telas

- **Concorrência de estoque**: dois clientes comprando a última unidade ao mesmo tempo — protegido no banco para produtos "combo" (a função SQL é atômica), mas o erro de "sem estoque" é descartado pela aplicação e o pedido é criado do mesmo jeito; para produtos "avulso", não existe proteção nenhuma.
- **Preço desatualizado**: preço muda no admin depois que o cliente já colocou o item no carrinho → cliente paga o preço antigo, porque o servidor confia no valor enviado pelo cliente em vez de reconferir no banco.
- **Sessão expira no meio de uma ação**: qualquer chamada autenticada (admin ou cliente) que falhe por sessão expirada geralmente cai num `catch` genérico — comportamento varia por tela, sem um padrão único de "sua sessão expirou, faça login de novo".
- **Duas abas abertas ao mesmo tempo** (carrinho do cliente, ou pedidos do admin) — carrinho não sincroniza entre abas; pedidos do admin sim, via realtime do Supabase.
- **Conexão cai no meio de uma ação crítica** (finalizar pedido, avançar status, salvar produto) — cada tela trata de um jeito diferente; a maioria mostra erro visível, mas atualização de status de pedido só loga no console.
- **Usuário volta no histórico do navegador** depois de finalizar um pedido → pode reabrir o checkout com o carrinho já vazio (botão desabilitado) ou reabrir a confirmação sem parâmetros (cai no fallback do localStorage).
- **Popup bloqueado pelo navegador** (WhatsApp no checkout) → sem detecção; mitigado parcialmente pelo botão manual "Acompanhar no WhatsApp" na tela de confirmação.
- **Cargo do usuário muda enquanto ele está logado** (ex.: admin rebaixa um `kitchen` para `customer` no banco enquanto a pessoa está com o painel aberto) → a sessão no navegador continua válida até a próxima checagem do middleware (próxima navegação), não é revogada em tempo real.
- **Imagem hospedada no Google Drive** — funciona quando o Drive permite hotlink, falha silenciosamente (cai no ícone genérico) quando o Drive bloqueia; comportamento inconsistente e fora do controle do código da aplicação.
