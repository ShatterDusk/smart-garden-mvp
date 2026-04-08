const UserService = require('../../../src/services/UserService');
const { User, UserConfig } = require('../../../src/models');

jest.mock('../../../src/models', () => ({
  User: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  UserConfig: {
    create: jest.fn(),
    findOne: jest.fn(),
    findOrCreate: jest.fn(),
  },
}));

describe('UserService', () => {
  let userService;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('generateUserId', () => {
    it('生成以 USER_ 开头的 ID', () => {
      const id = userService.generateUserId();
      expect(id).toMatch(/^USER_[A-Z0-9]+$/);
    });

    it('使用自定义前缀', () => {
      const id = userService.generateUserId('GUEST');
      expect(id).toMatch(/^GUEST_[A-Z0-9]+$/);
    });
  });

  describe('createUser', () => {
    it('创建新用户', async () => {
      const mockUser = {
        user_id: 'USER_123',
        wx_openid: 'openid_123',
        nickname: '植物爱好者',
        status: 'active',
        update: jest.fn(),
        userId: 'USER_123',
        wxOpenid: 'openid_123',
      };

      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue(mockUser);

      const result = await userService.createUser('openid_123', { nickname: '测试' });

      expect(result.isNew).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it('返回已存在的用户', async () => {
      const mockUser = {
        user_id: 'USER_123',
        wx_openid: 'openid_123',
        status: 'active',
        update: jest.fn(),
      };

      User.findOne.mockResolvedValue(mockUser);

      const result = await userService.createUser('openid_123');

      expect(result.isNew).toBe(false);
      expect(result.user).toEqual(mockUser);
      expect(mockUser.update).toHaveBeenCalled();
    });
  });

  describe('createGuestUser', () => {
    it('创建游客用户', async () => {
      const mockUser = {
        user_id: 'GUEST_123',
        nickname: '游客用户',
        userId: 'GUEST_123',
      };

      User.create.mockResolvedValue(mockUser);

      const result = await userService.createGuestUser();

      expect(result.nickname).toBe('游客用户');
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nickname: '游客用户',
          role: 'user',
          status: 'active',
        })
      );
    });
  });

  describe('getUserById', () => {
    it('返回用户信息', async () => {
      const mockUser = {
        userId: 'USER_123',
        wxOpenid: 'openid_123',
        nickname: '测试用户',
        avatarUrl: 'https://example.com/avatar.png',
        role: 'user',
        status: 'active',
        lastLoginAt: new Date(),
        createdAt: new Date(),
      };

      User.findByPk.mockResolvedValue(mockUser);

      const result = await userService.getUserById('USER_123');

      expect(result.userId).toBe('USER_123');
      expect(result.nickname).toBe('测试用户');
    });

    it('用户不存在返回 null', async () => {
      User.findByPk.mockResolvedValue(null);

      const result = await userService.getUserById('NOT_EXIST');

      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('更新用户信息', async () => {
      const mockUser = {
        user_id: 'USER_123',
        nickname: '旧昵称',
        update: jest.fn(),
      };

      User.findByPk.mockResolvedValue(mockUser);
      User.findByPk.mockResolvedValueOnce(mockUser);

      await userService.updateUser('USER_123', { nickname: '新昵称', avatarUrl: 'https://example.com/new.png' });

      expect(mockUser.update).toHaveBeenCalledWith({
        nickname: '新昵称',
        avatar_url: 'https://example.com/new.png',
      });
    });

    it('用户不存在返回 null', async () => {
      User.findByPk.mockResolvedValue(null);

      const result = await userService.updateUser('NOT_EXIST', { nickname: '新昵称' });

      expect(result).toBeNull();
    });
  });

  describe('getConfig', () => {
    it('返回配置', async () => {
      const mockConfig = {
        configKey: 'test_config',
        configValue: { test: true },
        configType: 'preference',
      };

      UserConfig.findOne.mockResolvedValue(mockConfig);

      const result = await userService.getConfig('USER_123', 'test_config');

      expect(result.configKey).toBe('test_config');
      expect(result.configValue).toEqual({ test: true });
    });

    it('配置不存在返回 null', async () => {
      UserConfig.findOne.mockResolvedValue(null);

      const result = await userService.getConfig('USER_123', 'not_exist');

      expect(result).toBeNull();
    });
  });

  describe('setConfig', () => {
    it('创建新配置', async () => {
      const mockConfig = {
        configKey: 'test_config',
        configValue: { test: true },
        configType: 'preference',
      };

      UserConfig.findOrCreate.mockResolvedValue([mockConfig, true]);

      const result = await userService.setConfig('USER_123', 'test_config', { test: true });

      expect(result.configKey).toBe('test_config');
    });

    it('更新已存在的配置', async () => {
      const mockConfig = {
        configKey: 'test_config',
        configValue: { test: false },
        configType: 'preference',
        update: jest.fn(),
      };

      UserConfig.findOrCreate.mockResolvedValue([mockConfig, false]);

      await userService.setConfig('USER_123', 'test_config', { test: true });

      expect(mockConfig.update).toHaveBeenCalled();
    });
  });

  describe('getSettings', () => {
    it('返回用户设置', async () => {
      UserConfig.findOne
        .mockResolvedValueOnce({
          configValue: {
            diagnosisReminder: true,
            careReminder: true,
            environmentAlert: true,
            reminderTime: '09:00',
          },
        })
        .mockResolvedValueOnce({
          configValue: { language: 'zh-CN' },
        });

      const result = await userService.getSettings('USER_123');

      expect(result.notification.diagnosisReminder).toBe(true);
      expect(result.preferences.language).toBe('zh-CN');
    });

    it('返回默认设置', async () => {
      UserConfig.findOne.mockResolvedValue(null);

      const result = await userService.getSettings('USER_123');

      expect(result.notification.diagnosisReminder).toBe(true);
      expect(result.preferences.language).toBe('zh-CN');
    });
  });
});
