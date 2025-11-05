import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = (() => {
  if (!supabaseUrl) return undefined;
  try {
    return new URL(supabaseUrl).hostname;
  } catch {
    return undefined;
  }
})();

const imagesConfig = supabaseHostname
  ? {
      remotePatterns: [
        {
          protocol: "https",
          hostname: supabaseHostname,
          pathname: "/storage/v1/object/**",
        },
      ],
    }
  : undefined;

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  ...(imagesConfig ? { images: imagesConfig } : {}),
  async headers() {
    return [
      {
        source: '/beta/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  // Add beta directory to static file serving
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
