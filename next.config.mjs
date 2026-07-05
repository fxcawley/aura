/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Allow the local dev + IDE browser-preview proxy origins so Server Actions
  // (form POSTs) aren't rejected with "Invalid Server Actions request".
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    serverActions: {
      allowedOrigins: ["127.0.0.1:3001", "localhost:3001", "127.0.0.1:3000", "localhost:3000"],
    },
  },
};

export default nextConfig;
