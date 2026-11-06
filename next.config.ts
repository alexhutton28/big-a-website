import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'r2.limitlesstcg.net',
      },
      {
        protocol: 'https',
        hostname: 'images.pokemontcg.io',
      },
    ],
  },
  // TierBinder moved to its own repo. Temporary for now: it moves again once it has its
  // real domain, and browsers remember permanent redirects.
  async redirects() {
    return [
      {
        source: '/tcg-tier-stack',
        destination: 'https://tierbinder.big-a.fun',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
