/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@grpc/grpc-js', '@caerus-dev/sdk'],
  images: {
    unoptimized: true,
  },
}

export default nextConfig
