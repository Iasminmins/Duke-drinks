import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // driver do Postgres roda só no servidor
  serverExternalPackages: ["pg"],
};

export default nextConfig;
