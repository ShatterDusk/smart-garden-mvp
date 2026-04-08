const BaseService = require('./BaseService');
const { EnvironmentReading, EnvironmentReadingValue, EnvironmentMetric, Plant, ReadingTask } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { TASK_STATUS, DATA_SOURCE } = require('../config/environment');
const compensationService = require('./compensationService');

class EnvironmentService extends BaseService {
  constructor() {
    super(EnvironmentReading, 'EnvironmentReading');
  }

  generateReadingId() {
    return `READ_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  }

  generateTaskId() {
    return `TASK_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  }

  generateValueId() {
    return `VAL_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  }

  async getPlantById(plantId, userId) {
    try {
      return await Plant.findOne({
        where: { plant_id: plantId, user_id: userId },
      });
    } catch (err) {
      logger.error('EnvironmentService.getPlantById error:', err);
      throw err;
    }
  }

  async processDeviceEnvironmentData(plantId, data) {
    try {
      const { deviceId, recordedAt, metrics, isSupplement } = data;
      const recordedAtDate = new Date(recordedAt);

      let task = await ReadingTask.findOne({
        where: { plant_id: plantId, recorded_at: recordedAtDate },
      });

      if (!task) {
        task = await ReadingTask.create({
          task_id: this.generateTaskId(),
          plant_id: plantId,
          recorded_at: recordedAtDate,
          sensor_status: TASK_STATUS.SENSOR.PENDING,
          weather_status: TASK_STATUS.WEATHER.FAILED,
        });
      }

      switch (task.sensor_status) {
        case TASK_STATUS.SENSOR.RECEIVED:
          if (isSupplement) {
            return { error: '该时刻已有真实传感器数据，拒绝补传', code: 409 };
          }
          return {
            readingId: null,
            recordedAt: recordedAtDate.toISOString(),
            isSupplement: false,
            isStale: false,
            message: '数据已存在',
          };

        case TASK_STATUS.SENSOR.COMPENSATED:
          const coveredReading = await compensationService.coverCompensatedData(task, {
            plantId,
            recordedAt: recordedAtDate,
            deviceId,
            metrics,
          });
          return {
            readingId: coveredReading.reading_id,
            recordedAt: recordedAtDate.toISOString(),
            isSupplement: true,
            isStale: false,
          };

        case TASK_STATUS.SENSOR.FAILED:
        case TASK_STATUS.SENSOR.PENDING:
        default:
          const newReading = await compensationService.createSensorReading(task, {
            plantId,
            recordedAt: recordedAtDate,
            deviceId,
            metrics,
          });
          return {
            readingId: newReading.reading_id,
            recordedAt: recordedAtDate.toISOString(),
            isSupplement: false,
            isStale: false,
          };
      }
    } catch (err) {
      logger.error('EnvironmentService.processDeviceEnvironmentData error:', err);
      throw err;
    }
  }

  async getCurrentData(plantId, recordedAt = null) {
    try {
      const targetTime = recordedAt ? new Date(recordedAt) : new Date();

      const nearestIntervalTime = new Date(targetTime);
      nearestIntervalTime.setMinutes(0, 0, 0);
      nearestIntervalTime.setHours(Math.floor(nearestIntervalTime.getHours() / 2) * 2);

      const plant = await Plant.findOne({
        where: { plant_id: plantId },
        attributes: ['plant_id', 'location_name', 'location_code'],
      });

      const [sensorReading, weatherReading, task] = await Promise.all([
        EnvironmentReading.findOne({
          where: {
            plant_id: plantId,
            data_source: DATA_SOURCE.SENSOR,
            recorded_at: nearestIntervalTime,
          },
          include: [{ model: EnvironmentReadingValue, as: 'values' }],
        }),
        EnvironmentReading.findOne({
          where: {
            plant_id: plantId,
            data_source: DATA_SOURCE.WEATHER_API,
            recorded_at: nearestIntervalTime,
          },
          include: [{ model: EnvironmentReadingValue, as: 'values' }],
        }),
        ReadingTask.findOne({
          where: { plant_id: plantId, recorded_at: nearestIntervalTime },
        }),
      ]);

      const allMetrics = await EnvironmentMetric.findAll({
        attributes: ['metric_code', 'name', 'unit', 'icon', 'min_value', 'max_value'],
      });
      const metricMap = new Map(allMetrics.map(m => [m.metric_code, m]));

      const buildMetricsData = (reading) => {
        if (!reading || !reading.values) return [];
        return reading.values.map(v => {
          const metricDef = metricMap.get(v.metric_code) || {};
          const value = parseFloat(v.value);
          const minValue = metricDef.min_value != null ? parseFloat(metricDef.min_value) : null;
          const maxValue = metricDef.max_value != null ? parseFloat(metricDef.max_value) : null;
          let status = 'normal';
          if (minValue !== null && maxValue !== null) {
            if (value < minValue || value > maxValue) {
              status = 'warning';
            }
          }
          return {
            metricCode: v.metric_code,
            name: metricDef.name || v.metric_code,
            value,
            unit: metricDef.unit || '',
            icon: metricDef.icon || '',
            status,
            minValue,
            maxValue,
            isStale: reading.is_stale || false,
          };
        });
      };

      const updateTime = weatherReading ? weatherReading.created_at : null;

      return {
        plantId,
        recordedAt: nearestIntervalTime.toISOString(),
        location: plant ? plant.location_name : null,
        deviceMetrics: buildMetricsData(sensorReading),
        weatherMetrics: buildMetricsData(weatherReading),
        updateTime: updateTime ? new Date(updateTime).toISOString() : null,
        taskStatus: task
          ? {
              sensor: task.sensor_status,
              weather: task.weather_status,
            }
          : null,
      };
    } catch (err) {
      logger.error('EnvironmentService.getCurrentData error:', err);
      throw err;
    }
  }

  async getHistoryData(plantId, query = {}) {
    try {
      const { metricCode, timeRange = '7d', dataSource } = query;

      const now = new Date();
      let startDate;
      switch (timeRange) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '7d':
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
      }

      const whereClause = {
        plant_id: plantId,
        recorded_at: {
          [Op.gte]: startDate,
          [Op.lte]: now,
        },
      };

      if (dataSource) {
        whereClause.data_source = dataSource;
      }

      const readings = await EnvironmentReading.findAll({
        where: whereClause,
        order: [['recorded_at', 'ASC']],
        attributes: ['reading_id', 'recorded_at', 'is_stale'],
      });

      if (readings.length === 0) {
        return {
          list: [],
          metricCode,
          timeRange,
        };
      }

      const readingIds = readings.map(r => r.reading_id);

      const values = await EnvironmentReadingValue.findAll({
        where: {
          reading_id: readingIds,
          metric_code: metricCode,
        },
        attributes: ['reading_id', 'value'],
      });

      const valueMap = new Map(values.map(v => [v.reading_id, parseFloat(v.value)]));

      const metric = await EnvironmentMetric.findOne({
        where: { metric_code: metricCode },
        attributes: ['metric_code', 'name', 'unit', 'icon'],
      });

      const dataPoints = readings
        .filter(r => valueMap.has(r.reading_id))
        .map(r => ({
          time: r.recorded_at.toISOString(),
          value: valueMap.get(r.reading_id),
          isStale: r.is_stale || false,
        }));

      return {
        list: dataPoints,
        metricCode,
        metricName: metric ? metric.name : metricCode,
        unit: metric ? metric.unit : '',
        timeRange,
      };
    } catch (err) {
      logger.error('EnvironmentService.getHistoryData error:', err);
      throw err;
    }
  }
}

module.exports = EnvironmentService;
