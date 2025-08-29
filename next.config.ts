import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'out',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
  },
  webpack: (config, { isServer }) => {
    // Excluir la carpeta backend del build
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/backend/**',
        '**/node_modules/**',
      ],
    };
    return config;
  },
  // Excluir archivos del backend de TypeScript checking
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    dirs: ['src', 'components', 'lib', 'hooks', 'contexts'],
  },
};

export default nextConfig;
