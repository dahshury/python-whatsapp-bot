import os from "node:os";
import path from "node:path";

// Regex patterns defined at top level for performance
const MJS_FILE_REGEX = /\.mjs$/;
const NODE_MODULES_REGEX = /[\\/]node_modules[\\/]/;

// Enable standalone output only on non-Windows platforms or when explicitly requested
// Windows has symlink permission issues with pnpm + Next.js standalone output
const shouldUseStandalone =
  process.env.FORCE_STANDALONE === "true" ||
  (os.platform() !== "win32" && process.env.DISABLE_STANDALONE !== "true");

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_TIMEZONE:
      process.env.NEXT_PUBLIC_TIMEZONE || process.env.TIMEZONE || "Asia/Riyadh",
    NEXT_PUBLIC_SYSTEM_AGENT_WA_ID:
      process.env.NEXT_PUBLIC_SYSTEM_AGENT_WA_ID ||
      process.env.SYSTEM_AGENT_WA_ID ||
      "12125550123",
    NEXT_PUBLIC_SYSTEM_AGENT_NAME:
      process.env.NEXT_PUBLIC_SYSTEM_AGENT_NAME ||
      process.env.SYSTEM_AGENT_NAME ||
      "Calendar AI Assistant",
  },

  // Allow remote images from YouTube thumbnail hosts and curated Unsplash assets
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },

  // Development configuration for better stability
  ...(process.env.NODE_ENV === "development" && {
    // Reduce memory usage and prevent bundle corruption
    onDemandEntries: (() => {
      // Period (in ms) where the server will keep pages in the buffer
      const INACTIVE_AGE_SECONDS = 25;
      const MS_PER_SECOND = 1000;
      // Number of pages that should be kept simultaneously without being disposed
      const PAGES_BUFFER_LENGTH = 2;
      return {
        maxInactiveAge: INACTIVE_AGE_SECONDS * MS_PER_SECOND,
        pagesBufferLength: PAGES_BUFFER_LENGTH,
      };
    })(),
    // Disable x-powered-by header
    poweredByHeader: false,
  }),

  // Rewrite theme CSS requests to remove .css extension for route matching
  rewrites() {
    return [
      {
        source: "/themes/:theme.css",
        destination: "/themes/:theme",
      },
    ];
  },

  // Headers to improve security and performance
  headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Content Security Policy to prevent document.write issues
          // Note: cdn.tldraw.com is required for tldraw icon sprites used in CSS mask properties
          {
            key: "Content-Security-Policy",
            value:
              process.env.NODE_ENV === "development"
                ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: ws: wss: http: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https:; style-src-elem 'self' 'unsafe-inline' https:; font-src 'self' data: blob: https:;"
                : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https:; style-src-elem 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https://img.youtube.com https://i.ytimg.com https://images.unsplash.com https://cdn.tldraw.com; font-src 'self' data: blob: https:; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://offline.tawkit.net; connect-src 'self' ws: wss: http: https:;",
          },
        ],
      },
    ];
  },

  // Webpack configuration to fix Glide Data Grid module resolution issues
  webpack: (
    config,
    {
      buildId: _buildId,
      dev: _dev,
      isServer: _isServer,
      defaultLoaders: _defaultLoaders,
      webpack: _webpack,
    }
  ) => {
    // Fix for Glide Data Grid module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      // Fix the math.js module resolution issue
      "@glideapps/glide-data-grid/dist/esm/internal/common/math.js":
        "@glideapps/glide-data-grid/dist/esm/internal/common/math",
      // Alias Streamlit internal lib path (~lib/*) to the copied directory
      "~lib": path.resolve(
        process.cwd(),
        "components/glide-data-editor-streamlit/lib"
      ),
    };

    // Add fallbacks for Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };

    // Ensure proper module resolution for .mjs files
    config.module.rules.push({
      test: MJS_FILE_REGEX,
      include: NODE_MODULES_REGEX,
      type: "javascript/auto",
    });

    // Development optimizations to prevent bundle corruption
    if (_dev) {
      // Simplify chunk splitting for development to prevent MIME type issues
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: NODE_MODULES_REGEX,
              name: "vendors",
              priority: -10,
              chunks: "all",
            },
          },
        },
      };

      // Disable module concatenation to prevent issues
      config.optimization.concatenateModules = false;

      // Better error handling for corrupted modules
      config.optimization.emitOnErrors = false;
    }

    // Strip console.* in production bundles except warn/error
    if (!_dev && process.env.NODE_ENV === "production") {
      config.optimization = {
        ...config.optimization,
        minimize: true,
      };
      config.plugins = config.plugins || [];
      // Rely on SWC compiler setting removeConsole below
    }

    // Define __DEV__ for webpack bundles
    config.plugins = config.plugins || [];
    config.plugins.push(
      new _webpack.DefinePlugin({
        __DEV__: _dev,
      })
    );

    return config;
  },

  // Transpile Glide Data Grid for compatibility with Next.js
  transpilePackages: ["@glideapps/glide-data-grid"],

  // Enable Strict Mode in production only to avoid double-mount in dev
  reactStrictMode: process.env.NODE_ENV === "production",

  // Remove console logs in production except warn/error
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  // Use standalone output to minimize runtime image size
  // Disabled on Windows due to symlink permission issues with pnpm
  ...(shouldUseStandalone && { output: "standalone" }),

  // TypeScript configuration for builds
  typescript: {
    // Allow production builds to complete even with type errors
    // This prevents "unused @ts-expect-error" from blocking builds
    ignoreBuildErrors: true,
  },

  // Turbopack configuration (stable now in Next.js 15)
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },

  // Note: tldraw CSS can't be externalized (CSS files aren't handled by Node.js)
  // The package itself will be code-split automatically by Next.js

  // Experimental features for stability
  experimental: {
    // Better memory management
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
    // Reduce warnings and improve performance
    optimizeCss: true,
    // Enable Turbopack file system caching for faster compilation in development
    turbopackFileSystemCacheForDev: true,
  },

  // Enable cache components for static UI caching (Next.js 16)
  cacheComponents: true,

  // Enable React Compiler for optimized rendering
  reactCompiler: true,
};

export default nextConfig;
