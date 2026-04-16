/**
 * UserService 单元测试
 */

const UserService = require('../../../src/services/UserService');
const logger = require('../../../src/utils/logger');

jest.mock('../../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

describe('UserService', () => {
  let userService;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('generateUserId', () => {
    it('应生成正确格式的用户ID', () => {
      const userId = userService.generateUserId();
      expect(userId).toMatch(/^USER_[A-F0-9]{8}$/);
    });

    it('应支持自定义前缀', () => {
      const userId = userService.generateUserId('GUEST');
      expect(userId).toMatch(/^GUEST_[A-F0-9]{8}$/);
    });

    it('应生成不同的用户ID', () => {
      const id1 = userService.generateUserId();
      const id2 = userService.generateUserId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateConfigId', () => {
    it('应生成正确格式的配置ID', () => {
      const configId = userService.generateConfigId();
      expect(configId).toMatch(/^CFG_[A-F0-9]{8}$/);
    });
  });

  describe('构造函数', () => {
    it('应正确初始化 model 和 modelName', () => {
      expect(userService.model).toBeDefined();
      expect(userService.modelName).toBe('User');
    });
  });
});
