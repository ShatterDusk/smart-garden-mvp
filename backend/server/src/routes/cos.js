/**
 * COS 直传路由
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getUploadSign, getTempFileUrl, deleteFile } = require('../controllers/cosController');

/**
 * 获取上传签名
 * POST /api/cos/upload-sign
 */
router.post('/upload-sign', authMiddleware, getUploadSign);

/**
 * 获取临时访问链接
 * POST /api/cos/temp-url
 */
router.post('/temp-url', authMiddleware, getTempFileUrl);

/**
 * 删除文件
 * DELETE /api/cos/delete
 */
router.delete('/delete', authMiddleware, deleteFile);

module.exports = router;
