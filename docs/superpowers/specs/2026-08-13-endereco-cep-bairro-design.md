# Endereço estruturado (CEP/bairro/complemento) e bloqueio de cidades não atendidas

## Contexto

Dois problemas reais reportados pelo usuário (dono do negócio) em 13/08/2026:

**1. Complemento não é salvo, e não há campo de CEP.** O checkout
(`src/components/checkout/CheckoutForm.tsx`) já tem um campo "Complemento
(opcional)" separado do campo "Endereço de entrega", mas nenhum dos dois é
persistido de forma reutilizável: o valor final vira uma string única
(`endereço + " - " + complemento`) gravada só em `orders.delivery_address`
(texto livre, por pedido). Para reaproveitar em pedidos futuros, hoje só
existem dois mecanismos client-side, nenhum guarda complemento nem CEP:
- Cliente logado: `user.user_metadata.delivery_address` (Supabase Auth),
  um único campo de texto livre.
- Convidado: `localStorage["donna-fit-guest"]`, preso ao navegador.

O modal de perfil (`src/components/ui/ProfileModal.tsx`, view
`"editProfile"`) tem o mesmo problema — um único campo de endereço em texto
livre, sem complemento, sem CEP, salvo no mesmo `user_metadata`.

A tabela `customer_profiles` (migration `20260608_006_customer_profiles.sql`,
chave = telefone, pensada para cobrir convidado + logado) **nunca foi
aplicada em produção** — confirmado nesta sessão via query direta à API REST
do Supabase (`PGRST205: Could not find the table 'public.customer_profiles'`).
Por decisão do usuário nesta sessão, este trabalho **não** resolve essa
lacuna: a persistência de endereço continua restrita a quem faz login, via
`user_metadata`. Convidado continua preenchendo tudo a cada pedido — isso é
uma escolha consciente, não uma omissão.

**2. Rua homônima em bairros diferentes gera frete/entrega errados.** O
matching de zona (`matchDeliveryZone` em `src/lib/deliveryZones.ts`) infere o
bairro a partir de substring no texto completo do endereço, com fallback de
geocoding externo (Nominatim) e, por fim, fallback de "zona cadastrada mais
próxima" por coordenadas (`nearestDeliveryZone`). Quando a rua digitada tem o
mesmo nome em dois bairros diferentes (fenômeno comum em nomes de rua
brasileiros, já mitigado parcialmente para alguns casos pontuais em
03/08/2026 — ver `restrictToPostStreetNameText` e os casos especiais de
"Atuba"/"São Francisco de Sales"), o sistema pode resolver para o bairro
errado, cobrando/roteando a entrega incorretamente. Pesquisa de mercado
(iFood) confirma que apps de delivery nunca decidem a área de entrega por
adivinhação de texto — usam lista fechada de bairros ou CEPs cadastrados
pelo estabelecimento, com CEP servindo apenas para acelerar o preenchimento.

**Pedido adicional:** bloquear venda com mensagem fixa para os bairros/
cidades **Campo Largo**, **Araucária** e **Fazenda Rio Grande** — nenhum dos
três está cadastrado em `delivery_zones` hoje (confirmado por grep), então
hoje esses endereços caem no fallback de "zona mais próxima" e são
aceitos incorretamente.

## Decisões já validadas com o usuário (não redescobrir)

- Persistência de CEP/endereço/complemento: **só para cliente logado**,
  via `user_metadata`. Convidado não ganha persistência nesta entrega.
- Identificação de bairro: **lista fechada confirmada pelo cliente**
  (não adivinhação automática sem confirmação), pré-selecionada por
  sugestão do CEP quando disponível.
- Bairro fora da lista (e não bloqueado): **mantém o fallback de zona
  mais próxima** (comportamento de 03/08/2026), agora acionado
  explicitamente pelo cliente ("meu bairro não está na lista").
- Bairro/cidade bloqueado: recusa a venda com a mensagem *"Ainda não
  entregamos em sua região, mas estamos trabalhando para, em breve,
  conseguir atender vocês também! 💚"*, checada em profundidade (CEP,
  fallback manual, e servidor) — nunca só no client.

## Comportamento desejado

### Campos de endereço (checkout e perfil, mesmo componente reutilizado)

Quatro campos, nesta ordem:

1. **CEP** — opcional, formato `00000-000`. Ao completar 8 dígitos, dispara
   lookup automático (debounce ~500ms, sem precisar de botão).
2. **Endereço** (rua + número) — texto livre como hoje, prefilled pelo CEP
   quando o lookup funciona, sempre editável.
3. **Bairro** — select/autocomplete restrito aos bairros ativos de
   `delivery_zones` (`active = true`), mais uma opção final "Meu bairro não
   está na lista". Pré-selecionado automaticamente se o bairro sugerido pelo
   CEP bater (por nome exato, case/acento-insensitive) com um bairro ativo;
   caso contrário fica vazio, cliente escolhe manualmente.
4. **Complemento** — texto livre, opcional, como hoje.

### Lookup de CEP

- Provedor: ViaCEP (`https://viacep.com.br/ws/{cep}/json/`) — gratuito, sem
  chave, já é o padrão de mercado no Brasil.
- Chamado direto do client (rota pública, sem necessidade de proxy no
  backend) com timeout curto (3s) e tratamento de falha silencioso: se o
  CEP não resolver ou a API estiver fora, os campos seguintes continuam
  editáveis manualmente, sem bloquear o fluxo.
- Resposta usada: `logradouro` → prefill de Endereço; `bairro` → sugestão
  de pré-seleção do select; `localidade` → checagem de cidade bloqueada
  (ver abaixo).

### Seleção de bairro / fallback "não está na lista"

- Selecionar "Meu bairro não está na lista" abre um campo de texto livre
  para o cliente digitar o bairro real.
- Esse texto passa pelo mesmo pipeline de hoje: `matchDeliveryZone` →
  geocoding (Nominatim) → `nearestDeliveryZone`. Se resolver por zona mais
  próxima, mostrar o aviso já existente de "frete estimado pela zona mais
  próxima" (`approximate: true`).
- Esse texto também passa pela checagem de cidade bloqueada (ver abaixo)
  antes de rodar o pipeline de matching.

### Bloqueio de cidade

- Lista fixa (constante, fácil de estender depois):
  `["Campo Largo", "Araucária", "Fazenda Rio Grande"]`.
- Comparação normalizada (sem acento, case-insensitive, como já é padrão em
  `deliveryZones.ts`), por igualdade de nome de cidade — não substring (para
  não bloquear por engano um bairro que apenas contenha uma dessas palavras).
- Checado em 3 pontos independentes (defesa em profundidade):
  1. Resposta do ViaCEP (`localidade`) — bloqueia imediatamente após o
     lookup do CEP, antes mesmo do cliente chegar no select de bairro.
  2. Texto digitado no fallback manual "meu bairro não está na lista" —
     tenta extrair nome de cidade do texto livre com a mesma heurística já
     usada para detectar cidade em `deliveryZones.ts`/`geocoding.ts`.
  3. Servidor, em `/api/orders` — repete a mesma checagem sobre o valor de
     cidade que a checagem 1 ou 2 já resolveu e que veio junto no payload;
     nunca confia apenas no que o client decidiu.
- Quando bloqueado: mostra a mensagem fixa no lugar do campo/resumo de
  frete, desabilita o botão de finalizar pedido. Servidor responde 400 com
  a mesma mensagem se, por algum motivo, a checagem client-side for
  contornada.

### Persistência (cliente logado)

Novo formato em `user_metadata`, substituindo o atual `delivery_address:
string`:

```
delivery_cep: string | null
delivery_street: string
delivery_bairro: string          // nome exato de uma delivery_zones.name ativa
delivery_complement: string | null
```

- Migração de dado legado: se `user_metadata` só tem o `delivery_address`
  antigo (string única) e nenhum dos campos novos, o checkout/perfil
  preenche `delivery_street` com esse valor e deixa `delivery_bairro` vazio
  — força uma única confirmação de bairro na próxima vez que esse cliente
  fizer checkout ou abrir o perfil. Depois de salvo uma vez no formato
  novo, não pede de novo.
- Toda edição feita no checkout (não só no modal de perfil) atualiza
  `user_metadata` via `supabase.auth.updateUser`, para o cliente logado —
  não precisa abrir o modal de perfil separadamente para o endereço "colar".
- Convidado: sem mudança — mesmo mecanismo de `localStorage` de hoje, sem
  os 4 campos estruturados persistidos (o formulário funciona igual, só não
  há "lembrar para próxima vez" fora do navegador atual).

### Cálculo do frete no servidor (`/api/orders`)

Hoje `/api/orders` recalcula a zona a partir do texto do endereço
(`matchDeliveryZone` → geocoding → zona mais próxima) como fonte de verdade
do preço. Passa a receber o **bairro já resolvido no client** (seja pela
seleção direta na lista, seja pelo resultado do fallback de zona mais
próxima) como campo estruturado (`deliveryBairro`) no payload do pedido:
- Servidor valida que `deliveryBairro` existe em `delivery_zones` e está
  `active = true`; usa a `fee` cadastrada para esse nome.
- Se o `deliveryBairro` enviado não bater com nenhuma zona ativa (client
  desatualizado, manipulação de payload, etc.), servidor cai de volta no
  pipeline atual (`matchDeliveryZone`/geocoding/`nearestDeliveryZone`) sobre
  o texto do endereço, como já faz hoje — nunca rejeita o pedido só por
  isso, mantém o comportamento de "nunca recusar por causa do cálculo de
  frete" já validado em 03/08/2026 (exceto para cidade bloqueada).
- `matchDeliveryZone`/`geocodeAddress`/`nearestDeliveryZone` continuam
  existindo e não mudam de comportamento internamente — passam a ser
  motor de *sugestão* (passo 1 do CEP, passo do fallback manual) e de
  *rede de segurança* server-side, não mais a fonte primária de verdade
  quando o client manda um bairro estruturado válido.

## Fora de escopo

- Persistência de endereço para convidado (decisão explícita do usuário
  nesta sessão).
- Criar/aplicar a tabela `customer_profiles` em produção.
- Split de "endereço" em rua/número como campos separados — continua um
  campo de texto único, só prefilled pelo CEP.
- Múltiplos endereços salvos por cliente (só um endereço padrão, como hoje).
- Alterar a lista de bairros bloqueados além dos 3 citados, ou criar UI de
  admin para gerenciar essa lista (fica como constante no código por ora).
- Qualquer mudança em `restrictToPostStreetNameText` ou nos casos especiais
  hardcoded existentes (Atuba, São Francisco de Sales) — continuam servindo
  o pipeline de sugestão/fallback sem alteração.

## Testes

Unit:
- `isBlockedCity()` — nomes exatos das 3 cidades (com/sem acento, case),
  não-match para bairros que contenham substring parecida.
- Validação de `deliveryBairro` recebido em `/api/orders` contra
  `delivery_zones` ativa; fallback para pipeline atual quando inválido.
- Migração de `user_metadata` legado (`delivery_address` string) →
  novo formato, preservando o texto como `delivery_street`.

E2E (manual ou Playwright, seguindo padrão de `e2e/`):
- CEP de bairro cadastrado → autopreenche e pré-seleciona corretamente,
  pedido conclui com o frete certo.
- CEP de uma das 3 cidades bloqueadas → mensagem de bloqueio aparece antes
  do select de bairro, botão de finalizar desabilitado.
- Bairro digitado manualmente (fallback) resolvendo por zona mais próxima
  → aviso de "frete estimado" aparece, pedido conclui.
- Bairro digitado manualmente contendo nome de uma das 3 cidades bloqueadas
  → recusa igual ao caminho via CEP.
- Cliente logado: preenche uma vez, desloga/loga novamente (ou abre em
  outra aba), checkout já vem com os 4 campos prontos.
- Cliente logado com dado legado (`delivery_address` antigo) → vê endereço
  preenchido, bairro vazio pedindo confirmação única.
- Convidado: comportamento inalterado (localStorage, mesmo navegador).
- Tentativa de manipular payload de `/api/orders` mandando `deliveryBairro`
  de uma zona inativa/inexistente → servidor cai no pipeline de matching
  por texto, não rejeita o pedido (exceto se resolver para cidade
  bloqueada).
