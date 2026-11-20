/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/assets/**": ["./study-assets/**/*"],
    "/api/ai/**": ["./data/index.json", "./data/papers/**/*.json"],
    "/api/preparation": ["./data/lessons-index.json"],
    "/api/search": ["./data/search-index.json"],
  },
};
export default nextConfig;
