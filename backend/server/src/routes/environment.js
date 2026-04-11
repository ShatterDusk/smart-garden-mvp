/**
 * 环境数据路由
 *
 * 本模块仅提供环境数据查询功能
 * 设备数据上报请使用 POST /api/devices/data
 */

const express = require('express');
const router = express.Router();
const environmentController = require('../controllers/environmentController');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(authMiddleware);

/**
 * GET /api/environment/current
 * 获取实时环境数据
 */
router.get('/current', asyncHandler(environmentController.getCurrentEnvironment));

/**
 * GET /api/environment/history
 * 获取指标历史数据
 */
router.get('/history', asyncHandler(environmentController.getMetricHistory));

module.exports = router;
