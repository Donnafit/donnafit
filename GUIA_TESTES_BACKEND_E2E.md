# Guia Definitivo: Estratégia de Testes E2E para Backend (SnipHUB Style)

Este guia consolida a estratégia de testes **End-to-End (E2E) leves**, focada na "verdade" dos dados, segurança e performance, utilizando apenas **Node.js nativo**.

---

## 1. O Mantra: Teste a Lógica, não a Cor do Botão
Enquanto testes de UI (Playwright/Cypress) validam se o botão está visível, esta estratégia valida se:
1.  **O RLS funciona**: O Usuário A pode realmente ler os dados do Usuário B?
2.  **A API é Rápida**: O endpoint responde em menos de 200ms?
3.  **Os Triggers Agem**: Ao deletar um snippet, os arquivos relacionados sumiram?
4.  **Integrações são Reais**: O Webhook do Stripe atualizou o banco corretamente?

---

## 2. Padrões de Implementação Avançados

### A. Webhooks e Mock de Integrações
Para testar fluxos como o do Stripe sem gastar dinheiro real ou expor o site, simule a chamada direto no seu endpoint de Webhook interno.

```javascript
// Exemplo: Simular Webhook de Pagamento Concluído
async function simulateStripeWebhook(userId, priceId) {
  const mockEvent = {
    type: 'checkout.session.completed',
    data: {
      object: {
        client_reference_id: userId,
        amount_total: 2990,
        metadata: { userId }
      }
    }
  };

  const res = await fetch(`${BASE_URL}/api/webhooks/stripe`, {
    method: 'POST',
    headers: { 'Stripe-Signature': 'simulada_pelo_teste' }, // Trate isso no seu dev-mode
    body: JSON.stringify(mockEvent)
  });
  
  return res.ok;
}
```

### B. Testes de Concorrência e Race Conditions
Útil para validar sistemas de likes, contadores ou slots de reserva.

```javascript
// Exemplo: 10 usuários curtindo o mesmo snippet ao mesmo tempo
async function testLikeConcurrency(snippetId, tokens) {
  console.log("🚀 Disparando 10 likes simultâneos...");
  const promises = tokens.map(t => 
    sbFetch(`/rest/v1/likes`, { method: 'POST', body: { snippet_id: snippetId } }, t)
  );
  
  const results = await Promise.all(promises);
  const successCount = results.filter(r => r.status === 201).length;
  console.log(`✅ ${successCount} likes registrados.`);
}
```

### C. Performance Benchmarking
Não basta passar, tem que ser rápido.

```javascript
async function sbFetchWithPerf(path, options, token) {
  const start = performance.now();
  const res = await sbFetch(path, options, token);
  const end = performance.now();
  const duration = (end - start).toFixed(2);
  
  if (duration > 500) console.warn(`⚠️ Lentidão em ${path}: ${duration}ms`);
  return { ...res, duration };
}
```

---

## 3. Matriz de Erros (Negative Testing)
Um bom teste tenta quebrar o sistema. Sua suíte deve sempre incluir:
- **Tokens Inválidos**: Tentar acessar rotas PRO com token FREE (Espera: 403).
- **Dados Malformados**: Enviar JSON vazio ou strings gigantes em campos limitados.
- **IDs Inexistentes**: Tentar buscar recursos com UUIDs que não existem (Espera: 404).

---

## 4. Boilerplate Completo e Utilitário

Salve este arquivo como `scripts/test-base.mjs`:

```javascript
/* 
  Estratégia SnipHUB de Testes Rápidos
  Uso: node scripts/test-base.mjs
*/
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Helpers de Estilo
const log = {
  ok: (m) => console.log(`  \x1b[32m✅ ${m}\x1b[0m`),
  fail: (m) => console.log(`  \x1b[31m❌ ${m}\x1b[0m`),
  info: (m) => console.log(`  \x1b[34mℹ️  ${m}\x1b[0m`),
  step: (m) => console.log(`\n👉 \x1b[33m${m}\x1b[0m`),
  head: (m) => console.log(`\n\x1b[45m SNIPHUB TEST: ${m} \x1b[0m`)
};

// Configuração Base (Lê .env automaticamente)
const ENV = (() => {
  const path = resolve(process.cwd(), '.env');
  const content = readFileSync(path, 'utf8');
  const config = {};
  content.split('\n').filter(l => l && !l.startsWith('#')).forEach(line => {
    const [k, v] = line.split('=');
    if (k && v) config[k.trim()] = v.trim().replace(/^["']|["']$/g, '');
  });
  return config;
})();

const BASE_URL = 'http://localhost:3000';

/**
 * Wrapper de Fetch Padronizado
 */
async function apiCall(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const start = performance.now();
  const res = await fetch(`${BASE_URL}${path}`, {
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

// Fluxo Principal de Exemplo
async function run() {
  log.head('INICIANDO SUÍTE DE TESTES GLOBAIS');

  // 1. Auth & Role Validation
  log.step('Validando Autenticação e Roles...');
  const auth = await apiCall('/api/extension/auth', { 
    method: 'POST', 
    body: { email: ENV.TEST_PRO_EMAIL, password: ENV.TEST_PRO_PASSWORD } 
  });
  
  if (auth.ok) {
    log.ok(`Login PRO OK (${auth.duration}ms)`);
    const token = auth.data.access_token;

    // 2. Filtros e Dados
    log.step('Testando Filtros de Busca (RPC Fix)...');
    const snippets = await apiCall('/api/extension/snippets?type=component&limit=1', { token });
    if (snippets.ok && snippets.data.snippets?.length > 0) {
      log.ok('Filtro de componentes retornando dados ✔');
    } else {
      log.fail('Filtro de componentes vazio!');
    }
  }

  log.head('TESTA CONCLUÍDOS COM SUCESSO');
}

run().catch(e => log.fail(e.message));
```

---

## 📅 Quando usar esta estratégia?
- **Tudo de rotas de API**: 100% das vezes.
- **Tudo de Banco (RLS/Functions)**: 100% das vezes.
- **Fluxos de Pagamento**: Para validar a lógica de mudança de role.
- **Debugando a Extensão**: Antes de abrir o navegador, valide se o JSON está chegando como esperado via script.

> [!TIP]
> **Automação de Cleanup:** No final dos seus testes, use o `SUPABASE_SERVICE_ROLE_KEY` para deletar os IDs criados. Isso evita "lixo" no banco de desenvolvimento após centenas de execuções.
