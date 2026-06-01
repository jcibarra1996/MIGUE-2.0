import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Aumenta el límite de body para rutas de API en App Router.
    // "50mb" cubre Actas Constitutivas + imágenes de INE/comprobante en un solo FormData.
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
