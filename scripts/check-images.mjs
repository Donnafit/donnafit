import { readFileSync } from 'fs';
import { resolve } from 'path';

const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
const config = {};
content.split('\n').filter(l => l && !l.trim().startsWith('#')).forEach(line => {
  const index = line.indexOf('=');
  if (index !== -1) { config[line.substring(0,index).trim()] = line.substring(index+1).trim().replace(/^["']|["']$/g,''); }
});

const URL = config.NEXT_PUBLIC_SUPABASE_URL;
const KEY = config.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const res = await fetch(`${URL}/rest/v1/products?select=name,image_url&is_active=eq.true&order=sort_order&limit=10`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
});
const data = await res.json();
console.log('=== IMAGE_URL dos produtos ===');
data.forEach(p => {
  console.log(`[${p.image_url ? 'TEM URL' : 'SEM URL'}] ${p.name}`);
  if (p.image_url) console.log(`   -> ${p.image_url}`);
});

// Testa se a primeira URL com imagem é acessível
const withImage = data.filter(p => p.image_url);
if (withImage.length > 0) {
  const url = withImage[0].image_url;
  console.log(`\n=== Testando acesso à imagem: ${url} ===`);
  try {
    const imgRes = await fetch(url, { method: 'HEAD' });
    console.log(`Status HTTP: ${imgRes.status} ${imgRes.statusText}`);
    console.log(`Content-Type: ${imgRes.headers.get('content-type')}`);
  } catch(e) {
    console.log(`Erro ao acessar imagem: ${e.message}`);
  }
} else {
  console.log('\n=== Nenhum produto tem image_url cadastrada no banco! ===');
}
