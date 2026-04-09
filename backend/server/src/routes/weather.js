/**
 * 天气数据路由
 */

const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');

/**
 * GET /api/weather/now
 * 获取实时天气
 */
router.get('/now', weatherController.getCurrentWeather);

/**
 * GET /api/weather/astronomy
 * 获取天文数据（日出日落）
 */
router.get('/astronomy', weatherController.getAstronomy);

module.exports = router;
