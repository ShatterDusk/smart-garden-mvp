/**
 * DiagnosisController 单元测试
 * 覆盖率目标：85%+
 */

// 在导入被测模块前设置 mock
jest.mock('../../../src/models', () => ({
  DiagnosisCard: {
    findAndCountAll: jest.fn(),
    findOne: jest.fn()
  },
  Plant: {
    findAll: jest.fn(),
    findOne: jest.fn()
  },
  Message: {
    findAll: jest.fn(),
    findOne: jest.fn()
  }
}))

const {
  getDiagnosisHistory,
  getDiagnosisDetail
} = require('../../../src/controllers/diagnosisController')
const { DiagnosisCard, Plant, Message } = require('../../../src/models')

describe('DiagnosisController', () => {
  let req, res

  beforeEach(() => {
    jest.clearAllMocks()

    req = {
      user: { userId: 123 },
      query: {},
      params: {}
    }

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    }
  })

  describe('getDiagnosisHistory', () => {
    it('应该成功获取诊断历史（带plantId过滤）', async () => {
      req.query = { plantId: '1', page: '1', pageSize: '10' }

      const mockDiagnoses = [
        {
          diagnosis_card_id: 1,
          plant_id: 1,
          message_id: 101,
          analysis_type: 'health',
          health_score: 85,
          status: 'healthy',
          get: jest.fn().mockReturnValue({
            diagnosis_card_id: 1,
            plant_id: 1,
            message_id: 101,
            analysis_type: 'health',
            health_score: 85,
            status: 'healthy'
          })
        }
      ]

      DiagnosisCard.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: mockDiagnoses
      })
      Plant.findAll.mockResolvedValue([
        { plant_id: 1, nickname: '测试植物', cover_image_url: 'url1' }
      ])
      Message.findAll.mockResolvedValue([
        { message_id: 101, content: '植物健康', created_at: '2024-01-01T00:00:00Z' }
      ])

      await getDiagnosisHistory(req, res)

      expect(DiagnosisCard.findAndCountAll).toHaveBeenCalledWith({
        where: { plant_id: '1' },
        order: [['created_at', 'DESC']],
        offset: 0,
        limit: 10
      })

      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        message: 'success',
        data: expect.objectContaining({
          list: expect.any(Array),
          pagination: expect.objectContaining({
            page: 1,
            pageSize: 10,
            total: 1,
            totalPages: 1
          })
        })
      })
    })

    it('应该成功获取诊断历史（不带plantId，获取用户所有植物）', async () => {
      req.query = { page: '1', pageSize: '20' }

      const mockUserPlants = [
        { plant_id: 1 },
        { plant_id: 2 }
      ]

      const mockDiagnoses = [
        {
          diagnosis_card_id: 1,
          plant_id: 1,
          message_id: 101,
          get: jest.fn().mockReturnValue({
            diagnosis_card_id: 1,
            plant_id: 1,
            message_id: 101
          })
        }
      ]

      Plant.findAll.mockResolvedValue(mockUserPlants)
      DiagnosisCard.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: mockDiagnoses
      })
      Plant.findAll.mockResolvedValue([
        { plant_id: 1, nickname: '植物1', cover_image_url: 'url1' }
      ])
      Message.findAll.mockResolvedValue([])

      await getDiagnosisHistory(req, res)

      expect(Plant.findAll).toHaveBeenCalledWith({
        where: { user_id: 123 },
        attributes: ['plant_id']
      })
    })

    it('应该使用默认分页参数', async () => {
      req.query = { plantId: '1' }

      DiagnosisCard.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: []
      })
      Plant.findAll.mockResolvedValue([])
      Message.findAll.mockResolvedValue([])

      await getDiagnosisHistory(req, res)

      expect(DiagnosisCard.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 0,
          limit: 20
        })
      )
    })

    it('应该正确处理空诊断历史', async () => {
      req.query = { plantId: '999' }

      DiagnosisCard.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: []
      })
      Plant.findAll.mockResolvedValue([])
      Message.findAll.mockResolvedValue([])

      await getDiagnosisHistory(req, res)

      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        message: 'success',
        data: {
          list: [],
          pagination: {
            page: 1,
            pageSize: 20,
            total: 0,
            totalPages: 0
          }
        }
      })
    })

    it('应该处理数据库查询错误', async () => {
      req.query = { plantId: '1' }

      const error = new Error('数据库错误')
      DiagnosisCard.findAndCountAll.mockRejectedValue(error)

      await getDiagnosisHistory(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        code: 500,
        message: '获取诊断历史失败',
        data: null
      })
    })

    it('应该正确计算总页数', async () => {
      req.query = { page: '1', pageSize: '5' }

      const mockDiagnoses = Array(5).fill(null).map((_, i) => ({
        diagnosis_card_id: i + 1,
        plant_id: 1,
        get: jest.fn().mockReturnValue({
          diagnosis_card_id: i + 1,
          plant_id: 1
        })
      }))

      DiagnosisCard.findAndCountAll.mockResolvedValue({
        count: 12,
        rows: mockDiagnoses
      })
      Plant.findAll.mockResolvedValue([])
      Message.findAll.mockResolvedValue([])

      await getDiagnosisHistory(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pagination: expect.objectContaining({
              total: 12,
              totalPages: 3
            })
          })
        })
      )
    })
  })

  describe('getDiagnosisDetail', () => {
    it('应该成功获取诊断详情', async () => {
      req.params = { diagnosisCardId: '1' }

      const mockDiagnosis = {
        diagnosis_card_id: 1,
        plant_id: 1,
        message_id: 101,
        analysis_type: 'health',
        health_score: 90,
        status: 'healthy',
        get: jest.fn().mockReturnValue({
          diagnosis_card_id: 1,
          plant_id: 1,
          message_id: 101,
          analysis_type: 'health',
          health_score: 90,
          status: 'healthy'
        })
      }

      const mockPlant = {
        plant_id: 1,
        nickname: '测试植物',
        species: '多肉',
        cover_image_url: 'http://example.com/image.jpg'
      }

      const mockMessage = {
        message_id: 101,
        content: '植物状态良好',
        image_urls: '[]',
        created_at: '2024-01-01T00:00:00Z'
      }

      DiagnosisCard.findOne.mockResolvedValue(mockDiagnosis)
      Plant.findOne.mockResolvedValue(mockPlant)
      Message.findOne.mockResolvedValue(mockMessage)

      await getDiagnosisDetail(req, res)

      expect(DiagnosisCard.findOne).toHaveBeenCalledWith({
        where: { diagnosis_card_id: '1' }
      })

      expect(Plant.findOne).toHaveBeenCalledWith({
        where: { plant_id: 1, user_id: 123 }
      })

      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        message: 'success',
        data: expect.objectContaining({
          diagnosisCardId: 1,
          plantId: 1,
          messageId: 101,
          analysisType: 'health',
          healthScore: 90,
          status: 'healthy',
          plant: expect.objectContaining({
            plantId: 1,
            nickname: '测试植物'
          }),
          message: expect.objectContaining({
            messageId: 101,
            content: '植物状态良好'
          })
        })
      })
    })

    it('应该返回404当诊断卡不存在', async () => {
      req.params = { diagnosisCardId: '999' }

      DiagnosisCard.findOne.mockResolvedValue(null)

      await getDiagnosisDetail(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        code: 404,
        message: '诊断卡不存在',
        data: null
      })
    })

    it('应该返回403当用户无权访问', async () => {
      req.params = { diagnosisCardId: '1' }

      const mockDiagnosis = {
        diagnosis_card_id: 1,
        plant_id: 1,
        get: jest.fn().mockReturnValue({
          diagnosis_card_id: 1,
          plant_id: 1
        })
      }

      DiagnosisCard.findOne.mockResolvedValue(mockDiagnosis)
      Plant.findOne.mockResolvedValue(null)

      await getDiagnosisDetail(req, res)

      // 注意：error() 函数默认使用 500 作为 HTTP 状态码，除非显式传递第4个参数
      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        code: 403,
        message: '无权限查看此诊断卡',
        data: null
      })
    })

    it('应该处理数据库查询错误', async () => {
      req.params = { diagnosisCardId: '1' }

      const error = new Error('数据库错误')
      DiagnosisCard.findOne.mockRejectedValue(error)

      await getDiagnosisDetail(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        code: 500,
        message: '获取诊断详情失败',
        data: null
      })
    })

    it('应该处理无关联消息的情况', async () => {
      req.params = { diagnosisCardId: '1' }

      const mockDiagnosis = {
        diagnosis_card_id: 1,
        plant_id: 1,
        message_id: null,
        get: jest.fn().mockReturnValue({
          diagnosis_card_id: 1,
          plant_id: 1,
          message_id: null
        })
      }

      const mockPlant = {
        plant_id: 1,
        nickname: '测试植物',
        species: '多肉',
        cover_image_url: null
      }

      DiagnosisCard.findOne.mockResolvedValue(mockDiagnosis)
      Plant.findOne.mockResolvedValue(mockPlant)

      await getDiagnosisDetail(req, res)

      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        message: 'success',
        data: expect.objectContaining({
          diagnosisCardId: 1,
          message: null
        })
      })
    })
  })
})
