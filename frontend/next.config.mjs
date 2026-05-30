/** @type {import('next').NextConfig} */
const config = {
  output: 'standalone',
  experimental: {
    serverActions: { allowedOrigins: ['*'] },
  },
}

export default config
