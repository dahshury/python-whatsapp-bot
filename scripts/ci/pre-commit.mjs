#!/usr/bin/env node
import { spawnSync } from "node:child_process";

/**
 * Modern pre-commit hook with clear output and proper error handling
 */

const COLORS = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	cyan: "\x1b[36m",
};

function log(message, color = "") {
	console.log(`${color}${message}${COLORS.reset}`);
}

function logSection(title) {
	console.log("");
	log(`${"=".repeat(80)}`, COLORS.cyan);
	log(`  ${title}`, COLORS.bright + COLORS.cyan);
	log(`${"=".repeat(80)}`, COLORS.cyan);
	console.log("");
}

function run(command, options = {}) {
	const { cwd = process.cwd(), stdio = "inherit", description = "" } = options;

	if (description) {
		log(`→ ${description}`, COLORS.blue);
	}

	const result = spawnSync(command, {
		shell: true,
		cwd,
		stdio,
		encoding: "utf8",
	});

	return {
		success: result.status === 0,
		status: result.status,
		stdout: result.stdout,
		stderr: result.stderr,
	};
}

function getStagedFiles(pattern) {
	const result = run("git diff --cached --name-only --diff-filter=ACMR", {
		stdio: "pipe",
	});

	if (!result.success || !result.stdout) return [];

	const files = result.stdout
		.split(/\r?\n/)
		.map((s) => s.trim())
		.filter(Boolean);

	if (!pattern) return files;

	const regex = new RegExp(pattern, "i");
	return files.filter((f) => regex.test(f));
}

function quotePaths(files) {
	return files.map((f) => `"${f.replace(/"/g, '\\"')}"`).join(" ");
}

// ============================================================================
// Main Pre-commit Flow
// ============================================================================

async function main() {
	log("\n🔍 Running pre-commit checks...\n", COLORS.bright);

	const frontendFiles = getStagedFiles("^app/frontend/");
	const frontendTsFiles = getStagedFiles("^app/frontend/.*\\.(ts|tsx)$");
	const pythonFiles = getStagedFiles("\\.py$").filter(
		(f) => !f.startsWith("app/frontend/")
	);

	const hasFrontend = frontendFiles.length > 0;
	const hasFrontendTs = frontendTsFiles.length > 0;
	const hasPython = pythonFiles.length > 0;

	let hasErrors = false;

	// ========================================================================
	// Frontend Checks
	// ========================================================================
	if (hasFrontend) {
		logSection("Frontend Checks");

		// 1. TypeScript Type Checking
		if (hasFrontendTs) {
			const tscResult = run("pnpm tsc --noEmit", {
				cwd: "app/frontend",
				description: "Running TypeScript type checker...",
			});

			if (!tscResult.success) {
				log("✗ TypeScript type checking failed", COLORS.red);
				hasErrors = true;
			} else {
				log("✓ TypeScript type checking passed", COLORS.green);
			}
		}

		// 2. Biome (Linting & Formatting)
		const biomeFiles = frontendFiles.filter((f) => {
			const lower = f.toLowerCase();
			return (
				lower.endsWith(".ts") ||
				lower.endsWith(".tsx") ||
				lower.endsWith(".js") ||
				lower.endsWith(".jsx") ||
				lower.endsWith(".json") ||
				lower.endsWith(".css")
			);
		});

		if (biomeFiles.length > 0) {
			// Run biome on staged files using --staged flag (biome v1.5.0+)
			// This avoids command line length issues
			const biomeFixResult = run(
				"pnpm biome check --fix --unsafe --staged",
				{
					cwd: "app/frontend",
					description: "Running Biome linter with auto-fix...",
					stdio: "pipe",
				}
			);

			// Check for remaining errors
			const biomeCheckResult = run("pnpm biome check --staged", {
				cwd: "app/frontend",
				stdio: "inherit",
			});

			if (!biomeCheckResult.success) {
				log("✗ Biome linting failed", COLORS.red);
				hasErrors = true;
			} else {
				log("✓ Biome linting passed", COLORS.green);
			}
		}

		// 3. Knip (Unused exports/dependencies)
		const knipResult = run("pnpm knip --no-config-hints", {
			cwd: "app/frontend",
			description: "Running Knip to check for unused code...",
		});

		if (!knipResult.success) {
			log("✗ Knip found issues", COLORS.yellow);
			log(
				"  (This is a warning, not blocking commit)",
				COLORS.yellow
			);
			// Note: We're not setting hasErrors = true here as knip is informational
		} else {
			log("✓ Knip check passed", COLORS.green);
		}

		// 4. Prettier (Code Formatting)
		// Run prettier with cache to format all staged files
		const prettierResult = run(
			"pnpm prettier --write --log-level warn --cache --cache-location .prettiercache .",
			{
				cwd: "app/frontend",
				description: "Running Prettier formatter...",
			}
		);

		if (!prettierResult.success) {
			log("✗ Prettier formatting failed", COLORS.red);
			hasErrors = true;
		} else {
			log("✓ Prettier formatting passed", COLORS.green);
			// Re-stage modified files in smaller batches to avoid command line length
			const batchSize = 50;
			for (let i = 0; i < frontendFiles.length; i += batchSize) {
				const batch = frontendFiles.slice(i, i + batchSize);
				const fileArgs = quotePaths(batch);
				run(`git add ${fileArgs}`, { stdio: "pipe" });
			}
		}
	}

	// ========================================================================
	// Python Backend Checks
	// ========================================================================
	if (hasPython) {
		logSection("Python Backend Checks");

		const pythonPaths = quotePaths(pythonFiles);

		// Ruff (Linting & Formatting)
		const ruffResult = run(
			`uv run ruff check --fix --unsafe-fixes ${pythonPaths}`,
			{
				description: "Running Ruff linter with auto-fix...",
			}
		);

		if (!ruffResult.success) {
			log("✗ Ruff linting failed", COLORS.red);
			hasErrors = true;
		} else {
			log("✓ Ruff linting passed", COLORS.green);
			// Re-stage fixed files
			run(`git add ${pythonPaths}`, { stdio: "pipe" });
		}

		// Ruff format
		const ruffFormatResult = run(`uv run ruff format ${pythonPaths}`, {
			description: "Running Ruff formatter...",
		});

		if (!ruffFormatResult.success) {
			log("✗ Ruff formatting failed", COLORS.red);
			hasErrors = true;
		} else {
			log("✓ Ruff formatting passed", COLORS.green);
			// Re-stage formatted files
			run(`git add ${pythonPaths}`, { stdio: "pipe" });
		}
	}

	// ========================================================================
	// Summary
	// ========================================================================
	console.log("");
	log("=".repeat(80), COLORS.cyan);

	if (hasErrors) {
		log("  ✗ Pre-commit checks FAILED", COLORS.bright + COLORS.red);
		log("=".repeat(80), COLORS.cyan);
		console.log("");
		log(
			"Please fix the errors above before committing.",
			COLORS.red
		);
		process.exit(1);
	} else {
		log("  ✓ All pre-commit checks PASSED", COLORS.bright + COLORS.green);
		log("=".repeat(80), COLORS.cyan);
		console.log("");
		process.exit(0);
	}
}

main().catch((error) => {
	log(`\n✗ Pre-commit hook failed: ${error.message}`, COLORS.red);
	process.exit(1);
});
