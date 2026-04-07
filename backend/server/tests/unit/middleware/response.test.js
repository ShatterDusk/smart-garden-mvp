const responseMiddleware = require('../../../src/middleware/response');
const { success, error } = require('../../../src/utils/response');

jest.mock('../../../src/utils/response');

describe('response middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('添加 res.success 方法', () => {
    responseMiddleware(req, res, next);

    expect(res.success).toBeDefined();
    expect(typeof res.success).toBe('function');
  });

  it('添加 res.error 方法', () => {
    responseMiddleware(req, res, next);

    expect(res.error).toBeDefined();
    expect(typeof res.error).toBe('function');
  });

  it('调用 next()', () => {
    responseMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  describe('res.success', () => {
    it('调用 success 工具函数', () => {
      responseMiddleware(req, res, next);

      res.success({ id: '123' }, '操作成功', 200);

      expect(success).toHaveBeenCalledWith(res, { id: '123' }, '操作成功', 200);
    });

    it('使用默认参数', () => {
      responseMiddleware(req, res, next);

      res.success({ id: '123' });

      expect(success).toHaveBeenCalledWith(res, { id: '123' }, 'success', 200);
    });
  });

  describe('res.error', () => {
    it('调用 error 工具函数', () => {
      responseMiddleware(req, res, next);

      res.error('操作失败', 500, 500);

      expect(error).toHaveBeenCalledWith(res, '操作失败', 500, 500);
    });

    it('使用默认参数', () => {
      responseMiddleware(req, res, next);

      res.error();

      expect(error).toHaveBeenCalledWith(res, 'error', 500, 500);
    });
  });
});
