import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
	env: {
		NEXT_PUBLIC_TIMEZONE:
			process.env.NEXT_PUBLIC_TIMEZONE || process.env.TIMEZONE || "Asia/Riyadh",
	},

	// Allow remote images from YouTube thumbnail hosts
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "img.youtube.com" },
			{ protocol: "https", hostname: "i.ytimg.com" },
		],
	},

	// Development configuration for better stability
	...(process.env.NODE_ENV === "development" && {
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
				source: "/(.*)",
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
					{
						key: "Content-Security-Policy",
						value:
							process.env.NODE_ENV === "development"
								? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: ws: wss: http: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https:; style-src-elem 'self' 'unsafe-inline' https:; font-src 'self' data: blob: https:;"
								: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https:; style-src-elem 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https://img.youtube.com https://i.ytimg.com; font-src 'self' data: blob: https:; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://offline.tawkit.net; connect-src 'self' ws: wss: http: https:;",
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
		},
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
				"components/glide-data-editor-streamlit/lib",
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
			test: /\.mjs$/,
			include: /node_modules/,
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
							test: /[\\/]node_modules[\\/]/,
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

		return config;
	},

	// Transpile Glide Data Grid for compatibility with Next.js
	transpilePackages: ["@glideapps/glide-data-grid"],

	// Enable Strict Mode in production only to avoid double-mount in dev
	reactStrictMode: process.env.NODE_ENV === "production",

	// Use standalone output to minimize runtime image size
	output: "standalone",

	// Disable ESLint during builds (for Docker production builds)
	eslint: {
		ignoreDuringBuilds: true,
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

	// Experimental features for stability
	experimental: {
		// Better memory management
		optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
		// Reduce warnings and improve performance
		optimizeCss: true,
	},
};

export default nextConfig;
