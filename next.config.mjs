/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb"
    }
  },
  webpack: (config, { isServer }) => {
    console.log("🧩 [Build] Webpack loaded (isServer:", isServer, ")");
    return config;
  }
};

export default nextConfig;
