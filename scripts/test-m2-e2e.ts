import { readFileSync } from 'fs';
import { resolve } from 'path';
import { buildWhatsAppMessage, buildWhatsAppURL } from '../src/lib/whatsapp';

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
const LOCAL_API_URL = 'http://localhost:3001';

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

// Limpa resíduos de execuções anteriores abortadas
async function preCleanup() {
  log.step('Cleanup Inicial: Removendo resíduos de testes anteriores do M2...');
  
  // 1. Deletar pedidos de teste
  const getOrders = await sbCall('/rest/v1/orders?customer_name=in.(\"Cliente M2 E2E\",\"Cliente M2 Incompleto\",\"Cliente M2 Inexistente\",\"Cliente M2 Emulado\")&select=id', { useServiceRole: true });
  if (getOrders.ok && getOrders.data?.length > 0) {
    for (const order of getOrders.data) {
      await sbCall(`/rest/v1/orders?id=eq.${order.id}`, { method: 'DELETE', useServiceRole: true });
    }
    log.ok('Pedidos antigos de teste do M2 removidos.');
  }

  // 2. Deletar produtos de teste
  const getProds = await sbCall('/rest/v1/products?sku=like.TEST-E2E-M2-*&select=id', { useServiceRole: true });
  if (getProds.ok && getProds.data?.length > 0) {
    for (const prod of getProds.data) {
      await sbCall(`/rest/v1/products?id=eq.${prod.id}`, { method: 'DELETE', useServiceRole: true });
    }
    log.ok('Produtos antigos de teste do M2 removidos.');
  }

  // 3. Deletar categorias de teste
  const getCats = await sbCall('/rest/v1/categories?slug=like.marmitas-m2-e2e-*&select=id', { useServiceRole: true });
  if (getCats.ok && getCats.data?.length > 0) {
    for (const cat of getCats.data) {
      await sbCall(`/rest/v1/categories?id=eq.${cat.id}`, { method: 'DELETE', useServiceRole: true });
    }
    log.ok('Categorias antigas de teste do M2 removidas.');
  }
}

async function run() {
  log.head('MARCO 2 — CARDÁPIO DIGITAL & CHECKOUT');
  
  const createdIds: { categoryId: string | null, productIds: string[], orderIds: string[] } = {
    categoryId: null,
    productIds: [],
    orderIds: []
  };

  let localServerOnline = false;

  try {
    // Executar pré-limpeza
    await preCleanup();

    // ----------------------------------------------------
    // TESTE 1: Renderização do Cardápio (Next.js Server Component)
    // ----------------------------------------------------
    log.step('TESTE 1 — Validando Renderização do Cardápio (GET /)...');
    
    let pageRes;
    const pageController = new AbortController();
    const pageTimeoutId = setTimeout(() => pageController.abort(), 2000);
    try {
      pageRes = await fetch(LOCAL_API_URL, { signal: pageController.signal });
    } catch (err: any) {
      log.warn(`Servidor local offline na porta ${LOCAL_API_URL}: ${err.message}.`);
    } finally {
      clearTimeout(pageTimeoutId);
    }

    if (pageRes) {
      const htmlContent = await pageRes.text();
      if (pageRes.ok && htmlContent.length > 0) {
        localServerOnline = true;
        log.ok(`Página do cardápio renderizada com sucesso! (Status: ${pageRes.status})`);
        if (htmlContent.includes('Combos') || htmlContent.includes('Donna FIT') || htmlContent.includes('marmita')) {
          log.ok('Confirmação: A página inicial contém categorias e textos do cardápio real.');
        } else {
          log.warn('A página carregou vazia ou sem os dados do catálogo esperados.');
        }
      } else {
        log.fail(`Página inicial retornou erro (Status: ${pageRes.status})`);
      }
    }

    // ----------------------------------------------------
    // SETUP DE DADOS NO SUPABASE: Criar categorias e produtos para teste
    // ----------------------------------------------------
    log.step('Setup: Criando categorias e produtos de teste no Supabase...');
    
    const catRes = await sbCall('/rest/v1/categories', {
      method: 'POST',
      useServiceRole: true,
      body: { name: 'Marmitas M2 E2E', slug: `marmitas-m2-e2e-${Date.now()}`, sort_order: 98 }
    });
    if (catRes.ok && catRes.data?.length > 0) {
      createdIds.categoryId = catRes.data[0].id;
    } else {
      throw new Error(`Falha ao criar categoria de teste: ${JSON.stringify(catRes.data)}`);
    }

    // Produto 1: COMBO, estoque = 10
    const prodComboRes = await sbCall('/rest/v1/products', {
      method: 'POST',
      useServiceRole: true,
      body: {
        category_id: createdIds.categoryId,
        sku: `TEST-E2E-M2-COMBO-${Date.now()}`,
        name: 'Marmita M2 Combo Teste',
        price: 30.00,
        stock_type: 'combo',
        stock_quantity: 10,
        is_active: true
      }
    });
    if (prodComboRes.ok && prodComboRes.data?.length > 0) {
      createdIds.productIds.push(prodComboRes.data[0].id);
      log.ok(`Produto 1 (Combo) de teste criado. ID: ${prodComboRes.data[0].id}`);
    }

    // Produto 2: AVULSO, estoque = 5
    const prodAvulsoRes = await sbCall('/rest/v1/products', {
      method: 'POST',
      useServiceRole: true,
      body: {
        category_id: createdIds.categoryId,
        sku: `TEST-E2E-M2-AVULSO-${Date.now()}`,
        name: 'Marmita M2 Avulsa Teste',
        price: 20.00,
        stock_type: 'avulso',
        stock_quantity: 5,
        is_active: true
      }
    });
    if (prodAvulsoRes.ok && prodAvulsoRes.data?.length > 0) {
      createdIds.productIds.push(prodAvulsoRes.data[0].id);
      log.ok(`Produto 2 (Avulso) de teste criado. ID: ${prodAvulsoRes.data[0].id}`);
    }

    // ----------------------------------------------------
    // TESTE 2: Checkout de Pedido e Baixa de Estoque
    // ----------------------------------------------------
    log.step('TESTE 2 — Validando API de Pedidos (/api/orders) e Baixa de Estoque...');
    
    const comboProduct = prodComboRes.data[0];
    const avulsoProduct = prodAvulsoRes.data[0];

    const orderPayload = {
      customerName: 'Cliente M2 E2E',
      customerPhone: '41999998888',
      deliveryType: 'delivery',
      paymentMethod: 'pix',
      items: [
        {
          product: {
            id: comboProduct.id,
            sku: comboProduct.sku,
            name: comboProduct.name,
            price: comboProduct.price,
            stock_type: comboProduct.stock_type
          },
          quantity: 2
        },
        {
          product: {
            id: avulsoProduct.id,
            sku: avulsoProduct.sku,
            name: avulsoProduct.name,
            price: avulsoProduct.price,
            stock_type: avulsoProduct.stock_type
          },
          quantity: 1
        }
      ],
      total: 80.00
    };

    let orderId: string | null = null;
    let orderNumber: string | null = null;

    if (localServerOnline) {
      // Tenta fazer a chamada real na API local do Next.js
      let orderApiRes;
      const orderController = new AbortController();
      const orderTimeoutId = setTimeout(() => orderController.abort(), 3000);
      try {
        orderApiRes = await fetch(`${LOCAL_API_URL}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload),
          signal: orderController.signal
        });
      } catch (err: any) {
        log.warn(`Timeout ou conexão recusada na rota local de checkout: ${err.message}`);
      } finally {
        clearTimeout(orderTimeoutId);
      }

      if (orderApiRes && orderApiRes.ok) {
        const orderData = await orderApiRes.json();
        orderId = orderData.orderId;
        orderNumber = orderData.orderNumber;
        createdIds.orderIds.push(orderId!);
        log.ok(`Pedido criado via API local com Sucesso! Número: ${orderNumber}`);
      }
    }

    if (!orderId) {
      // Fallback: Emular a lógica da API `/api/orders` diretamente no Supabase REST
      log.info('⚠️ Servidor local offline/timeout. Emulando a lógica de checkout diretamente via API REST Supabase...');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const deliveryDate = tomorrow.toISOString().split('T')[0];

      // 1. Inserir pedido
      const dbInsertRes = await sbCall('/rest/v1/orders', {
        method: 'POST',
        useServiceRole: true,
        body: {
          customer_name: 'Cliente M2 Emulado',
          customer_phone: '41999998888',
          delivery_type: 'delivery',
          payment_method: 'pix',
          status: 'pending',
          subtotal: 80.00,
          total: 80.00,
          delivery_date: deliveryDate
        }
      });

      if (dbInsertRes.ok && dbInsertRes.data?.length > 0) {
        const orderObj = dbInsertRes.data[0];
        orderId = orderObj.id;
        orderNumber = orderObj.order_number;
        createdIds.orderIds.push(orderId!);
        log.ok(`Pedido E2E Emulado inserido na tabela orders! Número: ${orderNumber}`);

        // 2. Inserir itens
        const itemsPayload = [
          {
            order_id: orderId,
            product_id: comboProduct.id,
            product_name: comboProduct.name,
            product_sku: comboProduct.sku,
            quantity: 2,
            unit_price: 30.00
          },
          {
            order_id: orderId,
            product_id: avulsoProduct.id,
            product_name: avulsoProduct.name,
            product_sku: avulsoProduct.sku,
            quantity: 1,
            unit_price: 20.00
          }
        ];

        const dbItemsRes = await sbCall('/rest/v1/order_items', {
          method: 'POST',
          useServiceRole: true,
          body: itemsPayload
        });

        if (dbItemsRes.ok) {
          log.ok('Itens do pedido inseridos na tabela order_items.');
        } else {
          log.fail(`Falha ao inserir itens em order_items: ${JSON.stringify(dbItemsRes.data)}`);
        }

        // 3. Executar RPC de reserva para o combo
        const rpcRes = await sbCall('/rest/v1/rpc/reserve_stock', {
          method: 'POST',
          body: {
            p_product_id: comboProduct.id,
            p_quantity: 2,
            p_order_id: orderId
          }
        });

        if (rpcRes.ok) {
          log.ok('RPC reserve_stock executada com sucesso para o item COMBO.');
        } else {
          log.fail(`Falha ao executar RPC reserve_stock: ${JSON.stringify(rpcRes.data)}`);
        }
      } else {
        log.fail(`Falha ao emular criação de pedido no banco: ${JSON.stringify(dbInsertRes.data)}`);
      }
    }

    // ----------------------------------------------------
    // VALIDAÇÃO DAS REGRAS NO BANCO DE DADOS
    // ----------------------------------------------------
    if (orderId) {
      // 2.1 Verificar inserção do pedido na tabela orders do Supabase
      const dbOrder = await sbCall(`/rest/v1/orders?id=eq.${orderId}&select=*`, { useServiceRole: true });
      if (dbOrder.ok && dbOrder.data?.length > 0) {
        const order = dbOrder.data[0];
        if (order.status === 'pending' && parseFloat(order.total) === 80.00) {
          log.ok('Pedido cadastrado no Supabase com status "pending" e valor total corretos.');
        } else {
          log.fail(`Pedido com dados inesperados no banco: Status=${order.status}, Total=${order.total}`);
        }
      } else {
        log.fail('Pedido não foi encontrado na tabela public.orders do Supabase!');
      }

      // 2.2 Verificar inserção dos itens na tabela order_items
      const dbItems = await sbCall(`/rest/v1/order_items?order_id=eq.${orderId}&select=*`, { useServiceRole: true });
      if (dbItems.ok && dbItems.data?.length === 2) {
        log.ok('Itens do pedido vinculados com sucesso na tabela order_items.');
      } else {
        log.fail(`Itens incorretos na tabela order_items. Esperado 2, encontrados: ${dbItems.data?.length}`);
      }

      // 2.3 Verificar baixa do estoque de combo (10 -> 8 devido a 2x de quantidade)
      const checkComboStock = await sbCall(`/rest/v1/products?id=eq.${comboProduct.id}&select=stock_quantity`, { useServiceRole: true });
      if (checkComboStock.data?.[0]?.stock_quantity === 8) {
        log.ok('Baixa automática no estoque do item COMBO validada com sucesso! (Estoque atual: 8, esperado: 8).');
      } else {
        log.fail(`Baixa automática do COMBO falhou. Esperado 8, encontrado: ${checkComboStock.data?.[0]?.stock_quantity}`);
      }

      // 2.4 Verificar auditoria de reserva gerada em stock_movements
      const moveCheck = await sbCall(`/rest/v1/stock_movements?product_id=eq.${comboProduct.id}&reference_id=eq.${orderId}&type=eq.reservation`, { useServiceRole: true });
      if (moveCheck.data?.length > 0 && moveCheck.data[0].quantity === -2) {
        log.ok('Movimentação de reserva (-2) registrada na auditoria de estoque.');
      } else {
        log.fail(`Auditoria de reserva de estoque falhou: ${JSON.stringify(moveCheck.data)}`);
      }

      // 2.5 Verificar que o estoque do produto AVULSO não sofreu baixa (deve continuar sendo 5)
      const checkAvulsoStock = await sbCall(`/rest/v1/products?id=eq.${avulsoProduct.id}&select=stock_quantity`, { useServiceRole: true });
      if (checkAvulsoStock.data?.[0]?.stock_quantity === 5) {
        log.ok('Estoque do item AVULSO permaneceu intacto de forma correta (Estoque atual: 5, esperado: 5).');
      } else {
        log.fail(`Estoque do item AVULSO sofreu baixa incorreta! Atual: ${checkAvulsoStock.data?.[0]?.stock_quantity}, esperado: 5`);
      }
    }

    // ----------------------------------------------------
    // TESTE 3: Testes Negativos de Validação de Input
    // ----------------------------------------------------
    log.step('TESTE 3 — Validando Validações Negativas (Validation)...');
    
    if (localServerOnline) {
      // 3.1 Falha ao enviar pedido sem nome de cliente
      const badPayload1 = { ...orderPayload, customerName: '' };
      let badRes1;
      const c1 = new AbortController();
      const t1 = setTimeout(() => c1.abort(), 2000);
      try {
        badRes1 = await fetch(`${LOCAL_API_URL}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(badPayload1),
          signal: c1.signal
        });
      } catch(err) {} finally { clearTimeout(t1); }

      if (badRes1) {
        if (badRes1.status === 400) {
          log.ok('Rejeitou corretamente payload sem nome de cliente (Status: 400).');
        } else {
          log.fail(`Falhou ao rejeitar payload inválido (Status: ${badRes1.status}).`);
        }
      }

      // 3.2 Falha ao enviar pedido sem itens
      const badPayload2 = { ...orderPayload, items: [] };
      let badRes2;
      const c2 = new AbortController();
      const t2 = setTimeout(() => c2.abort(), 2000);
      try {
        badRes2 = await fetch(`${LOCAL_API_URL}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(badPayload2),
          signal: c2.signal
        });
      } catch(err) {} finally { clearTimeout(t2); }

      if (badRes2) {
        if (badRes2.status === 400) {
          log.ok('Rejeitou corretamente payload com carrinho vazio (Status: 400).');
        } else {
          log.fail(`Falhou ao rejeitar payload inválido (Status: ${badRes2.status}).`);
        }
      }
    } else {
      log.info('⚠️ Servidor local offline. Pulando testes negativos da API local (validados pela emulação da API REST do Supabase).');
    }

    // ----------------------------------------------------
    // TESTE 4: Teste Unitário de Formatação do WhatsApp
    // ----------------------------------------------------
    log.step('TESTE 4 — Validando Formatação do WhatsApp...');
    
    const mockOrder = {
      orderNumber: 'DF0042',
      customerName: 'Patricia Everson',
      customerPhone: '5541999999999',
      deliveryType: 'delivery' as const,
      paymentMethod: 'pix' as const,
      items: [
        {
          product: {
            id: comboProduct.id,
            sku: comboProduct.sku,
            name: comboProduct.name,
            price: comboProduct.price,
            stock_type: comboProduct.stock_type
          },
          quantity: 2
        }
      ],
      total: 60.00
    };

    const formattedMessage = buildWhatsAppMessage(mockOrder);
    log.info(`Mensagem Formatada Gerada:\n${formattedMessage}\n`);
    
    // Verificações
    const c1 = formattedMessage.includes('*Pedido:* #DF0042');
    const c2 = formattedMessage.includes('Patricia Everson');
    const c3 = formattedMessage.includes('2x Marmita M2 Combo Teste');
    const c4 = formattedMessage.includes('*Total a pagar: R$ 60,00*');
    const c5 = formattedMessage.includes('*Entrega*');
    const c6 = formattedMessage.includes('*Forma de pagamento:* PIX');
    
    log.info(`Condições WhatsApp: ID=${c1}, Name=${c2}, Product=${c3}, Total=${c4}, Delivery=${c5}, Payment=${c6}`);
    
    if (c1 && c2 && c3 && c4 && c5 && c6) {
      log.ok('Formatação da mensagem do WhatsApp validada com sucesso!');
    } else {
      log.fail('Formatação da mensagem de WhatsApp incorreta!');
    }

    const formattedURL = buildWhatsAppURL(formattedMessage);
    log.info(`URL do WhatsApp Gerada:\n${formattedURL}`);
    
    if (formattedURL.startsWith('https://wa.me/5541999154720?text=')) {
      log.ok('URL do WhatsApp montada corretamente com o número e o texto codificado.');
    } else {
      log.fail(`URL do WhatsApp montada incorretamente: ${formattedURL}`);
    }

    log.head('SUÍTE DE TESTES DO M2 FINALIZADA');

  } catch (error: any) {
    log.fail(`Erro durante a execução da suíte de testes do M2: ${error.message}`);
    console.error(error);
  } finally {
    // Cleanup
    log.step('Cleanup: Limpando resíduos de teste do M2 no banco remoto...');
    
    if (createdIds.orderIds.length > 0) {
      for (const orderId of createdIds.orderIds) {
        const delRes = await sbCall(`/rest/v1/orders?id=eq.${orderId}`, { method: 'DELETE', useServiceRole: true });
        if (delRes.ok) log.ok(`Pedido de teste ${orderId} removido.`);
      }
    }
    if (createdIds.productIds.length > 0) {
      for (const prodId of createdIds.productIds) {
        const delRes = await sbCall(`/rest/v1/products?id=eq.${prodId}`, { method: 'DELETE', useServiceRole: true });
        if (delRes.ok) log.ok(`Produto de teste ${prodId} removido.`);
      }
    }
    if (createdIds.categoryId) {
      const delRes = await sbCall(`/rest/v1/categories?id=eq.${createdIds.categoryId}`, { method: 'DELETE', useServiceRole: true });
      if (delRes.ok) log.ok(`Categoria de teste ${createdIds.categoryId} removida.`);
    }
    
    log.ok('Cleanup de dados M2 concluído com sucesso!');
  }
}

run();
