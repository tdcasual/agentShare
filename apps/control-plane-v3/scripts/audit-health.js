#!/usr/bin/env node
/**
 * Health Audit Script
 * 
 * 检查代码库健康状况：
 * - 重复代码检测
 * - Console.log 使用统计
 * - 大文件检测
 * - 未使用导入检测（简化版）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.join(__dirname, '..', 'src');

// 颜色输出
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 获取所有 TypeScript 文件
function getAllTsFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.includes('node_modules')) {
      getAllTsFiles(fullPath, files);
    } else if (/\.(ts|tsx)$/.test(item)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// 检查文件大小
function checkFileSizes(files) {
  log('blue', '\n📁 File Size Analysis');
  log('blue', '======================');
  
  const largeFiles = [];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n').length;
    
    if (lines > 500) {
      largeFiles.push({ file: path.relative(process.cwd(), file), lines });
    }
  }
  
  if (largeFiles.length > 0) {
    log('yellow', `\n⚠️  Found ${largeFiles.length} large files (>500 lines):`);
    largeFiles
      .sort((a, b) => b.lines - a.lines)
      .forEach(({ file, lines }) => {
        log('yellow', `   ${file}: ${lines} lines`);
      });
  } else {
    log('green', '\n✅ No oversized files found');
  }
}

// 检查 console 使用
function checkConsoleUsage(files) {
  log('blue', '\n📊 Console Usage Analysis');
  log('blue', '=========================');
  
  const consoleUsage = [];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(/console\.(log|warn|error|debug|info)/g);
    
    if (matches) {
      consoleUsage.push({
        file: path.relative(process.cwd(), file),
        count: matches.length,
      });
    }
  }
  
  const total = consoleUsage.reduce((sum, item) => sum + item.count, 0);
  
  if (total > 0) {
    log('yellow', `\n⚠️  Found ${total} console statements:`);
    consoleUsage
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .forEach(({ file, count }) => {
        log('yellow', `   ${file}: ${count}`);
      });
  } else {
    log('green', '\n✅ No console statements found');
  }
}

// 检查重复代码模式（简化版）
function checkDuplicatePatterns(files) {
  log('blue', '\n🔍 Duplicate Code Patterns');
  log('blue', '==========================');
  
  // 常见的重复模式
  const patterns = [
    { name: 'Focus Trap', regex: /useFocusTrap|focus-trap/i },
    { name: 'Click Outside', regex: /useClickOutside|mousedown.*outside/i },
    { name: 'Escape Handler', regex: /e\.key === 'Escape'|keydown.*escape/i },
  ];
  
  const patternCounts = {};
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    
    for (const { name, regex } of patterns) {
      const matches = content.match(regex);
      if (matches) {
        patternCounts[name] = (patternCounts[name] || 0) + 1;
      }
    }
  }
  
  log('green', '\n📈 Pattern Usage:');
  Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, count]) => {
      const color = count > 5 ? 'yellow' : 'green';
      log(color, `   ${name}: ${count} files`);
    });
}

// 检查 TODO/FIXME
function checkTodos(files) {
  log('blue', '\n📝 TODO/FIXME Analysis');
  log('blue', '======================');
  
  const todos = [];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const match = line.match(/(TODO|FIXME|XXX|HACK):?\s*(.+)/i);
      if (match) {
        todos.push({
          file: path.relative(process.cwd(), file),
          line: index + 1,
          text: match[2].trim().slice(0, 60),
        });
      }
    });
  }
  
  if (todos.length > 0) {
    log('yellow', `\n⚠️  Found ${todos.length} TODOs/FIXMEs:`);
    todos.slice(0, 10).forEach(({ file, line, text }) => {
      log('yellow', `   ${file}:${line} - ${text}`);
    });
  } else {
    log('green', '\n✅ No TODOs found');
  }
}

// 主函数
function main() {
  log('green', '🚀 Starting Health Audit...\n');
  
  try {
    const files = getAllTsFiles(SRC_DIR);
    
    log('blue', `📊 Analyzing ${files.length} TypeScript files...`);
    
    checkFileSizes(files);
    checkConsoleUsage(files);
    checkDuplicatePatterns(files);
    checkTodos(files);
    
    log('green', '\n✅ Health Audit Complete!\n');
  } catch (error) {
    log('red', `❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
