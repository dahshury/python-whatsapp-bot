import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import arCommon from "@/public/locales/ar/common.json";

// Test file patterns to exclude (files containing demo/test data)
const TEST_FILE_PATTERNS = ["__tests__", ".test.", ".spec."];

// Directories to ignore
const IGNORED_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  "public",
  "dist",
  "build",
  "__tests__",
]);

// File extensions to check
const ALLOWED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

// Regex to match Arabic characters
const ARABIC_CHAR_RE = /[\u0600-\u06FF]/;

// Regex to match string literals (single quotes, double quotes, or template literals without interpolation)
const STRING_LITERAL_RE = /(['"])(?:(?=(\\?))\2.)*?\1|`(?:(?=(\\?))\3.)*?`/g;

/**
 * Check if a file path matches test file patterns
 */
function isTestFile(filePath: string): boolean {
  return TEST_FILE_PATTERNS.some((pattern) => filePath.includes(pattern));
}

/**
 * Normalize a string literal by removing quotes and handling escape sequences
 */
function normalizeLiteral(literal: string): string {
  const quote = literal[0];
  let text = literal.slice(1, -1);

  // Handle template literals
  if (quote === "`" && text.includes("${")) {
    throw new Error("template literal with interpolation");
  }

  // Basic unescape handling (simplified)
  text = text
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");

  return text.trim();
}

/**
 * Collect Arabic string literals from a file
 */
function collectArabicLiterals(
  filePath: string,
  content: string
): Array<{ line: number; literal: string }> {
  const literals: Array<{ line: number; literal: string }> = [];
  const lines = content.split("\n");

  for (const match of content.matchAll(STRING_LITERAL_RE)) {
    const literal = match[0];
    try {
      const value = normalizeLiteral(literal);
      if (value && ARABIC_CHAR_RE.test(value)) {
        const lineNumber = content.substring(0, match.index).split("\n").length;
        literals.push({ line: lineNumber, literal: value });
      }
    } catch {}
  }

  return literals;
}

/**
 * Load all translation values from the Arabic common.json
 */
function loadTranslationValues(): Map<string, string[]> {
  const values = new Map<string, string[]>();

  function flatten(prefix: string, node: unknown): void {
    if (typeof node === "object" && node !== null) {
      if (Array.isArray(node)) {
        node.forEach((item, idx) => {
          flatten(`${prefix}[${idx}]`, item);
        });
      } else {
        Object.entries(node as Record<string, unknown>).forEach(
          ([key, value]) => {
            const newPrefix = prefix ? `${prefix}.${key}` : key;
            flatten(newPrefix, value);
          }
        );
      }
    } else if (typeof node === "string") {
      const existing = values.get(node) || [];
      existing.push(prefix);
      values.set(node, existing);
    }
  }

  flatten("", arCommon);
  return values;
}

/**
 * Recursively find all source files
 */
function findSourceFiles(rootDir: string, baseDir: string = rootDir): string[] {
  const files: string[] = [];
  const entries = readdirSync(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(rootDir, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORED_DIR_NAMES.has(entry.name)) {
        files.push(...findSourceFiles(fullPath, baseDir));
      }
    } else if (entry.isFile()) {
      const ext = entry.name.substring(entry.name.lastIndexOf("."));
      if (ALLOWED_EXTENSIONS.has(ext.toLowerCase())) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

describe("i18n violations", () => {
  it("should not contain Arabic string literals outside of translation files", () => {
    // Detect frontend root: check if we're in frontend dir or project root
    const cwd = process.cwd();
    const frontendRoot = cwd.endsWith("frontend")
      ? cwd
      : join(cwd, "app", "frontend");

    const rootDir = frontendRoot;
    const translationFile = join(
      frontendRoot,
      "public",
      "locales",
      "ar",
      "common.json"
    );

    // Load translation values
    const translationValues = loadTranslationValues();

    // Find all source files
    const sourceFiles = findSourceFiles(rootDir);

    // Collect violations
    const violations: Array<{
      file: string;
      line: number;
      literal: string;
    }> = [];

    for (const filePath of sourceFiles) {
      // Skip test files
      if (isTestFile(filePath)) {
        continue;
      }

      // Skip the translation file itself
      if (filePath === translationFile) {
        continue;
      }

      try {
        const content = readFileSync(filePath, "utf-8");
        const arabicLiterals = collectArabicLiterals(filePath, content);

        for (const { line, literal } of arabicLiterals) {
          // Check if this literal exists in translations
          if (!translationValues.has(literal)) {
            const relativePath = relative(frontendRoot, filePath);
            violations.push({
              file: relativePath,
              line,
              literal,
            });
          }
        }
      } catch (error) {
        // Skip files that can't be read (e.g., binary files)
        if (error instanceof Error && error.message.includes("ENOENT")) {
          continue;
        }
        throw error;
      }
    }

    // Report violations
    if (violations.length > 0) {
      const violationMessages = violations.map(
        (v) => `  ${v.file}:${v.line} - "${v.literal}"`
      );
      const message = `Found ${violations.length} Arabic string literal(s) not defined in i18n:\n${violationMessages.join("\n")}`;
      expect.fail(message);
    }

    expect(violations.length).toBe(0);
  });
});
