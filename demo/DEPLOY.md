# Como fazer o deploy na Vercel

## Opção 1 — Vercel CLI (mais rápido, sem GitHub)

1. Instalar a CLI da Vercel (se não tiver):
   ```
   npm install -g vercel
   ```

2. Entrar na pasta do demo:
   ```
   cd "D:\Clientes 2024\Donna FIT\demo"
   ```

3. Fazer login na Vercel:
   ```
   vercel login
   ```

4. Fazer o deploy:
   ```
   vercel --prod
   ```

5. A CLI vai gerar uma URL pública tipo:
   `https://donna-fit-demo.vercel.app`

## Opção 2 — Via GitHub (drag & drop)

1. Crie uma conta em vercel.com se não tiver
2. No dashboard da Vercel, clique em "Add New Project"
3. Escolha "Deploy without Git"
4. Faça drag & drop da pasta `demo/` inteira
5. Clique em Deploy

## URLs após o deploy

| Página | URL |
|--------|-----|
| Cardápio (cliente) | `https://[seu-dominio].vercel.app/` |
| Painel Admin | `https://[seu-dominio].vercel.app/admin` |

## Domínio personalizado (opcional)

Para usar `pedidos.donnafit.com.br` ou similar:
- No dashboard da Vercel > Settings > Domains
- Adicionar o domínio desejado
- Configurar o DNS conforme instruções da Vercel
