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

const imagesConfig: NextConfig["images"] = supabaseHostname
  ? {
      remotePatterns: [
        {
          protocol: "https" as const,
          hostname: supabaseHostname,
          pathname: "/storage/v1/object/**",
        },
      ],
    }
  : undefined;

const nextConfig: NextConfig = {
  serverExternalPackages: ["lightningcss", "@tailwindcss/node", "@tailwindcss/oxide"],
  ...(imagesConfig ? { images: imagesConfig } : {}),
  outputFileTracingIncludes: {
    // Ensure workflow template YAML ships with every serverless bundle so runtime fs access succeeds.
    "/*": ["./docs/workflow_template.yaml"],
  },
  turbopack: {
    resolveAlias: {
      fs: {
        // Recreate the webpack `fs: false` fallback for browser bundles.
        browser: "./configs/browser-fs-shim.ts",
      },
    },
  },
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
