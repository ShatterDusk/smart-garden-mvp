/**
 * compensationService 单元测试
 * 环境数据补偿服务测试
 */

jest.mock('../../../src/models', () => ({
  EnvironmentReading: {
    findOne: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
    sequelize: {
      transaction: jest.fn()
    }
  },
  EnvironmentReadingValue: {
    create: jest.fn(),
    destroy: jest.fn()
  },
  ReadingTask: {
    findAll: jest.fn(),
    findOne: jest.fn()
  },
  Plant: {
    findOne: jest.fn()
  },
  EnvironmentMetric: {
    findAll: jest.fn(),
    findOne: jest.fn()
  }
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

jest.mock('../../../src/config/environment', () => ({
  TOLERANCE_PERIOD: 300000, // 5分钟
  TASK_STATUS: {
    SENSOR: {
      PENDING: 'pending',
      COMPENSATED: 'compensated',
      FAILED: 'failed',
      RECEIVED: 'received'
    }
  },
  DATA_SOURCE: {
    SENSOR: 'sensor',
    WEATHER_API: 'weather_api'
  }
}));

const { Op } = require('sequelize');
const {
  EnvironmentReading,
  EnvironmentReadingValue,
  ReadingTask,
  Plant,
  EnvironmentMetric
} = require('../../../src/models');
const logger = require('../../../src/utils/logger');

const {
  checkAndCompensateAll,
  compensateSensorReading,
  coverCompensatedData,
  createSensorReading,
  createWeatherReading,
  generateId,
  validateMetrics,
  validateMetric
} = require('../../../src/services/compensationService');

describe('compensationService', () => {
  let mockTransaction;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置 mock transaction
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn()
    };
    EnvironmentReading.sequelize.transaction.mockResolvedValue(mockTransaction);
  });

  describe('generateId', () => {
    it('应该生成带前缀的唯一ID', () => {
      const id = generateId('TEST');
      
      expect(id).toMatch(/^TEST_[a-f0-9]{16}$/);
    });

    it('不同调用应该生成不同ID', () => {
      const id1 = generateId('TEST');
      const id2 = generateId('TEST');
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('validateMetrics', () => {
    it('应该成功验证有效的指标', async () => {
      EnvironmentMetric.findAll.mockResolvedValue([
        { metric_code: 'temperature' },
        { metric_code: 'humidity' }
      ]);

      const metrics = [
        { metricCode: 'temperature', value: 25 },
        { metricCode: 'humidity', value: 60 }
      ];

      const result = await validateMetrics(metrics);

      expect(result).toBe(true);
      expect(EnvironmentMetric.findAll).toHaveBeenCalledWith({
        where: {
          metric_code: {
            [Op.in]: ['temperature', 'humidity']
          }
        },
        attributes: ['metric_code']
      });
    });

    it('应该抛出错误当指标不存在', async () => {
      EnvironmentMetric.findAll.mockResolvedValue([
        { metric_code: 'temperature' }
      ]);

      const metrics = [
        { metricCode: 'temperature', value: 25 },
        { metricCode: 'invalid_metric', value: 100 }
      ];

      await expect(validateMetrics(metrics)).rejects.toThrow('无效的指标代码: invalid_metric');
    });

    it('应该处理空指标数组', async () => {
      EnvironmentMetric.findAll.mockResolvedValue([]);

      const result = await validateMetrics([]);

      expect(result).toBe(true);
    });
  });

  describe('validateMetric', () => {
    it('应该成功验证单个有效指标', async () => {
      EnvironmentMetric.findOne.mockResolvedValue({ metric_code: 'temperature' });

      const result = await validateMetric('temperature');

      expect(result).toBe(true);
      expect(EnvironmentMetric.findOne).toHaveBeenCalledWith({
        where: { metric_code: 'temperature' }
      });
    });

    it('应该抛出错误当指标不存在', async () => {
      EnvironmentMetric.findOne.mockResolvedValue(null);

      await expect(validateMetric('invalid_metric')).rejects.toThrow('无效的指标代码: invalid_metric');
    });
  });

  describe('checkAndCompensateAll', () => {
    it('应该成功补偿所有待处理任务', async () => {
      const mockTasks = [
        { task_id: 'task_1', plant_id: 'plant_1', recorded_at: new Date(), update: jest.fn() },
        { task_id: 'task_2', plant_id: 'plant_2', recorded_at: new Date(), update: jest.fn() }
      ];
      ReadingTask.findAll.mockResolvedValue(mockTasks);

      // Mock compensateSensorReading 成功
      const mockReading = { reading_id: 'read_1' };
      EnvironmentReading.findOne.mockResolvedValue({
        reading_id: 'last_read_1',
        values: [
          { metric_code: 'temperature', value: 25 },
          { metric_code: 'humidity', value: 60 }
        ]
      });
      EnvironmentReading.create.mockResolvedValue(mockReading);
      EnvironmentReadingValue.create.mockResolvedValue({});

      const result = await checkAndCompensateAll();

      expect(result).toBe(2);
      expect(ReadingTask.findAll).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('补偿检查完成', expect.any(Object));
    });

    it('应该处理没有待补偿任务的情况', async () => {
      ReadingTask.findAll.mockResolvedValue([]);

      const result = await checkAndCompensateAll();

      expect(result).toBe(0);
      expect(logger.info).toHaveBeenCalledWith('发现 0 个待补偿任务');
    });

    it('应该继续处理其他任务当单个任务失败', async () => {
      const mockTasks = [
        { task_id: 'task_1', plant_id: 'plant_1', recorded_at: new Date(), update: jest.fn() },
        { task_id: 'task_2', plant_id: 'plant_2', recorded_at: new Date(), update: jest.fn() }
      ];
      ReadingTask.findAll.mockResolvedValue(mockTasks);

      // 第一个任务失败，第二个成功
      EnvironmentReading.findOne
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({
          reading_id: 'last_read_2',
          values: [{ metric_code: 'temperature', value: 25 }]
        });
      EnvironmentReading.create.mockResolvedValue({ reading_id: 'read_2' });
      EnvironmentReadingValue.create.mockResolvedValue({});

      const result = await checkAndCompensateAll();

      expect(result).toBe(1); // 只有一个成功
      expect(logger.error).toHaveBeenCalledWith('单个任务补偿失败，继续处理下一个', expect.any(Object));
    });
  });

  describe('compensateSensorReading', () => {
    it('应该成功补偿传感器读数', async () => {
      const mockTask = {
        task_id: 'task_1',
        plant_id: 'plant_1',
        recorded_at: new Date('2024-01-01 12:00:00'),
        update: jest.fn().mockResolvedValue({})
      };

      const mockLastReading = {
        reading_id: 'last_read_1',
        source_id: 'device_1',
        values: [
          { metric_code: 'temperature', value: 25 },
          { metric_code: 'humidity', value: 60 }
        ]
      };

      EnvironmentReading.findOne.mockResolvedValue(mockLastReading);
      const mockCompensatedReading = { reading_id: 'comp_read_1' };
      EnvironmentReading.create.mockResolvedValue(mockCompensatedReading);
      EnvironmentReadingValue.create.mockResolvedValue({});

      const result = await compensateSensorReading(mockTask);

      expect(result).toEqual(mockCompensatedReading);
      expect(EnvironmentReading.create).toHaveBeenCalledWith(expect.objectContaining({
        plant_id: 'plant_1',
        data_source: 'sensor',
        source_id: 'device_1',
        is_stale: true
      }));
      expect(mockTask.update).toHaveBeenCalledWith({ sensor_status: 'compensated' });
    });

    it('应该返回null当没有历史数据', async () => {
      const mockTask = {
        task_id: 'task_1',
        plant_id: 'plant_1',
        recorded_at: new Date(),
        update: jest.fn().mockResolvedValue({})
      };

      EnvironmentReading.findOne.mockResolvedValue(null);

      const result = await compensateSensorReading(mockTask);

      expect(result).toBeNull();
      expect(mockTask.update).toHaveBeenCalledWith({ sensor_status: 'failed' });
      expect(logger.warn).toHaveBeenCalledWith('无法补偿：无历史数据', expect.any(Object));
    });
  });

  describe('createSensorReading', () => {
    it('应该成功创建传感器读数', async () => {
      const mockTask = {
        task_id: 'task_1',
        update: jest.fn().mockResolvedValue({})
      };

      const data = {
        plantId: 'plant_1',
        recordedAt: new Date('2024-01-01 12:00:00'),
        deviceId: 'device_1',
        metrics: [
          { metricCode: 'temperature', value: 25 },
          { metricCode: 'humidity', value: 60 }
        ]
      };

      EnvironmentMetric.findAll.mockResolvedValue([
        { metric_code: 'temperature' },
        { metric_code: 'humidity' }
      ]);

      const mockReading = { reading_id: 'read_1' };
      EnvironmentReading.create.mockResolvedValue(mockReading);
      EnvironmentReadingValue.create.mockResolvedValue({});

      const result = await createSensorReading(mockTask, data);

      expect(result).toEqual(mockReading);
      expect(EnvironmentReading.create).toHaveBeenCalledWith(expect.objectContaining({
        plant_id: 'plant_1',
        data_source: 'sensor',
        source_id: 'device_1',
        is_stale: false
      }), { transaction: mockTransaction });
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('应该在失败时回滚事务', async () => {
      const mockTask = {
        task_id: 'task_1',
        update: jest.fn()
      };

      const data = {
        plantId: 'plant_1',
        recordedAt: new Date(),
        deviceId: 'device_1',
        metrics: [{ metricCode: 'temperature', value: 25 }]
      };

      EnvironmentMetric.findAll.mockRejectedValue(new Error('Validation error'));

      await expect(createSensorReading(mockTask, data)).rejects.toThrow('Validation error');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('createWeatherReading', () => {
    it('应该成功创建天气读数', async () => {
      const plantId = 'plant_1';
      const recordedAt = new Date('2024-01-01 12:00:00');
      const metrics = {
        temperature: 25,
        humidity: 60
      };
      const locationCode = '101010100';

      EnvironmentMetric.findAll.mockResolvedValue([
        { metric_code: 'temperature' },
        { metric_code: 'humidity' }
      ]);

      const mockReading = { reading_id: 'weather_read_1' };
      EnvironmentReading.create.mockResolvedValue(mockReading);
      EnvironmentReadingValue.create.mockResolvedValue({});

      const result = await createWeatherReading(plantId, recordedAt, metrics, locationCode);

      expect(result).toEqual(mockReading);
      expect(EnvironmentReading.create).toHaveBeenCalledWith(expect.objectContaining({
        plant_id: 'plant_1',
        data_source: 'weather_api',
        source_id: '101010100',
        is_stale: false
      }), { transaction: mockTransaction });
    });

    it('应该处理包含日照时长的指标', async () => {
      const plantId = 'plant_1';
      const recordedAt = new Date('2024-01-01 12:00:00');
      const metrics = {
        temperature: 25,
        sun_hours: 8.5
      };
      const locationCode = '101010100';

      // 模拟当天没有日照时长数据
      EnvironmentReading.findOne.mockResolvedValue(null);
      
      EnvironmentMetric.findAll.mockResolvedValue([
        { metric_code: 'temperature' },
        { metric_code: 'sun_hours' }
      ]);

      const mockReading = { reading_id: 'weather_read_1' };
      EnvironmentReading.create.mockResolvedValue(mockReading);
      EnvironmentReadingValue.create.mockResolvedValue({});

      const result = await createWeatherReading(plantId, recordedAt, metrics, locationCode);

      expect(result).toEqual(mockReading);
      // 验证日照时长被写入
      expect(EnvironmentReadingValue.create).toHaveBeenCalledWith(expect.objectContaining({
        metric_code: 'sun_hours',
        value: 8.5
      }), { transaction: mockTransaction });
    });

    it('应该跳过日照时长如果当天已存在', async () => {
      const plantId = 'plant_1';
      const recordedAt = new Date('2024-01-01 12:00:00');
      const metrics = {
        temperature: 25,
        sun_hours: 8.5
      };
      const locationCode = '101010100';

      // 模拟当天已有日照时长数据
      EnvironmentReading.findOne.mockResolvedValue({ reading_id: 'existing' });
      
      EnvironmentMetric.findAll.mockResolvedValue([
        { metric_code: 'temperature' },
        { metric_code: 'sun_hours' }
      ]);

      const mockReading = { reading_id: 'weather_read_1' };
      EnvironmentReading.create.mockResolvedValue(mockReading);
      EnvironmentReadingValue.create.mockResolvedValue({});

      await createWeatherReading(plantId, recordedAt, metrics, locationCode);

      // 验证日照时长没有被写入（只有 temperature）
      const calls = EnvironmentReadingValue.create.mock.calls;
      const sunHoursCalls = calls.filter(call => call[0].metric_code === 'sun_hours');
      expect(sunHoursCalls.length).toBe(0);
    });
  });

  describe('coverCompensatedData', () => {
    it('应该成功覆盖补偿数据', async () => {
      const mockTask = {
        task_id: 'task_1',
        plant_id: 'plant_1',
        recorded_at: new Date('2024-01-01 12:00:00'),
        update: jest.fn().mockResolvedValue({})
      };

      const data = {
        plantId: 'plant_1',
        recordedAt: new Date('2024-01-01 12:00:00'),
        deviceId: 'device_1',
        metrics: [
          { metricCode: 'temperature', value: 26 },
          { metricCode: 'humidity', value: 65 }
        ]
      };

      const mockCompensatedReading = {
        reading_id: 'comp_read_1',
        destroy: jest.fn().mockResolvedValue({})
      };
      EnvironmentReading.findOne.mockResolvedValue(mockCompensatedReading);
      EnvironmentReadingValue.destroy.mockResolvedValue(1);
      EnvironmentReading.destroy.mockResolvedValue(1);

      EnvironmentMetric.findAll.mockResolvedValue([
        { metric_code: 'temperature' },
        { metric_code: 'humidity' }
      ]);

      const mockRealReading = { reading_id: 'real_read_1' };
      EnvironmentReading.create.mockResolvedValue(mockRealReading);
      EnvironmentReadingValue.create.mockResolvedValue({});

      const result = await coverCompensatedData(mockTask, data);

      expect(result).toEqual(mockRealReading);
      expect(EnvironmentReadingValue.destroy).toHaveBeenCalledWith({
        where: { reading_id: 'comp_read_1' },
        transaction: mockTransaction
      });
      expect(mockTask.update).toHaveBeenCalledWith({ sensor_status: 'received' }, { transaction: mockTransaction });
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('应该在失败时回滚事务', async () => {
      const mockTask = {
        task_id: 'task_1',
        plant_id: 'plant_1',
        recorded_at: new Date(),
        update: jest.fn()
      };

      const data = {
        plantId: 'plant_1',
        recordedAt: new Date(),
        deviceId: 'device_1',
        metrics: [{ metricCode: 'temperature', value: 25 }]
      };

      EnvironmentMetric.findAll.mockRejectedValue(new Error('Validation error'));

      await expect(coverCompensatedData(mockTask, data)).rejects.toThrow('Validation error');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });
});
