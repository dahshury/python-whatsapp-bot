#!/usr/bin/env node
import { spawnSync } from "node:child_process";

function runSh(command, stdio = "pipe") {
	return spawnSync(command, { shell: true, stdio, encoding: "utf8" });
}

function getStagedFiles() {
	const diff = runSh("git diff --cached --name-only --diff-filter=ACMR");
	if (diff.status !== 0) return [];
	const files = (diff.stdout || "")
		.split(/\r?\n/)
		.map((s) => s.trim())
		.filter(Boolean);
	const allowed = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"]);
	return files.filter((f) => {
		const inFrontend = f.startsWith("app/frontend/");
		if (!inFrontend) return false;
		const lower = f.toLowerCase();
		for (const ext of allowed) {
			if (lower.endsWith(ext)) return true;
		}
		return false;
	});
}

function quoteFiles(files) {
	return files.map((f) => `"${f.replace(/"/g, '\\"')}"`).join(" ");
}

const files = getStagedFiles();
if (files.length === 0) {
	process.exit(0);
}

const fileArgs = quoteFiles(files);

// 1) Attempt auto-fix first (format + fix)
const fix = runSh(`pnpm exec biome check --fix --unsafe ${fileArgs}`, "inherit");
if (fix.error) {
	process.stderr.write(`Biome fix step failed to execute: ${String(fix.error)}\n`);
	process.exit(1);
}

// Restage only the processed files to include applied fixes
runSh(`git add ${fileArgs}`, "inherit");

// 2) Re-check and fail on ANY remaining warnings or errors
const check = runSh(`pnpm exec biome check --reporter json ${fileArgs}`);
if (check.status !== 0 && check.status !== 1) {
	process.stderr.write(check.stderr || "Biome check failed unexpectedly.\n");
	process.exit(check.status ?? 1);
}

let errorCount = 0;
let warningCount = 0;

const stdout = check.stdout || "";
const lines = stdout.split(/\r?\n/);
for (const line of lines) {
	const trimmed = line.trim();
	if (!trimmed || !trimmed.startsWith("{")) continue;
	try {
		const obj = JSON.parse(trimmed);
		if (Array.isArray(obj.diagnostics)) {
			for (const d of obj.diagnostics) {
				if (!d || typeof d !== "object") continue;
				if (d.severity === "error") errorCount += 1;
				else if (d.severity === "warning") warningCount += 1;
			}
		}
		if (obj.summary && typeof obj.summary === "object") {
			if (typeof obj.summary.errorCount === "number") errorCount += obj.summary.errorCount;
			if (typeof obj.summary.warningCount === "number") warningCount += obj.summary.warningCount;
		}
	} catch {}
}

if (errorCount > 0 || warningCount > 0) {
	process.stderr.write(`\nBiome found ${errorCount} errors and ${warningCount} warnings in staged files. Showing details...\n\n`);
	runSh(`pnpm exec biome check ${fileArgs}`, "inherit");
	process.exit(1);
}

process.exit(0);


