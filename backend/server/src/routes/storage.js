/**
 * 云存储路由
 */

const express = require('express');
const router = express.Router();
const { getUploadLink } = require('../controllers/storageController');
const { authMiddleware } = require('../middleware/auth');

/**
 * 获取文件上传链接
 * POST /api/storage/upload
 */
router.post('/upload', authMiddleware, getUploadLink);

module.exports = router;
