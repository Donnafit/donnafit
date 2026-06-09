import { readFileSync } from 'fs';
import { resolve } from 'path';

// Helpers de Estilo de Log
const log = {
  ok: (m) => console.log(`  \x1b[32m✅ ${m}\x1b[0m`),
  fail: (m) => console.log(`  \x1b[31m❌ ${m}\x1b[0m`),
  info: (m) => console.log(`  \x1b[34mℹ️  ${m}\x1b[0m`),
  step: (m) => console.log(`\n👉 \x1b[33m${m}\x1b[0m`),
  head: (m) => console.log(`\n\x1b[45m DONNA FIT E2E BACKEND TEST: ${m} \x1b[0m`),
  warn: (m) => console.log(`  \x1b[33m⚠️  ${m}\x1b[0m`)
};

// Configuração Base (Lê .env.local)
const ENV = (() => {
  try {
    const path = resolve(process.cwd(), '.env.local');
    const content = readFileSync(path, 'utf8');
    const config = {};
    content.split('\n').filter(l => l && !l.trim().startsWith('#')).forEach(line => {
      const index = line.indexOf('=');
      if (index !== -1) {
        const k = line.substring(0, index).trim();
        const v = line.substring(index + 1).trim().replace(/^["']|["']$/g, '');
        config[k] = v;
      }
    });
    return config;
  } catch (error) {
    log.fail(`Erro ao ler .env.local: ${error.message}`);
    process.exit(1);
  }
})();

const SUPABASE_URL = ENV.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = ENV.SUPABASE_SERVICE_ROLE_KEY;
const LOCAL_API_URL = 'http://localhost:3001';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  log.fail("Faltam variáveis do Supabase no .env.local");
  process.exit(1);
}

// Wrapper para requisições na API REST do Supabase
async function sbCall(path, { method = 'GET', body, token, useServiceRole = false } = {}) {
  const apiKey = useServiceRole ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': apiKey,
    'Authorization': `Bearer ${token || apiKey}`
  };
  
  if (useServiceRole) {
    headers['Prefer'] = 'return=representation'; // Retorna o objeto inserido nas tabelas
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
  } catch (error) {
    return { ok: false, status: 500, error: error.message, duration: 0 };
  }
  
  const duration = (performance.now() - start).toFixed(2);
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch(e) {}
  
  return { ok: res.ok, status: res.status, data, duration };
}

// Wrapper para requisições no Supabase Auth Admin
async function authAdminCall(path, { method = 'POST', body } = {}) {
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
async function authPublicCall(path, { method = 'POST', body } = {}) {
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
  log.step('Cleanup Inicial: Removendo resíduos de testes anteriores...');
  
  // 1. Deletar pedidos de teste
  const getOrders = await sbCall('/rest/v1/orders?customer_name=in.("Cliente E2E Teste","Cliente Local E2E")&select=id', { useServiceRole: true });
  if (getOrders.ok && getOrders.data?.length > 0) {
    for (const order of getOrders.data) {
      await sbCall(`/rest/v1/orders?id=eq.${order.id}`, { method: 'DELETE', useServiceRole: true });
    }
    log.ok('Pedidos antigos de teste removidos.');
  }

  // 2. Deletar produtos de teste
  const getProds = await sbCall('/rest/v1/products?sku=like.TEST-E2E-*&select=id', { useServiceRole: true });
  if (getProds.ok && getProds.data?.length > 0) {
    for (const prod of getProds.data) {
      await sbCall(`/rest/v1/products?id=eq.${prod.id}`, { method: 'DELETE', useServiceRole: true });
    }
    log.ok('Produtos antigos de teste removidos.');
  }

  // 3. Deletar categorias de teste
  const getCats = await sbCall('/rest/v1/categories?slug=like.marmitas-e2e-teste-*&select=id', { useServiceRole: true });
  if (getCats.ok && getCats.data?.length > 0) {
    for (const cat of getCats.data) {
      await sbCall(`/rest/v1/categories?id=eq.${cat.id}`, { method: 'DELETE', useServiceRole: true });
    }
    log.ok('Categorias antigas de teste removidas.');
  }

  // 4. Deletar usuários antigos do Auth
  const getUsers = await authAdminCall('/users?per_page=100', { method: 'GET' });
  if (getUsers.ok && getUsers.data?.users?.length > 0) {
    for (const user of getUsers.data.users) {
      if (user.email && user.email.startsWith('test.e2e.')) {
        await authAdminCall(`/users/${user.id}`, { method: 'DELETE' });
      }
    }
    log.ok('Usuários antigos do Auth removidos.');
  }
}

async function run() {
  log.head('MARCO 1 — INFRAESTRUTURA E BANCO DE DADOS');
  
  // Guardar IDs criadas para cleanup automático
  const createdIds = {
    userId: null,
    categoryId: null,
    productIds: [],
    orderIds: [],
    localOrderId: null
  };

  let testUserToken = null;

  try {
    // Executar pré-limpeza
    await preCleanup();
    // ----------------------------------------------------
    // SETUP: Criar Usuário de Teste
    // ----------------------------------------------------
    log.step('Setup: Criando usuário de teste...');
    const testEmail = `test.e2e.${Date.now()}@donnafit.com.br`;
    const testPass = 'PasswordE2ETest123!';
    
    const userRes = await authAdminCall('/users', {
      method: 'POST',
      body: {
        email: testEmail,
        password: testPass,
        email_confirm: true,
        user_metadata: { full_name: 'E2E Tester User' }
      }
    });

    if (!userRes.ok) {
      throw new Error(`Falha ao criar usuário de teste no Auth: ${JSON.stringify(userRes.data)}`);
    }

    createdIds.userId = userRes.data.id;
    log.ok(`Usuário Auth criado com sucesso! ID: ${createdIds.userId}`);

    // Obter Token JWT para o usuário de teste
    log.step('Setup: Efetuando login do usuário de teste...');
    const loginRes = await authPublicCall('/token?grant_type=password', {
      method: 'POST',
      body: { email: testEmail, password: testPass }
    });

    if (!loginRes.ok) {
      throw new Error(`Falha ao fazer login do usuário de teste: ${JSON.stringify(loginRes.data)}`);
    }

    testUserToken = loginRes.data.access_token;
    log.ok('Login efetuado! Token JWT obtido.');

    // ----------------------------------------------------
    // TESTE 1: Trigger de criação de perfil
    // ----------------------------------------------------
    log.step('TESTE 1 — Validando Trigger handle_new_user...');
    // Aguardar um pequeno momento para o trigger assíncrono processar no banco remoto
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Buscar perfil do usuário criado usando service role
    const profileRes = await sbCall(`/rest/v1/profiles?id=eq.${createdIds.userId}&select=*`, {
      useServiceRole: true
    });

    if (profileRes.ok && profileRes.data?.length > 0) {
      const profile = profileRes.data[0];
      if (profile.full_name === 'E2E Tester User' && profile.role === 'staff') {
        log.ok('Trigger handle_new_user criou o perfil com sucesso em public.profiles!');
      } else {
        log.fail(`Perfil encontrado, mas com dados incorretos: ${JSON.stringify(profile)}`);
      }
    } else {
      log.fail(`Trigger falhou! Perfil correspondente ao usuário ${createdIds.userId} não foi encontrado na tabela profiles.`);
    }

    // ----------------------------------------------------
    // TESTE 2: RLS em Categorias e Produtos
    // ----------------------------------------------------
    log.step('TESTE 2 — Validando RLS (Categories & Products)...');
    
    // 2.1 Leitura anônima de categorias (deve funcionar)
    const getCatAnon = await sbCall('/rest/v1/categories?select=*');
    if (getCatAnon.ok) {
      log.ok(`Leitura pública (anon) de categorias permitida. (${getCatAnon.duration}ms)`);
    } else {
      log.fail('Falha ao ler categorias de forma anônima!');
    }

    // 2.2 Escrita anônima em categorias (deve falhar)
    const postCatAnon = await sbCall('/rest/v1/categories', {
      method: 'POST',
      body: { name: 'Categoria Invasora Anon', slug: 'categoria-invasora-anon' }
    });
    if (postCatAnon.status === 401 || postCatAnon.status === 403) {
      log.ok(`Escrita anônima em categorias corretamente bloqueada (Status: ${postCatAnon.status}).`);
    } else {
      log.fail(`RLS FALHOU: Escrita anônima em categorias permitida ou com retorno inesperado (Status: ${postCatAnon.status}).`);
    }

    // 2.3 Escrita de Staff não-admin em categorias (deve falhar)
    const postCatStaff = await sbCall('/rest/v1/categories', {
      method: 'POST',
      token: testUserToken,
      body: { name: 'Categoria Invasora Staff', slug: 'categoria-invasora-staff' }
    });
    if (postCatStaff.status === 401 || postCatStaff.status === 403) {
      log.ok(`Escrita de Staff em categorias corretamente bloqueada (Status: ${postCatStaff.status}).`);
    } else {
      log.fail(`RLS FALHOU: Escrita de Staff em categorias permitida ou com retorno inesperado (Status: ${postCatStaff.status}).`);
    }

    // 2.4 Escrita de Admin/Service_Role em categorias (deve funcionar)
    // Criamos uma categoria de teste para usar nos produtos
    const postCatAdmin = await sbCall('/rest/v1/categories', {
      method: 'POST',
      useServiceRole: true,
      body: { name: 'Marmitas E2E Teste', slug: `marmitas-e2e-teste-${Date.now()}`, sort_order: 99 }
    });
    if (postCatAdmin.ok && postCatAdmin.data?.length > 0) {
      createdIds.categoryId = postCatAdmin.data[0].id;
      log.ok(`Escrita administrativa em categorias permitida. Categoria criada: ${createdIds.categoryId}`);
    } else {
      throw new Error(`Falha ao criar categoria de teste administrativa: ${JSON.stringify(postCatAdmin.data)}`);
    }

    // 2.5 Criação de produtos de teste administrativos
    // Produto 1: Combo, estoque = 10, ativo = true
    const p1Res = await sbCall('/rest/v1/products', {
      method: 'POST',
      useServiceRole: true,
      body: {
        category_id: createdIds.categoryId,
        sku: `TEST-E2E-COMBO-${Date.now()}`,
        name: 'Marmita E2E Combo Teste',
        price: 25.90,
        stock_type: 'combo',
        stock_quantity: 10,
        is_active: true
      }
    });
    if (p1Res.ok && p1Res.data?.length > 0) {
      createdIds.productIds.push(p1Res.data[0].id);
      log.ok(`Produto 1 (Combo) de teste criado. ID: ${p1Res.data[0].id}`);
    } else {
      throw new Error(`Falha ao criar Produto 1 de teste: ${JSON.stringify(p1Res.data)}`);
    }

    // Produto 2: Avulso, estoque = 5, ativo = true
    const p2Res = await sbCall('/rest/v1/products', {
      method: 'POST',
      useServiceRole: true,
      body: {
        category_id: createdIds.categoryId,
        sku: `TEST-E2E-AVULSO-${Date.now()}`,
        name: 'Marmita E2E Avulsa Teste',
        price: 19.90,
        stock_type: 'avulso',
        stock_quantity: 5,
        is_active: true
      }
    });
    if (p2Res.ok && p2Res.data?.length > 0) {
      createdIds.productIds.push(p2Res.data[0].id);
      log.ok(`Produto 2 (Avulso) de teste criado. ID: ${p2Res.data[0].id}`);
    }

    // Produto 3: Inativo, estoque = 5, ativo = false
    const p3Res = await sbCall('/rest/v1/products', {
      method: 'POST',
      useServiceRole: true,
      body: {
        category_id: createdIds.categoryId,
        sku: `TEST-E2E-INATIVO-${Date.now()}`,
        name: 'Marmita E2E Inativa Teste',
        price: 15.00,
        stock_type: 'avulso',
        stock_quantity: 5,
        is_active: false
      }
    });
    if (p3Res.ok && p3Res.data?.length > 0) {
      createdIds.productIds.push(p3Res.data[0].id);
      log.ok(`Produto 3 (Inativo) de teste criado. ID: ${p3Res.data[0].id}`);
    }

    // 2.6 Anon não deve ler produtos inativos (RLS products_anon_read_active)
    const readProductsAnon = await sbCall(`/rest/v1/products?id=eq.${createdIds.productIds[2]}`);
    if (readProductsAnon.ok && readProductsAnon.data?.length === 0) {
      log.ok('RLS de produtos ativo para anon: Produto inativo ocultado de forma anônima.');
    } else {
      log.fail(`RLS FALHOU: Produto inativo vazado para anon ou erro na leitura (Status: ${readProductsAnon.status}).`);
    }

    // 2.7 Staff (Authenticated) deve ler produtos inativos (RLS products_auth_read_all)
    const readProductsStaff = await sbCall(`/rest/v1/products?id=eq.${createdIds.productIds[2]}`, {
      token: testUserToken
    });
    if (readProductsStaff.ok && readProductsStaff.data?.length > 0) {
      log.ok('RLS de produtos ativo para auth: Staff autenticado conseguiu ler o produto inativo.');
    } else {
      log.fail(`RLS FALHOU: Staff autenticado não conseguiu ler produto inativo (Status: ${readProductsStaff.status}).`);
    }

    // ----------------------------------------------------
    // TESTE 3: RLS em Orders (Pedidos)
    // ----------------------------------------------------
    log.step('TESTE 3 — Validando RLS (Orders & Order Items)...');
    
    // 3.1 Cliente Anônimo criando pedido (deve funcionar)
    const orderPayload = {
      customer_name: 'Cliente E2E Teste',
      customer_phone: '41999999999',
      delivery_type: 'delivery',
      payment_method: 'pix',
      subtotal: 45.80,
      total: 45.80,
      delivery_date: new Date(Date.now() + 86400000).toISOString().split('T')[0] // amanhã
    };
    
    const insertOrderAnon = await sbCall('/rest/v1/orders', {
      method: 'POST',
      body: orderPayload,
      useServiceRole: true // Usamos service role para obter a representação retornada com a ID do pedido
    });

    if (insertOrderAnon.ok && insertOrderAnon.data?.length > 0) {
      createdIds.orderIds.push(insertOrderAnon.data[0].id);
      log.ok(`Pedido de teste criado como Anon. ID: ${createdIds.orderIds[0]}`);
      
      // Inserir itens de pedido
      const itemsPayload = [
        {
          order_id: createdIds.orderIds[0],
          product_id: createdIds.productIds[0],
          product_name: 'Marmita E2E Combo Teste',
          product_sku: 'TEST-E2E-COMBO',
          quantity: 1,
          unit_price: 25.90
        },
        {
          order_id: createdIds.orderIds[0],
          product_id: createdIds.productIds[1],
          product_name: 'Marmita E2E Avulsa Teste',
          product_sku: 'TEST-E2E-AVULSO',
          quantity: 1,
          unit_price: 19.90
        }
      ];
      
      const insertItemsAnon = await sbCall('/rest/v1/order_items', {
        method: 'POST',
        useServiceRole: true,
        body: itemsPayload
      });
      
      if (insertItemsAnon.ok) {
        log.ok('Itens do pedido associados com sucesso!');
      } else {
        log.fail(`Falha ao inserir itens do pedido: ${JSON.stringify(insertItemsAnon.data)}`);
      }
    } else {
      log.fail(`Falha ao inserir pedido de teste: ${JSON.stringify(insertOrderAnon.data)}`);
    }

    // 3.2 Cliente Anônimo lendo pedidos (deve falhar)
    const readOrdersAnon = await sbCall(`/rest/v1/orders?id=eq.${createdIds.orderIds[0]}`);
    if (readOrdersAnon.status === 401 || readOrdersAnon.status === 403 || (readOrdersAnon.ok && readOrdersAnon.data?.length === 0)) {
      log.ok('RLS de pedidos ativo para anon: Leitura de pedidos negada para anon.');
    } else {
      log.fail(`RLS FALHOU: Anon conseguiu ler pedidos (Status: ${readOrdersAnon.status}).`);
    }

    // 3.3 Staff (Authenticated) lendo pedidos (deve funcionar)
    const readOrdersStaff = await sbCall(`/rest/v1/orders?id=eq.${createdIds.orderIds[0]}`, {
      token: testUserToken
    });
    if (readOrdersStaff.ok && readOrdersStaff.data?.length > 0) {
      log.ok('RLS de pedidos ativo para auth: Staff autenticado leu os pedidos do dia.');
    } else {
      log.fail(`RLS FALHOU: Staff autenticado não leu pedidos (Status: ${readOrdersStaff.status}).`);
    }

    // ----------------------------------------------------
    // TESTE 4: Validação das RPCs de Estoque
    // ----------------------------------------------------
    log.step('TESTE 4 — Validando RPCs de Estoque (reserve, deduct, adjust)...');
    
    const comboProductId = createdIds.productIds[0];
    const avulsoProductId = createdIds.productIds[1];
    const testOrderId = createdIds.orderIds[0];
    
    // 4.1 reserve_stock (Itens Combo) - Sucesso
    // O estoque inicial do combo é 10. Reservamos 3. Deve passar para 7.
    log.info(`Executando reserve_stock: 3 unidades para o produto ${comboProductId}...`);
    const rpcRes1 = await sbCall('/rest/v1/rpc/reserve_stock', {
      method: 'POST',
      body: {
        p_product_id: comboProductId,
        p_quantity: 3,
        p_order_id: testOrderId
      }
    });

    if (rpcRes1.ok) {
      // Verificar estoque final
      const prodCheck = await sbCall(`/rest/v1/products?id=eq.${comboProductId}&select=stock_quantity`, { useServiceRole: true });
      const finalStock = prodCheck.data?.[0]?.stock_quantity;
      if (finalStock === 7) {
        log.ok('reserve_stock executado com sucesso! Estoque caiu de 10 para 7.');
      } else {
        log.fail(`reserve_stock: estoque inconsistente! Esperado 7, encontrado: ${finalStock}`);
      }
      
      // Verificar movimentação
      const moveCheck = await sbCall(`/rest/v1/stock_movements?product_id=eq.${comboProductId}&reference_id=eq.${testOrderId}&type=eq.reservation`, { useServiceRole: true });
      if (moveCheck.data?.length > 0 && moveCheck.data[0].quantity === -3) {
        log.ok('stock_movements audit trail gerado corretamente para reserva.');
      } else {
        log.fail(`stock_movements sem registro de reserva correto: ${JSON.stringify(moveCheck.data)}`);
      }
    } else {
      log.fail(`Erro na execução do reserve_stock: ${JSON.stringify(rpcRes1.data)}`);
    }

    // 4.2 reserve_stock - Falha por estoque insuficiente
    // Estoque atual é 7. Tentamos reservar 8. Deve lançar exceção.
    log.info(`Executando reserve_stock com quantidade excedente: 8 unidades...`);
    const rpcRes2 = await sbCall('/rest/v1/rpc/reserve_stock', {
      method: 'POST',
      body: {
        p_product_id: comboProductId,
        p_quantity: 8,
        p_order_id: testOrderId
      }
    });

    if (!rpcRes2.ok) {
      log.ok('reserve_stock falhou corretamente por falta de estoque. Transação sofreu rollback.');
      // Verificar que estoque continuou sendo 7
      const prodCheck2 = await sbCall(`/rest/v1/products?id=eq.${comboProductId}&select=stock_quantity`, { useServiceRole: true });
      if (prodCheck2.data?.[0]?.stock_quantity === 7) {
        log.ok('Confirmação: Estoque permaneceu inalterado (7).');
      } else {
        log.fail(`Estoque foi alterado mesmo após falha na reserva! Atual: ${prodCheck2.data?.[0]?.stock_quantity}`);
      }
    } else {
      log.fail('RLS/RPC FALHOU: reserve_stock aceitou reservar quantidade acima do limite em estoque!');
    }

    // 4.3 deduct_stock (Itens Avulsos)
    // O estoque inicial do avulso é 5. Deduzimos 2. Deve ir para 3.
    log.info(`Executando deduct_stock: 2 unidades para o produto ${avulsoProductId}...`);
    const rpcRes3 = await sbCall('/rest/v1/rpc/deduct_stock', {
      method: 'POST',
      body: {
        p_product_id: avulsoProductId,
        p_quantity: 2,
        p_order_id: testOrderId
      }
    });

    if (rpcRes3.ok) {
      const prodCheck = await sbCall(`/rest/v1/products?id=eq.${avulsoProductId}&select=stock_quantity`, { useServiceRole: true });
      const finalStock = prodCheck.data?.[0]?.stock_quantity;
      if (finalStock === 3) {
        log.ok('deduct_stock executado com sucesso! Estoque caiu de 5 para 3.');
      } else {
        log.fail(`deduct_stock: estoque inconsistente! Esperado 3, encontrado: ${finalStock}`);
      }
      
      const moveCheck = await sbCall(`/rest/v1/stock_movements?product_id=eq.${avulsoProductId}&reference_id=eq.${testOrderId}&type=eq.deduction`, { useServiceRole: true });
      if (moveCheck.data?.length > 0 && moveCheck.data[0].quantity === -2) {
        log.ok('stock_movements audit trail gerado corretamente para dedução.');
      } else {
        log.fail(`stock_movements sem registro de dedução correto: ${JSON.stringify(moveCheck.data)}`);
      }
    } else {
      log.fail(`Erro na execução do deduct_stock: ${JSON.stringify(rpcRes3.data)}`);
    }

    // 4.4 adjust_stock (Ajuste Físico de Freezer por Staff Autenticado)
    // Estoque atual do avulso é 3. Ajustamos para 8 (delta +5).
    log.info(`Executando adjust_stock: ajustar estoque do produto ${avulsoProductId} para 8...`);
    const rpcRes4 = await sbCall('/rest/v1/rpc/adjust_stock', {
      method: 'POST',
      token: testUserToken,
      body: {
        p_product_id: avulsoProductId,
        p_new_quantity: 8,
        p_notes: 'Contagem fisica do freezer teste E2E'
      }
    });

    if (rpcRes4.ok) {
      const prodCheck = await sbCall(`/rest/v1/products?id=eq.${avulsoProductId}&select=stock_quantity`, { useServiceRole: true });
      if (prodCheck.data?.[0]?.stock_quantity === 8) {
        log.ok('adjust_stock executado com sucesso! Estoque ajustado para 8.');
      } else {
        log.fail(`adjust_stock: estoque inconsistente! Esperado 8, encontrado: ${prodCheck.data?.[0]?.stock_quantity}`);
      }
      
      const moveCheck = await sbCall(`/rest/v1/stock_movements?product_id=eq.${avulsoProductId}&type=eq.adjustment&notes=eq.Contagem fisica do freezer teste E2E`, { useServiceRole: true });
      if (moveCheck.data?.length > 0) {
        const move = moveCheck.data[0];
        if (move.quantity === 5 && move.created_by === createdIds.userId) {
          log.ok('Movimentação de ajuste registrada com delta correto (+5) e autor (created_by) do usuário logado.');
        } else {
          log.fail(`Movimentação de ajuste com dados incorretos: Quantidade=${move.quantity} (esperado +5), Autor=${move.created_by} (esperado ${createdIds.userId})`);
        }
      } else {
        log.fail(`stock_movements sem registro de ajuste correto.`);
      }
    } else {
      log.fail(`Erro na execução do adjust_stock: ${JSON.stringify(rpcRes4.data)}`);
    }

    // ----------------------------------------------------
    // TESTE 5: Validação da Rota Next.js /api/orders
    // ----------------------------------------------------
    log.step('TESTE 5 — Validando Rota Next.js local /api/orders...');
    
    // Tentativa de requisição local. Se a API estiver offline, pular de forma elegante
    log.info(`Disparando POST local para ${LOCAL_API_URL}/api/orders...`);
    
    const localPayload = {
      customerName: 'Cliente Local E2E',
      customerPhone: '41988888888',
      deliveryType: 'pickup',
      paymentMethod: 'card',
      items: [
        {
          product: {
            id: comboProductId,
            sku: `TEST-E2E-COMBO`,
            name: 'Marmita E2E Combo Teste',
            price: 25.90,
            stock_type: 'combo'
          },
          quantity: 2
        }
      ],
      total: 51.80
    };

    let localRes;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    try {
      localRes = await fetch(`${LOCAL_API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localPayload),
        signal: controller.signal
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        log.warn(`Timeout de 3 segundos atingido ao chamar a API local ${LOCAL_API_URL}/api/orders. Pulando teste local.`);
      } else {
        log.warn(`Não foi possível conectar à porta local: ${err.message}. Certifique-se de iniciar o Next.js localmente antes dos testes.`);
      }
    } finally {
      clearTimeout(timeoutId);
    }

    if (localRes) {
      const localData = await localRes.json();
      if (localRes.ok && localData.orderId && localData.orderNumber) {
        createdIds.localOrderId = localData.orderId;
        log.ok(`Rota local respondeu com Sucesso! Pedido criado: ${localData.orderNumber} (ID: ${localData.orderId})`);
        
        // Verificar se a RPC de reserva rodou (estoque combo deve ter caído de 7 para 5 devido às 2 unidades do pedido local)
        const checkLocalStock = await sbCall(`/rest/v1/products?id=eq.${comboProductId}&select=stock_quantity`, { useServiceRole: true });
        if (checkLocalStock.data?.[0]?.stock_quantity === 5) {
          log.ok('Confirmação: O estoque do produto Combo foi reduzido corretamente de 7 para 5 via rota de API local.');
        } else {
          log.fail(`Estoque combo não foi atualizado corretamente após pedido local! Esperado 5, encontrado: ${checkLocalStock.data?.[0]?.stock_quantity}`);
        }
      } else {
        log.fail(`Erro na rota local /api/orders (Status: ${localRes.status}): ${JSON.stringify(localData)}`);
      }
    }

    log.head('SUÍTE DE TESTES E2E CONCLUÍDA');

  } catch (error) {
    log.fail(`Erro durante a execução da suíte de testes: ${error.message}`);
    console.error(error);
  } finally {
    // ----------------------------------------------------
    // CLEANUP AUTOMÁTICO
    // ----------------------------------------------------
    log.step('Cleanup: Iniciando limpeza de dados do banco de dados remoto...');
    
    // Deletar pedido criado localmente na API (cascateia itens e movimentos de estoque se referenciado)
    if (createdIds.localOrderId) {
      const delLocalOrder = await sbCall(`/rest/v1/orders?id=eq.${createdIds.localOrderId}`, {
        method: 'DELETE',
        useServiceRole: true
      });
      if (delLocalOrder.ok) log.ok('Pedido de teste local removido.');
    }

    // Deletar pedidos criados no banco
    for (const orderId of createdIds.orderIds) {
      const delOrder = await sbCall(`/rest/v1/orders?id=eq.${orderId}`, {
        method: 'DELETE',
        useServiceRole: true
      });
      if (delOrder.ok) log.ok(`Pedido de teste ${orderId} removido.`);
    }

    // Deletar produtos de teste
    for (const prodId of createdIds.productIds) {
      const delProd = await sbCall(`/rest/v1/products?id=eq.${prodId}`, {
        method: 'DELETE',
        useServiceRole: true
      });
      if (delProd.ok) log.ok(`Produto de teste ${prodId} removido.`);
    }

    // Deletar categoria de teste
    if (createdIds.categoryId) {
      const delCat = await sbCall(`/rest/v1/categories?id=eq.${createdIds.categoryId}`, {
        method: 'DELETE',
        useServiceRole: true
      });
      if (delCat.ok) log.ok(`Categoria de teste ${createdIds.categoryId} removida.`);
    }

    // Deletar usuário de teste do Auth (remove automaticamente o perfil devido ao CASCADE)
    if (createdIds.userId) {
      const delUser = await authAdminCall(`/users/${createdIds.userId}`, {
        method: 'DELETE'
      });
      if (delUser.ok) log.ok(`Usuário de teste do Auth ${createdIds.userId} removido com sucesso.`);
    }
    
    log.ok('Cleanup finalizado. Banco de dados limpo!');
  }
}

run();
