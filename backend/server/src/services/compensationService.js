/**
 * 环境数据补偿服务
 * 处理传感器缺失时的数据补偿逻辑
 */

const { v4: uuidv4 } = require('uuid');
const { EnvironmentReading, EnvironmentReadingValue, ReadingTask, Plant, EnvironmentMetric } = require('../models');
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
 * 验证指标是否存在
 * @param {Array} metrics - 指标数组 [{metricCode, value}, ...]
 * @returns {Promise<boolean>} 验证结果
 */
async function validateMetrics(metrics) {
  try {
    const metricCodes = metrics.map(metric => metric.metricCode);
    
    logger.debug('[validateMetrics] 验证指标', {
      inputCodes: metricCodes,
      count: metricCodes.length,
    });
    
    const existingMetrics = await EnvironmentMetric.findAll({
      where: {
        metric_code: {
          [Op.in]: metricCodes
        }
      },
      attributes: ['metric_code']
    });
    
    const existingCodes = new Set(existingMetrics.map(m => m.metric_code));
    const invalidMetrics = metricCodes.filter(code => !existingCodes.has(code));
    
    logger.debug('[validateMetrics] 验证结果', {
      existingCodes: Array.from(existingCodes),
      invalidMetrics,
      isValid: invalidMetrics.length === 0,
    });
    
    if (invalidMetrics.length > 0) {
      throw new Error(`无效的指标代码: ${invalidMetrics.join(', ')}`);
    }
    
    return true;
  } catch (error) {
    logger.error('[validateMetrics] 指标验证失败', { 
      error: error.message,
      inputMetrics: metrics.map(m => m.metricCode),
    });
    throw error;
  }
}

/**
 * 验证单个指标是否存在
 * @param {string} metricCode - 指标代码
 * @returns {Promise<boolean>} 验证结果
 */
async function validateMetric(metricCode) {
  try {
    const metric = await EnvironmentMetric.findOne({
      where: { metric_code: metricCode }
    });
    
    if (!metric) {
      throw new Error(`无效的指标代码: ${metricCode}`);
    }
    
    return true;
  } catch (error) {
    logger.error('指标验证失败', { error: error.message });
    throw error;
  }
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

    // 优化：单个任务失败不影响其他任务
    let successCount = 0;
    let failCount = 0;

    for (const task of pendingTasks) {
      try {
        await compensateSensorReading(task);
        successCount++;
      } catch (error) {
        failCount++;
        logger.error('单个任务补偿失败，继续处理下一个', {
          taskId: task.task_id,
          error: error.message,
        });
        // 继续处理下一个任务，不中断流程
      }
    }

    logger.info('补偿检查完成', { successCount, failCount, total: pendingTasks.length });
    return successCount;
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
    // 验证指标是否有效
    await validateMetrics(data.metrics);

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
        recorded_at: data.recordedAt,
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
    // 验证指标是否有效
    await validateMetrics(data.metrics);

    const reading = await EnvironmentReading.create(
      {
        reading_id: generateId('READ'),
        plant_id: data.plantId,
        data_source: DATA_SOURCE.SENSOR,
        source_id: data.deviceId,
        recorded_at: data.recordedAt,
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
/**
 * 检查当天是否已有日照时长数据
 */
async function hasSunHoursToday(plantId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const existing = await EnvironmentReading.findOne({
    where: {
      plant_id: plantId,
      data_source: DATA_SOURCE.WEATHER_API,
      recorded_at: {
        [Op.gte]: startOfDay,
        [Op.lte]: endOfDay,
      },
    },
    include: [{
      model: EnvironmentReadingValue,
      as: 'values',
      where: { metric_code: 'sun_hours' },
      required: true,
    }],
  });
  
  return !!existing;
}

async function createWeatherReading(plantId, recordedAt, metrics, locationCode) {
  const transaction = await EnvironmentReading.sequelize.transaction();

  try {
    // 分离日照时长（每天只记录一次）
    let sunHours = null;
    let shouldWriteSunHours = false;
    
    if ('sun_hours' in metrics) {
      sunHours = metrics.sun_hours;
      delete metrics.sun_hours; // 从常规指标中移除
      
      // 检查当天是否已有日照时长数据
      const hasToday = await hasSunHoursToday(plantId, recordedAt);
      if (!hasToday) {
        shouldWriteSunHours = true;
        logger.debug('[createWeatherReading] 当天首次记录日照时长', { plantId, recordedAt, sunHours });
      } else {
        logger.debug('[createWeatherReading] 当天已有日照时长，跳过', { plantId, recordedAt });
      }
    }
    
    // 验证指标是否有效
    const metricsArray = Object.entries(metrics).map(([metricCode, value]) => ({
      metricCode,
      value
    }));
    
    logger.debug('[createWeatherReading] 准备创建天气读数', {
      plantId,
      recordedAt,
      locationCode,
      metricCodes: metricsArray.map(m => m.metricCode),
      hasSunHours: sunHours !== null,
      shouldWriteSunHours,
      sunHoursValue: sunHours,
    });
    
    await validateMetrics(metricsArray);

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

    // 写入常规指标
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
    
    // 如果需要，写入日照时长
    if (shouldWriteSunHours && sunHours !== null) {
      valuePromises.push(
        EnvironmentReadingValue.create(
          {
            value_id: generateId('VAL'),
            reading_id: reading.reading_id,
            metric_code: 'sun_hours',
            value: sunHours,
          },
          { transaction }
        )
      );
    }
    
    await Promise.all(valuePromises);

    await transaction.commit();

    logger.info('[createWeatherReading] 创建天气数据成功', {
      readingId: reading.reading_id,
      plantId,
      recordedAt,
      metricCount: Object.keys(metrics).length,
      metrics: Object.keys(metrics),
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
  validateMetrics,
  validateMetric,
};
