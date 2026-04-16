/**
 * AIController 单元测试
 * 注意：控制器现在使用异步模式，只负责提交任务，不等待 AI 完成
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

jest.mock('../../../src/services/asyncAiService', () => ({
  submitAsyncAiTask: jest.fn(),
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
const { Session, Message } = require('../../../src/models');
const asyncAiService = require('../../../src/services/asyncAiService');

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
    it('AI 分析任务提交成功（plant 类型会话）', async () => {
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

      Session.findOne.mockResolvedValue(mockSession);
      Message.create.mockResolvedValue({ message_id: 'MSG_AI', created_at: new Date() });

      await aiController.analyze(req, res);

      expect(Session.findOne).toHaveBeenCalledWith({
        where: { session_id: 'SESSION_1', user_id: 'TEST_USER_123' },
      });
      // 验证异步任务被提交
      expect(asyncAiService.submitAsyncAiTask).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'SESSION_1',
          userId: 'TEST_USER_123',
          content: '这植物怎么了？',
          imageUrl: 'https://example.com/plant.jpg',
          analysisType: 'deep',
          contextConfig: { environmentData: true, careRecords: true },
        })
      );
      // 验证立即返回成功响应
      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        data: expect.objectContaining({
          isAsync: true,
          message: 'AI 分析已提交，请稍后查看结果',
        }),
      });
    });

    it('AI 分析任务提交成功（consultation 类型会话）', async () => {
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

      Session.findOne.mockResolvedValue(mockSession);
      Message.create.mockResolvedValue({ message_id: 'MSG_AI', created_at: new Date() });

      await aiController.analyze(req, res);

      expect(asyncAiService.submitAsyncAiTask).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'SESSION_1',
          content: '你好',
          imageUrl: undefined,
          analysisType: 'normal',
        })
      );
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

    it('兼容 imageUrl 参数（旧格式）', async () => {
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

      Session.findOne.mockResolvedValue(mockSession);
      Message.create.mockResolvedValue({ message_id: 'MSG_AI', created_at: new Date() });

      await aiController.analyze(req, res);

      expect(asyncAiService.submitAsyncAiTask).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrl: 'https://example.com/old-format.jpg',
        })
      );
    });

    it('保存用户消息到数据库', async () => {
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
        context_config: {},
      };

      Session.findOne.mockResolvedValue(mockSession);
      Message.create.mockResolvedValue({ message_id: 'MSG_USER_123', created_at: new Date() });

      await aiController.analyze(req, res);

      expect(Message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: 'SESSION_1',
          role: 'user',
          content: '这植物怎么了？',
          content_type: 'mixed',
          image_urls: ['https://example.com/plant.jpg'],
        })
      );
    });

    it('纯文本消息保存', async () => {
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

      Session.findOne.mockResolvedValue(mockSession);
      Message.create.mockResolvedValue({ message_id: 'MSG_USER_123', created_at: new Date() });

      await aiController.analyze(req, res);

      expect(Message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content_type: 'text',
          image_urls: null,
        })
      );
    });

    it('处理异常返回 500', async () => {
      req.body = {
        sessionId: 'SESSION_1',
        userMessage: '测试',
      };

      Session.findOne.mockRejectedValue(new Error('数据库错误'));

      await aiController.analyze(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 500,
        message: expect.stringContaining('AI 分析提交失败'),
      });
    });
  });
});
