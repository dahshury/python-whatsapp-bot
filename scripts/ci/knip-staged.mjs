#!/usr/bin/env node
import { spawnSync } from "node:child_process";

function runSh(command, stdio = "pipe") {
	return spawnSync(command, { shell: true, stdio, encoding: "utf8" });
}

function getStagedFrontendFiles() {
	const diff = runSh("git diff --cached --name-only --diff-filter=ACMR");
	if (diff.status !== 0) return [];
	const files = (diff.stdout || "")
		.split(/\r?\n/)
		.map((s) => s.trim())
		.filter(Boolean);
	const allowed = new Set([".ts", ".tsx", ".js", ".jsx"]);
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

const files = getStagedFrontendFiles();
if (files.length === 0) {
	process.exit(0);
}

// Run knip to detect unused exports, dependencies, etc.
console.log("Running knip for dead code detection...");
const knip = runSh("pnpm exec knip --workspace app/frontend", "inherit");

if (knip.status !== 0) {
	process.stderr.write("\nKnip found unused exports or dependencies.\n");
	process.exit(1);
}

process.exit(0);

