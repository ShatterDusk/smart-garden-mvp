/**
 * 云存储路由
 * @deprecated 此路由已废弃，请使用 /api/cos/* 进行 COS 直传
 */

const express = require('express');
const router = express.Router();
const { getUploadLink } = require('../controllers/storageController');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * 获取文件上传链接
 * POST /api/storage/upload
 * @deprecated 请使用 POST /api/cos/upload-sign 替代
 */
router.post('/upload', authMiddleware, asyncHandler(getUploadLink));

module.exports = router;
