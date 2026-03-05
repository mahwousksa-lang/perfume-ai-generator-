/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'replicate.delivery' },
      { protocol: 'https', hostname: 'pbxt.replicate.delivery' },
      { protocol: 'https', hostname: '**.replicate.com' },
      { protocol: 'https', hostname: '**.mahwous.com' },
      { protocol: 'https', hostname: '**.cdn.shopify.com' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['cheerio'],
  },
};

module.exports = nextConfig;
