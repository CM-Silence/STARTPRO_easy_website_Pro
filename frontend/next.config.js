/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    cpus: 1,
  },
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  images: {
    domains: ['localhost', '10.1.1.55']
  },
  async rewrites() {
    return [
      { source: '/about', destination: '/pages/about' },
      { source: '/services', destination: '/pages/services' },
      { source: '/contact', destination: '/pages/contact' },
      { source: '/api/:path*', destination: 'http://localhost:3003/api/:path*' },
      { source: '/uploads/:path*', destination: 'http://localhost:3003/uploads/:path*' },
      { source: '/system-default/:path*', destination: 'http://localhost:3003/system-default/:path*' }
    ]
  }
}
module.exports = nextConfig
