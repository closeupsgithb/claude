/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Chromium para generar el PDF en el servidor: no se empaqueta con webpack...
    serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
    // ...y sus binarios se incluyen a mano en la función del informe.
    outputFileTracingIncludes: {
      "/api/informe": ["./node_modules/@sparticuz/chromium/bin/**"],
    },
  },
};

export default nextConfig;
