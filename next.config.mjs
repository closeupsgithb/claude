/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Chromium para generar el PDF en el servidor: no se empaqueta con webpack.
    serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  },
};

export default nextConfig;
