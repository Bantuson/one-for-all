/** @type {import('next').NextConfig} */
const path = require('path')

// Load environment variables from root .env.local
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') })

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
]

const nextConfig = {
  experimental: {
    // Replace deprecated modularizeImports with optimizePackageImports
    optimizePackageImports: [
      'lucide-react',
      '@clerk/nextjs',
      '@supabase/supabase-js',
      '@supabase/ssr',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      '@radix-ui/react-select',
      '@radix-ui/react-popover',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-label',
      '@radix-ui/react-progress',
      '@radix-ui/react-visually-hidden',
      'recharts',
      '@tanstack/react-query',
      'zod',
    ],
    serverActions: { bodySizeLimit: '2mb' },
    webpackMemoryOptimizations: true,
  },

  // REMOVED: modularizeImports (deprecated in Next.js 15)
  // REMOVED: transpilePackages (not needed with optimizePackageImports)

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.clerk.com' },
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: '*.clerk.accounts.dev' },
    ],
  },

  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_JWT_ISSUER_DOMAIN: process.env.CLERK_JWT_ISSUER_DOMAIN,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  },

  // Simplified webpack config - only keep necessary externals
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.externals = config.externals || []
      config.externals.push({
        playwright: 'commonjs playwright',
        'playwright-core': 'commonjs playwright-core',
        openai: 'commonjs openai',
      })
    }
    return config
  },

  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      {
        source: '/npm/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' }],
      },
    ]
  },
}

module.exports = nextConfig
