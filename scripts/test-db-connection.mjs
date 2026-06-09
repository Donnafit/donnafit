import { readFileSync } from 'fs';
import { resolve } from 'path';

// Helpers de Estilo
const log = {
  ok: (m) => console.log(`  \x1b[32m✅ ${m}\x1b[0m`),
  fail: (m) => console.log(`  \x1b[31m❌ ${m}\x1b[0m`),
  info: (m) => console.log(`  \x1b[34mℹ️  ${m}\x1b[0m`),
  step: (m) => console.log(`\n👉 \x1b[33m${m}\x1b[0m`),
  head: (m) => console.log(`\n\x1b[45m DONNA FIT DATABASE TEST \x1b[0m`)
};

// Configuração Base (Lê .env.local automaticamente)
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

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  log.fail("NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não configurados no .env.local");
  process.exit(1);
}

async function sbFetch(path, { method = 'GET', body, token, useServiceRole = false } = {}) {
  const apiKey = useServiceRole ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': apiKey,
    'Authorization': `Bearer ${token || apiKey}`
  };
  
  const url = `${SUPABASE_URL}${path}`;
  const start = performance.now();
  const res = await fetch(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const duration = (performance.now() - start).toFixed(2);
  
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch(e) {}
  
  return { ok: res.ok, status: res.status, data, duration };
}

async function run() {
  log.head('TESTANDO CONEXÃO COM O SUPABASE');
  log.info(`URL: ${SUPABASE_URL}`);
  
  log.step('1. Testando leitura anônima de categorias...');
  const catRes = await sbFetch('/rest/v1/categories?select=*', { method: 'GET' });
  if (catRes.ok) {
    log.ok(`Categorias lidas com sucesso! Encontradas: ${catRes.data?.length || 0} categorias (${catRes.duration}ms)`);
    if (catRes.data && catRes.data.length > 0) {
      console.log('     Categorias:', catRes.data.map(c => c.name).join(', '));
    } else {
      log.info('A tabela de categorias está vazia.');
    }
  } else {
    log.fail(`Erro ao ler categorias (Status: ${catRes.status}): ${JSON.stringify(catRes.data)}`);
  }

  log.step('2. Testando leitura anônima de produtos...');
  const prodRes = await sbFetch('/rest/v1/products?select=*', { method: 'GET' });
  if (prodRes.ok) {
    log.ok(`Produtos lidos com sucesso! Encontrados: ${prodRes.data?.length || 0} produtos (${prodRes.duration}ms)`);
    if (prodRes.data && prodRes.data.length > 0) {
      console.log('     Amostra de produtos:', prodRes.data.slice(0, 3).map(p => `${p.name} (R$ ${p.price})`).join(' | '));
    } else {
      log.info('A tabela de produtos está vazia.');
    }
  } else {
    log.fail(`Erro ao ler produtos (Status: ${prodRes.status}): ${JSON.stringify(prodRes.data)}`);
  }
}

run().catch(e => log.fail(e.message));
