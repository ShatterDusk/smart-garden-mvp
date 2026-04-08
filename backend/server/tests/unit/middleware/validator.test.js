/**
 * Validator 中间件单元测试
 */

const Joi = require('joi');
const { validate, validateBody, validateQuery, validateParams } = require('../../../src/middleware/validator');

describe('Validator Middleware', () => {
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

  describe('validate', () => {
    it('验证通过调用 next', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        age: Joi.number().integer().min(0),
      });

      req.body = { name: '张三', age: 25 };

      const middleware = validate({ body: schema });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('验证失败返回 400', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
      });

      req.body = { age: 25 }; // 缺少必填字段 name

      const middleware = validate({ body: schema });
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 400,
        message: expect.stringContaining('name'),
        data: null,
      });
    });

    it('验证 query 参数', () => {
      const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        pageSize: Joi.number().integer().min(1).max(100).default(10),
      });

      req.query = { page: '2', pageSize: '20' };

      const middleware = validate({ query: schema });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.validatedQuery).toEqual({
        page: 2,
        pageSize: 20,
      });
    });

    it('验证 query 失败返回错误', () => {
      const schema = Joi.object({
        page: Joi.number().integer().min(1),
      });

      req.query = { page: '-1' }; // 无效值

      const middleware = validate({ query: schema });
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('验证 params 参数', () => {
      const schema = Joi.object({
        id: Joi.string().uuid().required(),
      });

      req.params = { id: '550e8400-e29b-41d4-a716-446655440000' };

      const middleware = validate({ params: schema });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('验证 params 失败返回错误', () => {
      const schema = Joi.object({
        id: Joi.string().uuid().required(),
      });

      req.params = { id: 'invalid-uuid' };

      const middleware = validate({ params: schema });
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('同时验证 body、query 和 params', () => {
      const bodySchema = Joi.object({ name: Joi.string().required() });
      const querySchema = Joi.object({ page: Joi.number().default(1) });
      const paramsSchema = Joi.object({ id: Joi.string().required() });

      req.body = { name: '测试' };
      req.query = { page: '1' };
      req.params = { id: '123' };

      const middleware = validate({
        body: bodySchema,
        query: querySchema,
        params: paramsSchema,
      });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.validatedQuery).toEqual({ page: 1 });
    });

    it('验证错误返回', () => {
      const bodySchema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
      });

      req.body = {}; // 两个字段都缺失

      const middleware = validate({ body: bodySchema });
      middleware(req, res, next);

      // Joi 默认只返回第一个错误
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 400,
          data: null,
          message: expect.any(String),
        })
      );
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('空 options 不验证任何内容', () => {
      const middleware = validate({});
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('query 默认值生效', () => {
      const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        pageSize: Joi.number().integer().min(1).default(10),
      });

      req.query = {}; // 空 query

      const middleware = validate({ query: schema });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.validatedQuery).toEqual({
        page: 1,
        pageSize: 10,
      });
    });

    it('类型转换生效', () => {
      const schema = Joi.object({
        count: Joi.number().integer().required(),
        active: Joi.boolean().required(),
      });

      req.body = { count: '100', active: 'true' };

      const middleware = validate({ body: schema });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('数组验证', () => {
      const schema = Joi.object({
        tags: Joi.array().items(Joi.string()).min(1).required(),
      });

      req.body = { tags: ['tag1', 'tag2'] };

      const middleware = validate({ body: schema });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('嵌套对象验证', () => {
      const schema = Joi.object({
        user: Joi.object({
          name: Joi.string().required(),
          profile: Joi.object({
            age: Joi.number().required(),
          }),
        }).required(),
      });

      req.body = {
        user: {
          name: '张三',
          profile: { age: 25 },
        },
      };

      const middleware = validate({ body: schema });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateBody', () => {
    it('快捷验证 body', () => {
      const schema = Joi.object({ title: Joi.string().required() });
      req.body = { title: '测试标题' };

      const middleware = validateBody(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('快捷验证 body 失败', () => {
      const schema = Joi.object({ title: Joi.string().required() });
      req.body = {};

      const middleware = validateBody(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateQuery', () => {
    it('快捷验证 query', () => {
      const schema = Joi.object({ search: Joi.string() });
      req.query = { search: '关键词' };

      const middleware = validateQuery(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.validatedQuery).toBeDefined();
    });
  });

  describe('validateParams', () => {
    it('快捷验证 params', () => {
      const schema = Joi.object({ plantId: Joi.string().required() });
      req.params = { plantId: 'PLANT_123' };

      const middleware = validateParams(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('实际业务场景', () => {
    it('植物创建验证', () => {
      const schema = Joi.object({
        nickname: Joi.string().min(1).max(50).required(),
        species: Joi.string().max(100).allow(''),
        plantCategory: Joi.string().valid('succulent', 'flower', 'foliage', 'vegetable', 'other').required(),
        coverImageUrl: Joi.string().uri().allow(null),
      });

      req.body = {
        nickname: '小绿',
        species: '绿萝',
        plantCategory: 'foliage',
      };

      const middleware = validateBody(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('分页查询验证', () => {
      const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        pageSize: Joi.number().integer().min(1).max(100).default(10),
        type: Joi.string().valid('plant', 'consultation').optional(),
      });

      req.query = { page: '2', pageSize: '20', type: 'plant' };

      const middleware = validateQuery(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.validatedQuery).toEqual({
        page: 2,
        pageSize: 20,
        type: 'plant',
      });
    });

    it('设备数据上报验证', () => {
      const schema = Joi.object({
        deviceId: Joi.string().required(),
        plantId: Joi.string().allow(null),
        timestamp: Joi.number().integer().required(),
        metrics: Joi.object({
          temperature: Joi.number(),
          humidity: Joi.number(),
          light: Joi.number(),
          soilMoisture: Joi.number(),
        }).required(),
        isSupplement: Joi.boolean().default(false),
      });

      req.body = {
        deviceId: 'DEVICE_123',
        plantId: 'PLANT_456',
        timestamp: Date.now(),
        metrics: {
          temperature: 25.5,
          humidity: 60,
        },
      };

      const middleware = validateBody(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
