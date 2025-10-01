#!/usr/bin/env node
import { spawnSync } from "node:child_process";

function run(command, stdio = "pipe") {
  return spawnSync(command, { shell: true, stdio, encoding: "utf8" });
}

function gitDiff(pattern) {
  const diff = run("git diff --cached --name-only --diff-filter=ACMR");
  if (diff.status !== 0) return [];
  const files = (diff.stdout || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const regex = new RegExp(pattern, "i");
  return files.filter((f) => regex.test(f));
}

const hasFrontend = gitDiff("^app/frontend/").length > 0;
const hasMarkdown = gitDiff("\\.md$").length > 0;
const hasPython = gitDiff("\\.py$").some((f) => !f.startsWith("app/frontend/"));
const hasFrontendTs = gitDiff("^app/frontend/.*\\.(ts|tsx)$").length > 0;

let failed = false;

if (hasFrontend) {
  const biome = run("node scripts/ci/biome-staged.mjs", "inherit");
  if (biome.status !== 0) failed = true;
}

// Run TypeScript type-checks for frontend changes
if (hasFrontendTs) {
  const tsc = run("pnpm -C app/frontend exec tsc --noEmit", "inherit");
  if (tsc.status !== 0) failed = true;
}

if (hasMarkdown) {
  const markdown = run("node scripts/ci/md-staged.mjs", "inherit");
  if (markdown.status !== 0) failed = true;
}

// Temporarily disabled mypy check
// if (hasPython) {
//   const mypy = run("python scripts/ci/mypy-staged.py", "inherit");
//   if (mypy.status !== 0) failed = true;
// }

// Run knip to check for unused exports/dependencies in the frontend when it changes
if (hasFrontend) {
  const knip = run("pnpm -C app/frontend dlx knip --reporter json", "inherit");
  if (knip.status !== 0) failed = true;
}

process.exit(failed ? 1 : 0);




