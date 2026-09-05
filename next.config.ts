import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // `standalone` cho self-host (Docker). Trên Vercel thì bỏ, Vercel tự đóng gói.
  output: process.env.VERCEL
    ? undefined
    : process.env.NODE_ENV === 'production'
      ? 'standalone'
      : undefined,
  // Thư mục cha có nhiều lockfile (các repo framevis khác); ghim root để Next không đoán sai.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'cdn.framevis.com' },
    ],
  },
};

export default nextConfig;
