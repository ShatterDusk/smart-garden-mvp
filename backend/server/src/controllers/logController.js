/**
 * 日志查看控制器
 * 用于远程查看服务器日志
 */

const fs = require('fs');
const path = require('path');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');

// 日志目录
const LOGS_DIR = path.join(__dirname, '../../logs');

/**
 * 获取日志文件列表
 * GET /api/logs/files
 */
const getLogFiles = async (req, res) => {
  try {
    // 检查目录是否存在
    if (!fs.existsSync(LOGS_DIR)) {
      return success(res, { files: [] });
    }

    const files = fs.readdirSync(LOGS_DIR)
      .filter(file => file.endsWith('.log'))
      .map(file => {
        const filePath = path.join(LOGS_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          modifiedAt: stats.mtime,
        };
      });

    return success(res, { files });
  } catch (err) {
    logger.error('获取日志文件列表失败', { error: err.message });
    return error(res, '获取日志文件列表失败', 500);
  }
};

/**
 * 获取日志内容
 * GET /api/logs/content?file=xxx.log&lines=100
 */
const getLogContent = async (req, res) => {
  try {
    const { file, lines = 100 } = req.query;

    if (!file) {
      return error(res, '请指定日志文件名', 400, 400);
    }

    // 安全检查：防止目录遍历攻击
    const fileName = path.basename(file);
    const filePath = path.join(LOGS_DIR, fileName);

    // 确保文件在日志目录内
    if (!filePath.startsWith(LOGS_DIR)) {
      return error(res, '非法文件路径', 400, 400);
    }

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return error(res, '日志文件不存在', 404, 404);
    }

    // 读取文件内容（最后 N 行）
    const content = fs.readFileSync(filePath, 'utf-8');
    const allLines = content.split('\n').filter(line => line.trim());
    const lastLines = allLines.slice(-parseInt(lines));

    return success(res, {
      file: fileName,
      totalLines: allLines.length,
      lines: lastLines.length,
      content: lastLines.join('\n'),
    });
  } catch (err) {
    logger.error('获取日志内容失败', { error: err.message });
    return error(res, '获取日志内容失败', 500);
  }
};

/**
 * 搜索日志
 * GET /api/logs/search?file=xxx.log&keyword=xxx
 */
const searchLogs = async (req, res) => {
  try {
    const { file, keyword, lines = 50 } = req.query;

    if (!file || !keyword) {
      return error(res, '请指定文件名和搜索关键词', 400, 400);
    }

    // 安全检查
    const fileName = path.basename(file);
    const filePath = path.join(LOGS_DIR, fileName);

    if (!filePath.startsWith(LOGS_DIR) || !fs.existsSync(filePath)) {
      return error(res, '日志文件不存在', 404, 404);
    }

    // 读取并搜索
    const content = fs.readFileSync(filePath, 'utf-8');
    const allLines = content.split('\n');
    const matchedLines = allLines
      .filter(line => line.includes(keyword))
      .slice(-parseInt(lines));

    return success(res, {
      file: fileName,
      keyword,
      matchedCount: matchedLines.length,
      content: matchedLines.join('\n'),
    });
  } catch (err) {
    logger.error('搜索日志失败', { error: err.message });
    return error(res, '搜索日志失败', 500);
  }
};

/**
 * 清空日志文件
 * DELETE /api/logs/clear?file=xxx.log
 */
const clearLogFile = async (req, res) => {
  try {
    const { file } = req.query;

    if (!file) {
      return error(res, '请指定日志文件名', 400, 400);
    }

    // 安全检查
    const fileName = path.basename(file);
    const filePath = path.join(LOGS_DIR, fileName);

    if (!filePath.startsWith(LOGS_DIR) || !fs.existsSync(filePath)) {
      return error(res, '日志文件不存在', 404, 404);
    }

    // 清空文件
    fs.writeFileSync(filePath, '');
    logger.info('日志文件已清空', { file: fileName });

    return success(res, { message: '日志文件已清空' });
  } catch (err) {
    logger.error('清空日志文件失败', { error: err.message });
    return error(res, '清空日志文件失败', 500);
  }
};

module.exports = {
  getLogFiles,
  getLogContent,
  searchLogs,
  clearLogFile,
};
