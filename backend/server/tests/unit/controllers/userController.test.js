/**
 * UserController 单元测试
 */

// 必须在导入 Controller 之前设置 Mock
jest.mock('../../../src/services', () => {
  const mockUserService = {
    createUser: jest.fn(),
    createGuestUser: jest.fn(),
    createDefaultConfig: jest.fn(),
    getUserEntity: jest.fn(),
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
    getConfig: jest.fn(),
    setConfig: jest.fn(),
  };
  return {
    UserService: jest.fn(() => mockUserService),
  };
});

jest.mock('../../../src/models', () => ({
  Plant: {
    count: jest.fn(),
    findAll: jest.fn(),
  },
  Device: {
    count: jest.fn(),
  },
}));

jest.mock('../../../src/middleware/auth', () => ({
  generateToken: jest.fn(() => 'mock_token'),
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const userController = require('../../../src/controllers/userController');
const { UserService } = require('../../../src/services');
const { Plant, Device } = require('../../../src/models');
const { generateToken } = require('../../../src/middleware/auth');

describe('UserController', () => {
  let req;
  let res;
  let next;
  let mockUserService;

  beforeEach(() => {
    // 获取 Mock 实例
    mockUserService = new UserService();

    req = {
      body: {},
      query: {},
      params: {},
      user: { userId: 'TEST_USER_123' },
    };
    res = {
      success: jest.fn(),
      error: jest.fn(),
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  describe('login', () => {
    it('新用户登录成功', async () => {
      req.body = {
        code: 'test_code',
        nickname: '测试用户',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      const mockUser = {
        user_id: 'USER_123',
        wx_openid: 'wx_openid_123',
        nickname: '测试用户',
        avatar_url: 'https://example.com/avatar.jpg',
        created_at: new Date(),
      };

      mockUserService.createUser.mockResolvedValue({
        isNew: true,
        user: mockUser,
      });

      await userController.login(req, res, next);

      expect(mockUserService.createUser).toHaveBeenCalled();
      expect(mockUserService.createDefaultConfig).toHaveBeenCalledWith('USER_123');
      expect(generateToken).toHaveBeenCalledWith({
        user_id: 'USER_123',
        openid: 'wx_openid_123',
      });
      expect(res.success).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'mock_token',
          user: expect.objectContaining({
            userId: 'USER_123',
            nickname: '测试用户',
          }),
        }),
        '登录成功'
      );
    });

    it('老用户登录成功并更新信息', async () => {
      req.body = {
        code: 'test_code',
        nickname: '新昵称',
        avatarUrl: 'https://example.com/new-avatar.jpg',
      };

      const mockUser = {
        user_id: 'USER_123',
        wx_openid: 'wx_openid_123',
        nickname: '旧昵称',
        avatar_url: 'https://example.com/old-avatar.jpg',
        created_at: new Date(),
        update: jest.fn().mockResolvedValue(true),
      };

      mockUserService.createUser.mockResolvedValue({
        isNew: false,
        user: mockUser,
      });

      await userController.login(req, res, next);

      expect(mockUser.update).toHaveBeenCalledWith({
        nickname: '新昵称',
        avatar_url: 'https://example.com/new-avatar.jpg',
        last_login_at: expect.any(Date),
      });
    });

    it('登录失败时调用 next(error)', async () => {
      const error = new Error('数据库错误');
      mockUserService.createUser.mockRejectedValue(error);
      req.body = { code: 'test_code' };

      await userController.login(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('guestLogin', () => {
    it('游客登录成功', async () => {
      const mockUser = {
        user_id: 'GUEST_123',
        nickname: '游客用户',
        avatar_url: null,
        created_at: new Date(),
      };

      mockUserService.createGuestUser.mockResolvedValue(mockUser);

      await userController.guestLogin(req, res, next);

      expect(mockUserService.createGuestUser).toHaveBeenCalled();
      expect(mockUserService.createDefaultConfig).toHaveBeenCalledWith('GUEST_123');
      expect(generateToken).toHaveBeenCalledWith({
        user_id: 'GUEST_123',
        openid: null,
      });
      expect(res.success).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'mock_token',
          user: expect.objectContaining({
            userId: 'GUEST_123',
            nickname: '游客用户',
          }),
        }),
        '游客登录成功'
      );
    });

    it('游客登录失败时调用 next(error)', async () => {
      const error = new Error('创建失败');
      mockUserService.createGuestUser.mockRejectedValue(error);

      await userController.guestLogin(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getProfile', () => {
    it('获取用户信息成功', async () => {
      const mockUser = {
        user_id: 'TEST_USER_123',
        nickname: '测试用户',
        avatar_url: 'https://example.com/avatar.jpg',
        created_at: new Date(),
      };

      mockUserService.getUserEntity.mockResolvedValue(mockUser);
      Plant.count.mockResolvedValue(5);
      Device.count.mockResolvedValue(2);

      await userController.getProfile(req, res, next);

      expect(mockUserService.getUserEntity).toHaveBeenCalledWith('TEST_USER_123');
      expect(Plant.count).toHaveBeenCalledWith({ where: { user_id: 'TEST_USER_123' } });
      expect(Device.count).toHaveBeenCalledWith({ where: { user_id: 'TEST_USER_123' } });
      expect(res.success).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'TEST_USER_123',
          nickname: '测试用户',
          plantCount: 5,
          deviceCount: 2,
        })
      );
    });

    it('用户不存在返回 404', async () => {
      mockUserService.getUserEntity.mockResolvedValue(null);

      await userController.getProfile(req, res, next);

      expect(res.error).toHaveBeenCalledWith('用户不存在', 404, 404);
    });

    it('包含 dashboard 数据', async () => {
      req.query = { include: 'dashboard' };

      const mockUser = {
        user_id: 'TEST_USER_123',
        nickname: '测试用户',
        avatar_url: null,
        created_at: new Date(),
      };

      mockUserService.getUserEntity.mockResolvedValue(mockUser);
      Plant.count.mockResolvedValue(3);
      Device.count.mockResolvedValue(2);
      Plant.findAll.mockResolvedValue([]);

      await userController.getProfile(req, res, next);

      expect(res.success).toHaveBeenCalledWith(
        expect.objectContaining({
          dashboard: expect.objectContaining({
            plantStats: expect.any(Object),
            deviceStats: expect.any(Object),
            recentPlants: expect.any(Array),
            dailyTip: expect.any(String),
          }),
        })
      );
    });
  });

  describe('updateProfile', () => {
    it('更新用户信息成功', async () => {
      req.body = {
        nickname: '新昵称',
        avatarUrl: 'https://example.com/new-avatar.jpg',
      };

      const mockUser = {
        user_id: 'TEST_USER_123',
        nickname: '新昵称',
        avatar_url: 'https://example.com/new-avatar.jpg',
        updated_at: new Date(),
        update: jest.fn().mockResolvedValue(true),
      };

      mockUserService.getUserEntity.mockResolvedValue(mockUser);

      await userController.updateProfile(req, res, next);

      expect(mockUser.update).toHaveBeenCalledWith({
        nickname: '新昵称',
        avatar_url: 'https://example.com/new-avatar.jpg',
        updated_at: expect.any(Date),
      });
      expect(res.success).toHaveBeenCalledWith(
        expect.objectContaining({
          nickname: '新昵称',
          avatarUrl: 'https://example.com/new-avatar.jpg',
        }),
        '更新成功'
      );
    });

    it('用户不存在返回 404', async () => {
      mockUserService.getUserEntity.mockResolvedValue(null);

      await userController.updateProfile(req, res, next);

      expect(res.error).toHaveBeenCalledWith('用户不存在', 404, 404);
    });

    it('部分更新（只更新 nickname）', async () => {
      req.body = { nickname: '只改昵称' };

      const mockUser = {
        user_id: 'TEST_USER_123',
        nickname: '只改昵称',
        avatar_url: 'https://example.com/avatar.jpg',
        updated_at: new Date(),
        update: jest.fn().mockResolvedValue(true),
      };

      mockUserService.getUserEntity.mockResolvedValue(mockUser);

      await userController.updateProfile(req, res, next);

      expect(mockUser.update).toHaveBeenCalledWith({
        nickname: '只改昵称',
        updated_at: expect.any(Date),
      });
    });
  });

  describe('getSettings', () => {
    it('获取用户设置成功', async () => {
      const mockSettings = {
        notification: { push: true },
        preferences: { theme: 'light' },
      };

      mockUserService.getSettings.mockResolvedValue(mockSettings);

      await userController.getSettings(req, res, next);

      expect(mockUserService.getSettings).toHaveBeenCalledWith('TEST_USER_123');
      expect(res.success).toHaveBeenCalledWith(mockSettings);
    });

    it('获取设置失败时调用 next(error)', async () => {
      const error = new Error('获取失败');
      mockUserService.getSettings.mockRejectedValue(error);

      await userController.getSettings(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateSettings', () => {
    it('更新用户设置成功', async () => {
      req.body = {
        notification: { push: false },
        preferences: { theme: 'dark' },
      };

      const mockResult = {
        notification: { push: false },
        preferences: { theme: 'dark' },
      };

      mockUserService.updateSettings.mockResolvedValue(mockResult);

      await userController.updateSettings(req, res, next);

      expect(mockUserService.updateSettings).toHaveBeenCalledWith('TEST_USER_123', {
        notification: { push: false },
        preferences: { theme: 'dark' },
      });
      expect(res.success).toHaveBeenCalledWith(mockResult, '设置更新成功');
    });
  });

  describe('getConfig', () => {
    it('获取存在的配置项', async () => {
      req.params = { configKey: 'test_config' };

      const mockConfig = {
        configKey: 'test_config',
        configValue: { option: 'value' },
        configType: 'preference',
      };

      mockUserService.getConfig.mockResolvedValue(mockConfig);

      await userController.getConfig(req, res, next);

      expect(mockUserService.getConfig).toHaveBeenCalledWith('TEST_USER_123', 'test_config');
      expect(res.success).toHaveBeenCalledWith(mockConfig);
    });

    it('获取不存在的配置项返回默认值', async () => {
      req.params = { configKey: 'non_existent' };

      mockUserService.getConfig.mockResolvedValue(null);

      await userController.getConfig(req, res, next);

      expect(res.success).toHaveBeenCalledWith({
        configKey: 'non_existent',
        configValue: null,
        configType: 'preference',
      });
    });
  });

  describe('setConfig', () => {
    it('设置配置项成功', async () => {
      req.body = {
        configKey: 'my_config',
        configValue: { enabled: true },
        configType: 'feature',
      };

      const mockResult = {
        configKey: 'my_config',
        configValue: { enabled: true },
        configType: 'feature',
      };

      mockUserService.setConfig.mockResolvedValue(mockResult);

      await userController.setConfig(req, res, next);

      expect(mockUserService.setConfig).toHaveBeenCalledWith(
        'TEST_USER_123',
        'my_config',
        { enabled: true },
        'feature'
      );
      expect(res.success).toHaveBeenCalledWith(mockResult);
    });

    it('缺少 configKey 返回 400', async () => {
      req.body = { configValue: 'test' };

      await userController.setConfig(req, res, next);

      expect(res.error).toHaveBeenCalledWith('configKey 不能为空', 400, 400);
    });

    it('默认 configType 为 preference', async () => {
      req.body = {
        configKey: 'my_config',
        configValue: 'test',
      };

      mockUserService.setConfig.mockResolvedValue({});

      await userController.setConfig(req, res, next);

      expect(mockUserService.setConfig).toHaveBeenCalledWith(
        'TEST_USER_123',
        'my_config',
        'test',
        'preference'
      );
    });
  });
});
