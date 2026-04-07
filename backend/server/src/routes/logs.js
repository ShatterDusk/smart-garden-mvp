/**
 * 日志查看路由
 * TODO: 添加管理员权限检查
 * 用户表中有 role 字段（admin/user），需要添加 authMiddleware 检查 role === 'admin'
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const logController = require('../controllers/logController');
// TODO: const { authMiddleware } = require('../middleware/auth');

// TODO: 添加管理员权限检查
// router.use(authMiddleware);
// router.use((req, res, next) => {
//   if (req.user.role !== 'admin') {
//     return res.status(403).json({ code: 403, message: '需要管理员权限' });
//   }
//   next();
// });

// 获取日志文件列表
router.get('/files', asyncHandler(logController.getLogFiles));

// 获取日志内容
router.get('/content', asyncHandler(logController.getLogContent));

// 搜索日志
router.get('/search', asyncHandler(logController.searchLogs));

// 清空日志文件
router.delete('/clear', asyncHandler(logController.clearLogFile));

module.exports = router;
