/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The Anthropic SDK is server-only; never bundle it (or the key) for the client.
  serverExternalPackages: ["@anthropic-ai/sdk"],
};

export default nextConfig;
