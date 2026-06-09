import { readFileSync } from 'fs';
import { resolve } from 'path';

// Helpers de Estilo de Log
const log = {
  ok: (m: string) => console.log(`  \x1b[32m✅ ${m}\x1b[0m`),
  fail: (m: string) => console.log(`  \x1b[31m❌ ${m}\x1b[0m`),
  info: (m: string) => console.log(`  \x1b[34mℹ️  ${m}\x1b[0m`),
  step: (m: string) => console.log(`\n👉 \x1b[33m${m}\x1b[0m`),
  head: (m: string) => console.log(`\n\x1b[45m DONNA FIT E2E BACKEND TEST: ${m} \x1b[0m`),
  warn: (m: string) => console.log(`  \x1b[33m⚠️  ${m}\x1b[0m`)
};

// Configuração Base (Lê .env.local)
const ENV = (() => {
  try {
    const path = resolve(process.cwd(), '.env.local');
    const content = readFileSync(path, 'utf8');
    const config: Record<string, string> = {};
    content.split('\n').filter(l => l && !l.trim().startsWith('#')).forEach(line => {
      const index = line.indexOf('=');
      if (index !== -1) {
        const k = line.substring(0, index).trim();
        const v = line.substring(index + 1).trim().replace(/^["']|["']$/g, '');
        config[k] = v;
      }
    });
    return config;
  } catch (error: any) {
    log.fail(`Erro ao ler .env.local: ${error.message}`);
    process.exit(1);
  }
})();

const SUPABASE_URL = ENV.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = ENV.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  log.fail("Faltam variáveis do Supabase no .env.local");
  process.exit(1);
}

// Wrapper para requisições na API REST do Supabase
async function sbCall(path: string, { method = 'GET', body, token, useServiceRole = false }: { method?: string, body?: any, token?: string, useServiceRole?: boolean } = {}) {
  const apiKey = useServiceRole ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': apiKey,
    'Authorization': `Bearer ${token || apiKey}`
  };
  
  if (useServiceRole) {
    headers['Prefer'] = 'return=representation';
  }

  const url = `${SUPABASE_URL}${path}`;
  const start = performance.now();
  
  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {})
    });
  } catch (error: any) {
    return { ok: false, status: 500, error: error.message, duration: 0, data: null };
  }
  
  const duration = (performance.now() - start).toFixed(2);
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch(e) {}
  
  return { ok: res.ok, status: res.status, data, duration };
}

// Wrapper para requisições no Supabase Auth Admin
async function authAdminCall(path: string, { method = 'POST', body }: { method?: string, body?: any } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
  };
  const url = `${SUPABASE_URL}/auth/v1/admin${path}`;
  const res = await fetch(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch(e) {}
  return { ok: res.ok, status: res.status, data };
}

// Wrapper para requisições no Supabase Auth Público (para login)
async function authPublicCall(path: string, { method = 'POST', body } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY
  };
  const url = `${SUPABASE_URL}/auth/v1${path}`;
  const res = await fetch(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch(e) {}
  return { ok: res.ok, status: res.status, data };
}

// Limpa resíduos de execuções anteriores abortadas
async function preCleanup() {
  log.step('Cleanup Inicial: Removendo resíduos de testes anteriores do M4...');
  
  // 1. Deletar pedidos de teste
  const getOrders = await sbCall('/rest/v1/orders?customer_name=like.Cliente M4 E2E*&select=id', { useServiceRole: true });
  if (getOrders.ok && getOrders.data?.length > 0) {
    for (const order of getOrders.data) {
      await sbCall(`/rest/v1/orders?id=eq.${order.id}`, { method: 'DELETE', useServiceRole: true });
    }
    log.ok('Pedidos antigos de teste do M4 removidos.');
  }

  // 2. Deletar produtos de teste
  const getProds = await sbCall('/rest/v1/products?sku=like.TEST-E2E-M4-*&select=id', { useServiceRole: true });
  if (getProds.ok && getProds.data?.length > 0) {
    for (const prod of getProds.data) {
      await sbCall(`/rest/v1/products?id=eq.${prod.id}`, { method: 'DELETE', useServiceRole: true });
    }
    log.ok('Produtos antigos de teste do M4 removidos.');
  }

  // 3. Deletar categorias de teste
  const getCats = await sbCall('/rest/v1/categories?slug=like.marmitas-m4-e2e-*&select=id', { useServiceRole: true });
  if (getCats.ok && getCats.data?.length > 0) {
    for (const cat of getCats.data) {
      await sbCall(`/rest/v1/categories?id=eq.${cat.id}`, { method: 'DELETE', useServiceRole: true });
    }
    log.ok('Categorias antigas de teste do M4 removidas.');
  }

  // 4. Deletar usuários antigos do Auth
  const getUsers = await authAdminCall('/users?per_page=100', { method: 'GET' });
  if (getUsers.ok && getUsers.data?.users?.length > 0) {
    for (const user of getUsers.data.users) {
      if (user.email && user.email.startsWith('test.m4.e2e.')) {
        await authAdminCall(`/users/${user.id}`, { method: 'DELETE' });
      }
    }
    log.ok('Usuários antigos do Auth de testes do M4 removidos.');
  }
}

async function run() {
  log.head('MARCO 4 — COZINHA & CONTROLE DE ESTOQUE');
  
  const createdIds: {
    kitchenUserId: string | null,
    categoryId: string | null,
    productIds: string[],
    orderIds: string[]
  } = {
    kitchenUserId: null,
    categoryId: null,
    productIds: [],
    orderIds: []
  };

  let kitchenToken: string | null = null;

  try {
    // Executar pré-limpeza
    await preCleanup();

    // ----------------------------------------------------
    // SETUP DE USUÁRIO: Criar usuário de Cozinha (Patrícia)
    // ----------------------------------------------------
    log.step('Setup: Criando usuário de teste da Cozinha (Patrícia)...');
    
    const kitchenEmail = `test.m4.e2e.kitchen.${Date.now()}@donnafit.com.br`;
    const kitchenPass = 'PasswordE2ETest123!';
    const kitchenRes = await authAdminCall('/users', {
      method: 'POST',
      body: {
        email: kitchenEmail,
        password: kitchenPass,
        email_confirm: true,
        user_metadata: { full_name: 'Cozinha M4 Tester' }
      }
    });
    if (kitchenRes.ok) {
      createdIds.kitchenUserId = kitchenRes.data.id;
      log.ok(`Usuário Cozinha criado no Auth. ID: ${createdIds.kitchenUserId}`);
      
      // Atualizar o perfil da Cozinha para role = 'kitchen' usando service_role
      const updateRole = await sbCall(`/rest/v1/profiles?id=eq.${createdIds.kitchenUserId}`, {
        method: 'PATCH',
        useServiceRole: true,
        body: { role: 'kitchen' }
      });
      if (updateRole.ok) {
        log.ok(`Perfil da Cozinha atualizado para role 'kitchen' no banco público.`);
      } else {
        throw new Error(`Falha ao setar role kitchen no perfil: ${JSON.stringify(updateRole.data)}`);
      }
    }

    // Efetuar login para obter o token JWT
    const kitchenLogin = await authPublicCall('/token?grant_type=password', {
      method: 'POST',
      body: { email: kitchenEmail, password: kitchenPass }
    });
    kitchenToken = kitchenLogin.data.access_token;
    log.ok('Token de Cozinha obtido com sucesso.');

    // ----------------------------------------------------
    // TESTE 1: RLS de Leitura do Painel da Cozinha
    // ----------------------------------------------------
    log.step('TESTE 1 — Validando RLS para o Perfil Cozinha (orders & order_items)...');
    
    // 1.1 Leitura de pedidos por Cozinha (deve ser permitida)
    const readOrdersKitchen = await sbCall('/rest/v1/orders?select=*', { token: kitchenToken });
    if (readOrdersKitchen.ok) {
      log.ok('RLS de pedidos permitiu leitura de pedidos por funcionário da cozinha.');
    } else {
      log.fail(`RLS de pedidos falhou: Cozinha autenticada não pôde ler pedidos (Status: ${readOrdersKitchen.status}).`);
    }

    // 1.2 Leitura de itens de pedido por Cozinha (deve ser permitida)
    const readOrderItemsKitchen = await sbCall('/rest/v1/order_items?select=*', { token: kitchenToken });
    if (readOrderItemsKitchen.ok) {
      log.ok('RLS de itens de pedido permitiu leitura por funcionário da cozinha.');
    } else {
      log.fail(`RLS de itens de pedido falhou: Cozinha não leu os itens (Status: ${readOrderItemsKitchen.status}).`);
    }

    // 1.3 Escrita bloqueada: Cozinha tenta criar categoria (deve falhar)
    const createCatKitchen = await sbCall('/rest/v1/categories', {
      method: 'POST',
      token: kitchenToken,
      body: { name: 'Cat Invalida Cozinha', slug: 'cat-invalida' }
    });
    if (createCatKitchen.status === 401 || createCatKitchen.status === 403 || !createCatKitchen.ok) {
      log.ok('RLS de categorias bloqueou corretamente criação por usuário da Cozinha.');
    } else {
      log.fail(`RLS de categorias falhou: Cozinha conseguiu criar categoria (Status: ${createCatKitchen.status}).`);
    }

    // ----------------------------------------------------
    // SETUP DE DADOS DO CARDÁPIO DE TESTE M4
    // ----------------------------------------------------
    log.step('Setup: Criando categorias e produtos de teste no Supabase...');
    const dbCat = await sbCall('/rest/v1/categories', {
      method: 'POST',
      useServiceRole: true,
      body: { name: 'Marmitas M4 E2E', slug: `marmitas-m4-e2e-${Date.now()}`, sort_order: 96 }
    });
    createdIds.categoryId = dbCat.data[0].id;

    // Produto 1: Combo, estoque = 10
    const dbP1 = await sbCall('/rest/v1/products', {
      method: 'POST',
      useServiceRole: true,
      body: {
        category_id: createdIds.categoryId,
        sku: `TEST-E2E-M4-COMBO-${Date.now()}`,
        name: 'Marmita M4 Combo Teste',
        price: 30.00,
        stock_type: 'combo',
        stock_quantity: 10,
        is_active: true
      }
    });
    createdIds.productIds.push(dbP1.data[0].id);

    // Produto 2: Avulso, estoque = 5
    const dbP2 = await sbCall('/rest/v1/products', {
      method: 'POST',
      useServiceRole: true,
      body: {
        category_id: createdIds.categoryId,
        sku: `TEST-E2E-M4-AVULSO-${Date.now()}`,
        name: 'Marmita M4 Avulsa Teste',
        price: 20.00,
        stock_type: 'avulso',
        stock_quantity: 5,
        is_active: true
      }
    });
    createdIds.productIds.push(dbP2.data[0].id);

    const comboProduct = dbP1.data[0];
    const avulsoProduct = dbP2.data[0];

    // ----------------------------------------------------
    // TESTE 2: Queries e Consolidação da Produção D+1 (Cozinha)
    // ----------------------------------------------------
    log.step('TESTE 2 — Validando Consolidação da Produção D+1 da Cozinha...');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const afterTomorrow = new Date();
    afterTomorrow.setDate(afterTomorrow.getDate() + 2);
    const afterTomorrowStr = afterTomorrow.toISOString().split("T")[0];

    // 2.1 Criar pedidos de teste com datas e status diferentes
    // Pedido A: Entrega amanhã, status 'pending' (DEVE incluir na cozinha)
    const orderARes = await sbCall('/rest/v1/orders', {
      method: 'POST',
      useServiceRole: true,
      body: { customer_name: 'Cliente M4 E2E A', customer_phone: '41999996666', delivery_type: 'delivery', payment_method: 'pix', status: 'pending', subtotal: 80.00, total: 80.00, delivery_date: tomorrowStr }
    });
    const orderA = orderARes.data[0];
    createdIds.orderIds.push(orderA.id);
    await sbCall('/rest/v1/order_items', {
      method: 'POST',
      useServiceRole: true,
      body: [
        { order_id: orderA.id, product_id: comboProduct.id, product_name: comboProduct.name, product_sku: comboProduct.sku, quantity: 2, unit_price: 30.00 },
        { order_id: orderA.id, product_id: avulsoProduct.id, product_name: avulsoProduct.name, product_sku: avulsoProduct.sku, quantity: 1, unit_price: 20.00 }
      ]
    });

    // Pedido B: Entrega amanhã, status 'production' (DEVE incluir na cozinha)
    const orderBRes = await sbCall('/rest/v1/orders', {
      method: 'POST',
      useServiceRole: true,
      body: { customer_name: 'Cliente M4 E2E B', customer_phone: '41999996666', delivery_type: 'delivery', payment_method: 'pix', status: 'production', subtotal: 30.00, total: 30.00, delivery_date: tomorrowStr }
    });
    const orderB = orderBRes.data[0];
    createdIds.orderIds.push(orderB.id);
    await sbCall('/rest/v1/order_items', {
      method: 'POST',
      useServiceRole: true,
      body: [
        { order_id: orderB.id, product_id: comboProduct.id, product_name: comboProduct.name, product_sku: comboProduct.sku, quantity: 1, unit_price: 30.00 }
      ]
    });

    // Pedido C: Entrega amanhã, status 'cancelled' (DEVE ignorar na cozinha)
    const orderCRes = await sbCall('/rest/v1/orders', {
      method: 'POST',
      useServiceRole: true,
      body: { customer_name: 'Cliente M4 E2E C', customer_phone: '41999996666', delivery_type: 'delivery', payment_method: 'pix', status: 'cancelled', subtotal: 40.00, total: 40.00, delivery_date: tomorrowStr }
    });
    const orderC = orderCRes.data[0];
    createdIds.orderIds.push(orderC.id);
    await sbCall('/rest/v1/order_items', {
      method: 'POST',
      useServiceRole: true,
      body: [
        { order_id: orderC.id, product_id: avulsoProduct.id, product_name: avulsoProduct.name, product_sku: avulsoProduct.sku, quantity: 2, unit_price: 20.00 }
      ]
    });

    // Pedido D: Entrega depois de amanhã, status 'pending' (DEVE ignorar na cozinha)
    const orderDRes = await sbCall('/rest/v1/orders', {
      method: 'POST',
      useServiceRole: true,
      body: { customer_name: 'Cliente M4 E2E D', customer_phone: '41999996666', delivery_type: 'delivery', payment_method: 'pix', status: 'pending', subtotal: 30.00, total: 30.00, delivery_date: afterTomorrowStr }
    });
    const orderD = orderDRes.data[0];
    createdIds.orderIds.push(orderD.id);
    await sbCall('/rest/v1/order_items', {
      method: 'POST',
      useServiceRole: true,
      body: [
        { order_id: orderD.id, product_id: comboProduct.id, product_name: comboProduct.name, product_sku: comboProduct.sku, quantity: 1, unit_price: 30.00 }
      ]
    });

    log.info('Pedidos de teste criados no banco.');

    // 2.2 Executar a query simulando a página da cozinha (utilizando o token do usuário 'kitchen')
    const kitchenOrdersQuery = await sbCall(
      `/rest/v1/orders?select=*,order_items(*)&delivery_date=eq.${tomorrowStr}&status=neq.cancelled`,
      { token: kitchenToken }
    );

    if (kitchenOrdersQuery.ok && kitchenOrdersQuery.data) {
      const orders = kitchenOrdersQuery.data;
      
      // Filtrar apenas os criados por este teste para validar com precisão
      const filteredOrders = orders.filter((o: any) => 
        o.customer_name === 'Cliente M4 E2E A' || 
        o.customer_name === 'Cliente M4 E2E B' || 
        o.customer_name === 'Cliente M4 E2E C' || 
        o.customer_name === 'Cliente M4 E2E D'
      );

      log.info(`Query da Cozinha retornou ${filteredOrders.length} pedidos de teste válidos.`);
      
      const containsA = filteredOrders.some((o: any) => o.id === orderA.id);
      const containsB = filteredOrders.some((o: any) => o.id === orderB.id);
      const containsC = filteredOrders.some((o: any) => o.id === orderC.id);
      const containsD = filteredOrders.some((o: any) => o.id === orderD.id);

      if (containsA && containsB && !containsC && !containsD) {
        log.ok('Filtragem de pedidos D+1 e status ativo funcionou perfeitamente!');
      } else {
        log.fail(`Falha na filtragem da cozinha: A=${containsA}, B=${containsB}, C(cancelado)=${containsC}, D(depois de amanhã)=${containsD}`);
      }

      // 2.3 Simular a lógica de agregação do frontend (aggregateItems)
      const map: Record<string, { productName: string, productSku: string | null, totalQuantity: number }> = {};
      for (const order of filteredOrders) {
        for (const item of order.order_items) {
          const key = item.product_id ?? item.product_name;
          if (!map[key]) {
            map[key] = {
              productName: item.product_name,
              productSku: item.product_sku,
              totalQuantity: 0
            };
          }
          map[key].totalQuantity += item.quantity;
        }
      }

      const aggregated = Object.values(map);
      const comboAgg = aggregated.find(i => i.productSku === comboProduct.sku);
      const avulsoAgg = aggregated.find(i => i.productSku === avulsoProduct.sku);

      const comboQty = comboAgg?.totalQuantity ?? 0;
      const avulsoQty = avulsoAgg?.totalQuantity ?? 0;

      if (comboQty === 3 && avulsoQty === 1) {
        log.ok('Consolidação das marmitas para produção no painel da cozinha calculou os valores corretos!');
        log.info(`Valores agregados: Combo = ${comboQty}x (esperado: 3), Avulso = ${avulsoQty}x (esperado: 1).`);
      } else {
        log.fail(`Falha na consolidação: Combo=${comboQty} (esp: 3), Avulso=${avulsoQty} (esp: 1)`);
      }
    } else {
      log.fail(`Falha na query da cozinha: ${JSON.stringify(kitchenOrdersQuery.data)}`);
    }

    // ----------------------------------------------------
    // TESTE 3: Ajuste de Freezer (RPC adjust_stock)
    // ----------------------------------------------------
    log.step('TESTE 3 — Validando Ajuste de Freezer (RPC adjust_stock)...');

    // 3.1 Executar a RPC adjust_stock com o token da Cozinha (Patrícia)
    log.info(`Cozinha chamando RPC adjust_stock para alterar estoque do Combo de 10 para 12...`);
    const adjustRpcRes = await sbCall('/rest/v1/rpc/adjust_stock', {
      method: 'POST',
      token: kitchenToken,
      body: {
        p_product_id: comboProduct.id,
        p_new_quantity: 12,
        p_notes: "Contagem fisica do freezer"
      }
    });

    if (adjustRpcRes.ok) {
      log.ok('RPC adjust_stock executada com sucesso pelo usuário da Cozinha.');
      
      // 3.2 Verificar alteração do estoque
      const checkStock = await sbCall(`/rest/v1/products?id=eq.${comboProduct.id}&select=stock_quantity`, { useServiceRole: true });
      const currentQty = checkStock.data?.[0]?.stock_quantity;
      if (currentQty === 12) {
        log.ok('Quantidade de estoque de combo atualizada no banco de dados para 12.');
      } else {
        log.fail(`Quantidade de estoque incorreta após ajuste: ${currentQty} (esperado: 12).`);
      }

      // 3.3 Verificar auditoria gerada em stock_movements
      const checkAudit = await sbCall(
        `/rest/v1/stock_movements?product_id=eq.${comboProduct.id}&type=eq.adjustment&notes=eq.Contagem fisica do freezer`,
        { useServiceRole: true }
      );
      if (checkAudit.data && checkAudit.data.length > 0) {
        const audit = checkAudit.data[0];
        const isDeltaCorrect = audit.quantity === 2; // 12 - 10 = 2
        const isUserCorrect = audit.created_by === createdIds.kitchenUserId;

        if (isDeltaCorrect && isUserCorrect) {
          log.ok('Trilha de auditoria gerada corretamente: delta +2 e autoria vinculada ao ID da Cozinha.');
        } else {
          log.fail(`Auditoria incorreta: delta=${audit.quantity} (esp: 2), created_by=${audit.created_by} (esp: ${createdIds.kitchenUserId}).`);
        }
      } else {
        log.fail('Nenhuma movimentação de auditoria de ajuste de freezer encontrada no banco.');
      }
    } else {
      log.fail(`Falha ao executar a RPC adjust_stock: ${JSON.stringify(adjustRpcRes.data)}`);
    }

    log.head('SUÍTE DE TESTES DO M4 FINALIZADA');

  } catch (error: any) {
    log.fail(`Erro durante a execução da suíte de testes do M4: ${error.message}`);
    console.error(error);
  } finally {
    // Cleanup
    log.step('Cleanup: Limpando resíduos de teste do M4 no banco remoto...');
    
    if (createdIds.orderIds.length > 0) {
      for (const orderId of createdIds.orderIds) {
        await sbCall(`/rest/v1/orders?id=eq.${orderId}`, { method: 'DELETE', useServiceRole: true });
      }
    }
    if (createdIds.productIds.length > 0) {
      for (const prodId of createdIds.productIds) {
        await sbCall(`/rest/v1/products?id=eq.${prodId}`, { method: 'DELETE', useServiceRole: true });
      }
    }
    if (createdIds.categoryId) {
      await sbCall(`/rest/v1/categories?id=eq.${createdIds.categoryId}`, { method: 'DELETE', useServiceRole: true });
    }
    if (createdIds.kitchenUserId) {
      await authAdminCall(`/users/${createdIds.kitchenUserId}`, { method: 'DELETE' });
    }
    
    log.ok('Cleanup de dados M4 concluído com sucesso!');
  }
}

run();
