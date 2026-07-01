import { readFileSync } from 'fs';
import { resolve } from 'path';

const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
const config = {};
content.split('\n').filter(l => l && !l.trim().startsWith('#')).forEach(line => {
  const index = line.indexOf('=');
  if (index !== -1) { config[line.substring(0,index).trim()] = line.substring(index+1).trim().replace(/^["']|["']$/g,''); }
});

const URL = config.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = config.SUPABASE_SERVICE_ROLE_KEY;

console.log('=== Aplicando migration: products-images bucket ===\n');

const sql = `
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products-images',
  'products-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
`;

const res = await fetch(`${URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

// Tenta via SQL direto na API
const sqlRes = await fetch(`${URL}/pg/query`, {
  method: 'POST',
  headers: {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

console.log('SQL result status:', sqlRes.status);

// Verifica se o bucket já existe listando via storage API
const bucketsRes = await fetch(`${URL}/storage/v1/bucket`, {
  headers: {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
  }
});
const buckets = await bucketsRes.json();
console.log('\nBuckets existentes no Supabase Storage:');
if (Array.isArray(buckets)) {
  buckets.forEach(b => console.log(`  - ${b.name} (public: ${b.public})`));
} else {
  console.log(JSON.stringify(buckets, null, 2));
}

// Cria o bucket via API REST do Storage se não existir
const existing = Array.isArray(buckets) ? buckets.find(b => b.id === 'products-images') : null;
if (!existing) {
  console.log('\nCriando bucket products-images via Storage API...');
  const createRes = await fetch(`${URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: 'products-images',
      name: 'products-images',
      public: true,
      file_size_limit: 5242880,
      allowed_mime_types: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    }),
  });
  const createData = await createRes.json();
  console.log('Resultado da criação:', JSON.stringify(createData, null, 2));
} else {
  console.log('\n✅ Bucket products-images já existe!');
  console.log(`   Public: ${existing.public}, Limit: ${existing.file_size_limit}`);
}
