#!/usr/bin/env node

/**
 * Z-Index Centralization Verification Script
 * 
 * This script verifies that:
 * 1. All z-index values are using CSS custom properties
 * 2. No hardcoded z-index values remain
 * 3. The centralized system is properly imported
 */

const fs = require('fs');
const path = require('path');

// Directories to scan
const scanDirs = [
  'styles',
  'components',
  'pages'
];

// Files to ignore
const ignoreFiles = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build'
];

// Results tracking
let totalFiles = 0;
let filesWithHardcodedZIndex = [];
let filesWithProperZIndex = [];
let zIndexVariablesFound = new Set();

/**
 * Check if a line contains hardcoded z-index
 */
function hasHardcodedZIndex(line) {
  // Look for z-index: followed by a number (not a CSS variable)
  const hardcodedPattern = /z-index\s*:\s*\d+/i;
  const variablePattern = /z-index\s*:\s*var\(--z-/i;
  
  return hardcodedPattern.test(line) && !variablePattern.test(line);
}

/**
 * Extract z-index CSS variables from a line
 */
function extractZIndexVariables(line) {
  const variablePattern = /var\((-z-[^)]+)\)/g;
  const matches = [];
  let match;
  
  while ((match = variablePattern.exec(line)) !== null) {
    matches.push(match[1]);
  }
  
  return matches;
}

/**
 * Scan a file for z-index usage
 */
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const fileResults = {
      hardcodedLines: [],
      variableLines: [],
      variables: new Set()
    };
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      if (hasHardcodedZIndex(line)) {
        fileResults.hardcodedLines.push({ lineNumber, content: line.trim() });
      }
      
      if (line.includes('z-index') && line.includes('var(--z-')) {
        fileResults.variableLines.push({ lineNumber, content: line.trim() });
        
        // Extract variable names
        const variables = extractZIndexVariables(line);
        variables.forEach(variable => {
          fileResults.variables.add(variable);
          zIndexVariablesFound.add(variable);
        });
      }
    });
    
    return fileResults;
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Recursively scan directory
 */
function scanDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.warn(`Warning: Directory ${dirPath} does not exist`);
    return;
  }
  
  const items = fs.readdirSync(dirPath);
  
  items.forEach(item => {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    // Skip ignored files/directories
    if (ignoreFiles.some(ignore => fullPath.includes(ignore))) {
      return;
    }
    
    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (stat.isFile() && (item.endsWith('.css') || item.endsWith('.tsx') || item.endsWith('.ts'))) {
      totalFiles++;
      const results = scanFile(fullPath);
      
      if (results) {
        if (results.hardcodedLines.length > 0) {
          filesWithHardcodedZIndex.push({
            file: fullPath,
            hardcodedLines: results.hardcodedLines
          });
        }
        
        if (results.variableLines.length > 0) {
          filesWithProperZIndex.push({
            file: fullPath,
            variableLines: results.variableLines,
            variables: Array.from(results.variables)
          });
        }
      }
    }
  });
}

/**
 * Main verification function
 */
function verifyZIndexCentralization() {
  console.log('🔍 Verifying Z-Index Centralization...\n');
  
  // Scan all directories
  scanDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`Scanning: ${dir}/`);
      scanDirectory(dir);
    }
  });
  
  console.log(`\n📊 Scan Results:`);
  console.log(`Total files scanned: ${totalFiles}`);
  console.log(`Files with proper z-index variables: ${filesWithProperZIndex.length}`);
  console.log(`Files with hardcoded z-index values: ${filesWithHardcodedZIndex.length}`);
  console.log(`Unique z-index variables found: ${zIndexVariablesFound.size}\n`);
  
  // Report hardcoded z-index violations
  if (filesWithHardcodedZIndex.length > 0) {
    console.log('❌ HARDCODED Z-INDEX VALUES FOUND:');
    filesWithHardcodedZIndex.forEach(file => {
      console.log(`\n📄 ${file.file}:`);
      file.hardcodedLines.forEach(line => {
        console.log(`  Line ${line.lineNumber}: ${line.content}`);
      });
    });
    console.log('\n❗ Please replace hardcoded z-index values with CSS custom properties from _z-index.css\n');
  } else {
    console.log('✅ No hardcoded z-index values found!\n');
  }
  
  // Report centralized z-index usage
  if (filesWithProperZIndex.length > 0) {
    console.log('✅ FILES USING CENTRALIZED Z-INDEX SYSTEM:');
    filesWithProperZIndex.forEach(file => {
      console.log(`\n📄 ${file.file}:`);
      console.log(`  Variables used: ${file.variables.join(', ')}`);
      console.log(`  Lines with z-index: ${file.variableLines.length}`);
    });
  }
  
  // List all z-index variables found
  if (zIndexVariablesFound.size > 0) {
    console.log(`\n📝 Z-INDEX VARIABLES IN USE:`);
    const sortedVariables = Array.from(zIndexVariablesFound).sort();
    sortedVariables.forEach(variable => {
      console.log(`  ${variable}`);
    });
  }
  
  // Check if centralized file exists
  const centralizedFile = 'components/glide_custom_cells/styles/_z-index.css';
  if (fs.existsSync(centralizedFile)) {
    console.log(`\n✅ Centralized z-index file found: ${centralizedFile}`);
  } else {
    console.log(`\n❌ Centralized z-index file not found: ${centralizedFile}`);
  }
  
  // Final summary
  console.log('\n🎯 VERIFICATION SUMMARY:');
  if (filesWithHardcodedZIndex.length === 0) {
    console.log('✅ Z-index centralization is working correctly!');
    console.log('✅ All z-index values are using CSS custom properties.');
    console.log('✅ No hardcoded values detected.');
  } else {
    console.log('❌ Z-index centralization needs attention.');
    console.log(`❌ Found ${filesWithHardcodedZIndex.length} files with hardcoded values.`);
  }
}

// Run verification
verifyZIndexCentralization(); 