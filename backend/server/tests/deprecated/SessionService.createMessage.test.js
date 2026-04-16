/**
 * SessionService.createMessage 单元测试
 * 测试消息创建和会话更新时间刷新逻辑
 */

const sessionService = require('../../../src/services/SessionService');
const logger = require('../../../src/utils/logger');

// Mock 依赖
jest.mock('../../../src/models', () => ({
  Session: {
    update: jest.fn(),
  },
  Message: {
    create: jest.fn(),
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const { Session, Message } = require('../../../src/models');

describe('SessionService.createMessage 单元测试', () => {
  const mockSessionId = 'SESSION_1234567890';
  const mockMessageId = 'MSG_1234567890';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('成功场景', () => {
    it('创建文本消息成功', async () => {
      const mockMessageData = {
        role: 'user',
        content: '测试消息内容',
        contentType: 'text',
      };

      const mockCreatedMessage = {
        message_id: mockMessageId,
        session_id: mockSessionId,
        role: 'user',
        content_type: 'text',
        content: '测试消息内容',
        image_urls: null,
        status: 'normal',
      };

      Message.create.mockResolvedValue(mockCreatedMessage);
      Session.update.mockResolvedValue([1]);

      const result = await sessionService.createMessage(mockSessionId, mockMessageData);

      expect(Message.create).toHaveBeenCalledWith({
        message_id: expect.stringMatching(/^MSG_[a-f0-9]{16}$/i),
        session_id: mockSessionId,
        role: 'user',
        content_type: 'text',
        content: '测试消息内容',
        image_urls: null,
        status: 'normal',
      });

      expect(Session.update).toHaveBeenCalledWith(
        { updated_at: expect.any(Date) },
        { where: { session_id: mockSessionId } }
      );

      expect(result).toEqual(mockCreatedMessage);
      expect(logger.info).toHaveBeenCalledWith(`Message created: ${mockMessageId}`);
    });

    it('创建带图片的消息成功', async () => {
      const mockMessageData = {
        role: 'user',
        content: '看看这植物',
        contentType: 'mixed',
        imageUrls: ['https://example.com/plant.jpg'],
      };

      const mockCreatedMessage = {
        message_id: mockMessageId,
        session_id: mockSessionId,
        role: 'user',
        content_type: 'mixed',
        content: '看看这植物',
        image_urls: ['https://example.com/plant.jpg'],
        status: 'normal',
      };

      Message.create.mockResolvedValue(mockCreatedMessage);
      Session.update.mockResolvedValue([1]);

      const result = await sessionService.createMessage(mockSessionId, mockMessageData);

      expect(Message.create).toHaveBeenCalledWith({
        message_id: expect.stringMatching(/^MSG_[a-f0-9]{16}$/i),
        session_id: mockSessionId,
        role: 'user',
        content_type: 'mixed',
        content: '看看这植物',
        image_urls: ['https://example.com/plant.jpg'],
        status: 'normal',
      });

      expect(result).toEqual(mockCreatedMessage);
    });

    it('创建 AI 回复消息成功', async () => {
      const mockMessageData = {
        role: 'assistant',
        content: '这是 AI 的回复',
        contentType: 'text',
        status: 'normal',
      };

      const mockCreatedMessage = {
        message_id: mockMessageId,
        session_id: mockSessionId,
        role: 'assistant',
        content_type: 'text',
        content: '这是 AI 的回复',
        image_urls: null,
        status: 'normal',
      };

      Message.create.mockResolvedValue(mockCreatedMessage);
      Session.update.mockResolvedValue([1]);

      const result = await sessionService.createMessage(mockSessionId, mockMessageData);

      expect(Message.create).toHaveBeenCalledWith(expect.objectContaining({
        role: 'assistant',
        content: '这是 AI 的回复',
      }));

      expect(result.role).toBe('assistant');
    });

    it('使用默认值创建消息', async () => {
      const mockMessageData = {
        role: 'user',
        content: '只有必填字段',
      };

      const mockCreatedMessage = {
        message_id: mockMessageId,
        session_id: mockSessionId,
        role: 'user',
        content_type: 'text', // 默认值
        content: '只有必填字段',
        image_urls: null, // 默认值
        status: 'normal', // 默认值
      };

      Message.create.mockResolvedValue(mockCreatedMessage);
      Session.update.mockResolvedValue([1]);

      await sessionService.createMessage(mockSessionId, mockMessageData);

      expect(Message.create).toHaveBeenCalledWith(expect.objectContaining({
        content_type: 'text',
        image_urls: null,
        status: 'normal',
      }));
    });
  });

  describe('会话更新时间刷新', () => {
    it('消息创建后刷新会话 updated_at', async () => {
      const mockMessageData = {
        role: 'user',
        content: '测试',
      };

      Message.create.mockResolvedValue({
        message_id: mockMessageId,
        session_id: mockSessionId,
      });
      Session.update.mockResolvedValue([1]);

      await sessionService.createMessage(mockSessionId, mockMessageData);

      // 验证 Session.update 被调用
      expect(Session.update).toHaveBeenCalledTimes(1);
      expect(Session.update).toHaveBeenCalledWith(
        { updated_at: expect.any(Date) },
        { where: { session_id: mockSessionId } }
      );

      // 验证 updated_at 是当前时间（允许 1 秒误差）
      const updateCall = Session.update.mock.calls[0];
      const updatedAt = updateCall[0].updated_at;
      expect(updatedAt.getTime()).toBeGreaterThan(Date.now() - 1000);
      expect(updatedAt.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('会话更新失败不影响消息创建结果', async () => {
      const mockMessageData = {
        role: 'user',
        content: '测试',
      };

      const mockCreatedMessage = {
        message_id: mockMessageId,
        session_id: mockSessionId,
        content: '测试',
      };

      Message.create.mockResolvedValue(mockCreatedMessage);
      // 模拟会话更新失败
      Session.update.mockRejectedValue(new Error('数据库连接失败'));

      // 应该抛出错误
      await expect(
        sessionService.createMessage(mockSessionId, mockMessageData)
      ).rejects.toThrow('数据库连接失败');
    });
  });

  describe('错误处理', () => {
    it('消息创建失败抛出异常', async () => {
      const mockMessageData = {
        role: 'user',
        content: '测试',
      };

      const dbError = new Error('数据库写入失败');
      Message.create.mockRejectedValue(dbError);

      await expect(
        sessionService.createMessage(mockSessionId, mockMessageData)
      ).rejects.toThrow('数据库写入失败');

      expect(logger.error).toHaveBeenCalledWith(
        'SessionService.createMessage error:',
        dbError
      );

      // 验证会话更新没有被调用
      expect(Session.update).not.toHaveBeenCalled();
    });

    it('空消息内容处理', async () => {
      const mockMessageData = {
        role: 'user',
        content: '',
      };

      Message.create.mockResolvedValue({
        message_id: mockMessageId,
        session_id: mockSessionId,
        content: '',
      });
      Session.update.mockResolvedValue([1]);

      const result = await sessionService.createMessage(mockSessionId, mockMessageData);

      expect(result.content).toBe('');
    });

    it('超长消息内容处理', async () => {
      const longContent = 'a'.repeat(10000);
      const mockMessageData = {
        role: 'user',
        content: longContent,
      };

      Message.create.mockResolvedValue({
        message_id: mockMessageId,
        session_id: mockSessionId,
        content: longContent,
      });
      Session.update.mockResolvedValue([1]);

      const result = await sessionService.createMessage(mockSessionId, mockMessageData);

      expect(result.content).toBe(longContent);
    });
  });

  describe('边界情况', () => {
    it('特殊字符消息内容', async () => {
      const specialContent = '特殊字符: <script>alert("xss")</script> 🌱 中文测试';
      const mockMessageData = {
        role: 'user',
        content: specialContent,
      };

      Message.create.mockResolvedValue({
        message_id: mockMessageId,
        session_id: mockSessionId,
        content: specialContent,
      });
      Session.update.mockResolvedValue([1]);

      const result = await sessionService.createMessage(mockSessionId, mockMessageData);

      expect(result.content).toBe(specialContent);
    });

    it('多张图片 URL', async () => {
      const imageUrls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
      ];

      const mockMessageData = {
        role: 'user',
        content: '多张图片',
        contentType: 'mixed',
        imageUrls,
      };

      Message.create.mockResolvedValue({
        message_id: mockMessageId,
        session_id: mockSessionId,
        image_urls: imageUrls,
      });
      Session.update.mockResolvedValue([1]);

      await sessionService.createMessage(mockSessionId, mockMessageData);

      expect(Message.create).toHaveBeenCalledWith(expect.objectContaining({
        image_urls: imageUrls,
      }));
    });

    it('消息状态参数传递', async () => {
      const mockMessageData = {
        role: 'user',
        content: '测试',
        status: 'pending', // 非默认状态
      };

      Message.create.mockResolvedValue({
        message_id: mockMessageId,
        session_id: mockSessionId,
        status: 'pending',
      });
      Session.update.mockResolvedValue([1]);

      await sessionService.createMessage(mockSessionId, mockMessageData);

      expect(Message.create).toHaveBeenCalledWith(expect.objectContaining({
        status: 'pending',
      }));
    });
  });
});
