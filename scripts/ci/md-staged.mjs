#!/usr/bin/env node
import { spawnSync } from "node:child_process";

function runSh(command, stdio = "pipe") {
	return spawnSync(command, { shell: true, stdio, encoding: "utf8" });
}

function getStagedMarkdownFiles() {
	const diff = runSh("git diff --cached --name-only --diff-filter=ACMR");
	if (diff.status !== 0) return [];
	const files = (diff.stdout || "")
		.split(/\r?\n/)
		.map((s) => s.trim())
		.filter(Boolean);
	return files.filter((f) => f.toLowerCase().endsWith(".md"));
}

function quoteFiles(files) {
	return files.map((f) => `"${f.replace(/"/g, '\\"')}"`).join(" ");
}

const files = getStagedMarkdownFiles();
if (files.length === 0) {
	process.exit(0);
}

const fileArgs = quoteFiles(files);

// helpers that fall back to pnpm dlx if tool is not installed locally
function runMarkdownlint(args, stdio) {
	// Quietly detect local availability to avoid noisy errors
	const hasLocal = runSh("pnpm exec markdownlint --version", "pipe").status === 0;
	if (hasLocal) return runSh(`pnpm exec markdownlint ${args}`, stdio);
	return runSh(`pnpm dlx markdownlint-cli ${args}`, stdio);
}

function runPrettier(args, stdio) {
	const first = runSh(`pnpm exec prettier ${args}`, stdio);
	if (first.status === 0) return first;
	return runSh(`pnpm dlx prettier ${args}`, stdio);
}

// 1) markdownlint --fix
const fix = runMarkdownlint(`--fix ${fileArgs}`, "inherit");
// Do not fail here; some rules are not auto-fixable. Proceed to check.

// 2) re-check markdownlint, fail and print diagnostics if any remain
const check = runMarkdownlint(`${fileArgs}`, "pipe");
if (check.status !== 0) {
	process.stderr.write("\nmarkdownlint found issues after fixing. Showing details...\n\n");
	// Print readable output
	runMarkdownlint(`${fileArgs}`, "inherit");
	process.exit(1);
}

// 3) Prettier write (markdown only)
const prettier = runPrettier(`--log-level warn --write ${fileArgs}`, "inherit");
if (prettier.status !== 0) {
	process.stderr.write("prettier failed to execute.\n");
	process.exit(1);
}

process.exit(0);


