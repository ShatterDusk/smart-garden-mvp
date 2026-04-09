/**
 * 天气数据控制器
 * 处理天气API查询请求
 */

const weatherService = require('../services/weatherService');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 获取实时天气
 * GET /api/weather/now
 * Query: location - 位置标识 (city:101010100 或 geo:39.9042,116.4074)
 */
const getCurrentWeather = async (req, res) => {
  try {
    const { location } = req.query;

    if (!location) {
      return error(res, '缺少位置参数', 400);
    }

    let locationCode = null;
    let lat = null;
    let lng = null;

    if (location.startsWith('city:')) {
      locationCode = location.substring(5);
    } else if (location.startsWith('geo:')) {
      const coords = location.substring(4).split(',');
      if (coords.length === 2) {
        lat = parseFloat(coords[0]);
        lng = parseFloat(coords[1]);
      }
    }

    const weatherData = await weatherService.getCurrentWeather(locationCode, lat, lng);

    if (!weatherData) {
      return error(res, '获取天气数据失败', 500);
    }

    const result = {
      temperature: weatherData.temperature,
      humidity: weatherData.humidity,
      weatherCondition: weatherData.weatherCondition,
      weatherCode: weatherData.weatherCode,
      windSpeed: weatherData.windSpeed,
      windDirection: weatherData.windDirection,
      pressure: weatherData.pressure,
      visibility: weatherData.visibility,
      dataSource: weatherData.dataSource,
      recordedAt: weatherData.recordedAt,
    };

    return success(res, result);
  } catch (err) {
    logger.error('获取实时天气失败', { error: err.message });
    return error(res, '获取实时天气失败', 500);
  }
};

/**
 * 获取天文数据（日出日落）
 * GET /api/weather/astronomy
 * Query: location - 位置标识
 * Query: date - 日期 (yyyy-MM-dd)，默认今天
 */
const getAstronomy = async (req, res) => {
  try {
    const { location, date } = req.query;

    if (!location) {
      return error(res, '缺少位置参数', 400);
    }

    let locationCode = null;
    let lat = null;
    let lng = null;

    if (location.startsWith('city:')) {
      locationCode = location.substring(5);
    } else if (location.startsWith('geo:')) {
      const coords = location.substring(4).split(',');
      if (coords.length === 2) {
        lat = parseFloat(coords[0]);
        lng = parseFloat(coords[1]);
      }
    }

    const astronomyData = await weatherService.getAstronomyData(locationCode, lat, lng, date);

    if (!astronomyData) {
      return error(res, '获取天文数据失败', 500);
    }

    return success(res, astronomyData);
  } catch (err) {
    logger.error('获取天文数据失败', { error: err.message });
    return error(res, '获取天文数据失败', 500);
  }
};

module.exports = {
  getCurrentWeather,
  getAstronomy,
};
