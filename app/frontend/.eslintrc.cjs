'use strict'
/* eslint-disable @typescript-eslint/no-var-requires */

module.exports = {
	root: true,
	extends: ['next', 'next/core-web-vitals'],
	rules: {
		// Layered boundaries (warn-only initially)
		'no-restricted-imports': [
			'warn',
			{
				patterns: [
					{
						group: [
							'@features/*',
							'@widgets/*',
							'@entities/*',
							'@services/*',
							'@processes/*',
							'@shared/*',
						],
						message:
							'Prefer path aliases that respect DDD layers. Avoid deep relative imports across layers.',
					},
				],
			},
		],
	},
	overrides: [
		{
			files: ['**/*.{ts,tsx}'],
			rules: {
				// Custom simple boundaries: import direction constraints
				// These are soft constraints; for strict enforcement consider eslint-plugin-boundaries
			},
		},
	],
}

/**
 * ESLint configuration with initial boundaries setup.
 * Phase 0 keeps rules permissive to avoid breaking existing imports;
 * later phases will tighten the allowed directions.
 */
module.exports = {
	root: true,
	extends: ['next/core-web-vitals'],
	plugins: ['boundaries'],
	settings: {
		'boundaries/elements': [
			{ type: 'app', pattern: 'app' },
			{ type: 'features', pattern: 'features' },
			{ type: 'widgets', pattern: 'widgets' },
			{ type: 'entities', pattern: 'entities' },
			{ type: 'services', pattern: 'services' },
			{ type: 'processes', pattern: 'processes' },
			{ type: 'shared', pattern: 'shared' },
		],
	},
	rules: {
		// Start permissive; enforce in later phases
		'boundaries/element-types': [
			'warn',
			{
				default: 'allow',
			},
		],
	},
}

/* eslint-env node */
module.exports = {
	root: true,
	extends: ['next', 'next/core-web-vitals'],
	plugins: ['boundaries'],
	settings: {
		'boundaries/elements': [
			{ type: 'app', pattern: 'app/*' },
			{ type: 'features', pattern: 'features/*' },
			{ type: 'widgets', pattern: 'widgets/*' },
			{ type: 'entities', pattern: 'entities/*' },
			{ type: 'services', pattern: 'services/*' },
			{ type: 'processes', pattern: 'processes/*' },
			{ type: 'shared', pattern: 'shared/*' },
			{ type: 'ui', pattern: 'shared/ui/*' },
			{ type: 'libs', pattern: 'shared/libs/*' },
			{ type: 'components', pattern: 'components/*' },
			{ type: 'hooks', pattern: 'hooks/*' },
			{ type: 'lib', pattern: 'lib/*' },
		],
	},
	rules: {
		// Tightened boundaries, but warnings to avoid breaking CI while cleaning
		'boundaries/element-types': [
			'warn',
			{
				default: 'allow',
				rules: [
					{
						from: ['features'],
						disallow: ['features', 'widgets', 'components'],
						allow: [
							'entities',
							'shared',
							'services',
							'ui',
							'libs',
							'processes',
						],
					},
					{
						from: ['widgets'],
						disallow: ['features', 'components'],
						allow: [
							'entities',
							'shared',
							'services',
							'ui',
							'libs',
							'processes',
						],
					},
					{
						from: ['shared'],
						disallow: ['features', 'components'],
						allow: ['shared', 'services', 'libs', 'ui', 'entities'],
					},
					{
						from: ['ui'],
						disallow: ['widgets', 'features', 'components'],
						allow: ['shared', 'libs'],
					},
					{
						from: ['entities'],
						disallow: ['components'],
						allow: ['shared'],
					},
					{
						from: ['services'],
						disallow: ['components'],
						allow: ['shared', 'entities'],
					},
					{
						from: ['processes'],
						disallow: ['components'],
						allow: ['services', 'shared', 'entities', 'widgets'],
					},
				],
			},
		],
	},
}
