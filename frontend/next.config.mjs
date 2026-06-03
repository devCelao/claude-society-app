/** @type {import('next').NextConfig} */

const allowedOrigins = ['localhost:3000']
if (process.env.NEXT_PUBLIC_APP_URL) {
  allowedOrigins.push(new URL(process.env.NEXT_PUBLIC_APP_URL).host)
}

const config = {
  output: 'standalone',
  serverExternalPackages: ['mariadb', '@prisma/adapter-mariadb'],
  experimental: {
    serverActions: { allowedOrigins },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default config
