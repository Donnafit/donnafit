/** @type {import('next').NextConfig} */
const nextConfig = {
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
