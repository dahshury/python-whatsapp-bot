/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Python backend URL - can be overridden by environment variables
    PYTHON_BACKEND_URL: process.env.PYTHON_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:8000',
    NEXT_PUBLIC_TIMEZONE: process.env.NEXT_PUBLIC_TIMEZONE || process.env.TIMEZONE || 'Asia/Riyadh',
  },
  
  // Development configuration for better stability
  ...(process.env.NODE_ENV === 'development' && {
    // Reduce memory usage and prevent bundle corruption
    onDemandEntries: {
      // Period (in ms) where the server will keep pages in the buffer
      maxInactiveAge: 25 * 1000,
      // Number of pages that should be kept simultaneously without being disposed
      pagesBufferLength: 2,
    },
    // Disable x-powered-by header
    poweredByHeader: false,
  }),
  
  // Headers to improve security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Content Security Policy to prevent document.write issues
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'development' 
              ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: ws: wss: http: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval';"
              : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self';"
          },
        ],
      },
    ]
  },
  
  // Webpack configuration to fix Glide Data Grid module resolution issues
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Fix for Glide Data Grid module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      // Fix the math.js module resolution issue
      '@glideapps/glide-data-grid/dist/esm/internal/common/math.js': '@glideapps/glide-data-grid/dist/esm/internal/common/math',
    }
    
    // Add fallbacks for Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    }
    
    // Ensure proper module resolution for .mjs files
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: "javascript/auto",
    })
    
    // Development optimizations to prevent bundle corruption
    if (dev) {
      // Improve chunk splitting for development
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              enforce: true,
            },
          },
        },
      }
      
      // Improve module concatenation
      config.optimization.concatenateModules = false
      
      // Better error handling for corrupted modules
      config.optimization.emitOnErrors = false
    }
    
    return config
  },

  // Transpile Glide Data Grid for compatibility with Next.js
  transpilePackages: ['@glideapps/glide-data-grid'],
  
  // Re-enable strict mode for better error catching
  reactStrictMode: true,
  
  // Turbopack configuration (stable now in Next.js 15)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  // Experimental features for stability
  experimental: {
    // Better memory management
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    // Reduce warnings and improve performance
    optimizeCss: true,
  },
};

export default nextConfig;
