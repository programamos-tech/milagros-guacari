import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Subida de imágenes vía Server Action: el default es 1 MB y rompe con fotos > ~1 MB.
    serverActions: {
      bodySizeLimit: "6mb",
    },
    // Transiciones suaves entre rutas (View Transitions API).
    viewTransition: true,
  },
  images: {
    // Incluye 1920 para retina en PDP; evita 4K innecesario.
    deviceSizes: [640, 750, 828, 1080, 1200, 1400, 1600, 1920],
    imageSizes: [64, 96, 128, 256, 384, 480],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Supabase local (CLI): URLs tipo http://127.0.0.1:<puerto>/storage/v1/object/public/...
      {
        protocol: "http",
        hostname: "127.0.0.1",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
