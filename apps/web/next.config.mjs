/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true
  },
  transpilePackages: ["@hg/db"]
};

export default nextConfig;

