#!/usr/bin/env node

/**
 * Script to check for hardcoded z-index values in the project
 * and suggest centralized alternatives from z-index.css
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Checking for hardcoded z-index values...\n');

try {
  // Run grep to find hardcoded z-index values
  const result = execSync(
    `grep -r "z-index:" styles/ components/ app/ --include="*.css" --include="*.tsx" --include="*.ts" | grep -v "var(--z-" | grep -v "z-index.css"`,
    { encoding: 'utf8', cwd: process.cwd() }
  );

  const lines = result.trim().split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    console.log('✅ No hardcoded z-index values found! All z-index values are centralized.');
    process.exit(0);
  }

  console.log(`⚠️  Found ${lines.length} hardcoded z-index values:\n`);

  // Group by file for better readability
  const fileGroups = {};
  lines.forEach(line => {
    const [filePath, ...rest] = line.split(':');
    const content = rest.join(':');
    
    if (!fileGroups[filePath]) {
      fileGroups[filePath] = [];
    }
    fileGroups[filePath].push(content.trim());
  });

  // Display grouped results
  Object.entries(fileGroups).forEach(([filePath, content]) => {
    console.log(`📁 ${filePath}`);
    content.forEach(line => {
      console.log(`   ${line}`);
    });
    console.log();
  });

  console.log('💡 Suggested actions:');
  console.log('1. Replace hardcoded z-index values with CSS custom properties from z-index.css');
  console.log('2. Add new z-index variables to z-index.css if needed');
  console.log('3. Use appropriate semantic layer names (e.g., --z-tooltip, --z-modal-backdrop)');
  console.log('\n📚 Available CSS custom properties in z-index.css:');
  
  // Read and display available z-index variables
  try {
    const zIndexContent = fs.readFileSync(path.join(process.cwd(), 'styles/z-index.css'), 'utf8');
    const variableMatches = zIndexContent.match(/--z-[^:]+/g);
    if (variableMatches) {
      const uniqueVars = [...new Set(variableMatches)].sort();
      uniqueVars.forEach(variable => {
        console.log(`   ${variable}`);
      });
    }
  } catch (error) {
    console.log('   (Could not read z-index.css file)');
  }

} catch (error) {
  console.log('✅ No hardcoded z-index values found! All z-index values are centralized.');
}

console.log('\n🎯 Goal: All z-index values should use CSS custom properties from z-index.css');
console.log('   Example: z-index: var(--z-tooltip) instead of z-index: 200'); 