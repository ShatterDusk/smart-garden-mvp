/**
 * 诊断卡模块路由
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const diagnosisController = require('../controllers/diagnosisController');

router.get('/', authMiddleware, asyncHandler(diagnosisController.getDiagnosisHistory));
router.get('/:diagnosisCardId', authMiddleware, asyncHandler(diagnosisController.getDiagnosisDetail));

module.exports = router;
