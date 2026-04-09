/**
 * 日志查看路由
 * 提供日志文件列表、内容查看、搜索和清空功能
 * 需要密钥验证访问
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { verifyLogAccessKey } = require('../middleware/logAuth');
const logController = require('../controllers/logController');

// 接收前端日志（不需要密钥验证，方便前端推送）
// POST /api/logs/frontend
router.post('/frontend', asyncHandler(logController.receiveFrontendLogs));

// 以下接口需要密钥验证
router.use(verifyLogAccessKey);

// 获取日志文件列表
// GET /api/logs/files?source=backend|frontend
router.get('/files', asyncHandler(logController.getLogFiles));

// 获取日志内容
// GET /api/logs/content?file=xxx.log&lines=100&source=backend|frontend
router.get('/content', asyncHandler(logController.getLogContent));

// 搜索日志
// GET /api/logs/search?file=xxx.log&keyword=xxx&source=backend|frontend
router.get('/search', asyncHandler(logController.searchLogs));

// 清空日志文件
// DELETE /api/logs/clear?file=xxx.log&source=backend|frontend
router.delete('/clear', asyncHandler(logController.clearLogFile));

module.exports = router;
