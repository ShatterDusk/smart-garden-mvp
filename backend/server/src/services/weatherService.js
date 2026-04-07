/**
 * 天气服务
 * 处理天气API查询和数据转换
 */

const axios = require('axios');
const logger = require('../utils/logger');

// 和风天气API配置
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const WEATHER_BASE_URL = process.env.WEATHER_BASE_URL || 'https://devapi.qweather.com/v7';

/**
 * 查询实时天气
 * @param {string} locationCode - 城市编码
 * @param {number} lat - 纬度（可选）
 * @param {number} lng - 经度（可选）
 * @returns {Promise<Object>} 天气数据
 */
async function getCurrentWeather(locationCode, lat, lng) {
  try {
    // 优先使用经纬度查询，更精确
    let location = locationCode;
    if (lat && lng) {
      location = `${lng},${lat}`;
    }

    const url = `${WEATHER_BASE_URL}/weather/now`;
    const response = await axios.get(url, {
      params: {
        key: WEATHER_API_KEY,
        location: location,
      },
      headers: {
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    if (response.data.code !== '200') {
      logger.warn('天气API返回错误', { code: response.data.code, location });
      return null;
    }

    const now = response.data.now;
    return {
      temperature: parseFloat(now.temp),
      humidity: parseFloat(now.humidity),
      weatherCondition: now.text,
      weatherCode: parseInt(now.icon),
      windSpeed: parseFloat(now.windSpeed),
      windDirection: now.windDir,
      pressure: parseFloat(now.pressure),
      visibility: parseFloat(now.vis),
      dataSource: 'weather_api',
      recordedAt: new Date(),
    };
  } catch (error) {
    logger.error('获取天气数据失败', { error: error.message, locationCode });
    return null;
  }
}

/**
 * 查询天文数据（日出日落）
 * @param {string} locationCode - 城市编码
 * @param {number} lat - 纬度（可选）
 * @param {number} lng - 经度（可选）
 * @param {string} date - 日期，格式 yyyy-MM-dd，默认今天
 * @returns {Promise<Object>} 天文数据
 */
async function getAstronomyData(locationCode, lat, lng, date) {
  try {
    let location = locationCode;
    if (lat && lng) {
      location = `${lng},${lat}`;
    }

    const today = date || new Date().toISOString().split('T')[0];
    const url = `${WEATHER_BASE_URL}/astronomy/sun`;
    const response = await axios.get(url, {
      params: {
        key: WEATHER_API_KEY,
        location: location,
        date: today,
      },
      headers: {
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    if (response.data.code !== '200') {
      logger.warn('天文API返回错误', { code: response.data.code, location });
      return null;
    }

    const astro = response.data.sun;
    const sunrise = astro.sunrise;
    const sunset = astro.sunset;

    // 计算日照时长（小时）
    let sunHours = null;
    if (sunrise && sunset) {
      const rise = new Date(`2026-01-01T${sunrise}`);
      const set = new Date(`2026-01-01T${sunset}`);
      sunHours = (set - rise) / (1000 * 60 * 60);
    }

    return {
      sunrise: sunrise,
      sunset: sunset,
      sunHours: sunHours,
    };
  } catch (error) {
    logger.error('获取天文数据失败', { error: error.message, locationCode });
    return null;
  }
}

/**
 * 将天气数据转换为环境指标格式
 * @param {Object} weatherData - 天气数据
 * @param {Object} astroData - 天文数据（可选）
 * @returns {Object} 指标键值对
 */
function convertToMetrics(weatherData, astroData) {
  if (!weatherData) return {};

  const metrics = {};

  if (weatherData.temperature !== undefined) {
    metrics.temperature = weatherData.temperature;
  }
  if (weatherData.humidity !== undefined) {
    metrics.humidity = weatherData.humidity;
  }
  if (weatherData.windSpeed !== undefined) {
    metrics.wind_speed = weatherData.windSpeed;
  }
  if (weatherData.pressure !== undefined) {
    metrics.air_pressure = weatherData.pressure;
  }
  if (weatherData.weatherCode !== undefined) {
    metrics.weather_condition = weatherData.weatherCode;
  }

  // 添加天文数据
  if (astroData && astroData.sunHours !== undefined) {
    metrics.sun_hours = astroData.sunHours;
  }

  return metrics;
}

/**
 * 获取植物位置的天气数据（合轴用）
 * @param {Object} plant - 植物对象
 * @returns {Promise<Object>} 天气指标数据
 */
async function getWeatherForPlant(plant) {
  if (!plant) return null;

  const locationCode = plant.location_code;
  const lat = plant.location_lat;
  const lng = plant.location_lng;

  if (!locationCode && !(lat && lng)) {
    logger.debug('植物未设置位置信息，无法获取天气', { plantId: plant.plant_id });
    return null;
  }

  // 并行获取天气和天文数据
  const [weatherData, astroData] = await Promise.all([
    getCurrentWeather(locationCode, lat, lng),
    getAstronomyData(locationCode, lat, lng),
  ]);

  return convertToMetrics(weatherData, astroData);
}

module.exports = {
  getCurrentWeather,
  getAstronomyData,
  convertToMetrics,
  getWeatherForPlant,
};
