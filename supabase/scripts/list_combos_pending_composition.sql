-- Lista combos que ainda não têm composição cadastrada em combo_items.
-- Não é possível preencher isso automaticamente: qual produto individual
-- compõe cada combo é conhecimento de negócio que não está em nenhuma
-- coluna existente. Rode esta query, e para cada linha retornada, edite
-- o produto pelo painel /admin/estoque (botão de editar) e cadastre a
-- composição na seção "Composição do Combo".
SELECT p.id, p.name, p.sku, p.price
FROM public.products p
WHERE p.stock_type = 'combo'
  AND NOT EXISTS (
    SELECT 1 FROM public.combo_items ci WHERE ci.combo_product_id = p.id
  )
ORDER BY p.name;
