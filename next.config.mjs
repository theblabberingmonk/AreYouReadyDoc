/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/assets/**": ["./study-assets/**/*"],
    "/api/search": ["./data/search-index.json"],
  },
};
export default nextConfig;
