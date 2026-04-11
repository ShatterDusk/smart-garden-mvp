#!/usr/bin/env node
/**
 * 扫描项目中的 TODO/FIXME 标签
 * 用法: node scan-todos.js [目录路径]
 */

const fs = require('fs');
const path = require('path');

// 默认扫描目录
const DEFAULT_DIRS = [
  'backend/server/src',
  'frontend',
];

// 扫描的文件扩展名
const EXTENSIONS = ['.js', '.ts', '.vue', '.jsx', '.tsx'];

// 要扫描的标签
const TAGS = ['TODO', 'FIXME', 'XXX', 'HACK', 'BUG', 'OPTIMIZE', 'REFACTOR'];

// 优先级
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

// 结果存储
const results = [];

/**
 * 递归扫描目录
 */
function scanDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // 跳过 node_modules 和隐藏目录
      if (file !== 'node_modules' && !file.startsWith('.')) {
        scanDirectory(fullPath);
      }
    } else if (stat.isFile() && EXTENSIONS.includes(path.extname(file))) {
      scanFile(fullPath);
    }
  }
}

/**
 * 扫描单个文件
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    for (const tag of TAGS) {
      const regex = new RegExp(`\\b${tag}\\b`, 'i');
      if (regex.test(line)) {
        // 提取优先级
        let priority = 'NONE';
        for (const p of PRIORITIES) {
          if (line.includes(`[${p}]`)) {
            priority = p;
            break;
          }
        }

        results.push({
          tag: tag,
          priority: priority,
          file: filePath,
          line: index + 1,
          content: line.trim(),
        });
      }
    }
  });
}

/**
 * 打印结果
 */
function printResults() {
  console.log('\n========== TODO/FIXME 扫描结果 ==========\n');

  if (results.length === 0) {
    console.log('✅ 未发现 TODO/FIXME 标签');
    return;
  }

  // 按标签和优先级分组
  const grouped = {};
  for (const item of results) {
    const key = `${item.tag}[${item.priority}]`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  }

  // 按优先级排序
  const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NONE: 4 };
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const priorityA = a.match(/\[(\w+)\]/)[1];
    const priorityB = b.match(/\[(\w+)\]/)[1];
    return priorityOrder[priorityA] - priorityOrder[priorityB];
  });

  // 打印统计
  console.log(`共发现 ${results.length} 个标签\n`);

  for (const key of sortedKeys) {
    const items = grouped[key];
    const [tag, priority] = key.split('[');
    const priorityStr = priority.replace(']', '');

    // 根据优先级设置颜色（ANSI 颜色码）
    let color = '\x1b[0m'; // 默认
    if (priorityStr === 'CRITICAL') color = '\x1b[31m'; // 红色
    else if (priorityStr === 'HIGH') color = '\x1b[33m'; // 黄色
    else if (priorityStr === 'MEDIUM') color = '\x1b[36m'; // 青色
    else if (priorityStr === 'LOW') color = '\x1b[32m'; // 绿色

    console.log(`${color}[${tag}][${priorityStr}] (${items.length}个)\x1b[0m`);

    for (const item of items) {
      const relativePath = item.file.replace(process.cwd(), '');
      console.log(`  ${relativePath}:${item.line}`);
      console.log(`    ${item.content.substring(0, 80)}${item.content.length > 80 ? '...' : ''}`);
    }
    console.log();
  }

  // 打印汇总
  console.log('========== 优先级汇总 ==========');
  const priorityCount = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, NONE: 0 };
  for (const item of results) {
    priorityCount[item.priority]++;
  }

  for (const [priority, count] of Object.entries(priorityCount)) {
    if (count > 0) {
      let color = '\x1b[0m';
      if (priority === 'CRITICAL') color = '\x1b[31m';
      else if (priority === 'HIGH') color = '\x1b[33m';
      else if (priority === 'MEDIUM') color = '\x1b[36m';
      else if (priority === 'LOW') color = '\x1b[32m';

      console.log(`${color}${priority}: ${count}个\x1b[0m`);
    }
  }
}

/**
 * 主函数
 */
function main() {
  const targetDirs = process.argv.slice(2).length > 0
    ? process.argv.slice(2)
    : DEFAULT_DIRS;

  console.log('开始扫描目录:', targetDirs.join(', '));

  for (const dir of targetDirs) {
    const fullPath = path.resolve(dir);
    if (fs.existsSync(fullPath)) {
      scanDirectory(fullPath);
    } else {
      console.warn(`警告: 目录不存在 ${dir}`);
    }
  }

  printResults();
}

main();
