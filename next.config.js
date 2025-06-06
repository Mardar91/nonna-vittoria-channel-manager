/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ['mongoose']
  },
  webpack: (config, { isServer }) => { // è buona pratica includere { isServer } sebbene non usato subito
    // Assicurati che config.resolve.fallback esista
    if (!config.resolve.fallback) {
      config.resolve.fallback = {};
    }

    // Mantieni i fallback esistenti e aggiungi/sovrascrivi quelli per mongodb
    config.resolve.fallback.fs = false;
    config.resolve.fallback.net = false;
    config.resolve.fallback.tls = false;
    config.resolve.fallback['aws4'] = false;
    config.resolve.fallback['kerberos'] = false;
    config.resolve.fallback['snappy'] = false;
    config.resolve.fallback['gcp-metadata'] = false;
    config.resolve.fallback['azure-client-id-plugin'] = false;
    config.resolve.fallback['@mongodb-js/zstd'] = false;
    // Aggiungi anche 'mongodb-client-encryption' per sicurezza, dato l'import trace
    config.resolve.fallback['mongodb-client-encryption'] = false;

    return config;
  }
};

module.exports = nextConfig;
