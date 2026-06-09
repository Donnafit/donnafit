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
  log.step('Cleanup Inicial: Removendo resíduos de testes anteriores do M5...');
  
  // 1. Deletar pedidos de teste
  const getOrders = await sbCall('/rest/v1/orders?customer_name=like.Cliente M5 E2E*&select=id', { useServiceRole: true });
  if (getOrders.ok && getOrders.data?.length > 0) {
    for (const order of getOrders.data) {
      await sbCall(`/rest/v1/orders?id=eq.${order.id}`, { method: 'DELETE', useServiceRole: true });
    }
    log.ok('Pedidos antigos de teste do M5 removidos.');
  }

  // 2. Deletar produtos de teste
  const getProds = await sbCall('/rest/v1/products?sku=like.TEST-E2E-M5-*&select=id', { useServiceRole: true });
  if (getProds.ok && getProds.data?.length > 0) {
    for (const prod of getProds.data) {
      await sbCall(`/rest/v1/products?id=eq.${prod.id}`, { method: 'DELETE', useServiceRole: true });
    }
    log.ok('Produtos antigos de teste do M5 removidos.');
  }

  // 3. Deletar categorias de teste
  const getCats = await sbCall('/rest/v1/categories?slug=like.marmitas-m5-e2e-*&select=id', { useServiceRole: true });
  if (getCats.ok && getCats.data?.length > 0) {
    for (const cat of getCats.data) {
      await sbCall(`/rest/v1/categories?id=eq.${cat.id}`, { method: 'DELETE', useServiceRole: true });
    }
    log.ok('Categorias antigas de teste do M5 removidas.');
  }

  // 4. Deletar usuários antigos do Auth
  const getUsers = await authAdminCall('/users?per_page=100', { method: 'GET' });
  if (getUsers.ok && getUsers.data?.users?.length > 0) {
    for (const user of getUsers.data.users) {
      if (user.email && user.email.startsWith('test.m5.e2e.')) {
        await authAdminCall(`/users/${user.id}`, { method: 'DELETE' });
      }
    }
    log.ok('Usuários antigos do Auth de testes do M5 removidos.');
  }
}

async function run() {
  log.head('MARCO 5 — HOMOLOGAÇÃO INTEGRADA & CONCORRÊNCIA');
  
  const createdIds: {
    adminUserId: string | null,
    kitchenUserId: string | null,
    categoryId: string | null,
    productIds: string[],
    orderIds: string[]
  } = {
    adminUserId: null,
    kitchenUserId: null,
    categoryId: null,
    productIds: [],
    orderIds: []
  };

  let adminToken: string | null = null;
  let kitchenToken: string | null = null;

  try {
    // Executar pré-limpeza
    await preCleanup();

    // ----------------------------------------------------
    // SETUP DE USUÁRIOS: Criar Admin e Cozinha
    // ----------------------------------------------------
    log.step('Setup: Criando usuários de teste para homologação (Admin e Cozinha)...');
    
    // 1. Criar Admin
    const adminEmail = `test.m5.e2e.admin.${Date.now()}@donnafit.com.br`;
    const adminPass = 'PasswordE2ETest123!';
    const adminRes = await authAdminCall('/users', {
      method: 'POST',
      body: { email: adminEmail, password: adminPass, email_confirm: true, user_metadata: { full_name: 'Admin M5 Everson' } }
    });
    createdIds.adminUserId = adminRes.data.id;
    await sbCall(`/rest/v1/profiles?id=eq.${createdIds.adminUserId}`, { method: 'PATCH', useServiceRole: true, body: { role: 'admin' } });

    // 2. Criar Cozinha
    const kitchenEmail = `test.m5.e2e.kitchen.${Date.now()}@donnafit.com.br`;
    const kitchenPass = 'PasswordE2ETest123!';
    const kitchenRes = await authAdminCall('/users', {
      method: 'POST',
      body: { email: kitchenEmail, password: kitchenPass, email_confirm: true, user_metadata: { full_name: 'Cozinha M5 Patricia' } }
    });
    createdIds.kitchenUserId = kitchenRes.data.id;
    await sbCall(`/rest/v1/profiles?id=eq.${createdIds.kitchenUserId}`, { method: 'PATCH', useServiceRole: true, body: { role: 'kitchen' } });

    // Logins
    const adminLogin = await authPublicCall('/token?grant_type=password', { method: 'POST', body: { email: adminEmail, password: adminPass } });
    adminToken = adminLogin.data.access_token;

    const kitchenLogin = await authPublicCall('/token?grant_type=password', { method: 'POST', body: { email: kitchenEmail, password: kitchenPass } });
    kitchenToken = kitchenLogin.data.access_token;

    log.ok('Usuários criados e autenticados com sucesso.');

    // Setup de Categoria
    const dbCat = await sbCall('/rest/v1/categories', {
      method: 'POST',
      useServiceRole: true,
      body: { name: 'Marmitas M5 E2E', slug: `marmitas-m5-e2e-${Date.now()}`, sort_order: 95 }
    });
    createdIds.categoryId = dbCat.data[0].id;

    // ----------------------------------------------------
    // TESTE 1: Fluxo do Ciclo de Vida do Pedido
    // ----------------------------------------------------
    log.step('TESTE 1 — Validando Ciclo de Vida Integrado do Pedido (Ponta a Ponta)...');

    // 1.1 Criar produtos de teste
    const dbP1 = await sbCall('/rest/v1/products', {
      method: 'POST',
      useServiceRole: true,
      body: { category_id: createdIds.categoryId, sku: `TEST-E2E-M5-COMBO-${Date.now()}`, name: 'M5 Combo Teste', price: 30.00, stock_type: 'combo', stock_quantity: 10, is_active: true }
    });
    createdIds.productIds.push(dbP1.data[0].id);

    const dbP2 = await sbCall('/rest/v1/products', {
      method: 'POST',
      useServiceRole: true,
      body: { category_id: createdIds.categoryId, sku: `TEST-E2E-M5-AVULSO-${Date.now()}`, name: 'M5 Avulso Teste', price: 20.00, stock_type: 'avulso', stock_quantity: 5, is_active: true }
    });
    createdIds.productIds.push(dbP2.data[0].id);

    const comboProduct = dbP1.data[0];
    const avulsoProduct = dbP2.data[0];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // 1.2 Checkout anônimo (cliente criando pedido)
    const orderRes = await sbCall('/rest/v1/orders', {
      method: 'POST',
      useServiceRole: true,
      body: { customer_name: 'Cliente M5 E2E Ciclo', customer_phone: '41999995555', delivery_type: 'delivery', payment_method: 'pix', status: 'pending', subtotal: 80.00, total: 80.00, delivery_date: tomorrowStr }
    });
    const order = orderRes.data[0];
    createdIds.orderIds.push(order.id);

    await sbCall('/rest/v1/order_items', {
      method: 'POST',
      useServiceRole: true,
      body: [
        { order_id: order.id, product_id: comboProduct.id, product_name: comboProduct.name, product_sku: comboProduct.sku, quantity: 2, unit_price: 30.00 },
        { order_id: order.id, product_id: avulsoProduct.id, product_name: avulsoProduct.name, product_sku: avulsoProduct.sku, quantity: 1, unit_price: 20.00 }
      ]
    });
    log.info('Checkout simulado no banco.');

    // 1.3 Executar reserva de estoque de checkout para o item combo
    await sbCall('/rest/v1/rpc/reserve_stock', {
      method: 'POST',
      body: { p_product_id: comboProduct.id, p_quantity: 2, p_order_id: order.id }
    });

    // Validar estados iniciais
    const p1Check1 = await sbCall(`/rest/v1/products?id=eq.${comboProduct.id}&select=stock_quantity`, { useServiceRole: true });
    const p2Check1 = await sbCall(`/rest/v1/products?id=eq.${avulsoProduct.id}&select=stock_quantity`, { useServiceRole: true });
    
    if (p1Check1.data[0].stock_quantity === 8 && p2Check1.data[0].stock_quantity === 5) {
      log.ok('Checkout reservou estoque do combo (10->8) e manteve avulso intacto (5->5).');
    } else {
      log.fail(`Setup de checkout incorreto: Combo=${p1Check1.data[0].stock_quantity}, Avulso=${p2Check1.data[0].stock_quantity}`);
    }

    // 1.4 Admin muda status para "production" (Kanban)
    log.info('Admin atualizando status do pedido para "production"...');
    await sbCall(`/rest/v1/orders?id=eq.${order.id}`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'production' }
    });

    // Validar trigger de dedução de avulso
    const p2Check2 = await sbCall(`/rest/v1/products?id=eq.${avulsoProduct.id}&select=stock_quantity`, { useServiceRole: true });
    if (p2Check2.data[0].stock_quantity === 4) {
      log.ok('Trigger automática detectou "production" e baixou estoque do avulso (5->4).');
    } else {
      log.fail(`Trigger de baixa de avulso falhou. Estoque atual: ${p2Check2.data[0].stock_quantity}`);
    }

    const auditCheck = await sbCall(`/rest/v1/stock_movements?product_id=eq.${avulsoProduct.id}&reference_id=eq.${order.id}&type=eq.deduction`, { useServiceRole: true });
    if (auditCheck.data?.length > 0 && auditCheck.data[0].quantity === -1) {
      log.ok('Movimentação de dedução (-1) registrada em stock_movements via trigger.');
    } else {
      log.fail('Auditoria de dedução não foi gerada no banco.');
    }

    // 1.5 Cozinha lê painel de produção
    log.info('Cozinha lendo painel D+1...');
    const kitchenQuery = await sbCall(`/rest/v1/orders?select=*,order_items(*)&delivery_date=eq.${tomorrowStr}&status=neq.cancelled`, { token: kitchenToken });
    const containsOrder = kitchenQuery.data?.some((o: any) => o.id === order.id);
    if (containsOrder) {
      log.ok('Pedido visível corretamente no painel consolidado da Cozinha.');
    } else {
      log.fail('Cozinha não conseguiu ver o pedido ativo.');
    }

    // 1.6 Admin avança status para pronto e entregue
    log.info('Admin avançando status para "delivered"...');
    await sbCall(`/rest/v1/orders?id=eq.${order.id}`, { method: 'PATCH', token: adminToken, body: { status: 'delivered' } });

    const orderStatusCheck = await sbCall(`/rest/v1/orders?id=eq.${order.id}&select=status`, { useServiceRole: true });
    if (orderStatusCheck.data[0].status === 'delivered') {
      log.ok('Pedido entregue com sucesso.');
    }

    // 1.7 Cancelamento de Pedido
    log.info('Admin atualizando status do pedido para "cancelled" (para sumir da tela)...');
    await sbCall(`/rest/v1/orders?id=eq.${order.id}`, { method: 'PATCH', token: adminToken, body: { status: 'cancelled' } });

    // Cozinha e Kanban não devem ver pedidos cancelados
    const kitchenQueryCancelled = await sbCall(`/rest/v1/orders?select=*,order_items(*)&delivery_date=eq.${tomorrowStr}&status=neq.cancelled`, { token: kitchenToken });
    const containsOrderCancelled = kitchenQueryCancelled.data?.some((o: any) => o.id === order.id);
    if (!containsOrderCancelled) {
      log.ok('Pedido cancelado sumiu com sucesso do painel ativo da Cozinha.');
    } else {
      log.fail('Pedido cancelado continua listado no painel da Cozinha!');
    }

    // ----------------------------------------------------
    // TESTE 2: Concorrência e Atomicidade (Condição de Corrida)
    // ----------------------------------------------------
    log.step('TESTE 2 — Validando Robustez de Estoque sob Carga e Concorrência...');

    // 2.1 Criar produto combo exclusivo de teste com estoque limite = 5
    const dbLimitProd = await sbCall('/rest/v1/products', {
      method: 'POST',
      useServiceRole: true,
      body: {
        category_id: createdIds.categoryId,
        sku: `TEST-E2E-M5-LIMIT-${Date.now()}`,
        name: 'M5 Combo Concorrente Teste',
        price: 15.00,
        stock_type: 'combo',
        stock_quantity: 5,
        is_active: true
      }
    });
    const limitProduct = dbLimitProd.data[0];
    createdIds.productIds.push(limitProduct.id);
    log.info(`Produto concorrência criado com ID: ${limitProduct.id} (Estoque inicial: 5)`);

    // 2.2 Criar um pedido dummy para satisfazer a constraint de reference_id de stock_movements
    const dummyOrder = await sbCall('/rest/v1/orders', {
      method: 'POST',
      useServiceRole: true,
      body: { customer_name: 'Cliente M5 E2E Concorrente', customer_phone: '41999995555', delivery_type: 'pickup', payment_method: 'card', status: 'pending', subtotal: 0, total: 0, delivery_date: tomorrowStr }
    });
    createdIds.orderIds.push(dummyOrder.data[0].id);

    // 2.3 Disparar 30 chamadas simultâneas de reserve_stock concorrentemente
    log.info('Disparando 30 reservas simultâneas no banco em paralelo via Promise.all...');
    
    const concurrencyCount = 30;
    const calls = Array.from({ length: concurrencyCount }).map(async (_, index) => {
      // Pequeno delay aleatório entre 0 e 50ms para estressar a disputa simultânea
      await new Promise(r => setTimeout(r, Math.random() * 50));
      return sbCall('/rest/v1/rpc/reserve_stock', {
        method: 'POST',
        body: {
          p_product_id: limitProduct.id,
          p_quantity: 1,
          p_order_id: dummyOrder.data[0].id
        }
      });
    });

    const results = await Promise.all(calls);

    // 2.4 Analisar os resultados das transações
    const successes = results.filter(r => r.ok).length;
    const failures = results.filter(r => !r.ok).length;

    log.info(`Resultados do ataque: Sucessos = ${successes}, Falhas = ${failures}`);

    if (successes === 5) {
      log.ok('Disputa concorrente tratada perfeitamente: exatamente 5 reservas tiveram sucesso.');
    } else {
      log.fail(`Falha na concorrência: ${successes} reservas tiveram sucesso (esperava exatamente 5).`);
    }

    if (failures === 25) {
      log.ok('Tratamento de concorrência: exatamente 25 requisições foram rejeitadas com erro de estoque.');
    } else {
      log.warn(`Número de falhas diferente do esperado: ${failures} (esperava exatamente 25).`);
    }

    // 2.5 Verificar saldo final de estoque no banco
    const checkLimitProdFinal = await sbCall(`/rest/v1/products?id=eq.${limitProduct.id}&select=stock_quantity`, { useServiceRole: true });
    const finalStock = checkLimitProdFinal.data[0].stock_quantity;

    if (finalStock === 0) {
      log.ok('Garantia de consistência: O estoque final do produto terminou exatamente em 0.');
    } else {
      log.fail(`Garantia violada! O estoque final terminou em ${finalStock} (esperava 0).`);
    }

    // 2.6 Verificar auditoria no banco
    const movementsCheck = await sbCall(
      `/rest/v1/stock_movements?product_id=eq.${limitProduct.id}&reference_id=eq.${dummyOrder.data[0].id}&type=eq.reservation`,
      { useServiceRole: true }
    );
    const movesCount = movementsCheck.data?.length ?? 0;
    
    if (movesCount === 5) {
      log.ok('Consistência de trilha: exatamente 5 movimentações de reserva foram registradas em stock_movements.');
    } else {
      log.fail(`Trilha de auditoria corrompida: ${movesCount} movimentações criadas (esperava 5).`);
    }

    log.head('SUÍTE DE TESTES DO M5 FINALIZADA');

  } catch (error: any) {
    log.fail(`Erro durante a execução da suíte de testes do M5: ${error.message}`);
    console.error(error);
  } finally {
    // Cleanup
    log.step('Cleanup: Limpando resíduos de teste do M5 no banco remoto...');
    
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
    if (createdIds.adminUserId) {
      await authAdminCall(`/users/${createdIds.adminUserId}`, { method: 'DELETE' });
    }
    if (createdIds.kitchenUserId) {
      await authAdminCall(`/users/${createdIds.kitchenUserId}`, { method: 'DELETE' });
    }
    
    log.ok('Cleanup de dados M5 concluído com sucesso!');
  }
}

run();
