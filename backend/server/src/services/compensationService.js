/**
 * 环境数据补偿服务
 * 处理传感器缺失时的数据补偿逻辑
 */

const { v4: uuidv4 } = require('uuid');
const { EnvironmentReading, EnvironmentReadingValue, ReadingTask, Plant } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { TOLERANCE_PERIOD, TASK_STATUS, DATA_SOURCE } = require('../config/environment');

/**
 * 生成唯一ID
 * @param {string} prefix - ID前缀
 * @returns {string} 唯一ID
 */
function generateId(prefix) {
  return `${prefix}_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
}

/**
 * 检查并执行补偿
 * 扫描所有超时的 pending task，执行补偿
 */
async function checkAndCompensateAll() {
  try {
    const now = Date.now();
    const cutoffTime = new Date(now - TOLERANCE_PERIOD);

    const pendingTasks = await ReadingTask.findAll({
      where: {
        sensor_status: TASK_STATUS.SENSOR.PENDING,
        recorded_at: { [Op.lt]: cutoffTime },
      },
    });

    logger.info(`发现 ${pendingTasks.length} 个待补偿任务`);

    for (const task of pendingTasks) {
      await compensateSensorReading(task);
    }

    return pendingTasks.length;
  } catch (error) {
    logger.error('补偿检查失败', { error: error.message });
    throw error;
  }
}

/**
 * 对单个任务执行补偿
 * @param {Object} task - ReadingTask 实例
 */
async function compensateSensorReading(task) {
  try {
    const lastReading = await EnvironmentReading.findOne({
      where: {
        plant_id: task.plant_id,
        data_source: DATA_SOURCE.SENSOR,
        recorded_at: { [Op.lt]: task.recorded_at },
      },
      order: [['recorded_at', 'DESC']],
      include: [{ model: EnvironmentReadingValue, as: 'values' }],
    });

    if (!lastReading) {
      await task.update({ sensor_status: TASK_STATUS.SENSOR.FAILED });
      logger.warn('无法补偿：无历史数据', { taskId: task.task_id, plantId: task.plant_id });
      return null;
    }

    const compensatedReading = await EnvironmentReading.create({
      reading_id: generateId('READ'),
      plant_id: task.plant_id,
      data_source: DATA_SOURCE.SENSOR,
      source_id: lastReading.source_id,
      recorded_at: task.recorded_at,
      is_stale: true,
    });

    const valuePromises = lastReading.values.map(val =>
      EnvironmentReadingValue.create({
        value_id: generateId('VAL'),
        reading_id: compensatedReading.reading_id,
        metric_code: val.metric_code,
        value: val.value,
      })
    );
    await Promise.all(valuePromises);

    await task.update({ sensor_status: TASK_STATUS.SENSOR.COMPENSATED });

    logger.info('补偿成功', {
      taskId: task.task_id,
      readingId: compensatedReading.reading_id,
      plantId: task.plant_id,
      recordedAt: task.recorded_at,
    });

    return compensatedReading;
  } catch (error) {
    logger.error('补偿失败', { taskId: task.task_id, error: error.message });
    throw error;
  }
}

/**
 * 覆盖补偿数据（传感器补传时）
 * @param {Object} task - ReadingTask 实例
 * @param {Object} data - 新数据 { plantId, recordedAt, deviceId, metrics }
 * @returns {Object} 新创建的真实 reading
 */
async function coverCompensatedData(task, data) {
  const transaction = await EnvironmentReading.sequelize.transaction();

  try {
    const compensatedReading = await EnvironmentReading.findOne({
      where: {
        plant_id: task.plant_id,
        recorded_at: task.recorded_at,
        data_source: DATA_SOURCE.SENSOR,
        is_stale: true,
      },
      transaction,
    });

    if (compensatedReading) {
      await EnvironmentReadingValue.destroy({
        where: { reading_id: compensatedReading.reading_id },
        transaction,
      });
      await compensatedReading.destroy({ transaction });
    }

    const realReading = await EnvironmentReading.create(
      {
        reading_id: generateId('READ'),
        plant_id: data.plantId,
        data_source: DATA_SOURCE.SENSOR,
        source_id: data.deviceId,
        recorded_at: data.recorded_at,
        is_stale: false,
      },
      { transaction }
    );

    const valuePromises = data.metrics.map(metric =>
      EnvironmentReadingValue.create(
        {
          value_id: generateId('VAL'),
          reading_id: realReading.reading_id,
          metric_code: metric.metricCode,
          value: metric.value,
        },
        { transaction }
      )
    );
    await Promise.all(valuePromises);

    await task.update({ sensor_status: TASK_STATUS.SENSOR.RECEIVED }, { transaction });

    await transaction.commit();

    logger.info('覆盖补偿数据成功', {
      taskId: task.task_id,
      readingId: realReading.reading_id,
      plantId: data.plantId,
    });

    return realReading;
  } catch (error) {
    await transaction.rollback();
    logger.error('覆盖补偿数据失败', { taskId: task.task_id, error: error.message });
    throw error;
  }
}

/**
 * 创建传感器 reading
 * @param {Object} task - ReadingTask 实例
 * @param {Object} data - 数据 { plantId, recordedAt, deviceId, metrics }
 * @returns {Object} 新创建的 reading
 */
async function createSensorReading(task, data) {
  const transaction = await EnvironmentReading.sequelize.transaction();

  try {
    const reading = await EnvironmentReading.create(
      {
        reading_id: generateId('READ'),
        plant_id: data.plantId,
        data_source: DATA_SOURCE.SENSOR,
        source_id: data.deviceId,
        recorded_at: data.recorded_at,
        is_stale: false,
      },
      { transaction }
    );

    const valuePromises = data.metrics.map(metric =>
      EnvironmentReadingValue.create(
        {
          value_id: generateId('VAL'),
          reading_id: reading.reading_id,
          metric_code: metric.metricCode,
          value: metric.value,
        },
        { transaction }
      )
    );
    await Promise.all(valuePromises);

    await task.update({ sensor_status: TASK_STATUS.SENSOR.RECEIVED }, { transaction });

    await transaction.commit();

    logger.info('创建传感器数据成功', {
      taskId: task.task_id,
      readingId: reading.reading_id,
      plantId: data.plantId,
    });

    return reading;
  } catch (error) {
    await transaction.rollback();
    logger.error('创建传感器数据失败', { taskId: task.task_id, error: error.message });
    throw error;
  }
}

/**
 * 创建天气 reading
 * @param {string} plantId - 植物ID
 * @param {Date} recordedAt - 记录时间
 * @param {Object} metrics - 指标数据 { metricCode: value, ... }
 * @param {string} locationCode - 位置编码
 * @returns {Object} 新创建的 reading
 */
async function createWeatherReading(plantId, recordedAt, metrics, locationCode) {
  const transaction = await EnvironmentReading.sequelize.transaction();

  try {
    const reading = await EnvironmentReading.create(
      {
        reading_id: generateId('READ'),
        plant_id: plantId,
        data_source: DATA_SOURCE.WEATHER_API,
        source_id: locationCode,
        recorded_at: recordedAt,
        is_stale: false,
      },
      { transaction }
    );

    const valuePromises = Object.entries(metrics).map(([metricCode, value]) =>
      EnvironmentReadingValue.create(
        {
          value_id: generateId('VAL'),
          reading_id: reading.reading_id,
          metric_code: metricCode,
          value: value,
        },
        { transaction }
      )
    );
    await Promise.all(valuePromises);

    await transaction.commit();

    logger.info('创建天气数据成功', {
      readingId: reading.reading_id,
      plantId,
      recordedAt,
    });

    return reading;
  } catch (error) {
    await transaction.rollback();
    logger.error('创建天气数据失败', { plantId, error: error.message });
    throw error;
  }
}

module.exports = {
  checkAndCompensateAll,
  compensateSensorReading,
  coverCompensatedData,
  createSensorReading,
  createWeatherReading,
  generateId,
};
