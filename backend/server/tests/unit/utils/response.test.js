/**
 * response 工具函数测试（精简版）
 * 只保留核心功能测试
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

    it('支持自定义消息和状态码', () => {
      success(mockRes, { id: '456' }, '创建成功', 201);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 0,
        message: '创建成功',
        data: { id: '456' },
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
  });

  describe('paginated', () => {
    it('返回标准分页响应', () => {
      const list = [{ id: 1 }, { id: 2 }];

      paginated(mockRes, list, 100, 1, 20);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 0,
        message: 'success',
        data: {
          total: 100,
          page: 1,
          pageSize: 20,
          list,
        },
      });
    });
  });
});
