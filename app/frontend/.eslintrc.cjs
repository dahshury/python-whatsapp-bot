/* eslint-env node */
module.exports = {
	root: true,
	extends: ["next", "next/core-web-vitals"],
	plugins: ["boundaries"],
	settings: {
		"boundaries/elements": [
			{ type: "features", pattern: "features/*" },
			{ type: "widgets", pattern: "widgets/*" },
			{ type: "entities", pattern: "entities/*" },
			{ type: "shared", pattern: "shared/*" },
			{ type: "services", pattern: "services/*" },
			{ type: "providers", pattern: "shared/providers/*" },
			{ type: "ui", pattern: "shared/ui/*" },
			{ type: "libs", pattern: "shared/libs/*" },
			{ type: "types", pattern: "shared/types/*" },
			{ type: "app", pattern: "app/*" },
			{ type: "components", pattern: "components/*" },
			{ type: "hooks", pattern: "hooks/*" },
			{ type: "lib", pattern: "lib/*" },
		],
	},
	rules: {
		/**
		 * Enforce import boundaries between app layers. UI may not import from infrastructure folders directly, etc.
		 * Keep initial rules soft (warn) to allow incremental adoption.
		 */
		"boundaries/element-types": [
			"error",
			{
				default: "allow",
				rules: [
					{
						from: ["features"],
						disallow: ["features", "widgets"],
						allow: [
							"entities",
							"shared",
							"services",
							"types",
							"libs",
							"providers",
							"ui",
						],
					},
					{
						from: ["widgets"],
						disallow: ["features"],
						allow: [
							"entities",
							"shared",
							"services",
							"types",
							"libs",
							"providers",
							"ui",
						],
					},
					{
						from: ["ui"],
						disallow: ["widgets", "features"],
						allow: ["shared", "types", "libs", "providers"],
					},
					{
						from: ["shared"],
						disallow: ["features"],
						allow: [
							"shared",
							"services",
							"types",
							"libs",
							"providers",
							"ui",
							"entities",
						],
					},
					{
						from: ["components"],
						allow: ["shared", "types", "services", "hooks", "lib"],
					},
				],
			},
		],
	},
};
