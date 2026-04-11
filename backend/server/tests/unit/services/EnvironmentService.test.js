/**
 * EnvironmentService 单元测试
 * 覆盖率目标：85%+
 */

jest.mock('../../../src/models', () => ({
  EnvironmentReading: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn()
  },
  EnvironmentReadingValue: {
    findAll: jest.fn()
  },
  EnvironmentMetric: {
    findAll: jest.fn(),
    findOne: jest.fn()
  },
  Plant: {
    findOne: jest.fn()
  },
  ReadingTask: {
    findOne: jest.fn(),
    create: jest.fn()
  }
}))

jest.mock('../../../src/services/compensationService', () => ({
  coverCompensatedData: jest.fn(),
  createSensorReading: jest.fn()
}))

jest.mock('../../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}))

const EnvironmentService = require('../../../src/services/EnvironmentService')
const {
  EnvironmentReading,
  EnvironmentReadingValue,
  EnvironmentMetric,
  Plant,
  ReadingTask
} = require('../../../src/models')
const compensationService = require('../../../src/services/compensationService')
const { TASK_STATUS, DATA_SOURCE } = require('../../../src/config/environment')

describe('EnvironmentService', () => {
  let service

  beforeEach(() => {
    jest.clearAllMocks()
    service = new EnvironmentService()
  })

  describe('generateReadingId', () => {
    it('应该生成正确的readingId格式', () => {
      const readingId = service.generateReadingId()
      expect(readingId).toMatch(/^READ_[A-Fa-f0-9]{16}$/)
    })

    it('应该生成唯一的readingId', () => {
      const id1 = service.generateReadingId()
      const id2 = service.generateReadingId()
      expect(id1).not.toBe(id2)
    })
  })

  describe('generateTaskId', () => {
    it('应该生成正确的taskId格式', () => {
      const taskId = service.generateTaskId()
      expect(taskId).toMatch(/^TASK_[A-Fa-f0-9]{16}$/)
    })
  })

  describe('generateValueId', () => {
    it('应该生成正确的valueId格式', () => {
      const valueId = service.generateValueId()
      expect(valueId).toMatch(/^VAL_[A-Fa-f0-9]{16}$/)
    })
  })

  describe('getPlantById', () => {
    it('应该成功获取植物', async () => {
      const mockPlant = { plant_id: 1, name: '测试植物', user_id: 123 }
      Plant.findOne.mockResolvedValue(mockPlant)

      const result = await service.getPlantById(1, 123)

      expect(Plant.findOne).toHaveBeenCalledWith({
        where: { plant_id: 1, user_id: 123 }
      })
      expect(result).toEqual(mockPlant)
    })

    it('应该返回null当植物不存在', async () => {
      Plant.findOne.mockResolvedValue(null)

      const result = await service.getPlantById(999, 123)

      expect(result).toBeNull()
    })

    it('应该处理数据库错误', async () => {
      const error = new Error('数据库错误')
      Plant.findOne.mockRejectedValue(error)

      await expect(service.getPlantById(1, 123)).rejects.toThrow('数据库错误')
    })
  })

  describe('processDeviceEnvironmentData', () => {
    const mockData = {
      deviceId: 'device_001',
      recordedAt: '2024-01-01T12:00:00Z',
      metrics: { temperature: 25, humidity: 60 },
      isSupplement: false
    }

    it('应该创建新的传感器读数（当任务不存在时）', async () => {
      ReadingTask.findOne.mockResolvedValue(null)
      ReadingTask.create.mockResolvedValue({
        task_id: 'TASK_001',
        plant_id: 1,
        sensor_status: TASK_STATUS.SENSOR.PENDING
      })
      compensationService.createSensorReading.mockResolvedValue({
        reading_id: 'READ_001'
      })

      const result = await service.processDeviceEnvironmentData(1, mockData)

      expect(ReadingTask.create).toHaveBeenCalled()
      expect(compensationService.createSensorReading).toHaveBeenCalled()
      expect(result).toHaveProperty('readingId', 'READ_001')
      expect(result).toHaveProperty('isSupplement', false)
    })

    it('应该返回数据已存在（当已有真实传感器数据时）', async () => {
      ReadingTask.findOne.mockResolvedValue({
        task_id: 'TASK_001',
        sensor_status: TASK_STATUS.SENSOR.RECEIVED
      })

      const result = await service.processDeviceEnvironmentData(1, mockData)

      expect(result).toHaveProperty('message', '数据已存在')
      expect(result).toHaveProperty('isSupplement', false)
    })

    it('应该拒绝补传当已有真实数据', async () => {
      ReadingTask.findOne.mockResolvedValue({
        task_id: 'TASK_001',
        sensor_status: TASK_STATUS.SENSOR.RECEIVED
      })

      const supplementData = { ...mockData, isSupplement: true }
      const result = await service.processDeviceEnvironmentData(1, supplementData)

      expect(result).toHaveProperty('error', '该时刻已有真实传感器数据，拒绝补传')
      expect(result).toHaveProperty('code', 409)
    })

    it('应该覆盖补偿数据（当状态为COMPENSATED时）', async () => {
      ReadingTask.findOne.mockResolvedValue({
        task_id: 'TASK_001',
        sensor_status: TASK_STATUS.SENSOR.COMPENSATED
      })
      compensationService.coverCompensatedData.mockResolvedValue({
        reading_id: 'READ_002'
      })

      const result = await service.processDeviceEnvironmentData(1, mockData)

      expect(compensationService.coverCompensatedData).toHaveBeenCalled()
      expect(result).toHaveProperty('readingId', 'READ_002')
      expect(result).toHaveProperty('isSupplement', true)
    })

    it('应该处理FAILED状态', async () => {
      ReadingTask.findOne.mockResolvedValue({
        task_id: 'TASK_001',
        sensor_status: TASK_STATUS.SENSOR.FAILED
      })
      compensationService.createSensorReading.mockResolvedValue({
        reading_id: 'READ_003'
      })

      const result = await service.processDeviceEnvironmentData(1, mockData)

      expect(compensationService.createSensorReading).toHaveBeenCalled()
      expect(result).toHaveProperty('readingId', 'READ_003')
    })

    it('应该处理数据库错误', async () => {
      const error = new Error('数据库错误')
      ReadingTask.findOne.mockRejectedValue(error)

      await expect(service.processDeviceEnvironmentData(1, mockData)).rejects.toThrow('数据库错误')
    })
  })

  describe('getCurrentData', () => {
    it('应该获取当前环境数据', async () => {
      const mockSensorReading = {
        reading_id: 'READ_001',
        is_stale: false,
        values: [
          { metric_code: 'temperature', value: '25' },
          { metric_code: 'humidity', value: '60' }
        ]
      }

      const mockWeatherReading = {
        reading_id: 'READ_002',
        is_stale: false,
        values: [
          { metric_code: 'temperature', value: '24' }
        ]
      }

      const mockTask = {
        sensor_status: TASK_STATUS.SENSOR.RECEIVED,
        weather_status: TASK_STATUS.WEATHER.RECEIVED
      }

      const mockMetrics = [
        { metric_code: 'temperature', name: '温度', unit: '°C', min_value: 15, max_value: 30 },
        { metric_code: 'humidity', name: '湿度', unit: '%', min_value: 40, max_value: 80 }
      ]

      EnvironmentReading.findOne.mockResolvedValueOnce(mockSensorReading)
        .mockResolvedValueOnce(mockWeatherReading)
      ReadingTask.findOne.mockResolvedValue(mockTask)
      EnvironmentMetric.findAll.mockResolvedValue(mockMetrics)

      const result = await service.getCurrentData(1)

      expect(result).toHaveProperty('plantId', 1)
      expect(result).toHaveProperty('deviceMetrics')
      expect(result).toHaveProperty('weatherMetrics')
      expect(result).toHaveProperty('taskStatus')
      expect(result.deviceMetrics).toHaveLength(2)
      expect(result.weatherMetrics).toHaveLength(1)
    })

    it('应该处理无数据的情况', async () => {
      EnvironmentReading.findOne.mockResolvedValue(null)
      ReadingTask.findOne.mockResolvedValue(null)
      EnvironmentMetric.findAll.mockResolvedValue([])

      const result = await service.getCurrentData(1)

      expect(result.deviceMetrics).toEqual([])
      expect(result.weatherMetrics).toEqual([])
      expect(result.taskStatus).toBeNull()
    })

    it('应该处理警告状态（值超出范围）', async () => {
      const mockReading = {
        reading_id: 'READ_001',
        is_stale: false,
        values: [
          { metric_code: 'temperature', value: '35' }
        ]
      }

      const mockMetrics = [
        { metric_code: 'temperature', name: '温度', unit: '°C', min_value: 15, max_value: 30 }
      ]

      EnvironmentReading.findOne.mockResolvedValueOnce(mockReading)
        .mockResolvedValueOnce(null)
      ReadingTask.findOne.mockResolvedValue(null)
      EnvironmentMetric.findAll.mockResolvedValue(mockMetrics)

      const result = await service.getCurrentData(1)

      expect(result.deviceMetrics[0]).toHaveProperty('status', 'warning')
    })

    it('应该处理stale数据', async () => {
      const mockReading = {
        reading_id: 'READ_001',
        is_stale: true,
        values: [{ metric_code: 'temperature', value: '25' }]
      }

      EnvironmentReading.findOne.mockResolvedValueOnce(mockReading)
        .mockResolvedValueOnce(null)
      ReadingTask.findOne.mockResolvedValue(null)
      EnvironmentMetric.findAll.mockResolvedValue([
        { metric_code: 'temperature', name: '温度', unit: '°C' }
      ])

      const result = await service.getCurrentData(1)

      expect(result.deviceMetrics[0]).toHaveProperty('isStale', true)
    })

    it('应该处理指定时间的数据', async () => {
      const recordedAt = '2024-01-01T10:00:00Z'

      EnvironmentReading.findOne.mockResolvedValue(null)
      ReadingTask.findOne.mockResolvedValue(null)
      EnvironmentMetric.findAll.mockResolvedValue([])

      await service.getCurrentData(1, recordedAt)

      expect(EnvironmentReading.findOne).toHaveBeenCalled()
    })

    it('应该处理数据库错误', async () => {
      const error = new Error('数据库错误')
      EnvironmentReading.findOne.mockRejectedValue(error)

      await expect(service.getCurrentData(1)).rejects.toThrow('数据库错误')
    })
  })

  describe('getHistoryData', () => {
    it('应该获取7天历史数据（默认）', async () => {
      const mockReadings = [
        { reading_id: 'READ_001', recorded_at: new Date(), is_stale: false },
        { reading_id: 'READ_002', recorded_at: new Date(), is_stale: false }
      ]

      const mockValues = [
        { reading_id: 'READ_001', value: '25' },
        { reading_id: 'READ_002', value: '26' }
      ]

      const mockMetric = { metric_code: 'temperature', name: '温度', unit: '°C' }

      EnvironmentReading.findAll.mockResolvedValue(mockReadings)
      EnvironmentReadingValue.findAll.mockResolvedValue(mockValues)
      EnvironmentMetric.findOne.mockResolvedValue(mockMetric)

      const result = await service.getHistoryData(1, { metricCode: 'temperature' })

      expect(result).toHaveProperty('list')
      expect(result).toHaveProperty('metricCode', 'temperature')
      expect(result).toHaveProperty('metricName', '温度')
      expect(result).toHaveProperty('timeRange', '7d')
      expect(result.list).toHaveLength(2)
    })

    it('应该支持24小时时间范围', async () => {
      EnvironmentReading.findAll.mockResolvedValue([])

      await service.getHistoryData(1, { metricCode: 'temperature', timeRange: '24h' })

      expect(EnvironmentReading.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recorded_at: expect.objectContaining({
              [Symbol.for('gte')]: expect.any(Date),
              [Symbol.for('lte')]: expect.any(Date)
            })
          })
        })
      )
    })

    it('应该支持30天时间范围', async () => {
      EnvironmentReading.findAll.mockResolvedValue([])

      await service.getHistoryData(1, { metricCode: 'temperature', timeRange: '30d' })

      expect(EnvironmentReading.findAll).toHaveBeenCalled()
    })

    it('应该支持指定数据源', async () => {
      EnvironmentReading.findAll.mockResolvedValue([])

      await service.getHistoryData(1, {
        metricCode: 'temperature',
        timeRange: '7d',
        dataSource: DATA_SOURCE.SENSOR
      })

      expect(EnvironmentReading.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            data_source: DATA_SOURCE.SENSOR
          })
        })
      )
    })

    it('应该返回空列表当无数据时', async () => {
      EnvironmentReading.findAll.mockResolvedValue([])
      EnvironmentMetric.findOne.mockResolvedValue({
        metric_code: 'temperature',
        name: '温度',
        unit: '℃'
      })

      const result = await service.getHistoryData(1, { metricCode: 'temperature' })

      expect(result).toEqual({
        list: [],
        metricCode: 'temperature',
        metricName: '温度',
        unit: '℃',
        timeRange: '7d'
      })
    })

    it('应该处理未知指标代码', async () => {
      EnvironmentReading.findAll.mockResolvedValue([])
      EnvironmentMetric.findOne.mockResolvedValue(null)

      const result = await service.getHistoryData(1, { metricCode: 'unknown_metric' })

      // 当指标不存在时，返回空列表并使用指标代码作为名称
      expect(result).toEqual({
        list: [],
        metricCode: 'unknown_metric',
        metricName: 'unknown_metric',
        unit: '',
        timeRange: '7d',
        message: '不支持的指标类型: unknown_metric'
      })
    })

    it('应该处理数据库错误', async () => {
      const error = new Error('数据库错误')
      EnvironmentMetric.findOne.mockRejectedValue(error)

      await expect(service.getHistoryData(1, { metricCode: 'temperature' })).rejects.toThrow('数据库错误')
    })
  })
})
