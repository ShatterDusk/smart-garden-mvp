/**
 * 环境数据同步定时任务
 * 每2小时执行一次，生成 reading_tasks 并获取天气数据
 */

const { Plant, ReadingTask, EnvironmentReading, EnvironmentReadingValue } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { SYNC_INTERVAL, TOLERANCE_PERIOD, TASK_STATUS, DATA_SOURCE } = require('../config/environment');
const compensationService = require('../services/compensationService');
const weatherService = require('../services/weatherService');

let syncIntervalId = null;
let compensateIntervalId = null;

// 并发控制标志
let isSyncRunning = false;
let isCompensationRunning = false;

/**
 * 生成唯一ID
 */
function generateId(prefix) {
  return `${prefix}_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
}

/**
 * 获取最近的整点时间（向下取整到2小时）
 */
function getNearestIntervalTime(date) {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  d.setHours(Math.floor(d.getHours() / 2) * 2);
  return d;
}

/**
 * 生成所有植物的 reading_task
 */
async function generateTasksForAllPlants() {
  try {
    const now = new Date();
    const recordedAt = getNearestIntervalTime(now);

    const plants = await Plant.findAll({
      attributes: ['plant_id', 'location_code', 'location_lat', 'location_lng'],
      where: {
        [Op.or]: [
          { current_device_id: { [Op.ne]: null } },
          {
            [Op.and]: [
              { location_lat: { [Op.ne]: null } },
              { location_lng: { [Op.ne]: null } },
            ],
          },
        ],
      },
    });

    logger.info(`开始生成任务，共 ${plants.length} 株植物，时间: ${recordedAt.toISOString()}`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const plant of plants) {
      const existingTask = await ReadingTask.findOne({
        where: { plant_id: plant.plant_id, recorded_at: recordedAt },
      });

      if (existingTask) {
        skippedCount++;
        continue;
      }

      await ReadingTask.create({
        task_id: generateId('TASK'),
        plant_id: plant.plant_id,
        recorded_at: recordedAt,
        sensor_status: TASK_STATUS.SENSOR.PENDING,
        weather_status: TASK_STATUS.WEATHER.PENDING,
      });

      createdCount++;
    }

    logger.info(`任务生成完成，新建: ${createdCount}，跳过: ${skippedCount}`);

    return { createdCount, skippedCount, recordedAt };
  } catch (error) {
    logger.error('生成任务失败', { error: error.message });
    throw error;
  }
}

/**
 * 为所有植物获取天气数据
 * 优化：按位置分组，组内共享结果，复用缓存
 */
async function fetchWeatherForAllPlants() {
  try {
    const now = new Date();
    const recordedAt = getNearestIntervalTime(now);

    const pendingTasks = await ReadingTask.findAll({
      where: {
        recorded_at: recordedAt,
        weather_status: TASK_STATUS.WEATHER.PENDING,
      },
      include: [
        {
          model: Plant,
          as: 'plant',
          attributes: ['plant_id', 'location_code', 'location_lat', 'location_lng'],
        },
      ],
    });

    logger.info(`开始获取天气数据，共 ${pendingTasks.length} 个任务`);

    // 1. 按位置分组
    const locationGroups = new Map(); // locationKey -> { plantIds: [], plant: {...} }

    for (const task of pendingTasks) {
      const plant = task.plant;
      if (!plant) continue;

      const locationKey = weatherService.getPlantLocationKey(plant);
      if (!locationKey) continue;

      if (!locationGroups.has(locationKey)) {
        locationGroups.set(locationKey, {
          locationKey,
          locationCode: plant.location_code,
          lat: plant.location_lat,
          lng: plant.location_lng,
          tasks: [],
        });
      }
      locationGroups.get(locationKey).tasks.push(task);
    }

    logger.info(`位置分组完成，共 ${locationGroups.size} 个不同位置`);

    // 2. 检查数据库缓存（同一个位置标识是否有可用的天气读数）
    const cachedReadings = new Map(); // locationKey -> weatherData

    if (locationGroups.size > 0) {
      const existingReadings = await EnvironmentReading.findAll({
        where: {
          data_source: DATA_SOURCE.WEATHER_API,
          recorded_at: recordedAt,
        },
        include: [
          {
            model: EnvironmentReadingValue,
            as: 'values',
          },
        ],
      });

      for (const reading of existingReadings) {
        const sourceId = reading.source_id;
        let matchedKey = null;

        for (const locationKey of locationGroups.keys()) {
          const group = locationGroups.get(locationKey);
          const groupSourceId = group.locationCode || (group.lat && group.lng ? `${group.lng},${group.lat}` : null);
          if (sourceId === groupSourceId) {
            matchedKey = locationKey;
            break;
          }
        }

        if (matchedKey) {
          const metrics = {};
          for (const v of reading.values) {
            metrics[v.metric_code] = v.value;
          }
          cachedReadings.set(matchedKey, metrics);
          logger.debug('找到缓存的天气数据', { locationKey: matchedKey });
        }
      }
    }

    // 3. 对每个位置分组获取天气数据
    let successCount = 0;
    let failedCount = 0;
    let cacheHitCount = 0;

    for (const [locationKey, group] of locationGroups) {
      const { tasks, locationCode, lat, lng } = group;
      let weatherData = cachedReadings.get(locationKey);

      if (!weatherData) {
        // 缓存未命中，尝试获取城市代码
        let queryLocationCode = locationCode;
        if (!queryLocationCode && lat && lng) {
          queryLocationCode = await weatherService.geocoding(lat, lng);
          if (queryLocationCode) {
            logger.debug('经纬度转换为城市代码', { lat, lng, cityCode: queryLocationCode });
          }
        }

        // 调用API获取天气数据
        const queryPlant = {
          location_code: queryLocationCode,
          location_lat: lat,
          location_lng: lng,
        };
        weatherData = await weatherService.getWeatherForPlant(queryPlant);
      } else {
        cacheHitCount++;
      }

      if (!weatherData || Object.keys(weatherData).length === 0) {
        for (const task of tasks) {
          await task.update({ weather_status: TASK_STATUS.WEATHER.FAILED });
        }
        failedCount += tasks.length;
        continue;
      }

      // 使用统一的 sourceId
      const sourceId = locationCode || (lat && lng ? `${lng},${lat}` : null);

      // 为每个 task 创建天气读数（共享同一份天气数据）
      for (const task of tasks) {
        try {
          await compensationService.createWeatherReading(
            task.plant_id,
            recordedAt,
            weatherData,
            sourceId
          );
          await task.update({ weather_status: TASK_STATUS.WEATHER.RECEIVED });
          successCount++;
        } catch (err) {
          logger.warn('创建天气读数失败', { taskId: task.task_id, error: err.message });
          await task.update({ weather_status: TASK_STATUS.WEATHER.FAILED });
          failedCount++;
        }
      }
    }

    logger.info(`天气数据获取完成，成功: ${successCount}，失败: ${failedCount}，缓存命中: ${cacheHitCount}`);

    return { successCount, failedCount, cacheHitCount };
  } catch (error) {
    logger.error('获取天气数据失败', { error: error.message });
    throw error;
  }
}

/**
 * 执行完整的同步流程
 * 添加了并发控制，防止任务重叠执行
 */
async function runSync() {
  // 并发控制检查
  if (isSyncRunning) {
    logger.warn('上一次同步任务尚未完成，跳过本次执行');
    return;
  }

  isSyncRunning = true;
  logger.info('========== 环境数据同步开始 ==========');

  try {
    await generateTasksForAllPlants();
    await fetchWeatherForAllPlants();

    logger.info('========== 环境数据同步完成 ==========');
  } catch (error) {
    logger.error('环境数据同步失败', { error: error.message });
  } finally {
    isSyncRunning = false;
  }
}

/**
 * 执行补偿检查
 * 添加了并发控制，防止任务重叠执行
 */
async function runCompensation() {
  // 并发控制检查
  if (isCompensationRunning) {
    logger.warn('上一次补偿检查尚未完成，跳过本次执行');
    return;
  }

  isCompensationRunning = true;
  logger.info('========== 补偿检查开始 ==========');

  try {
    const count = await compensationService.checkAndCompensateAll();
    logger.info(`========== 补偿检查完成，处理 ${count} 个任务 ==========`);
  } catch (error) {
    logger.error('补偿检查失败', { error: error.message });
  } finally {
    isCompensationRunning = false;
  }
}

/**
 * 启动定时任务
 */
function start() {
  if (syncIntervalId) {
    logger.warn('定时任务已在运行');
    return;
  }

  logger.info('启动环境数据同步定时任务');
  logger.info(`同步周期: ${SYNC_INTERVAL / 1000 / 60} 分钟`);
  logger.info(`容忍期: ${TOLERANCE_PERIOD / 1000 / 60} 分钟`);

  // 主同步任务：每2小时执行
  syncIntervalId = setInterval(runSync, SYNC_INTERVAL);

  // 补偿任务：每10分钟检查一次（容忍期5分钟，但多检查几次确保不遗漏）
  compensateIntervalId = setInterval(runCompensation, 10 * 60 * 1000);

  // 启动时立即执行一次
  runSync();
}

/**
 * 停止定时任务
 */
function stop() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }

  if (compensateIntervalId) {
    clearInterval(compensateIntervalId);
    compensateIntervalId = null;
  }

  logger.info('环境数据同步定时任务已停止');
}

/**
 * 手动触发同步（用于测试）
 */
async function triggerSync() {
  await runSync();
}

/**
 * 手动触发补偿（用于测试）
 */
async function triggerCompensation() {
  await runCompensation();
}

module.exports = {
  start,
  stop,
  triggerSync,
  triggerCompensation,
  runSync,
  runCompensation,
};
