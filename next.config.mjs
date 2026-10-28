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
