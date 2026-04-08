/**
 * AIController 单元测试
 */

// Mock 依赖
jest.mock('../../../src/models', () => ({
  Session: {
    findOne: jest.fn(),
  },
  Message: {
    create: jest.fn(),
  },
  DiagnosisCard: {
    create: jest.fn(),
    findAll: jest.fn(),
  },
  Plant: {
    findOne: jest.fn(),
  },
  CareRecord: {
    findAll: jest.fn(),
  },
  EnvironmentReading: {
    findOne: jest.fn(),
  },
  EnvironmentReadingValue: {
    findAll: jest.fn(),
  },
  EnvironmentMetric: {
    findAll: jest.fn(),
  },
}));

jest.mock('../../../src/services/aiService', () => ({
  analyze: jest.fn(),
}));

jest.mock('../../../src/utils/response', () => ({
  success: jest.fn((res, data) => res.json({ code: 0, data })),
  error: jest.fn((res, message, code, statusCode) => {
    res.status(statusCode || code || 500).json({ code: code || 500, message });
  }),
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const aiController = require('../../../src/controllers/aiController');
const { Session, Message, DiagnosisCard, Plant, CareRecord, EnvironmentReading, EnvironmentReadingValue, EnvironmentMetric } = require('../../../src/models');
const aiService = require('../../../src/services/aiService');

describe('AIController', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      body: {},
      user: { userId: 'TEST_USER_123' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('analyze', () => {
    it('AI 分析成功（带诊断卡）', async () => {
      req.body = {
        sessionId: 'SESSION_1',
        userMessage: '这植物怎么了？',
        imageUrls: ['https://example.com/plant.jpg'],
      };

      const mockSession = {
        session_id: 'SESSION_1',
        user_id: 'TEST_USER_123',
        type: 'plant',
        plant_id: 'PLANT_1',
        context_config: { environmentData: true, careRecords: true },
      };

      const mockPlant = {
        plant_id: 'PLANT_1',
        nickname: '小绿',
        species: '绿萝',
        plant_category: 'foliage',
        location_name: '客厅',
        location_code: '110101',
      };

      const mockAiResult = {
        content: '看起来有些缺水',
        diagnosisCard: {
          species: '绿萝',
          healthScore: 70,
          status: 'warning',
          issues: ['缺水'],
          suggestions: ['浇水'],
          confidence: 0.8,
        },
      };

      Session.findOne.mockResolvedValue(mockSession);
      Plant.findOne.mockResolvedValue(mockPlant);
      EnvironmentReading.findOne.mockResolvedValue(null);
      CareRecord.findAll.mockResolvedValue([]);
      aiService.analyze.mockResolvedValue(mockAiResult);
      Message.create.mockResolvedValue({ message_id: 'MSG_AI', created_at: new Date() });
      DiagnosisCard.create.mockResolvedValue({});

      await aiController.analyze(req, res);

      expect(Session.findOne).toHaveBeenCalledWith({
        where: { session_id: 'SESSION_1', user_id: 'TEST_USER_123' },
      });
      expect(aiService.analyze).toHaveBeenCalledWith({
        content: '这植物怎么了？',
        imageUrl: 'https://example.com/plant.jpg',
        analysisType: 'deep',
        context: expect.objectContaining({
          plantInfo: expect.any(Object),
        }),
      });
      expect(Message.create).toHaveBeenCalledTimes(2);
      expect(DiagnosisCard.create).toHaveBeenCalled();
    });

    it('AI 分析成功（纯对话，无诊断卡）', async () => {
      req.body = {
        sessionId: 'SESSION_1',
        userMessage: '你好',
      };

      const mockSession = {
        session_id: 'SESSION_1',
        user_id: 'TEST_USER_123',
        type: 'consultation',
        plant_id: null,
        context_config: {},
      };

      const mockAiResult = {
        content: '你好！有什么可以帮助你的？',
        diagnosisCard: null,
      };

      Session.findOne.mockResolvedValue(mockSession);
      aiService.analyze.mockResolvedValue(mockAiResult);
      Message.create.mockResolvedValue({ message_id: 'MSG_AI', created_at: new Date() });

      await aiController.analyze(req, res);

      expect(aiService.analyze).toHaveBeenCalledWith({
        content: '你好',
        imageUrl: undefined,
        analysisType: 'normal',
        context: {},
      });
      expect(DiagnosisCard.create).not.toHaveBeenCalled();
    });

    it('会话不存在返回 404', async () => {
      req.body = {
        sessionId: 'NOT_EXIST',
        userMessage: '测试',
      };

      Session.findOne.mockResolvedValue(null);

      await aiController.analyze(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        code: 404,
        message: '会话不存在',
      });
    });

    it('AI 服务失败返回 500', async () => {
      req.body = {
        sessionId: 'SESSION_1',
        userMessage: '测试',
      };

      const mockSession = {
        session_id: 'SESSION_1',
        user_id: 'TEST_USER_123',
        type: 'consultation',
        plant_id: null,
        context_config: {},
      };

      Session.findOne.mockResolvedValue(mockSession);
      aiService.analyze.mockRejectedValue(new Error('AI 服务超时'));

      await aiController.analyze(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 500,
        message: expect.stringContaining('AI 分析失败'),
      });
    });

    it('兼容 imageUrl 参数', async () => {
      req.body = {
        sessionId: 'SESSION_1',
        content: '看看这植物',
        imageUrl: 'https://example.com/old-format.jpg',
      };

      const mockSession = {
        session_id: 'SESSION_1',
        user_id: 'TEST_USER_123',
        type: 'plant',
        plant_id: 'PLANT_1',
        context_config: {},
      };

      const mockPlant = {
        plant_id: 'PLANT_1',
        nickname: '小绿',
        species: '绿萝',
      };

      Session.findOne.mockResolvedValue(mockSession);
      Plant.findOne.mockResolvedValue(mockPlant);
      aiService.analyze.mockResolvedValue({ content: '分析结果', diagnosisCard: null });
      Message.create.mockResolvedValue({ message_id: 'MSG_AI', created_at: new Date() });

      await aiController.analyze(req, res);

      expect(aiService.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrl: 'https://example.com/old-format.jpg',
        })
      );
    });

    it('准备上下文包含环境数据', async () => {
      req.body = {
        sessionId: 'SESSION_1',
        userMessage: '测试',
      };

      const mockSession = {
        session_id: 'SESSION_1',
        user_id: 'TEST_USER_123',
        type: 'plant',
        plant_id: 'PLANT_1',
        context_config: { environmentData: true },
      };

      const mockPlant = {
        plant_id: 'PLANT_1',
        nickname: '小绿',
        species: '绿萝',
      };

      const mockReading = {
        reading_id: 'READING_1',
        recorded_at: new Date(),
      };

      const mockReadingValues = [
        { metric_code: 'TEMP', value: 25 },
        { metric_code: 'HUMIDITY', value: 60 },
      ];

      const mockMetrics = [
        { metric_code: 'TEMP', name: '温度', unit: '°C' },
        { metric_code: 'HUMIDITY', name: '湿度', unit: '%' },
      ];

      Session.findOne.mockResolvedValue(mockSession);
      Plant.findOne.mockResolvedValue(mockPlant);
      EnvironmentReading.findOne.mockResolvedValue(mockReading);
      EnvironmentReadingValue.findAll.mockResolvedValue(mockReadingValues);
      EnvironmentMetric.findAll.mockResolvedValue(mockMetrics);
      aiService.analyze.mockResolvedValue({ content: '分析结果', diagnosisCard: null });
      Message.create.mockResolvedValue({ message_id: 'MSG_AI', created_at: new Date() });

      await aiController.analyze(req, res);

      expect(aiService.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            environmentData: expect.arrayContaining([
              expect.objectContaining({ metricName: '温度', value: 25 }),
              expect.objectContaining({ metricName: '湿度', value: 60 }),
            ]),
          }),
        })
      );
    });

    it('准备上下文包含养护记录', async () => {
      req.body = {
        sessionId: 'SESSION_1',
        userMessage: '测试',
      };

      const mockSession = {
        session_id: 'SESSION_1',
        user_id: 'TEST_USER_123',
        type: 'plant',
        plant_id: 'PLANT_1',
        context_config: { careRecords: true },
      };

      const mockPlant = {
        plant_id: 'PLANT_1',
        nickname: '小绿',
        species: '绿萝',
      };

      const mockCareRecords = [
        { action_type: 'water', description: '浇水', performed_at: new Date() },
        { action_type: 'fertilize', description: '施肥', performed_at: new Date() },
      ];

      Session.findOne.mockResolvedValue(mockSession);
      Plant.findOne.mockResolvedValue(mockPlant);
      CareRecord.findAll.mockResolvedValue(mockCareRecords);
      aiService.analyze.mockResolvedValue({ content: '分析结果', diagnosisCard: null });
      Message.create.mockResolvedValue({ message_id: 'MSG_AI', created_at: new Date() });

      await aiController.analyze(req, res);

      expect(aiService.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            careRecords: expect.arrayContaining([
              expect.objectContaining({ actionType: 'water' }),
            ]),
          }),
        })
      );
    });

    it('准备上下文包含历史诊断', async () => {
      req.body = {
        sessionId: 'SESSION_1',
        userMessage: '测试',
      };

      const mockSession = {
        session_id: 'SESSION_1',
        user_id: 'TEST_USER_123',
        type: 'plant',
        plant_id: 'PLANT_1',
        context_config: { historyDiagnosis: true },
      };

      const mockPlant = {
        plant_id: 'PLANT_1',
        nickname: '小绿',
        species: '绿萝',
      };

      const mockHistoryDiagnosis = [
        { health_score: 85, status: 'healthy', issues: [], created_at: new Date() },
      ];

      Session.findOne.mockResolvedValue(mockSession);
      Plant.findOne.mockResolvedValue(mockPlant);
      DiagnosisCard.findAll.mockResolvedValue(mockHistoryDiagnosis);
      aiService.analyze.mockResolvedValue({ content: '分析结果', diagnosisCard: null });
      Message.create.mockResolvedValue({ message_id: 'MSG_AI', created_at: new Date() });

      await aiController.analyze(req, res);

      expect(aiService.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            historyDiagnosis: expect.any(Array),
          }),
        })
      );
    });

    it('无植物ID时上下文为空', async () => {
      req.body = {
        sessionId: 'SESSION_1',
        userMessage: '测试',
      };

      const mockSession = {
        session_id: 'SESSION_1',
        user_id: 'TEST_USER_123',
        type: 'consultation',
        plant_id: null,
        context_config: { environmentData: true, careRecords: true },
      };

      Session.findOne.mockResolvedValue(mockSession);
      aiService.analyze.mockResolvedValue({ content: '分析结果', diagnosisCard: null });
      Message.create.mockResolvedValue({ message_id: 'MSG_AI', created_at: new Date() });

      await aiController.analyze(req, res);

      expect(aiService.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          context: {},
        })
      );
    });
  });
});
