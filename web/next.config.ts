import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las dependencias de Solana/Anchor (web3.js v1) referencian módulos de
  // Node.js (fs, net, tls) que no existen en el navegador. Estos fallbacks
  // los resuelven a `false` en el bundle del cliente.
  // Nota: el `webpack` config solo se aplica con el bundler webpack. Por eso
  // los scripts `dev`/`build` usan el flag `--webpack` (Next 16 usa Turbopack
  // por defecto, que ignoraría esta configuración).
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
