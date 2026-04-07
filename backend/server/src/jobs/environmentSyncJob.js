/**
 * 环境数据同步定时任务
 * 每2小时执行一次，生成 reading_tasks 并获取天气数据
 */

const { Plant, ReadingTask } = require('../models');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { SYNC_INTERVAL, TOLERANCE_PERIOD, TASK_STATUS, DATA_SOURCE } = require('../config/environment');
const compensationService = require('../services/compensationService');
const weatherService = require('../services/weatherService');

let syncIntervalId = null;
let compensateIntervalId = null;

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
      attributes: ['plant_id', 'location_code'],
      where: {
        current_device_id: { [require('sequelize').Op.ne]: null },
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
          attributes: ['plant_id', 'location_code'],
        },
      ],
    });

    logger.info(`开始获取天气数据，共 ${pendingTasks.length} 个任务`);

    let successCount = 0;
    let failedCount = 0;

    for (const task of pendingTasks) {
      try {
        const plant = task.plant;
        if (!plant || !plant.location_code) {
          await task.update({ weather_status: TASK_STATUS.WEATHER.FAILED });
          failedCount++;
          continue;
        }

        const weatherData = await weatherService.getWeatherForPlant(plant);

        if (!weatherData || !weatherData.metrics) {
          await task.update({ weather_status: TASK_STATUS.WEATHER.FAILED });
          failedCount++;
          continue;
        }

        await compensationService.createWeatherReading(
          plant.plant_id,
          recordedAt,
          weatherData.metrics,
          plant.location_code
        );

        await task.update({ weather_status: TASK_STATUS.WEATHER.RECEIVED });
        successCount++;
      } catch (err) {
        logger.warn('获取天气数据失败', { taskId: task.task_id, error: err.message });
        await task.update({ weather_status: TASK_STATUS.WEATHER.FAILED });
        failedCount++;
      }
    }

    logger.info(`天气数据获取完成，成功: ${successCount}，失败: ${failedCount}`);

    return { successCount, failedCount };
  } catch (error) {
    logger.error('获取天气数据失败', { error: error.message });
    throw error;
  }
}

/**
 * 执行完整的同步流程
 */
async function runSync() {
  logger.info('========== 环境数据同步开始 ==========');

  try {
    await generateTasksForAllPlants();
    await fetchWeatherForAllPlants();

    logger.info('========== 环境数据同步完成 ==========');
  } catch (error) {
    logger.error('环境数据同步失败', { error: error.message });
  }
}

/**
 * 执行补偿检查
 */
async function runCompensation() {
  logger.info('========== 补偿检查开始 ==========');

  try {
    const count = await compensationService.checkAndCompensateAll();
    logger.info(`========== 补偿检查完成，处理 ${count} 个任务 ==========`);
  } catch (error) {
    logger.error('补偿检查失败', { error: error.message });
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
