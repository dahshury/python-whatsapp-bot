#!/usr/bin/env node
/**
 * Script to remove console.log statements from TypeScript files while preserving console.error
 */

const fs = require("node:fs");
const path = require("node:path");

function removeConsoleLogs(filePath) {
	let content = fs.readFileSync(filePath, "utf8");
	const originalContent = content;

	// Remove console.log statements (including multiline)
	// Pattern: try block containing console.log or standalone console.log
	content = content.replace(/try\s*\{\s*console\.log\([^)]*\);\s*\}\s*catch\s*\{\}/gms, "");
	content = content.replace(/console\.log\([^)]*\);?\n?/gms, "");

	// Remove empty try-catch blocks that might be left
	content = content.replace(/try\s*\{\s*\}\s*catch\s*\{\}/gms, "");

	// Clean up multiple consecutive empty lines (more than 2)
	content = content.replace(/\n{3,}/g, "\n\n");

	if (content !== originalContent) {
		fs.writeFileSync(filePath, content, "utf8");
		console.log(`✅ Cleaned: ${filePath}`);
		return true;
	}

	console.log(`⏭️  No changes: ${filePath}`);
	return false;
}

const files = [
	"app/(core)/documents/page.tsx",
	"processes/documents/document-save.process.ts",
	"widgets/document-canvas/hooks/use-document-scene.ts",
	"widgets/document-canvas/hooks/use-document-customer-row.ts",
	"processes/documents/document-load.process.ts",
];

let totalCleaned = 0;
files.forEach((file) => {
	const fullPath = path.join(__dirname, file);
	if (fs.existsSync(fullPath)) {
		if (removeConsoleLogs(fullPath)) {
			totalCleaned++;
		}
	} else {
		console.log(`⚠️  File not found: ${fullPath}`);
	}
});

console.log(`\n🎉 Cleaned ${totalCleaned} file(s)`);
