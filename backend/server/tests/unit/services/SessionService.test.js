const SessionService = require('../../../src/services/SessionService');
const { Session, Message, Plant, DiagnosisCard, UserConfig } = require('../../../src/models');

jest.mock('../../../src/models', () => ({
  Session: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  Message: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    destroy: jest.fn(),
  },
  Plant: {
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
  DiagnosisCard: {
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
  },
  UserConfig: {
    findOne: jest.fn(),
    findOrCreate: jest.fn(),
  },
}));

describe('SessionService', () => {
  let sessionService;

  beforeEach(() => {
    sessionService = new SessionService();
    jest.clearAllMocks();
  });

  describe('generateSessionId', () => {
    it('生成以 SESSION_ 开头的 ID', () => {
      const id = sessionService.generateSessionId();
      expect(id).toMatch(/^SESSION_[A-Fa-f0-9]+$/);
    });
  });

  describe('generateMessageId', () => {
    it('生成以 MSG_ 开头的 ID', () => {
      const id = sessionService.generateMessageId();
      expect(id).toMatch(/^MSG_[A-Fa-f0-9]+$/);
    });
  });

  describe('createSession', () => {
    it('创建咨询会话', async () => {
      const mockSession = {
        session_id: 'SESSION_123',
        user_id: 'USER_123',
        type: 'consultation',
        title: '咨询会话',
      };

      Session.create.mockResolvedValue(mockSession);

      const result = await sessionService.createSession('USER_123', { type: 'consultation' });

      expect(result.session_id).toBe('SESSION_123');
      expect(result.type).toBe('consultation');
    });

    it('创建植物会话', async () => {
      const mockSession = {
        session_id: 'SESSION_123',
        user_id: 'USER_123',
        type: 'plant',
        plant_id: 'PLANT_123',
      };

      Session.create.mockResolvedValue(mockSession);

      const result = await sessionService.createSession('USER_123', {
        type: 'plant',
        plantId: 'PLANT_123',
      });

      expect(result.type).toBe('plant');
    });
  });

  describe('getSessionList', () => {
    it('返回会话列表', async () => {
      const mockSessions = [
        { session_id: 'SESSION_1', type: 'consultation' },
        { session_id: 'SESSION_2', type: 'plant' },
      ];

      Session.findAndCountAll.mockResolvedValue({ count: 2, rows: mockSessions });

      const result = await sessionService.getSessionList('USER_123', { page: 1, pageSize: 20 });

      expect(result.count).toBe(2);
      expect(result.sessions.length).toBe(2);
    });

    it('按类型筛选', async () => {
      const mockSessions = [{ session_id: 'SESSION_1', type: 'plant' }];

      Session.findAndCountAll.mockResolvedValue({ count: 1, rows: mockSessions });

      const result = await sessionService.getSessionList('USER_123', { type: 'plant' });

      expect(result.count).toBe(1);
    });
  });

  describe('getSessionById', () => {
    it('返回会话', async () => {
      const mockSession = {
        session_id: 'SESSION_123',
        user_id: 'USER_123',
      };

      Session.findOne.mockResolvedValue(mockSession);

      const result = await sessionService.getSessionById('SESSION_123', 'USER_123');

      expect(result.session_id).toBe('SESSION_123');
    });

    it('会话不存在返回 null', async () => {
      Session.findOne.mockResolvedValue(null);

      const result = await sessionService.getSessionById('NOT_EXIST', 'USER_123');

      expect(result).toBeNull();
    });
  });

  describe('updateSession', () => {
    it('更新会话', async () => {
      const mockSession = {
        session_id: 'SESSION_123',
        title: '旧标题',
        update: jest.fn(),
      };

      Session.findOne.mockResolvedValue(mockSession);

      await sessionService.updateSession('SESSION_123', 'USER_123', { title: '新标题' });

      expect(mockSession.update).toHaveBeenCalled();
    });

    it('会话不存在返回 null', async () => {
      Session.findOne.mockResolvedValue(null);

      const result = await sessionService.updateSession('NOT_EXIST', 'USER_123', { title: '新标题' });

      expect(result).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('删除会话', async () => {
      const mockSession = {
        session_id: 'SESSION_123',
        destroy: jest.fn(),
      };

      Session.findOne.mockResolvedValue(mockSession);

      const result = await sessionService.deleteSession('SESSION_123', 'USER_123');

      expect(result).toBe(true);
      expect(mockSession.destroy).toHaveBeenCalled();
    });

    it('会话不存在返回 false', async () => {
      Session.findOne.mockResolvedValue(null);

      const result = await sessionService.deleteSession('NOT_EXIST', 'USER_123');

      expect(result).toBe(false);
    });
  });

  describe('createMessage', () => {
    it('创建消息', async () => {
      const mockMessage = {
        message_id: 'MSG_123',
        session_id: 'SESSION_123',
        role: 'user',
        content: '测试消息',
      };

      Message.create.mockResolvedValue(mockMessage);
      Session.update.mockResolvedValue([1]);

      const result = await sessionService.createMessage('SESSION_123', {
        role: 'user',
        content: '测试消息',
      });

      expect(result.message_id).toBe('MSG_123');
    });
  });

  describe('getMessages', () => {
    it('返回消息列表', async () => {
      const mockMessages = [
        { message_id: 'MSG_1', content: '消息1' },
        { message_id: 'MSG_2', content: '消息2' },
      ];

      Message.findAll.mockResolvedValue(mockMessages);

      const result = await sessionService.getMessages('SESSION_123', { limit: 20 });

      expect(result.length).toBe(2);
    });
  });

  describe('getMessageCount', () => {
    it('返回消息数量', async () => {
      Message.count.mockResolvedValue(5);

      const result = await sessionService.getMessageCount('SESSION_123');

      expect(result).toBe(5);
    });
  });

  describe('createDiagnosisCard', () => {
    it('创建诊断卡', async () => {
      const mockDiagnosis = {
        diagnosis_card_id: 'DIAG_123',
        plant_id: 'PLANT_123',
        health_score: 85,
        status: 'healthy',
      };

      DiagnosisCard.create.mockResolvedValue(mockDiagnosis);

      const result = await sessionService.createDiagnosisCard({
        messageId: 'MSG_123',
        plantId: 'PLANT_123',
        healthScore: 85,
        status: 'healthy',
        issues: [],
        suggestions: [],
        confidence: 0.9,
      });

      expect(result.diagnosis_card_id).toBe('DIAG_123');
    });
  });

  describe('upgradeSession', () => {
    it('升级咨询会话为植物会话', async () => {
      const mockSession = {
        session_id: 'SESSION_123',
        type: 'consultation',
        update: jest.fn(),
      };

      const mockPlant = {
        plant_id: 'PLANT_123',
        nickname: '测试植物',
      };

      Session.findOne.mockResolvedValue(mockSession);
      Plant.findOne.mockResolvedValue(mockPlant);
      Message.findAll.mockResolvedValue([]);

      const result = await sessionService.upgradeSession('SESSION_123', 'USER_123', 'PLANT_123');

      expect(result.session).toBeDefined();
      expect(result.plant).toBeDefined();
    });

    it('已经是植物会话返回错误', async () => {
      const mockSession = {
        session_id: 'SESSION_123',
        type: 'plant',
      };

      Session.findOne.mockResolvedValue(mockSession);

      const result = await sessionService.upgradeSession('SESSION_123', 'USER_123', 'PLANT_123');

      expect(result.error).toContain('已经是植物会话');
      expect(result.code).toBe(400);
    });

    it('会话不存在返回错误', async () => {
      Session.findOne.mockResolvedValue(null);

      const result = await sessionService.upgradeSession('NOT_EXIST', 'USER_123', 'PLANT_123');

      expect(result.error).toContain('会话不存在');
      expect(result.code).toBe(404);
    });
  });
});
