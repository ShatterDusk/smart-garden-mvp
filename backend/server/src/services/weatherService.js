/**
 * 天气服务
 * 处理天气API查询和数据转换
 */

const axios = require('axios');
const logger = require('../utils/logger');

// 和风天气API配置
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const WEATHER_BASE_URL = process.env.WEATHER_BASE_URL || 'https://devapi.qweather.com/v7';
const GEO_API_URL = process.env.GEO_API_URL || 'https://geoapi.qweather.com/v2/city/lookup';

// 城市代码缓存（内存缓存，避免重复请求）
const cityCodeCache = new Map();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7天

// 天气数据缓存（同城市、同时间段的读数可复用）
const weatherDataCache = new Map();
const WEATHER_CACHE_TTL = 2 * 60 * 60 * 1000; // 2小时

// 天文数据缓存
const astronomyCache = new Map();
const ASTRONOMY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时

// 天文数据获取失败计数（用于降级）
let astronomyFailCount = 0;
let astronomyLastFailTime = 0;
const ASTRONOMY_MAX_FAIL = 5;
const ASTRONOMY_COOLDOWN = 30 * 60 * 1000; // 30分钟冷却期

// TODO[MEDIUM]: 缓存使用内存存储，重启后丢失
// 建议：考虑使用 Redis 或数据库缓存，支持多实例共享
// 影响：生产环境多实例部署时缓存不共享

/**
 * 地理编码：经纬度 → 城市代码
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @returns {Promise<string|null>} 城市代码
 */
async function geocoding(lat, lng) {
  if (!lat || !lng) return null;

  const cacheKey = `${lat},${lng}`;
  const cached = cityCodeCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.debug('使用缓存的城市代码', { lat, lng, cityCode: cached.cityCode });
    return cached.cityCode;
  }

  try {
    const location = `${lng},${lat}`;
    const response = await axios.get(GEO_API_URL, {
      params: {
        key: WEATHER_API_KEY,
        location: location,
      },
      headers: {
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    if (response.data.code !== '200' || !response.data.location || response.data.location.length === 0) {
      logger.warn('地理编码API返回错误', { code: response.data.code, lat, lng });
      return null;
    }

    const cityCode = response.data.location[0].id;
    cityCodeCache.set(cacheKey, { cityCode, timestamp: Date.now() });
    logger.debug('获取城市代码成功', { lat, lng, cityCode });

    return cityCode;
  } catch (error) {
    logger.error('地理编码失败', { error: error.message, lat, lng });
    return null;
  }
}

/**
 * 批量地理编码
 * @param {Array} locations - [{lat, lng}]
 * @returns {Promise<Map>} locationKey -> cityCode
 */
async function batchGeocoding(locations) {
  const results = new Map();
  const uncachedLocations = [];

  for (const { lat, lng, key } of locations) {
    const cacheKey = `${lat},${lng}`;
    const cached = cityCodeCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      results.set(key, cached.cityCode);
    } else {
      uncachedLocations.push({ lat, lng, key });
    }
  }

  for (const { lat, lng, key } of uncachedLocations) {
    const cityCode = await geocoding(lat, lng);
    results.set(key, cityCode);
  }

  return results;
}

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

    // 检查缓存
    const cacheKey = `weather:${location}`;
    const cached = weatherDataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < WEATHER_CACHE_TTL) {
      logger.debug('[Weather] 使用缓存的天气数据', { location });
      return cached.data;
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
    const weatherData = {
      temperature: parseFloat(now.temp),
      humidity: parseFloat(now.humidity),
      feelsLike: parseFloat(now.feelsLike),
      weatherCondition: now.text,
      weatherCode: parseInt(now.icon),
      windSpeed: parseFloat(now.windSpeed), // API 返回 km/h，不再转换
      windDirection: now.windDir,
      wind360: parseFloat(now.wind360),
      windScale: parseInt(now.windScale),
      pressure: parseFloat(now.pressure), // hPa (百帕)
      precip: parseFloat(now.precip),
      visibility: parseFloat(now.vis),
      cloud: parseFloat(now.cloud),
      dew: parseFloat(now.dew),
      dataSource: 'weather_api',
      recordedAt: new Date(),
    };

    // 缓存天气数据
    weatherDataCache.set(cacheKey, {
      data: weatherData,
      timestamp: Date.now(),
    });

    return weatherData;
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
  const today = date || new Date().toISOString().split('T')[0];
  const cacheKey = `${locationCode || lat + ',' + lng}_${today}`;
  
  // 检查缓存
  const cached = astronomyCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ASTRONOMY_CACHE_TTL) {
    logger.debug('使用缓存的天文数据', { cacheKey });
    return cached.data;
  }
  
  // 检查是否需要冷却（连续失败过多）
  if (astronomyFailCount >= ASTRONOMY_MAX_FAIL && 
      Date.now() - astronomyLastFailTime < ASTRONOMY_COOLDOWN) {
    logger.warn('[getAstronomyData] 天文数据获取进入冷却期，跳过请求', {
      failCount: astronomyFailCount,
      cooldownRemaining: Math.ceil((ASTRONOMY_COOLDOWN - (Date.now() - astronomyLastFailTime)) / 1000),
    });
    return getDefaultAstronomyData();
  }
  
  try {
    let location = locationCode;
    if (lat && lng) {
      location = `${lng},${lat}`;
    }
    
    if (!location) {
      logger.warn('[getAstronomyData] 缺少位置信息');
      return getDefaultAstronomyData();
    }

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
      logger.warn('[getAstronomyData] 天文API返回错误', { 
        code: response.data.code, 
        location,
        date: today,
      });
      // 记录失败
      astronomyFailCount++;
      astronomyLastFailTime = Date.now();
      return getDefaultAstronomyData();
    }

    const astro = response.data.sun;
    const sunrise = astro.sunrise;
    const sunset = astro.sunset;

    // 计算日照时长（小时）
    let sunHours = null;
    if (sunrise && sunset) {
      try {
        const rise = new Date(`2026-01-01T${sunrise}`);
        const set = new Date(`2026-01-01T${sunset}`);
        
        // 验证日期是否有效
        if (isNaN(rise.getTime()) || isNaN(set.getTime())) {
          logger.warn('[getAstronomyData] 日出日落时间格式无效', { sunrise, sunset });
        } else {
          sunHours = (set - rise) / (1000 * 60 * 60);
          // 处理跨天的情况（日落时间在日出时间之前）
          if (sunHours < 0) {
            sunHours += 24;
          }
          logger.debug('[getAstronomyData] 日照时长计算', { sunrise, sunset, sunHours });
        }
      } catch (err) {
        logger.error('[getAstronomyData] 计算日照时长失败', { sunrise, sunset, error: err.message });
      }
    } else {
      logger.debug('[getAstronomyData] 缺少日出日落数据', { hasSunrise: !!sunrise, hasSunset: !!sunset });
    }

    const result = {
      sunrise: sunrise,
      sunset: sunset,
      sunHours: sunHours,
    };
    
    // 缓存成功结果
    astronomyCache.set(cacheKey, { data: result, timestamp: Date.now() });
    // 重置失败计数
    astronomyFailCount = 0;
    
    logger.debug('[getAstronomyData] 获取天文数据成功', { cacheKey, sunrise, sunset });

    return result;
  } catch (error) {
    logger.error('[getAstronomyData] 获取天文数据失败', { 
      error: error.message, 
      locationCode,
      date: today,
    });
    // 记录失败
    astronomyFailCount++;
    astronomyLastFailTime = Date.now();
    return getDefaultAstronomyData();
  }
}

/**
 * 获取默认天文数据（降级）
 * @returns {Object} 默认天文数据
 */
function getDefaultAstronomyData() {
  // 返回合理的默认值（基于中国大部分地区）
  return {
    sunrise: '06:00',
    sunset: '18:00',
    sunHours: 12,
    isDefault: true,
  };
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

  // 基础气象指标
  if (weatherData.temperature !== undefined) {
    metrics.temperature = weatherData.temperature;
  }
  if (weatherData.humidity !== undefined) {
    metrics.humidity = weatherData.humidity;
  }
  if (weatherData.pressure !== undefined) {
    metrics.pressure = weatherData.pressure;
  }

  // 体感温度
  if (weatherData.feelsLike !== undefined) {
    metrics.feels_like = weatherData.feelsLike;
  }

  // 天气状况
  if (weatherData.weatherCode !== undefined) {
    metrics.weather_condition = weatherData.weatherCode;
  }

  // 风向风力
  if (weatherData.windSpeed !== undefined) {
    metrics.wind_speed = weatherData.windSpeed;
  }
  if (weatherData.wind360 !== undefined) {
    metrics.wind_direction_360 = weatherData.wind360;
  }
  if (weatherData.windScale !== undefined) {
    metrics.wind_scale = weatherData.windScale;
  }

  // 降水
  if (weatherData.precip !== undefined) {
    metrics.precip = weatherData.precip;
  }

  // 能见度
  if (weatherData.visibility !== undefined) {
    metrics.visibility = weatherData.visibility;
  }

  // 云量
  if (weatherData.cloud !== undefined) {
    metrics.cloud_cover = weatherData.cloud;
  }

  // 露点
  if (weatherData.dew !== undefined) {
    metrics.dew_point = weatherData.dew;
  }

  // 天文数据
  if (astroData && astroData.sunHours !== undefined && astroData.sunHours !== null) {
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

  // 检查天文数据缓存状态
  const today = new Date().toISOString().split('T')[0];
  const astroCacheKey = `${locationCode || lat + ',' + lng}_${today}`;
  const astroCached = astronomyCache.get(astroCacheKey);
  if (astroCached && Date.now() - astroCached.timestamp < ASTRONOMY_CACHE_TTL) {
    logger.debug('[getWeatherForPlant] 使用缓存的天文数据', { plantId: plant.plant_id, cacheKey: astroCacheKey });
  } else {
    logger.debug('[getWeatherForPlant] 天文数据缓存未命中，将请求API', { plantId: plant.plant_id, cacheKey: astroCacheKey });
  }

  // 并行获取天气和天文数据
  const [weatherData, astroData] = await Promise.all([
    getCurrentWeather(locationCode, lat, lng),
    getAstronomyData(locationCode, lat, lng),
  ]);

  logger.debug('[getWeatherForPlant] 获取天气数据完成', { 
    plantId: plant.plant_id, 
    hasWeatherData: !!weatherData,
    hasAstroData: !!astroData,
    sunHours: astroData ? astroData.sunHours : null,
  });

  return convertToMetrics(weatherData, astroData);
}

/**
 * 获取位置标识键（用于缓存和分组）
 * @param {string} locationCode - 城市代码
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @returns {string} 位置标识键
 */
function getLocationKey(locationCode, lat, lng) {
  if (locationCode) return `city:${locationCode}`;
  if (lat && lng) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!isNaN(latNum) && !isNaN(lngNum)) {
      return `geo:${latNum.toFixed(4)},${lngNum.toFixed(4)}`;
    }
  }
  return null;
}

/**
 * 统一获取位置标识键（支持传入植物对象）
 * @param {Object} plant - 植物对象
 * @returns {string} 位置标识键
 */
function getPlantLocationKey(plant) {
  if (!plant) return null;
  return getLocationKey(plant.location_code, plant.location_lat, plant.location_lng);
}

/**
 * 清除所有缓存（用于测试）
 */
function clearCache() {
  cityCodeCache.clear();
  weatherDataCache.clear();
  astronomyCache.clear();
  astronomyFailCount = 0;
  astronomyLastFailTime = 0;
}

module.exports = {
  getCurrentWeather,
  getAstronomyData,
  convertToMetrics,
  getWeatherForPlant,
  getLocationKey,
  getPlantLocationKey,
  geocoding,
  batchGeocoding,
  clearCache,
};
