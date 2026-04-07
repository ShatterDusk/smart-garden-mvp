/**
 * AI 模块路由
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const aiController = require('../controllers/aiController');

router.post('/analyze', authMiddleware, asyncHandler(aiController.analyze));

module.exports = router;
