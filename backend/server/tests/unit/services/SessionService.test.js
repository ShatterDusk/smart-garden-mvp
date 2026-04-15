/**
 * SessionService 单元测试
 */

const SessionServiceModule = require('../../../src/services/SessionService');
const SessionService = SessionServiceModule.SessionServiceClass || SessionServiceModule;
const logger = require('../../../src/utils/logger');

jest.mock('../../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

describe('SessionService', () => {
  let sessionService;

  beforeEach(() => {
    sessionService = new SessionService();
    jest.clearAllMocks();
  });

  describe('ID 生成方法', () => {
    it('应生成正确格式的会话ID', () => {
      const sessionId = sessionService.generateSessionId();
      expect(sessionId).toMatch(/^SESSION_[a-f0-9]{16}$/i);
    });

    it('应生成正确格式的消息ID', () => {
      const messageId = sessionService.generateMessageId();
      expect(messageId).toMatch(/^MSG_[a-f0-9]{16}$/i);
    });

    it('应生成正确格式的诊断ID', () => {
      const diagnosisId = sessionService.generateDiagnosisId();
      expect(diagnosisId).toMatch(/^DIAG_[a-f0-9]{16}$/i);
    });

    it('应生成不同的ID', () => {
      const id1 = sessionService.generateSessionId();
      const id2 = sessionService.generateSessionId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('calculateCareDuration', () => {
    it('应返回"今天添加"当是同一天', () => {
      const today = new Date();
      const result = sessionService.calculateCareDuration(today);
      expect(result).toBe('今天添加');
    });

    it('应返回"不到1周"当小于7天', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const result = sessionService.calculateCareDuration(threeDaysAgo);
      expect(result).toBe('不到1周');
    });

    it('应返回天数当小于30天', () => {
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      const result = sessionService.calculateCareDuration(fifteenDaysAgo);
      expect(result).toBe('15天');
    });

    it('应返回月数当小于1年', () => {
      const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const result = sessionService.calculateCareDuration(twoMonthsAgo);
      expect(result).toMatch(/\d+个月/);
    });

    it('应返回"未知"当日期在未来', () => {
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const result = sessionService.calculateCareDuration(future);
      expect(result).toBe('未知');
    });
  });

  describe('构造函数', () => {
    it('应正确初始化 model 和 modelName', () => {
      expect(sessionService.model).toBeDefined();
      expect(sessionService.modelName).toBe('Session');
    });
  });
});
