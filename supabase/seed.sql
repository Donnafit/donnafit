-- ============================================================
-- Donna FIT — Seed Data
-- Apply via: Supabase Dashboard → SQL Editor → paste and Run
-- Apply AFTER migrations 001 and 002
-- ============================================================

-- Categories
INSERT INTO public.categories (name, slug, sort_order) VALUES
  ('Combos',            'combos',      1),
  ('Pratos Principais', 'pratos',      2),
  ('Massas',            'massas',      3),
  ('Sopas e Caldos',    'sopas',       4),
  ('Low Carb',          'low-carb',    5),
  ('Vegetariano',       'vegetariano', 6),
  ('Adicionais',        'adicionais',  7);

-- Combos (stock_type = 'combo', starts with 20 in freezer)
WITH cat AS (SELECT id FROM public.categories WHERE slug = 'combos')
INSERT INTO public.products (category_id, name, description, price, stock_type, stock_quantity, min_stock_alert, sort_order)
SELECT cat.id, v.name, v.description, v.price, 'combo', 20, 5, v.sort_order
FROM cat, (VALUES
  ('Combo 10 Sopas',              '2 sopa de abóbora + frango desfiado e queijo + 2 caldos', 129.90, 1),
  ('Combo 10 Refeições',          '',                                                         141.90, 2),
  ('Projeto 5 Dias no Foco',      '10 refeições almoço e jantar',                            143.90, 3),
  ('Combo Premium 10 Refeições',  '',                                                         165.90, 4),
  ('Combo Queridinho da Nutri',   '',                                                         199.90, 5),
  ('Combo 12 Refeições + 3 Sopas','',                                                         202.90, 6),
  ('Combo 16 Refeições + 4 Sopas','',                                                         262.90, 7),
  ('Combo 20 Refeições',          '',                                                         289.90, 8)
) AS v(name, description, price, sort_order);

-- Pratos Principais (avulso)
WITH cat AS (SELECT id FROM public.categories WHERE slug = 'pratos')
INSERT INTO public.products (category_id, sku, name, description, price, stock_type, stock_quantity, sort_order)
SELECT cat.id, v.sku, v.name, v.description, v.price, 'avulso', 50, v.sort_order
FROM cat, (VALUES
  ('04',  'Estrogonofe de Frango',                      'Com arroz branco e batata palha',                       15.00, 1),
  ('03',  'Estrogonofe de Carne',                       'Com arroz branco e batata palha',                       18.50, 2),
  ('05',  'Estrogonofe de Salmão',                      'Com arroz branco e batata palha',                       16.00, 3),
  (NULL,  'Estrogonofe de Frango com Purê de Mandioquinha','',                                                   16.00, 4),
  ('10',  'Escondidinho de Batata Doce',                'Purê + recheio carne + queijo gratinado',               16.00, 5),
  ('07',  'Escondidinho de Aipim',                      'Com carne moída e queijo (350g)',                       16.50, 6),
  ('43',  'Brasileirinho',                              'Carne moída com arroz e feijão (350g)',                 15.00, 7),
  ('47',  'Brasileirinho Fit',                          'Frango isca com cenoura ralada, arroz e feijão (300g)', 14.50, 8),
  ('17',  'Frango Xadrez',                              'Cubos, mix de pimentão, champignon',                   15.50, 9),
  ('14',  'Sobrecoxa com Creme de Milho',               'Sobrecoxa de frango desfiada, creme de milho e arroz', 15.00, 10),
  ('37',  'Filé de Tilápia ao Molho Siciliano',         'Mix de legumes e arroz',                                20.00, 11),
  ('49',  'Fricassê de Frango',                         'Com queijo, batata palha e arroz branco',               15.50, 12),
  (NULL,  'Arroz Carreteiro (300g)',                    'Picadinho de carne bovina, bacon, calabresa, cenoura',  15.00, 13),
  (NULL,  'Bife a Rolê com Arroz e Feijão (350g)',      'Bife a rolê (bacon, calabresa, cenoura) molho tomate', 22.00, 14),
  (NULL,  'Picadinho de Carne com Legumes na Manteiga', '120g carne + 130g legumes',                             17.00, 15),
  ('10b', 'Moída com Legumes (300g)',                   'Moída refogada com legumes e arroz',                    15.00, 16),
  ('34',  'Moída com Legumes com Purê de Abóbora',      'Moída refogada com legumes e purê de abóbora (350g)',  15.50, 17),
  ('06',  'Feijoada',                                   'Costelinha suína defumada, paio, calabresa',            15.50, 18)
) AS v(sku, name, description, price, sort_order);

-- Massas (avulso)
WITH cat AS (SELECT id FROM public.categories WHERE slug = 'massas')
INSERT INTO public.products (category_id, sku, name, description, price, stock_type, stock_quantity, sort_order)
SELECT cat.id, v.sku, v.name, v.description, v.price, 'avulso', 50, v.sort_order
FROM cat, (VALUES
  ('25', 'Macarrão Integral à Bolonhesa',  'Espaguete, Penne ou parafuso integral ao molho bolonhesa',   16.00, 1),
  ('24', 'Espaguete',                      'Com molho posta desfiada, molho de tomate',                  14.00, 2),
  ('26', 'Nhoque à Bolonhesa',             'Nhoque ao molho bolonhesa e queijo com molho de tomate',     17.00, 3),
  ('31', 'Nhoque ao Molho Branco',         'Nhoque ao molho branco e queijo (350g)',                     15.00, 4),
  (NULL, 'Panqueca de Carne',              '3 panquecas recheio carne, molho de tomate artesanal (300g)',18.00, 5)
) AS v(sku, name, description, price, sort_order);

-- Sopas e Caldos (avulso)
WITH cat AS (SELECT id FROM public.categories WHERE slug = 'sopas')
INSERT INTO public.products (category_id, sku, name, description, price, stock_type, stock_quantity, sort_order)
SELECT cat.id, v.sku, v.name, v.description, v.price, 'avulso', 50, v.sort_order
FROM cat, (VALUES
  ('23', 'Caldo Verde',    'Creme de batata inglesa, bacon, calabresa e couve (400g)',         14.00, 1),
  ('39', 'Sopa Eslava',    'Creme de batata inglesa com carne bovina e queijo (400g)',         14.00, 2),
  (NULL, 'Caldo de Kenga', 'Creme de cenoura, aipim, batata salsa com frango desfiado',       14.00, 3),
  ('22', 'Sopa de Aipim',  'Creme de aipim com carne bovina desfiada, bacon e queijo',        14.00, 4),
  ('21', 'Sopa de Abóbora','Sopa de abóbora com frango desfiado e queijo (400g)',             13.00, 5)
) AS v(sku, name, description, price, sort_order);

-- Low Carb (avulso — cross-listed, separate category entries)
WITH cat AS (SELECT id FROM public.categories WHERE slug = 'low-carb')
INSERT INTO public.products (category_id, name, description, price, stock_type, stock_quantity, sort_order)
SELECT cat.id, v.name, v.description, v.price, 'avulso', 50, v.sort_order
FROM cat, (VALUES
  ('Picadinho de Carne com Legumes na Manteiga (Low Carb)', '120g carne + 130g legumes',                 17.00, 1),
  ('Sopa de Abóbora (Low Carb)',                            'Com frango desfiado e queijo (400g)',        13.00, 2),
  ('Moída com Legumes com Purê de Abóbora (Low Carb)',      'Moída refogada com legumes (350g)',          15.50, 3)
) AS v(name, description, price, sort_order);

-- Vegetariano (avulso)
WITH cat AS (SELECT id FROM public.categories WHERE slug = 'vegetariano')
INSERT INTO public.products (category_id, sku, name, description, price, stock_type, stock_quantity, sort_order)
SELECT cat.id, v.sku, v.name, v.description, v.price, 'avulso', 50, v.sort_order
FROM cat, (VALUES
  ('31v', 'Nhoque ao Molho Branco (Vegetariano)', 'Nhoque ao molho branco e queijo (350g)', 15.00, 1)
) AS v(sku, name, description, price, sort_order);

-- Adicionais (avulso, high stock)
WITH cat AS (SELECT id FROM public.categories WHERE slug = 'adicionais')
INSERT INTO public.products (category_id, sku, name, description, price, stock_type, stock_quantity, min_stock_alert, sort_order)
SELECT cat.id, v.sku, v.name, v.description, v.price, 'avulso', 99, 20, v.sort_order
FROM cat, (VALUES
  ('27',   'Feijão',                    'Feijão preto ou carioca (200g)', 3.50, 1),
  ('46',   'Mix de Legumes (150g)',     'Cenoura, vagem e grão de bico',  4.50, 2),
  (NULL,   'Mix de Legumes na Manteiga','150g',                           5.50, 3)
) AS v(sku, name, description, price, sort_order);
