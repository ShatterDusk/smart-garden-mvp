/**
 * response 工具函数测试
 */

const { success, error, paginated } = require('../../../src/utils/response');

describe('response utils', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('success', () => {
    it('返回标准成功响应', () => {
      const data = { userId: '123', name: 'Test User' };

      success(mockRes, data);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 0,
        message: 'success',
        data,
      });
    });

    it('支持自定义消息', () => {
      const data = { id: '456' };
      const message = '创建成功';

      success(mockRes, data, message);

      expect(mockRes.json).toHaveBeenCalledWith({
        code: 0,
        message: '创建成功',
        data,
      });
    });

    it('支持自定义状态码', () => {
      const data = { id: '789' };
      const message = '已创建';
      const statusCode = 201;

      success(mockRes, data, message, statusCode);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 0,
        message: '已创建',
        data,
      });
    });

    it('处理 null 数据', () => {
      success(mockRes, null);

      expect(mockRes.json).toHaveBeenCalledWith({
        code: 0,
        message: 'success',
        data: null,
      });
    });

    it('处理数组数据', () => {
      const data = [{ id: 1 }, { id: 2 }];

      success(mockRes, data);

      expect(mockRes.json).toHaveBeenCalledWith({
        code: 0,
        message: 'success',
        data,
      });
    });

    it('处理空对象数据', () => {
      success(mockRes, {});

      expect(mockRes.json).toHaveBeenCalledWith({
        code: 0,
        message: 'success',
        data: {},
      });
    });
  });

  describe('error', () => {
    it('返回标准错误响应', () => {
      error(mockRes, '服务器错误');

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 500,
        message: '服务器错误',
        data: null,
      });
    });

    it('支持自定义错误码', () => {
      error(mockRes, '未授权', 401, 401);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 401,
        message: '未授权',
        data: null,
      });
    });

    it('使用默认错误消息', () => {
      error(mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        code: 500,
        message: 'error',
        data: null,
      });
    });

    it('支持业务错误码与 HTTP 状态码不同', () => {
      // 业务逻辑错误但 HTTP 请求成功
      error(mockRes, '参数错误', 4001, 200);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 4001,
        message: '参数错误',
        data: null,
      });
    });

    it('处理常见 HTTP 错误状态', () => {
      // 400 Bad Request
      error(mockRes, '请求参数错误', 400, 400);
      expect(mockRes.status).toHaveBeenCalledWith(400);

      // 401 Unauthorized
      mockRes.status.mockClear();
      error(mockRes, '未授权', 401, 401);
      expect(mockRes.status).toHaveBeenCalledWith(401);

      // 403 Forbidden
      mockRes.status.mockClear();
      error(mockRes, '禁止访问', 403, 403);
      expect(mockRes.status).toHaveBeenCalledWith(403);

      // 404 Not Found
      mockRes.status.mockClear();
      error(mockRes, '资源不存在', 404, 404);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('paginated', () => {
    it('返回标准分页响应', () => {
      const list = [{ id: 1 }, { id: 2 }];
      const total = 100;
      const page = 1;
      const pageSize = 20;

      paginated(mockRes, list, total, page, pageSize);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 0,
        message: 'success',
        data: {
          total,
          page,
          pageSize,
          list,
        },
      });
    });

    it('处理空列表', () => {
      paginated(mockRes, [], 0, 1, 20);

      expect(mockRes.json).toHaveBeenCalledWith({
        code: 0,
        message: 'success',
        data: {
          total: 0,
          page: 1,
          pageSize: 20,
          list: [],
        },
      });
    });

    it('处理最后一页', () => {
      const list = [{ id: 99 }];
      const total = 100;
      const page = 5;
      const pageSize = 20;

      paginated(mockRes, list, total, page, pageSize);

      expect(mockRes.json).toHaveBeenCalledWith({
        code: 0,
        message: 'success',
        data: {
          total: 100,
          page: 5,
          pageSize: 20,
          list: [{ id: 99 }],
        },
      });
    });

    it('处理大数据量', () => {
      const list = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }));
      const total = 10000;
      const page = 1;
      const pageSize = 50;

      paginated(mockRes, list, total, page, pageSize);

      expect(mockRes.json).toHaveBeenCalledWith({
        code: 0,
        message: 'success',
        data: {
          total: 10000,
          page: 1,
          pageSize: 50,
          list: expect.any(Array),
        },
      });
    });
  });

  describe('链式调用', () => {
    it('success 支持链式调用', () => {
      const result = success(mockRes, { id: 1 });

      expect(result).toBe(mockRes);
    });

    it('error 支持链式调用', () => {
      const result = error(mockRes, '错误');

      expect(result).toBe(mockRes);
    });

    it('paginated 支持链式调用', () => {
      const result = paginated(mockRes, [], 0, 1, 10);

      expect(result).toBe(mockRes);
    });
  });

  describe('实际使用场景', () => {
    it('用户登录成功响应', () => {
      const userData = {
        userId: 'user_123',
        nickName: '张三',
        avatarUrl: 'https://example.com/avatar.jpg',
        token: 'jwt_token_here',
      };

      success(mockRes, userData, '登录成功');

      expect(mockRes.json).toHaveBeenCalledWith({
        code: 0,
        message: '登录成功',
        data: userData,
      });
    });

    it('表单验证错误响应', () => {
      error(mockRes, '手机号格式不正确', 400, 400);

      expect(mockRes.json).toHaveBeenCalledWith({
        code: 400,
        message: '手机号格式不正确',
        data: null,
      });
    });

    it('植物列表分页响应', () => {
      const plants = [
        { plantId: 'p1', name: '多肉1', category: 'succulent' },
        { plantId: 'p2', name: '多肉2', category: 'succulent' },
      ];

      paginated(mockRes, plants, 50, 1, 20);

      expect(mockRes.json).toHaveBeenCalledWith({
        code: 0,
        message: 'success',
        data: {
          total: 50,
          page: 1,
          pageSize: 20,
          list: plants,
        },
      });
    });
  });
});
