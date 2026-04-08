/**
 * ErrorHandler 中间件单元测试
 */

const { errorHandler, notFoundHandler, asyncHandler, ERROR_CODES } = require('../../../src/middleware/errorHandler');
const logger = require('../../../src/utils/logger');

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  error: jest.fn(),
}));

describe('ErrorHandler Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      originalUrl: '/api/test',
      method: 'POST',
      ip: '127.0.0.1',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('errorHandler', () => {
    it('处理普通错误', () => {
      const err = new Error('测试错误');

      errorHandler(err, req, res, next);

      expect(logger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 500,
        message: '测试错误',
        data: null,
      });
    });

    it('处理带状态码的错误', () => {
      const err = new Error('未找到');
      err.statusCode = 404;
      err.code = 404;

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        code: 404,
        message: '未找到',
        data: null,
      });
    });

    it('处理 Sequelize 验证错误', () => {
      const err = new Error('Validation Error');
      err.name = 'SequelizeValidationError';
      err.errors = [
        { message: '昵称不能为空' },
        { message: '邮箱格式不正确' },
      ];

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 400,
        message: '昵称不能为空, 邮箱格式不正确',
        data: null,
      });
    });

    it('处理 Sequelize 唯一约束错误', () => {
      const err = new Error('Unique Error');
      err.name = 'SequelizeUniqueConstraintError';
      err.errors = [{ message: '该邮箱已被注册' }];

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 400,
        message: '该邮箱已被注册',
        data: null,
      });
    });

    it('处理 JWT 错误', () => {
      const err = new Error('jwt malformed');
      err.name = 'JsonWebTokenError';

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        message: '无效的Token',
        data: null,
      });
    });

    it('处理 Token 过期错误', () => {
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        code: 1002,
        message: 'Token已过期',
        data: null,
      });
    });

    it('处理 Joi 验证错误', () => {
      const err = new Error('Validation Error');
      err.name = 'ValidationError';
      err.isJoi = true;
      err.details = [
        { message: '"name" is required' },
        { message: '"email" must be valid' },
      ];

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 400,
        message: '"name" is required, "email" must be valid',
        data: null,
      });
    });

    it('记录错误日志包含请求信息', () => {
      const err = new Error('测试错误');

      errorHandler(err, req, res, next);

      expect(logger.error).toHaveBeenCalledWith('Error occurred:', {
        message: '测试错误',
        stack: expect.any(String),
        url: '/api/test',
        method: 'POST',
        ip: '127.0.0.1',
      });
    });

    it('使用默认错误消息', () => {
      const err = new Error();

      errorHandler(err, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '服务器内部错误',
        })
      );
    });

    it('处理没有 errors 数组的 Sequelize 错误', () => {
      const err = new Error('Validation Error');
      err.name = 'SequelizeValidationError';

      errorHandler(err, req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        code: 400,
        message: '数据验证失败',
        data: null,
      });
    });

    it('处理没有 details 的 Joi 错误', () => {
      const err = new Error('Validation Error');
      err.name = 'ValidationError';
      err.isJoi = true;

      errorHandler(err, req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        code: 400,
        message: '参数验证失败',
        data: null,
      });
    });

    it('处理使用 status 而不是 statusCode 的错误', () => {
      const err = new Error('Bad Request');
      err.status = 400;

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('notFoundHandler', () => {
    it('返回 404 错误', () => {
      notFoundHandler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        code: 404,
        message: '接口不存在',
        data: null,
      });
    });
  });

  describe('asyncHandler', () => {
    it('成功执行异步函数', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(req, res, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('捕获异步函数错误并调用 next', async () => {
      const error = new Error('Async Error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(req, res, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });

    it('处理返回 Promise 的函数', async () => {
      const asyncFn = jest.fn().mockReturnValue(Promise.resolve('success'));
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(req, res, next);

      expect(asyncFn).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('ERROR_CODES', () => {
    it('包含所有标准 HTTP 错误码', () => {
      expect(ERROR_CODES.BAD_REQUEST).toEqual({ code: 400, message: '请求参数错误' });
      expect(ERROR_CODES.UNAUTHORIZED).toEqual({ code: 401, message: '未授权' });
      expect(ERROR_CODES.FORBIDDEN).toEqual({ code: 403, message: '禁止访问' });
      expect(ERROR_CODES.NOT_FOUND).toEqual({ code: 404, message: '资源不存在' });
      expect(ERROR_CODES.INTERNAL_ERROR).toEqual({ code: 500, message: '服务器内部错误' });
    });

    it('包含业务错误码', () => {
      expect(ERROR_CODES.WECHAT_LOGIN_FAILED).toEqual({ code: 1001, message: '微信登录失败' });
      expect(ERROR_CODES.TOKEN_EXPIRED).toEqual({ code: 1002, message: 'Token过期' });
      expect(ERROR_CODES.PLANT_NOT_FOUND).toEqual({ code: 1003, message: '植物不存在' });
      expect(ERROR_CODES.SESSION_NOT_FOUND).toEqual({ code: 1004, message: '会话不存在' });
      expect(ERROR_CODES.DEVICE_NOT_FOUND).toEqual({ code: 1005, message: '设备不存在' });
      expect(ERROR_CODES.DIAGNOSIS_NOT_FOUND).toEqual({ code: 1006, message: '诊断记录不存在' });
      expect(ERROR_CODES.UPLOAD_FAILED).toEqual({ code: 1007, message: '图片上传失败' });
      expect(ERROR_CODES.AI_SERVICE_UNAVAILABLE).toEqual({ code: 1008, message: 'AI服务不可用' });
    });
  });

  describe('实际业务场景', () => {
    it('处理微信登录失败', () => {
      const err = new Error('微信登录失败');
      err.code = 1001;

      errorHandler(err, req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        code: 1001,
        message: '微信登录失败',
        data: null,
      });
    });

    it('处理植物不存在错误', () => {
      const err = new Error('植物不存在');
      err.statusCode = 404;
      err.code = 1003;

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        code: 1003,
        message: '植物不存在',
        data: null,
      });
    });

    it('处理 AI 服务不可用', () => {
      const err = new Error('AI服务超时');
      err.code = 1008;

      errorHandler(err, req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        code: 1008,
        message: 'AI服务超时',
        data: null,
      });
    });

    it('asyncHandler 包装控制器函数', async () => {
      const mockController = jest.fn(async (req, res) => {
        const data = await Promise.resolve({ id: 1 });
        res.json(data);
      });

      const wrappedController = asyncHandler(mockController);
      await wrappedController(req, res, next);

      expect(mockController).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('asyncHandler 捕获数据库错误', async () => {
      const dbError = new Error('数据库连接失败');
      const mockController = jest.fn().mockRejectedValue(dbError);

      const wrappedController = asyncHandler(mockController);
      await wrappedController(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });
});
