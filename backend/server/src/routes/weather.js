/**
 * 天气数据路由
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const weatherController = require('../controllers/weatherController');

/**
 * GET /api/weather/now
 * 获取实时天气
 */
router.get('/now', authMiddleware, asyncHandler(weatherController.getCurrentWeather));

/**
 * GET /api/weather/astronomy
 * 获取天文数据（日出日落）
 */
router.get('/astronomy', authMiddleware, asyncHandler(weatherController.getAstronomy));

module.exports = router;
