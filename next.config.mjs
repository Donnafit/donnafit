/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
    // Fotos de produto e avatares mudam raramente — cache longo evita que o
    // Next volte a buscar o original no Storage da Supabase a cada poucos
    // segundos (foi isso, combinado com <img> cru sem otimização nenhuma,
    // que estourou a cota de Cached Egress e derrubou o projeto inteiro).
    minimumCacheTTL: 2678400, // 31 dias
    // Cada combinação foto x largura x qualidade é uma transformação paga da
    // cota de Image Optimization da Vercel. Sem essas listas o otimizador
    // aceita q=1..100 e 16 larguras, e qualquer um esgota a cota do mês
    // pedindo variações da mesma foto (aí as fotos novas param de carregar).
    // Larguras = as que os `sizes` do catálogo/produto/carrinho realmente
    // pedem em telas de 1x a 3x. Qualidade única: todo <Image> usa 70.
    qualities: [70],
    deviceSizes: [640, 828, 1080, 1200],
    imageSizes: [32, 64, 128, 256, 384],
  },
  webpack: (config) => {
    // Disable symlink resolution (fixes EISDIR readlink errors on Windows Node 24)
    config.resolve.symlinks = false;

    // Disable snapshot to avoid readlink EISDIR issues on Windows Node 24
    config.snapshot = {
      ...(config.snapshot || {}),
      managedPaths: [],
      immutablePaths: [],
    };

    return config;
  },
};

export default nextConfig;
