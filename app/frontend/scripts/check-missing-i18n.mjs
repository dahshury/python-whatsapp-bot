#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const FRONTEND_ROOT = process.cwd();
const SRC_DIR = FRONTEND_ROOT;
const EN_JSON = path.join(
  FRONTEND_ROOT,
  "public",
  "locales",
  "en",
  "common.json"
);
const AR_JSON = path.join(
  FRONTEND_ROOT,
  "public",
  "locales",
  "ar",
  "common.json"
);

/** Recursively gather .ts/.tsx files under the frontend directory */
function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (
      e.name === "node_modules" ||
      e.name === ".next" ||
      e.name === "public"
    ) {
      continue;
    }
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(p, out);
    } else if (e.isFile() && (p.endsWith(".ts") || p.endsWith(".tsx"))) {
      out.push(p);
    }
  }
  return out;
}

function extractKeysFromFile(filePath) {
  const src = fs.readFileSync(filePath, "utf8");
  const re = /i18n\.getMessage\(\s*['"]([^'")]+)['"]/g;
  const keys = [];
  let m;
  m = re.exec(src);
  while (m !== null) {
    keys.push(m[1]);
    m = re.exec(src);
  }
  return keys;
}

function loadJsonKeys(file) {
  try {
    const obj = JSON.parse(fs.readFileSync(file, "utf8"));
    return new Set(Object.keys(obj));
  } catch (e) {
    console.error("Failed to read JSON", file, e.message);
    return new Set();
  }
}

const files = walk(SRC_DIR, []);
const used = new Set();
for (const f of files) {
  const ks = extractKeysFromFile(f);
  for (const k of ks) {
    used.add(k);
  }
}

const enKeys = loadJsonKeys(EN_JSON);
const arKeys = loadJsonKeys(AR_JSON);

const missingEn = [];
const missingAr = [];
for (const k of used) {
  if (!enKeys.has(k)) {
    missingEn.push(k);
  }
  if (!arKeys.has(k)) {
    missingAr.push(k);
  }
}

missingEn.sort();
missingAr.sort();

console.log(`Total getMessage keys used: ${used.size}`);
console.log(`Missing in EN: ${missingEn.length}`);
if (missingEn.length) {
  console.log(missingEn.join("\n"));
}
console.log("---");
console.log(`Missing in AR: ${missingAr.length}`);
if (missingAr.length) {
  console.log(missingAr.join("\n"));
}
