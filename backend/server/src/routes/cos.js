/**
 * COS 直传路由
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { getUploadSign, getTempFileUrl, deleteFile } = require('../controllers/cosController');

/**
 * 获取上传签名
 * POST /api/cos/upload-sign
 */
router.post('/upload-sign', authMiddleware, asyncHandler(getUploadSign));

/**
 * 获取临时访问链接
 * POST /api/cos/temp-url
 */
router.post('/temp-url', authMiddleware, asyncHandler(getTempFileUrl));

/**
 * 删除文件
 * DELETE /api/cos/delete
 */
router.delete('/delete', authMiddleware, asyncHandler(deleteFile));

module.exports = router;
