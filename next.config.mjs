/** @type {import('next').NextConfig} */
const nextConfig = {
  // Evidence and photo uploads go through server actions
  experimental: { serverActions: { bodySizeLimit: '5mb' } },
};

export default nextConfig;
