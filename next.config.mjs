/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
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
