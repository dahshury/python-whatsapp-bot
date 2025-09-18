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

// 1) markdownlint --fix
const fix = runSh(`pnpm exec markdownlint --fix ${fileArgs}`, "inherit");
if (fix.error) {
	process.stderr.write(`markdownlint fix failed to execute: ${String(fix.error)}\n`);
	process.exit(1);
}

// 2) re-check markdownlint, fail and print diagnostics if any remain
const check = runSh(`pnpm exec markdownlint ${fileArgs}`, "pipe");
if (check.status !== 0) {
	process.stderr.write("\nmarkdownlint found issues after fixing. Showing details...\n\n");
	// Print readable output
	runSh(`pnpm exec markdownlint ${fileArgs}`, "inherit");
	process.exit(1);
}

// 3) Prettier write (markdown only)
const prettier = runSh(`pnpm exec prettier --log-level warn --write ${fileArgs}`, "inherit");
if (prettier.error) {
	process.stderr.write(`prettier failed to execute: ${String(prettier.error)}\n`);
	process.exit(1);
}

process.exit(0);


