# Detalhar composição de combos na nota impressa (admin)

## Contexto

Hoje, quando um pedido tem um combo (ex: "Combo 5 Marmitas"), a nota impressa
do painel admin (`FiscalCopyButton.tsx`) mostra apenas uma linha genérica:
`2x Combo 5 Marmitas — R$ 100,00`, sem detalhar quais marmitas (sabores/tipos)
compõem aquele combo. A cozinha não tem essa informação na nota para separar
o pedido corretamente.

A composição de cada combo é fixa por produto no catálogo (tabela
`combo_items`, definida pelo admin em `EstoqueClient.tsx`) — não é uma escolha
do cliente por pedido. Isso significa que dá para buscar a composição do
catálogo no momento da impressão e exibi-la, sem precisar mudar como o pedido
é armazenado.

Escopo: apenas a nota impressa (`FiscalCopyButton.tsx`). A mensagem de
WhatsApp e as telas de detalhe do pedido no admin (`OrderModal.tsx`,
`OrderDetailPanel.tsx`) não são alteradas.

## Comportamento desejado

Ao imprimir a nota de um pedido com combo, cada linha de combo ganha
sub-linhas indentadas, em fonte menor, listando os componentes (nome +
quantidade), sem preço — o preço já está na linha do combo.

As quantidades dos componentes são multiplicadas pela quantidade do combo
comprada no pedido. Exemplo: combo cadastrado como 3x Frango + 2x Carne,
cliente compra 2 unidades do combo:

```
2x Combo 5 Marmitas       R$ 100,00
   6x Frango
   4x Carne
```

Pedidos sem combo continuam idênticos ao comportamento atual.

## Fluxo de dados

1. No `handlePrint`, antes de montar o HTML, filtrar `order.order_items` onde
   `item.product?.stock_type === "combo"` (esse campo já vem no `order` via
   join existente, não precisa buscar produto de novo).
2. Se não houver combos: seguir o fluxo atual, sem nenhuma chamada extra.
3. Se houver combos: usar o client Supabase do browser (`createClient()` de
   `@/lib/supabase/client`, mesmo padrão de `CheckoutForm.tsx`) para buscar:
   - `combo_items` filtrando `combo_product_id in (ids dos combos do pedido)`,
     selecionando `combo_product_id, component_product_id, quantity`.
   - `products` filtrando `id in (component_product_id únicos)`, selecionando
     `id, name`.
   - Montar um mapa `combo_product_id → [{ name, quantity }]`.
4. Ao montar `itemsRows`, para cada item de combo, multiplicar a `quantity`
   de cada componente do mapa pela `quantity` daquele item no pedido, e gerar
   sub-linhas HTML indentadas logo abaixo da linha do combo.
5. Erros (fetch falhou, combo sem composição cadastrada) não bloqueiam a
   impressão: a nota sai sem as sub-linhas daquele combo, como hoje.

## Mudança de UX

`handlePrint` passa de síncrono para `async` (por causa do fetch). O botão
deve refletir um estado de carregamento breve entre o clique e a abertura da
janela de impressão — hoje a abertura é instantânea.

## Fora de escopo

- Mensagem de WhatsApp (`whatsapp.ts`).
- Telas de detalhe de pedido no admin (`OrderModal.tsx`, `OrderDetailPanel.tsx`).
- Qualquer alteração em como o pedido é armazenado (`order_items`,
  `combo_items` permanecem como estão).
- Escolha de sabor por cliente (não existe hoje; combo é sempre a mesma
  composição fixa do catálogo).

## Testes (verificação manual)

- Pedido com um combo simples.
- Pedido com combo + itens avulsos.
- Pedido com 2+ combos diferentes.
- Pedido sem nenhum combo (comportamento inalterado).
- Simulação de falha na busca de `combo_items`/`products` (fallback sem
  sub-linhas, impressão não é bloqueada).
