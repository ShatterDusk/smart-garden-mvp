const jwt = require('jsonwebtoken');
const { authMiddleware, optionalAuthMiddleware, generateToken, verifyToken, JWT_SECRET } = require('../../../src/middleware/auth');

jest.mock('../../../src/models', () => ({
  User: {
    findByPk: jest.fn(),
  },
}));

const { User } = require('../../../src/models');

describe('auth middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    it('缺少 Authorization 头返回 401', async () => {
      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        message: '缺少Authorization头',
        data: null,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('Authorization 格式错误返回 401', async () => {
      req.headers.authorization = 'InvalidFormat';

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        message: 'Authorization格式错误，应为: Bearer <token>',
        data: null,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('缺少 Bearer 前缀返回 401', async () => {
      req.headers.authorization = 'Basic sometoken';

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        message: 'Authorization格式错误，应为: Bearer <token>',
        data: null,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('无效 Token 返回 401', async () => {
      req.headers.authorization = 'Bearer invalid-token';

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        message: '无效的Token',
        data: null,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('有效 Token 通过验证', async () => {
      const mockUser = {
        user_id: 'TEST_USER_123',
        nickname: 'testuser',
        avatar_url: 'https://example.com/avatar.png',
        created_at: new Date('2024-01-01'),
      };

      User.findByPk.mockResolvedValue(mockUser);

      const token = generateToken({ user_id: 'TEST_USER_123' });
      req.headers.authorization = `Bearer ${token}`;

      await authMiddleware(req, res, next);

      expect(User.findByPk).toHaveBeenCalledWith('TEST_USER_123', {
        attributes: ['user_id', 'nickname', 'avatar_url', 'created_at'],
      });
      expect(req.user).toEqual({
        userId: 'TEST_USER_123',
        nickname: 'testuser',
        avatarUrl: 'https://example.com/avatar.png',
        createdAt: mockUser.created_at,
      });
      expect(next).toHaveBeenCalled();
    });

    it('Token 对应的用户不存在返回 401', async () => {
      User.findByPk.mockResolvedValue(null);

      const token = generateToken({ user_id: 'TEST_USER_NOT_EXIST' });
      req.headers.authorization = `Bearer ${token}`;

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        message: '用户不存在',
        data: null,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('过期的 Token 返回特定错误码', async () => {
      const expiredToken = jwt.sign(
        { user_id: 'TEST_USER_123' },
        JWT_SECRET,
        { expiresIn: '-1s' }
      );
      req.headers.authorization = `Bearer ${expiredToken}`;

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        code: 1002,
        message: 'Token已过期',
        data: null,
      });
    });
  });

  describe('optionalAuthMiddleware', () => {
    it('无 Authorization 头时继续请求', async () => {
      await optionalAuthMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it('无效 Token 时继续请求', async () => {
      req.headers.authorization = 'Bearer invalid-token';

      await optionalAuthMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('有效 Token 时设置用户信息', async () => {
      const mockUser = {
        user_id: 'TEST_USER_123',
        nickname: 'testuser',
        avatar_url: null,
        created_at: new Date(),
      };

      User.findByPk.mockResolvedValue(mockUser);

      const token = generateToken({ user_id: 'TEST_USER_123' });
      req.headers.authorization = `Bearer ${token}`;

      await optionalAuthMiddleware(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe('TEST_USER_123');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('generateToken', () => {
    it('生成有效 token', () => {
      const payload = { user_id: 'TEST_USER_123', role: 'user' };
      const token = generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.user_id).toBe('TEST_USER_123');
      expect(decoded.role).toBe('user');
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });
  });

  describe('verifyToken', () => {
    it('验证有效 token', () => {
      const payload = { user_id: 'TEST_USER_123', role: 'admin' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

      const decoded = verifyToken(token);

      expect(decoded.user_id).toBe('TEST_USER_123');
      expect(decoded.role).toBe('admin');
    });

    it('验证无效 token 抛出错误', () => {
      expect(() => verifyToken('invalid-token')).toThrow();
    });

    it('验证过期 token 抛出错误', () => {
      const expiredToken = jwt.sign(
        { user_id: 'TEST_USER_123' },
        JWT_SECRET,
        { expiresIn: '-1s' }
      );

      expect(() => verifyToken(expiredToken)).toThrow();
    });
  });
});
