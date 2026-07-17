# Ingredientes estruturados (nome + quantidade) — cadastro de produto e Manual de Preparo

## Contexto

Hoje o campo "Ingredientes" do formulário de produto (`ProductModal` em
`src/components/admin/EstoqueClient.tsx`) é um textarea de texto livre, salvo na coluna
`products.description`. Esse mesmo texto:

- aparece pro cliente no cardápio (`ProductCard.tsx`), na página do produto
  (`produto/[id]/page.tsx`, que tenta *adivinhar* gramagem via regex tipo `"ARROZ: 180G"`
  dentro do texto livre) e na busca do catálogo (`CatalogClient.tsx`);
- é usado pelo checkout (`CheckoutForm.tsx:153`) pra decidir se pergunta "arroz integral
  ou branco", procurando a palavra `"arroz"` dentro do texto.

O pedido: transformar esse campo em uma lista estruturada de ingredientes (nome +
quantidade), com nomes reaproveitáveis entre produtos via um catálogo, editável tanto no
cadastro do produto (Estoque) quanto na tela Manual de Preparo — e visível de forma
organizada no Manual de Preparo sem precisar clicar em nada.

## Decisões (confirmadas com o cliente)

1. **`description` passa a ser gerada automaticamente** a partir da lista estruturada
   (ex: `"Peito de frango grelhado (150g), Arroz integral (180g)"`) — nenhuma tela do
   site (`ProductCard`, `produto/[id]`, `CatalogClient`, `CheckoutForm`) muda de código;
   elas continuam lendo `product.description` como sempre leram.
2. **Catálogo relacional** (`ingredients` + `product_ingredients`), mesmo padrão já usado
   pra composição de combos (`combo_items`) neste projeto — não é JSONB solto no produto.
3. **Visual do Popover/Select restilizado** para combinar com o resto do painel Estoque
   (que não usa Tailwind/shadcn hoje, é todo `style={{}}` com variáveis CSS
   `var(--surface-*)`, `var(--gold-*)` etc.) — shadcn entra só como base de comportamento
   (acessibilidade, posicionamento, teclado).
4. **Catálogo cresce direto no formulário**: combobox com opção "Criar '<nome>'" quando o
   ingrediente digitado não existe ainda. Sem tela de gestão separada.
5. **Quantidade aceita unidade** (não só gramas): campo numérico + campo de unidade
   (texto livre curto: g, ml, un, colher...).
6. **Editável em dois lugares**: no formulário "Novo Produto"/"Editar Produto" (Estoque) e
   no modo de edição da tela Manual de Preparo — mesmo componente reaproveitado nos dois.

## Dados

Duas tabelas novas, seguindo o padrão de `combo_items` (migration `20260716_026`):

```sql
create table public.ingredients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz default now()
);

create table public.product_ingredients (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity      numeric not null check (quantity > 0),
  unit          text not null default 'g',
  sort_order    int not null default 0,
  created_at    timestamptz default now(),
  constraint product_ingredients_unique unique (product_id, ingredient_id)
);

create index idx_product_ingredients_product_id on public.product_ingredients(product_id);
```

RLS: leitura para `authenticated` (qualquer staff logado, mesmo padrão de
`combo_items_auth_read`); escrita com `is_staff()` em ambas as tabelas — mesmo nível de
quem já pode editar produto e modo de preparo hoje (`products_admin_write` usa
`is_staff()`, não `is_admin()`, desde a migration 015; ingredientes acompanham o mesmo
nível pra não travar o fluxo de quem já edita produto/preparo).

`name` em `ingredients` é único (case-sensitive por ora — sem normalização de acento ou
caixa; se dois nomes quase iguais forem criados por engano isso não é resolvido aqui, fica
como limitação conhecida, não como bug).

## Componente reaproveitado: `IngredientBuilder`

Novo componente (arquivo próprio, ex: `src/components/admin/IngredientBuilder.tsx`),
usado tanto em `ProductModal` (`EstoqueClient.tsx`) quanto no modo de edição de
`ManualClient.tsx`.

**Props:** lista atual de linhas (`{ ingredientId, name, quantity, unit }[]`) + callback de
mudança — componente controlado, sem estado de persistência próprio (quem salva é o
formulário pai, igual ao padrão já usado por `ComboComposer` no mesmo arquivo).

**Comportamento:**
- Botão "+ Adicionar ingrediente" abre um Popover (shadcn `Popover` + `Command` como
  combobox) com busca no catálogo (`ingredients`, carregado uma vez ao abrir o modal) e
  opção de criar um novo nome inline se a busca não encontrar nada.
- Dentro do popover, além do nome, dois campos: quantidade (número) e unidade (texto
  curto, default "g").
- Confirmar adiciona a linha na lista (sem fechar necessariamente — permite adicionar
  várias seguidas) e a lista abaixo mostra cada ingrediente já adicionado como uma linha
  independente: nome + quantidade + unidade + botão remover (X).
- Sem reordenação (drag) — ordem é a de inclusão, refletida em `sort_order` na gravação.
- Estilo: cores/bordas/tipografia herdadas das variáveis CSS já usadas no resto do painel
  (`var(--surface-100)`, `var(--gold-500)` etc.), não o tema padrão do shadcn.

## Integração — `ProductModal` (Estoque → Novo/Editar Produto)

- Textarea "Ingredientes" é **removida** e substituída pelo `IngredientBuilder`.
- Ao abrir pra edição (`productToEdit`), busca as linhas existentes em
  `product_ingredients` (join com `ingredients` pra pegar o nome) — mesmo padrão do
  `useEffect` que já carrega `combo_items` quando o produto é um combo.
- Ao salvar (`handleSubmit`):
  1. Se a lista de ingredientes **não estiver vazia**, gera `description` a partir dela:
     `nomes.map(i => \`${i.name} (${i.quantity}${i.unit})\`).join(", ")`, sobrescrevendo o
     que estiver salvo. Se a lista estiver **vazia** (produto legado ainda não migrado pra
     ingredientes estruturados, ou produto realmente sem ingrediente cadastrado), o campo
     `description` **não é alterado** — mantém o texto livre já salvo no banco, pra não
     apagar a descrição de produtos antigos só porque o formulário foi salvo por outro
     motivo (ex: mudar o preço). `description` só passa a ser gerado automaticamente a
     partir do momento em que o produto tem pelo menos 1 ingrediente estruturado.
  2. Salva/atualiza o produto normalmente (como já faz).
  3. Apaga todas as linhas de `product_ingredients` do produto e reinsere as atuais — mesma
     estratégia já usada pra `combo_items` logo abaixo no mesmo handler.
  4. Ingredientes novos (criados inline no combobox) já foram inseridos em `ingredients`
     no momento da criação dentro do Popover (não esperam o submit do formulário todo).

## Integração — `ManualClient` (Manual de Preparo)

- **Modo visualização:** o bloco atual "Descrição / Ingredientes" (texto livre) é
  substituído por uma lista organizada dos ingredientes estruturados — cada um em uma
  linha própria, nome + quantidade visíveis sem clique (mesmo cartão visual já usado pro
  bloco de Modo de Preparo, reaproveitando o estilo).
  - **Compatibilidade:** se o produto ainda não tem nenhuma linha em
    `product_ingredients` (produto antigo, nunca editado depois desta feature), cai no
    fallback de mostrar a `description` livre como está hoje — sem forçar migração de
    dados existentes.
- **Modo edição:** o mesmo `IngredientBuilder` aparece acima ou abaixo do textarea de
  Modo de Preparo, dentro do card já existente de edição. `handleSave` passa a gravar
  `product_ingredients` (mesma rotina de apagar+reinserir) e recalcular `description`
  junto com o que já salva hoje (`image_url`, `prep_instructions`) — mesma regra do
  `ProductModal`: só sobrescreve `description` se a lista de ingredientes não estiver
  vazia.

## Fora de escopo (não mexe)

- Nenhuma tela do site (`ProductCard`, `produto/[id]`, `CatalogClient`, `CheckoutForm`)
  muda de código — continuam consumindo `description` como já consomem.
- Sem tela de gestão do catálogo de ingredientes fora do combobox inline.
- Sem normalização/dedupe de nomes quase-iguais no catálogo.
- Sem reordenação (drag-and-drop) da lista de ingredientes.

## Testes

Seguir o padrão e2e já existente (`e2e/admin-estoque.spec.ts`, `e2e/admin-manual.spec.ts`):
cobrir criação de produto com 2+ ingredientes e conferir que `description` foi gerada
corretamente, edição via Manual de Preparo alterando ingredientes, e o fallback de
produto legado sem `product_ingredients`.
