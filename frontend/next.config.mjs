/** @type {import('next').NextConfig} */
const config = {
  output: 'standalone',
  serverExternalPackages: ['mariadb', '@prisma/adapter-mariadb'],
  experimental: {
    serverActions: { allowedOrigins: ['*'] },
  },
}

export default config
