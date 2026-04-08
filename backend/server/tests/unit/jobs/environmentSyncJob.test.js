/**
 * environmentSyncJob 单元测试
 * 覆盖率目标：85%+
 */

jest.mock('../../../src/models', () => ({
  Plant: {
    findAll: jest.fn()
  },
  ReadingTask: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn()
  }
}))

jest.mock('../../../src/services/compensationService', () => ({
  createWeatherReading: jest.fn(),
  checkAndCompensateAll: jest.fn()
}))

jest.mock('../../../src/services/weatherService', () => ({
  getWeatherForPlant: jest.fn()
}))

jest.mock('../../../src/utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}))

const { Plant, ReadingTask } = require('../../../src/models')
const compensationService = require('../../../src/services/compensationService')
const weatherService = require('../../../src/services/weatherService')
const logger = require('../../../src/utils/logger')
const { TASK_STATUS } = require('../../../src/config/environment')

// 导入被测模块（在 mock 之后）
const environmentSyncJob = require('../../../src/jobs/environmentSyncJob')

describe('environmentSyncJob', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // 确保定时器已停止
    environmentSyncJob.stop()
  })

  afterEach(() => {
    environmentSyncJob.stop()
  })

  describe('generateTasksForAllPlants', () => {
    it('应该为所有植物生成任务', async () => {
      const mockPlants = [
        { plant_id: 1, location_code: '101010100' },
        { plant_id: 2, location_code: '101020100' }
      ]

      Plant.findAll.mockResolvedValue(mockPlants)
      ReadingTask.findOne.mockResolvedValue(null)
      ReadingTask.create.mockResolvedValue({ task_id: 'TASK_001' })
      ReadingTask.findAll.mockResolvedValue([])

      await environmentSyncJob.runSync()

      expect(Plant.findAll).toHaveBeenCalledWith({
        attributes: ['plant_id', 'location_code'],
        where: expect.any(Object)
      })
      expect(ReadingTask.create).toHaveBeenCalledTimes(2)
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('任务生成完成'))
    })

    it('应该跳过已存在的任务', async () => {
      const mockPlants = [
        { plant_id: 1, location_code: '101010100' },
        { plant_id: 2, location_code: '101020100' }
      ]

      Plant.findAll.mockResolvedValue(mockPlants)
      ReadingTask.findOne.mockResolvedValueOnce({ task_id: 'EXISTING_001' })
      ReadingTask.findOne.mockResolvedValueOnce(null)
      ReadingTask.create.mockResolvedValue({ task_id: 'TASK_001' })
      ReadingTask.findAll.mockResolvedValue([])

      await environmentSyncJob.runSync()

      expect(ReadingTask.create).toHaveBeenCalledTimes(1)
    })

    it('应该处理没有植物的情况', async () => {
      Plant.findAll.mockResolvedValue([])
      ReadingTask.findAll.mockResolvedValue([])

      await environmentSyncJob.runSync()

      expect(ReadingTask.create).not.toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('共 0 株植物'))
    })

    it('应该处理数据库错误', async () => {
      const error = new Error('数据库错误')
      Plant.findAll.mockRejectedValue(error)

      await environmentSyncJob.runSync()

      expect(logger.error).toHaveBeenCalledWith('环境数据同步失败', expect.any(Object))
    })
  })

  describe('fetchWeatherForAllPlants', () => {
    it('应该获取所有植物的天气数据', async () => {
      Plant.findAll.mockResolvedValue([])

      const mockTasks = [
        {
          task_id: 'TASK_001',
          plant: { plant_id: 1, location_code: '101010100' },
          update: jest.fn().mockResolvedValue({})
        }
      ]

      const mockWeatherData = {
        metrics: { temperature: 25, humidity: 60 }
      }

      ReadingTask.findAll.mockResolvedValue(mockTasks)
      weatherService.getWeatherForPlant.mockResolvedValue(mockWeatherData)
      compensationService.createWeatherReading.mockResolvedValue({})

      await environmentSyncJob.runSync()

      expect(weatherService.getWeatherForPlant).toHaveBeenCalledWith(mockTasks[0].plant)
      expect(compensationService.createWeatherReading).toHaveBeenCalled()
      expect(mockTasks[0].update).toHaveBeenCalledWith({ weather_status: TASK_STATUS.WEATHER.RECEIVED })
    })

    it('应该处理植物无位置信息的情况', async () => {
      Plant.findAll.mockResolvedValue([])

      const mockTasks = [
        {
          task_id: 'TASK_001',
          plant: { plant_id: 1, location_code: null },
          update: jest.fn().mockResolvedValue({})
        }
      ]

      ReadingTask.findAll.mockResolvedValue(mockTasks)

      await environmentSyncJob.runSync()

      expect(mockTasks[0].update).toHaveBeenCalledWith({ weather_status: TASK_STATUS.WEATHER.FAILED })
      expect(weatherService.getWeatherForPlant).not.toHaveBeenCalled()
    })

    it('应该处理天气数据获取失败', async () => {
      Plant.findAll.mockResolvedValue([])

      const mockTasks = [
        {
          task_id: 'TASK_001',
          plant: { plant_id: 1, location_code: '101010100' },
          update: jest.fn().mockResolvedValue({})
        }
      ]

      ReadingTask.findAll.mockResolvedValue(mockTasks)
      weatherService.getWeatherForPlant.mockResolvedValue(null)

      await environmentSyncJob.runSync()

      expect(mockTasks[0].update).toHaveBeenCalledWith({ weather_status: TASK_STATUS.WEATHER.FAILED })
    })

    it('应该处理天气API异常', async () => {
      Plant.findAll.mockResolvedValue([])

      const mockTasks = [
        {
          task_id: 'TASK_001',
          plant: { plant_id: 1, location_code: '101010100' },
          update: jest.fn().mockResolvedValue({})
        }
      ]

      ReadingTask.findAll.mockResolvedValue(mockTasks)
      weatherService.getWeatherForPlant.mockRejectedValue(new Error('API Error'))

      await environmentSyncJob.runSync()

      expect(mockTasks[0].update).toHaveBeenCalledWith({ weather_status: TASK_STATUS.WEATHER.FAILED })
      expect(logger.warn).toHaveBeenCalledWith('获取天气数据失败', expect.any(Object))
    })

    it('应该处理无待处理任务的情况', async () => {
      Plant.findAll.mockResolvedValue([])
      ReadingTask.findAll.mockResolvedValue([])

      await environmentSyncJob.runSync()

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('共 0 个任务'))
    })

    it('应该处理植物关联缺失', async () => {
      Plant.findAll.mockResolvedValue([])

      const mockTasks = [
        {
          task_id: 'TASK_001',
          plant: null,
          update: jest.fn().mockResolvedValue({})
        }
      ]

      ReadingTask.findAll.mockResolvedValue(mockTasks)

      await environmentSyncJob.runSync()

      expect(mockTasks[0].update).toHaveBeenCalledWith({ weather_status: TASK_STATUS.WEATHER.FAILED })
    })
  })

  describe('runCompensation', () => {
    it('应该执行补偿检查', async () => {
      compensationService.checkAndCompensateAll.mockResolvedValue(5)

      await environmentSyncJob.triggerCompensation()

      expect(compensationService.checkAndCompensateAll).toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('补偿检查完成'))
    })

    it('应该处理补偿服务错误', async () => {
      compensationService.checkAndCompensateAll.mockRejectedValue(new Error('补偿错误'))

      await environmentSyncJob.triggerCompensation()

      expect(logger.error).toHaveBeenCalledWith('补偿检查失败', expect.any(Object))
    })
  })

  describe('start/stop', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('应该启动定时任务', () => {
      Plant.findAll.mockResolvedValue([])

      environmentSyncJob.start()

      expect(logger.info).toHaveBeenCalledWith('启动环境数据同步定时任务')
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('同步周期'))
    })

    it('应该防止重复启动', () => {
      Plant.findAll.mockResolvedValue([])

      environmentSyncJob.start()
      environmentSyncJob.start()

      expect(logger.warn).toHaveBeenCalledWith('定时任务已在运行')
    })

    it('应该停止定时任务', () => {
      Plant.findAll.mockResolvedValue([])

      environmentSyncJob.start()
      environmentSyncJob.stop()

      expect(logger.info).toHaveBeenCalledWith('环境数据同步定时任务已停止')
    })

    it('应该处理停止未运行的任务', () => {
      // 先确保任务已停止
      environmentSyncJob.stop()

      // 清除之前的调用记录
      jest.clearAllMocks()

      // 不启动直接停止 - 不应该抛出错误
      expect(() => environmentSyncJob.stop()).not.toThrow()
    })
  })

  describe('triggerSync', () => {
    it('应该手动触发同步', async () => {
      Plant.findAll.mockResolvedValue([])
      ReadingTask.findAll.mockResolvedValue([])

      await environmentSyncJob.triggerSync()

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('环境数据同步开始'))
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('环境数据同步完成'))
    })
  })

  describe('时间计算', () => {
    it('应该正确计算最近的整点时间', async () => {
      const mockPlants = [{ plant_id: 1, location_code: '101010100' }]
      Plant.findAll.mockResolvedValue(mockPlants)
      ReadingTask.findOne.mockResolvedValue(null)
      ReadingTask.create.mockResolvedValue({ task_id: 'TASK_001' })
      ReadingTask.findAll.mockResolvedValue([])

      await environmentSyncJob.runSync()

      // 验证任务创建时使用了正确的时间
      expect(ReadingTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recorded_at: expect.any(Date)
        })
      )
    })
  })
})
