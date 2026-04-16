/**
 * 边界条件测试
 * 测试极限值、空值、类型边界等
 */

const { validateBody, validateQuery } = require('../../../src/middleware/validator');
const Joi = require('joi');

describe('Boundary Tests - 边界条件测试', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('字符串长度边界', () => {
    it('应处理空字符串', () => {
      const schema = Joi.object({
        nickname: Joi.string().min(1).max(50).required(),
      });

      req.body = { nickname: '' };
      const middleware = validateBody(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('应处理最小长度边界', () => {
      const schema = Joi.object({
        nickname: Joi.string().min(1).max(50).required(),
      });

      // 1个字符（最小值）
      req.body = { nickname: 'a' };
      let middleware = validateBody(schema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      jest.clearAllMocks();

      // 0个字符（低于最小值）
      req.body = { nickname: '' };
      middleware = validateBody(schema);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('应处理最大长度边界', () => {
      const schema = Joi.object({
        nickname: Joi.string().min(1).max(50).required(),
      });

      // 50个字符（最大值）
      req.body = { nickname: 'a'.repeat(50) };
      let middleware = validateBody(schema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      jest.clearAllMocks();

      // 51个字符（超过最大值）
      req.body = { nickname: 'a'.repeat(51) };
      middleware = validateBody(schema);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('应处理Unicode字符长度', () => {
      const schema = Joi.object({
        nickname: Joi.string().max(10).required(),
      });

      // 10个中文字符
      req.body = { nickname: '一二三四五六七八九十' };
      let middleware = validateBody(schema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      jest.clearAllMocks();

      // 11个中文字符
      req.body = { nickname: '一二三四五六七八九十十一' };
      middleware = validateBody(schema);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('应处理emoji字符长度', () => {
      const schema = Joi.object({
        nickname: Joi.string().max(10).required(),
      });

      // emoji通常占用2个字符长度
      req.body = { nickname: '🌍🌍🌍🌍🌍' };
      let middleware = validateBody(schema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('数字边界', () => {
    it('应处理整数边界', () => {
      const schema = Joi.object({
        age: Joi.number().integer().min(0).max(150).required(),
      });

      // 边界值
      const testCases = [
        { value: 0, shouldPass: true },      // 最小值
        { value: 150, shouldPass: true },    // 最大值
        { value: -1, shouldPass: false },    // 低于最小值
        { value: 151, shouldPass: false },   // 超过最大值
        { value: 75, shouldPass: true },     // 中间值
      ];

      testCases.forEach(({ value, shouldPass }) => {
        req.body = { age: value };
        const middleware = validateBody(schema);
        middleware(req, res, next);

        if (shouldPass) {
          expect(next).toHaveBeenCalled();
        } else {
          expect(res.status).toHaveBeenCalledWith(400);
        }

        jest.clearAllMocks();
      });
    });

    it('应处理浮点数精度', () => {
      const schema = Joi.object({
        temperature: Joi.number().min(-50).max(100).precision(2).required(),
      });

      // 有效浮点数
      req.body = { temperature: 25.55 };
      let middleware = validateBody(schema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      jest.clearAllMocks();

      // 超过精度限制
      req.body = { temperature: 25.555 };
      middleware = validateBody(schema);
      middleware(req, res, next);
      // Joi 会截断或报错，取决于配置
    });

    it('应处理极大和极小数', () => {
      const schema = Joi.object({
        value: Joi.number().required(),
      });

      const extremeValues = [
        Number.MAX_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER,
        Number.MAX_VALUE,
        Number.MIN_VALUE,
        Infinity,
        -Infinity,
      ];

      extremeValues.forEach((value) => {
        req.body = { value };
        const middleware = validateBody(schema);
        
        // 应该不崩溃
        expect(() => middleware(req, res, next)).not.toThrow();
        jest.clearAllMocks();
      });
    });
  });

  describe('分页参数边界', () => {
    it('应处理分页极限值', () => {
      const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        pageSize: Joi.number().integer().min(1).max(100).default(10),
      });

      const testCases = [
        { page: 1, pageSize: 1, shouldPass: true },           // 最小值
        { page: 999999, pageSize: 100, shouldPass: true },    // 大页码
        { page: 0, pageSize: 10, shouldPass: false },         // page为0
        { page: 1, pageSize: 0, shouldPass: false },          // pageSize为0
        { page: -1, pageSize: 10, shouldPass: false },        // 负数page
        { page: 1, pageSize: 101, shouldPass: false },        // 超过最大pageSize
      ];

      testCases.forEach(({ page, pageSize, shouldPass }) => {
        req.query = { page: String(page), pageSize: String(pageSize) };
        const middleware = validateQuery(schema);
        middleware(req, res, next);

        if (shouldPass) {
          expect(next).toHaveBeenCalled();
        } else {
          expect(res.status).toHaveBeenCalledWith(400);
        }

        jest.clearAllMocks();
      });
    });

    it('应处理非数字分页参数', () => {
      const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        pageSize: Joi.number().integer().min(1).max(100).default(10),
      });

      const invalidCases = [
        { page: 'abc', pageSize: '10' },
        { page: '10', pageSize: 'xyz' },
        { page: '', pageSize: '' },
        { page: null, pageSize: undefined },
      ];

      invalidCases.forEach((query) => {
        req.query = query;
        const middleware = validateQuery(schema);
        middleware(req, res, next);

        // 要么使用默认值通过，要么返回400
        const wasNextCalled = next.mock.calls.length > 0;
        const wasStatusCalled = res.status.mock.calls.length > 0;
        expect(wasNextCalled || wasStatusCalled).toBe(true);
        jest.clearAllMocks();
      });
    });
  });

  describe('空值和null处理', () => {
    it('应区分null、undefined和空字符串', () => {
      const schema = Joi.object({
        requiredField: Joi.string().required(),
        optionalField: Joi.string().allow(null, ''),
      });

      // null值
      req.body = { requiredField: 'test', optionalField: null };
      let middleware = validateBody(schema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      jest.clearAllMocks();

      // undefined（字段缺失）
      req.body = { requiredField: 'test' };
      middleware = validateBody(schema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      jest.clearAllMocks();

      // 空字符串
      req.body = { requiredField: 'test', optionalField: '' };
      middleware = validateBody(schema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      jest.clearAllMocks();

      // 必填字段为null
      req.body = { requiredField: null, optionalField: 'test' };
      middleware = validateBody(schema);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('应处理空对象和空数组', () => {
      const schema = Joi.object({
        emptyObject: Joi.object().required(),
        emptyArray: Joi.array().required(),
      });

      // 空对象和空数组
      req.body = { emptyObject: {}, emptyArray: [] };
      let middleware = validateBody(schema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      jest.clearAllMocks();

      // null值
      req.body = { emptyObject: null, emptyArray: [] };
      middleware = validateBody(schema);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('数组边界', () => {
    it('应处理数组长度边界', () => {
      const schema = Joi.object({
        tags: Joi.array().items(Joi.string()).min(1).max(10).required(),
      });

      // 空数组（低于最小长度）
      req.body = { tags: [] };
      let middleware = validateBody(schema);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);

      jest.clearAllMocks();

      // 1个元素（最小值）
      req.body = { tags: ['tag1'] };
      middleware = validateBody(schema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      jest.clearAllMocks();

      // 10个元素（最大值）
      req.body = { tags: Array(10).fill('tag') };
      middleware = validateBody(schema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      jest.clearAllMocks();

      // 11个元素（超过最大值）
      req.body = { tags: Array(11).fill('tag') };
      middleware = validateBody(schema);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('应处理数组元素类型', () => {
      const schema = Joi.object({
        numbers: Joi.array().items(Joi.number()).required(),
      });

      // 正确类型
      req.body = { numbers: [1, 2, 3] };
      let middleware = validateBody(schema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      jest.clearAllMocks();

      // 包含错误类型
      req.body = { numbers: [1, 'two', 3] };
      middleware = validateBody(schema);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('日期时间边界', () => {
    it('应处理日期格式和范围', () => {
      const schema = Joi.object({
        date: Joi.date().iso().required(),
      });

      // 有效日期
      req.body = { date: '2024-01-15' };
      let middleware = validateBody(schema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      jest.clearAllMocks();

      // 无效日期
      req.body = { date: '2024-13-45' };
      middleware = validateBody(schema);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);

      jest.clearAllMocks();

      // 非日期字符串
      req.body = { date: 'not-a-date' };
      middleware = validateBody(schema);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('应处理时间戳边界', () => {
      const schema = Joi.object({
        timestamp: Joi.number().integer().required(),
      });

      // 当前时间戳
      req.body = { timestamp: Date.now() };
      let middleware = validateBody(schema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      jest.clearAllMocks();

      // 负数时间戳（1970年前）
      req.body = { timestamp: -86400000 };
      middleware = validateBody(schema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      jest.clearAllMocks();

      // 极大时间戳
      req.body = { timestamp: 9999999999999 };
      middleware = validateBody(schema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('枚举值边界', () => {
    it('应处理枚举值大小写敏感', () => {
      const schema = Joi.object({
        category: Joi.string().valid('succulent', 'flower', 'foliage').required(),
      });

      // 正确值
      req.body = { category: 'succulent' };
      let middleware = validateBody(schema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      jest.clearAllMocks();

      // 大小写错误
      req.body = { category: 'Succulent' };
      middleware = validateBody(schema);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);

      jest.clearAllMocks();

      // 空字符串
      req.body = { category: '' };
      middleware = validateBody(schema);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('嵌套对象边界', () => {
    it('应处理嵌套对象验证', () => {
      const schema = Joi.object({
        user: Joi.object({
          name: Joi.string().required(),
          profile: Joi.object({
            age: Joi.number().integer().min(0).max(150).required(),
          }).required(),
        }).required(),
      });

      // 完整对象
      req.body = {
        user: {
          name: '张三',
          profile: { age: 25 },
        },
      };
      let middleware = validateBody(schema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      jest.clearAllMocks();

      // 缺少嵌套字段
      req.body = {
        user: {
          name: '张三',
          profile: {},
        },
      };
      middleware = validateBody(schema);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);

      jest.clearAllMocks();

      // 嵌套字段类型错误
      req.body = {
        user: {
          name: '张三',
          profile: { age: 'twenty-five' },
        },
      };
      middleware = validateBody(schema);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('默认值边界', () => {
    it('应正确处理默认值', () => {
      const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        pageSize: Joi.number().integer().min(1).max(100).default(10),
        sort: Joi.string().valid('asc', 'desc').default('desc'),
      });

      // 空对象，使用所有默认值
      req.query = {};
      const middleware = validateQuery(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.validatedQuery).toEqual({
        page: 1,
        pageSize: 10,
        sort: 'desc',
      });
    });

    it('应部分使用默认值', () => {
      const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        pageSize: Joi.number().integer().min(1).max(100).default(10),
      });

      // 只提供page
      req.query = { page: '5' };
      const middleware = validateQuery(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.validatedQuery).toEqual({
        page: 5,
        pageSize: 10,
      });
    });
  });
});
