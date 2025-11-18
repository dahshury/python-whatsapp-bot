import path from 'node:path'
import { defineConfig } from 'vitest/config'

const r = (p: string) => path.resolve(__dirname, p)

export default defineConfig({
	plugins: [],
	resolve: {
		alias: {
			'@': r('.'),
			'@/': r('.'),
			'@app': r('app'),
			'@pages': r('pages'),
			'@shared': r('shared'),
			'@features': r('features'),
			'@entities': r('entities'),
			'@widgets': r('widgets'),
			'@ui': r('shared/ui'),
			'@libs': r('shared/libs'),
		},
	},
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./setupTests.ts'],
		include: [
			'shared/**/__tests__/**/*.{test,spec}.{ts,tsx}',
			'features/**/__tests__/**/*.{test,spec}.{ts,tsx}',
			'entities/**/__tests__/**/*.{test,spec}.{ts,tsx}',
		],
	},
})
