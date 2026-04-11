/**
 * 日志API路由 - 整改版
 * 提供统一的日志查询、搜索、导出和管理功能
 * 支持文件模式和数据库模式
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { verifyLogAccess, verifyClientLogPush } = require('../middleware/logAuth');
const logController = require('../controllers/logController');

/**
 * @route   POST /api/logs/client
 * @desc    接收客户端（前端）日志
 * @access  Public（开放访问，但有限流保护）
 */
router.post('/client', verifyClientLogPush, asyncHandler(logController.receiveClientLogs));

/**
 * @route   GET /api/logs
 * @desc    获取日志列表（支持分页和过滤）
 * @query   level, source, startTime, endTime, userId, requestId, keyword, page, pageSize
 * @access  Private
 */
router.get('/', verifyLogAccess, asyncHandler(logController.getLogs));

/**
 * @route   GET /api/logs/stats
 * @desc    获取日志统计信息
 * @query   level, source, startTime, endTime
 * @access  Private
 */
router.get('/stats', verifyLogAccess, asyncHandler(logController.getLogStats));

/**
 * @route   GET /api/logs/search
 * @desc    搜索日志
 * @query   keyword, level, source, startTime, endTime, page, pageSize
 * @access  Private
 */
router.get('/search', verifyLogAccess, asyncHandler(logController.searchLogs));

/**
 * @route   DELETE /api/logs
 * @desc    删除日志（支持按条件批量删除）
 * @query   ids（逗号分隔）或 level + before
 * @access  Private（需要admin角色）
 */
router.delete('/', verifyLogAccess, asyncHandler(logController.deleteLogs));

/**
 * @route   GET /api/logs/export
 * @desc    导出日志
 * @query   format(json|csv), level, source, startTime, endTime
 * @access  Private
 */
router.get('/export', verifyLogAccess, asyncHandler(logController.exportLogs));

/**
 * @route   GET /api/logs/files
 * @desc    获取日志文件列表（文件模式专用）
 * @query   source(backend|frontend)
 * @access  Private
 * @deprecated 建议使用 GET /api/logs 替代
 */
router.get('/files', verifyLogAccess, asyncHandler(logController.getLogFiles));

/**
 * @route   GET /api/logs/content
 * @desc    获取日志文件内容（文件模式专用）
 * @query   file, lines, source
 * @access  Private
 * @deprecated 建议使用 GET /api/logs 替代
 */
router.get('/content', verifyLogAccess, asyncHandler(logController.getLogContent));

module.exports = router;
