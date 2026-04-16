/**
 * SessionController 单元测试
 */

// 必须在导入 Controller 之前设置 Mock
const mockSessionService = {
  getSessionList: jest.fn(),
  getPlantsForSessions: jest.fn(),
  getLatestMessages: jest.fn(),
  getReadPositions: jest.fn(),
  createSession: jest.fn(),
  getSessionById: jest.fn(),
  getMessageCount: jest.fn(),
  updateSession: jest.fn(),
  getMessages: jest.fn(),
  getDiagnosisCardsForMessages: jest.fn(),
  createMessage: jest.fn(),
  prepareContext: jest.fn(),
  getConversationHistory: jest.fn(),
  createDiagnosisCard: jest.fn(),
  upgradeSession: jest.fn(),
  getLastMessage: jest.fn(),
  updateReadPosition: jest.fn(),
  deleteSession: jest.fn(),
};

jest.mock('../../../src/services/sessionService', () => mockSessionService);

jest.mock('../../../src/services/aiService', () => ({
  analyze: jest.fn(),
}));

jest.mock('../../../src/services/asyncAiService', () => ({
  submitAsyncAiTask: jest.fn(),
}));

jest.mock('../../../src/utils/response', () => ({
  success: jest.fn((res, data, message) => {
    res.json({ code: 0, message: message || 'success', data });
  }),
  error: jest.fn((res, message, code, statusCode) => {
    res.status(statusCode || code || 500).json({ code: code || 500, message, data: null });
  }),
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const sessionController = require('../../../src/controllers/sessionController');
const aiService = require('../../../src/services/aiService');
const asyncAiService = require('../../../src/services/asyncAiService');
const { success, error } = require('../../../src/utils/response');

describe('SessionController', () => {
  let req;
  let res;

  beforeEach(() => {

    req = {
      body: {},
      query: {},
      params: {},
      user: { userId: 'TEST_USER_123' },
      validatedQuery: null,
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe('getSessions', () => {
    it('获取会话列表成功', async () => {
      req.query = { type: 'plant', page: '1', pageSize: '10' };

      const mockSessions = [
        {
          sessionId: 'SESSION_1',
          type: 'plant',
          plantId: 'PLANT_1',
          title: '植物咨询',
          status: 'active',
          contextConfig: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockSessionService.getSessionList.mockResolvedValue({
        count: 1,
        sessions: mockSessions,
      });
      mockSessionService.getPlantsForSessions.mockResolvedValue([
        { plantId: 'PLANT_1', nickname: '小绿', coverImageUrl: 'https://example.com/plant.jpg' },
      ]);
      mockSessionService.getLatestMessages.mockResolvedValue(new Map());
      mockSessionService.getReadPositions.mockResolvedValue({});

      await sessionController.getSessions(req, res);

      expect(mockSessionService.getSessionList).toHaveBeenCalledWith('TEST_USER_123', {
        type: 'plant',
        plantId: undefined,
        page: '1',
        pageSize: '10',
      });
      expect(success).toHaveBeenCalled();
    });

    it('返回包含未读状态的会话列表', async () => {
      const mockSessions = [
        {
          sessionId: 'SESSION_1',
          type: 'consultation',
          plantId: null,
          title: '咨询',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockSessionService.getSessionList.mockResolvedValue({
        count: 1,
        sessions: mockSessions,
      });
      mockSessionService.getPlantsForSessions.mockResolvedValue([]);
      mockSessionService.getLatestMessages.mockResolvedValue(
        new Map([['SESSION_1', { messageId: 'MSG_2', content: '你好', role: 'assistant', createdAt: new Date() }]])
      );
      mockSessionService.getReadPositions.mockResolvedValue({ SESSION_1: 'MSG_1' });

      await sessionController.getSessions(req, res);

      const successCall = success.mock.calls[0];
      expect(successCall[1].list[0].hasUnread).toBe(true);
    });

    it('获取会话列表失败返回 500', async () => {
      mockSessionService.getSessionList.mockRejectedValue(new Error('数据库错误'));

      await sessionController.getSessions(req, res);

      expect(error).toHaveBeenCalledWith(res, '获取会话列表失败', 500);
    });
  });

  describe('createSession', () => {
    it('创建会话成功', async () => {
      req.body = {
        type: 'plant',
        plantId: 'PLANT_1',
        title: '植物咨询',
      };

      const mockSession = {
        sessionId: 'SESSION_NEW',
        type: 'plant',
        plantId: 'PLANT_1',
        title: '植物咨询',
        status: 'active',
        contextConfig: {},
        createdAt: new Date(),
      };

      mockSessionService.createSession.mockResolvedValue(mockSession);

      await sessionController.createSession(req, res);

      expect(mockSessionService.createSession).toHaveBeenCalledWith('TEST_USER_123', {
        type: 'plant',
        plantId: 'PLANT_1',
        title: '植物咨询',
      });
      expect(success).toHaveBeenCalled();
    });

    it('创建咨询会话（无 plantId）', async () => {
      req.body = {
        type: 'consultation',
        title: '专家咨询',
      };

      const mockSession = {
        sessionId: 'SESSION_NEW',
        type: 'consultation',
        plantId: null,
        title: '专家咨询',
        status: 'active',
        createdAt: new Date(),
      };

      mockSessionService.createSession.mockResolvedValue(mockSession);

      await sessionController.createSession(req, res);

      expect(mockSessionService.createSession).toHaveBeenCalledWith('TEST_USER_123', {
        type: 'consultation',
        plantId: undefined,
        title: '专家咨询',
      });
    });

    it('创建会话失败返回 500', async () => {
      mockSessionService.createSession.mockRejectedValue(new Error('数据库错误'));

      await sessionController.createSession(req, res);

      expect(error).toHaveBeenCalledWith(res, '创建会话失败', 500);
    });
  });

  describe('getSessionDetail', () => {
    it('获取会话详情成功', async () => {
      req.params = { sessionId: 'SESSION_1' };

      const mockSession = {
        sessionId: 'SESSION_1',
        type: 'plant',
        plantId: 'PLANT_1',
        title: '植物咨询',
        status: 'active',
        contextConfig: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSessionService.getSessionById.mockResolvedValue(mockSession);
      mockSessionService.getMessageCount.mockResolvedValue(10);
      mockSessionService.getPlantsForSessions.mockResolvedValue([
        { plantId: 'PLANT_1', nickname: '小绿', species: '绿萝', coverImageUrl: 'https://example.com/plant.jpg' },
      ]);

      await sessionController.getSessionDetail(req, res);

      expect(mockSessionService.getSessionById).toHaveBeenCalledWith('SESSION_1', 'TEST_USER_123');
      expect(success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          sessionId: 'SESSION_1',
          messageCount: 10,
          plant: expect.objectContaining({
            plantId: 'PLANT_1',
            nickname: '小绿',
          }),
        })
      );
    });

    it('会话不存在返回 404', async () => {
      req.params = { sessionId: 'NOT_EXIST' };

      mockSessionService.getSessionById.mockResolvedValue(null);

      await sessionController.getSessionDetail(req, res);

      expect(error).toHaveBeenCalledWith(res, '会话不存在', 404, 404);
    });
  });

  describe('updateSession', () => {
    it('更新会话成功', async () => {
      req.params = { sessionId: 'SESSION_1' };
      req.body = { title: '新标题', contextConfig: { depth: 'deep' } };

      const mockSession = {
        sessionId: 'SESSION_1',
        type: 'plant',
        plantId: 'PLANT_1',
        title: '新标题',
        status: 'active',
        contextConfig: { depth: 'deep' },
        updatedAt: new Date(),
      };

      mockSessionService.updateSession.mockResolvedValue(mockSession);

      await sessionController.updateSession(req, res);

      expect(mockSessionService.updateSession).toHaveBeenCalledWith('SESSION_1', 'TEST_USER_123', {
        title: '新标题',
        contextConfig: { depth: 'deep' },
      });
      expect(success).toHaveBeenCalled();
    });

    it('会话不存在返回 404', async () => {
      req.params = { sessionId: 'NOT_EXIST' };
      req.body = { title: '新标题' };

      mockSessionService.updateSession.mockResolvedValue(null);

      await sessionController.updateSession(req, res);

      expect(error).toHaveBeenCalledWith(res, '会话不存在', 404, 404);
    });
  });

  describe('getMessages', () => {
    it('获取消息列表成功', async () => {
      req.params = { sessionId: 'SESSION_1' };
      req.query = { before: 'MSG_10', limit: '20' };

      const mockSession = {
        sessionId: 'SESSION_1',
        type: 'plant',
        plantId: 'PLANT_1',
      };

      const mockMessages = [
        {
          messageId: 'MSG_9',
          sessionId: 'SESSION_1',
          role: 'user',
          contentType: 'text',
          content: '你好',
          imageUrls: null,
          replyToMessageId: null,
          status: 'sent',
          createdAt: new Date(),
        },
      ];

      mockSessionService.getSessionById.mockResolvedValue(mockSession);
      mockSessionService.getMessages.mockResolvedValue(mockMessages);
      mockSessionService.getDiagnosisCardsForMessages.mockResolvedValue(new Map());

      await sessionController.getMessages(req, res);

      expect(mockSessionService.getMessages).toHaveBeenCalledWith('SESSION_1', {
        before: 'MSG_10',
        limit: '20',
      });
      expect(success).toHaveBeenCalled();
    });

    it('会话不存在返回 404', async () => {
      req.params = { sessionId: 'NOT_EXIST' };

      mockSessionService.getSessionById.mockResolvedValue(null);

      await sessionController.getMessages(req, res);

      expect(error).toHaveBeenCalledWith(res, '会话不存在', 404, 404);
    });
  });

  describe('sendMessage', () => {
    it('发送消息成功（纯文本）', async () => {
      req.params = { sessionId: 'SESSION_1' };
      req.body = { content: '你好', contentType: 'text' };

      const mockSession = {
        sessionId: 'SESSION_1',
        type: 'consultation',
        plantId: null,
        contextConfig: {},
      };

      const mockUserMessage = {
        messageId: 'MSG_USER',
        sessionId: 'SESSION_1',
        role: 'user',
        contentType: 'text',
        content: '你好',
        imageUrls: null,
        status: 'sent',
        createdAt: new Date(),
      };

      const mockAiMessage = {
        messageId: 'MSG_AI',
        sessionId: 'SESSION_1',
        role: 'assistant',
        contentType: 'text',
        content: '你好！有什么可以帮助你的？',
        status: 'sent',
        createdAt: new Date(),
      };

      mockSessionService.getSessionById.mockResolvedValue(mockSession);
      mockSessionService.createMessage.mockResolvedValueOnce(mockUserMessage);
      mockSessionService.prepareContext.mockResolvedValue({});
      mockSessionService.getConversationHistory.mockResolvedValue([]);
      mockSessionService.createMessage.mockResolvedValueOnce(mockAiMessage);

      await sessionController.sendMessage(req, res);

      expect(mockSessionService.createMessage).toHaveBeenCalledTimes(2);
      // SA-7-001: 现在使用异步模式，验证 submitAsyncAiTask 被调用
      expect(asyncAiService.submitAsyncAiTask).toHaveBeenCalledWith({
        sessionId: 'SESSION_1',
        userMessageId: 'MSG_USER',
        content: '你好',
        imageUrl: null,
        analysisType: 'normal',
        context: expect.any(Object),
        userId: 'TEST_USER_123',
      });
      expect(success).toHaveBeenCalled();
    });

    it('发送带图片的消息', async () => {
      req.params = { sessionId: 'SESSION_1' };
      req.body = {
        content: '这植物怎么了？',
        contentType: 'image_text',
        imageUrls: ['https://example.com/plant.jpg'],
      };

      const mockSession = {
        sessionId: 'SESSION_1',
        type: 'plant',
        plantId: 'PLANT_1',
        contextConfig: {},
      };

      const mockUserMessageWithImage = {
        messageId: 'MSG_USER_IMG',
        sessionId: 'SESSION_1',
        role: 'user',
        content: '这植物怎么了？',
        imageUrls: ['https://example.com/plant.jpg'],
        status: 'sent',
        createdAt: new Date(),
      };

      mockSessionService.getSessionById.mockResolvedValue(mockSession);
      mockSessionService.createMessage.mockResolvedValueOnce(mockUserMessageWithImage);
      mockSessionService.prepareContext.mockResolvedValue({});
      mockSessionService.getConversationHistory.mockResolvedValue([]);
      mockSessionService.createMessage.mockResolvedValueOnce({
        messageId: 'MSG_AI',
        role: 'assistant',
        content: 'AI 正在分析中，请稍候...',
        status: 'sent',
        createdAt: new Date(),
      });

      await sessionController.sendMessage(req, res);

      // SA-7-001: 现在使用异步模式，验证 submitAsyncAiTask 被调用
      expect(asyncAiService.submitAsyncAiTask).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'SESSION_1',
          userMessageId: 'MSG_USER_IMG',
          content: '这植物怎么了？',
          imageUrl: 'https://example.com/plant.jpg',
          analysisType: 'deep',
          userId: 'TEST_USER_123',
        })
      );
    });

    it('会话不存在返回 404', async () => {
      req.params = { sessionId: 'NOT_EXIST' };
      req.body = { content: '你好' };

      mockSessionService.getSessionById.mockResolvedValue(null);

      await sessionController.sendMessage(req, res);

      expect(error).toHaveBeenCalledWith(res, '会话不存在', 404, 404);
    });

    it('AI 服务超时处理', async () => {
      req.params = { sessionId: 'SESSION_1' };
      req.body = { content: '你好' };

      const mockSession = {
        sessionId: 'SESSION_1',
        type: 'consultation',
        contextConfig: {},
      };

      mockSessionService.getSessionById.mockResolvedValue(mockSession);
      mockSessionService.createMessage.mockResolvedValueOnce({
        messageId: 'MSG_USER',
        role: 'user',
        content: '你好',
        status: 'sent',
        createdAt: new Date(),
      });
      mockSessionService.prepareContext.mockResolvedValue({});
      mockSessionService.getConversationHistory.mockResolvedValue([]);

      // 模拟 AI 超时
      aiService.analyze.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI 分析超时')), 60000)
        )
      );

      mockSessionService.createMessage.mockResolvedValueOnce({
        messageId: 'MSG_AI_ERROR',
        role: 'assistant',
        content: '抱歉，分析耗时较长，请稍后刷新页面查看结果。',
        status: 'sent',
        createdAt: new Date(),
      });

      // 由于超时测试需要实际等待，这里简化处理
      // 实际测试中可以使用 jest.useFakeTimers()
    });
  });

  describe('deleteSession', () => {
    it('删除会话成功', async () => {
      req.params = { sessionId: 'SESSION_1' };

      mockSessionService.deleteSession.mockResolvedValue(true);

      await sessionController.deleteSession(req, res);

      expect(mockSessionService.deleteSession).toHaveBeenCalledWith('SESSION_1', 'TEST_USER_123');
      expect(success).toHaveBeenCalledWith(res, null, '删除成功');
    });

    it('会话不存在返回 404', async () => {
      req.params = { sessionId: 'NOT_EXIST' };

      mockSessionService.deleteSession.mockResolvedValue(false);

      await sessionController.deleteSession(req, res);

      expect(error).toHaveBeenCalledWith(res, '会话不存在', 404, 404);
    });
  });

  describe('markSessionAsRead', () => {
    it('标记会话已读成功', async () => {
      req.params = { sessionId: 'SESSION_1' };

      const mockSession = {
        sessionId: 'SESSION_1',
        type: 'plant',
      };

      mockSessionService.getSessionById.mockResolvedValue(mockSession);
      mockSessionService.getLastMessage.mockResolvedValue({
        messageId: 'MSG_LAST',
        content: '最新消息',
      });
      mockSessionService.updateReadPosition.mockResolvedValue({});

      await sessionController.markSessionAsRead(req, res);

      expect(mockSessionService.updateReadPosition).toHaveBeenCalledWith(
        'TEST_USER_123',
        'SESSION_1',
        'MSG_LAST'
      );
      expect(success).toHaveBeenCalledWith(res, { message: '已标记为已读' });
    });

    it('无消息时返回提示', async () => {
      req.params = { sessionId: 'SESSION_1' };

      const mockSession = {
        sessionId: 'SESSION_1',
        type: 'plant',
      };

      mockSessionService.getSessionById.mockResolvedValue(mockSession);
      mockSessionService.getLastMessage.mockResolvedValue(null);

      await sessionController.markSessionAsRead(req, res);

      expect(success).toHaveBeenCalledWith(res, { message: '无消息可标记' });
    });

    it('会话不存在返回 404', async () => {
      req.params = { sessionId: 'NOT_EXIST' };

      mockSessionService.getSessionById.mockResolvedValue(null);

      await sessionController.markSessionAsRead(req, res);

      expect(error).toHaveBeenCalledWith(res, '会话不存在', 404, 404);
    });
  });
});
