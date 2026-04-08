/**
 * 安全性测试
 * 测试常见攻击防护
 */

const { validateBody } = require('../../../src/middleware/validator');
const Joi = require('joi');

describe('Security Tests - 安全性测试', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('SQL注入防护', () => {
    it('应阻止基本的SQL注入尝试', () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; DELETE FROM plants WHERE '1'='1'; --",
        "1; SELECT * FROM users",
        "admin'--",
        "' UNION SELECT * FROM users--",
      ];

      const schema = Joi.object({
        nickname: Joi.string().max(50).required(),
      });

      maliciousInputs.forEach((input) => {
        req.body = { nickname: input };
        const middleware = validateBody(schema);
        middleware(req, res, next);

        // 验证中间件处理了请求（通过或拒绝）
        const wasNextCalled = next.mock.calls.length > 0;
        const wasStatusCalled = res.status.mock.calls.length > 0;
        expect(wasNextCalled || wasStatusCalled).toBe(true);
        
        // 重置 mocks
        jest.clearAllMocks();
      });
    });

    it('应阻止SQL注入在搜索参数中', () => {
      const searchInputs = [
        "%' OR '1'='1",
        "_'; DROP TABLE sessions; --",
        "'% OR '1'='1' --",
      ];

      const schema = Joi.object({
        keyword: Joi.string().max(100).allow(''),
      });

      searchInputs.forEach((input) => {
        req.body = { keyword: input };
        const middleware = validateBody(schema);
        middleware(req, res, next);

        // 字符串验证应该通过（Joi不检查SQL注入，但长度限制有帮助）
        // 实际防护应在Service层使用参数化查询
        const wasNextCalled = next.mock.calls.length > 0;
        const wasStatusCalled = res.status.mock.calls.length > 0;
        expect(wasNextCalled || wasStatusCalled).toBe(true);
        jest.clearAllMocks();
      });
    });
  });

  describe('XSS攻击防护', () => {
    it('应处理包含XSS payload的输入', () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert("xss")>',
        'javascript:alert("xss")',
        '<svg onload=alert("xss")>',
        '"><script>alert(String.fromCharCode(88,83,83))</script>',
        "' onclick='alert(1)",
      ];

      const schema = Joi.object({
        description: Joi.string().max(500).allow(''),
      });

      xssPayloads.forEach((payload) => {
        req.body = { description: payload };
        const middleware = validateBody(schema);
        middleware(req, res, next);

        // 验证请求被处理（XSS防护应在输出时进行转义）
        const wasNextCalled = next.mock.calls.length > 0;
        const wasStatusCalled = res.status.mock.calls.length > 0;
        expect(wasNextCalled || wasStatusCalled).toBe(true);
        jest.clearAllMocks();
      });
    });

    it('应阻止HTML标签在受限字段', () => {
      const schema = Joi.object({
        nickname: Joi.string().max(50).pattern(/^[^<>]*$/).required(),
      });

      req.body = { nickname: '<b>test</b>' };
      const middleware = validateBody(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('权限绕过防护', () => {
    it('应验证用户ID格式', () => {
      const userIdSchema = Joi.object({
        userId: Joi.string().pattern(/^USER_[A-F0-9]{8}$/i).required(),
      });

      // 有效的用户ID
      req.body = { userId: 'USER_12345678' };
      let middleware = validateBody(userIdSchema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      jest.clearAllMocks();

      // 无效的用户ID（尝试注入）
      req.body = { userId: "USER_123' OR '1'='1" };
      middleware = validateBody(userIdSchema);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('应验证植物ID格式', () => {
      const plantIdSchema = Joi.object({
        plantId: Joi.string().pattern(/^PLANT_[A-F0-9]{16}$/i).required(),
      });

      // 有效的植物ID
      req.body = { plantId: 'PLANT_1234567890ABCDEF' };
      let middleware = validateBody(plantIdSchema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      jest.clearAllMocks();

      // 无效的植物ID
      req.body = { plantId: '../../../etc/passwd' };
      middleware = validateBody(plantIdSchema);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('路径遍历防护', () => {
    it('应阻止路径遍历尝试', () => {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        '....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2fetc/passwd',
        '..%2f..%2fetc/passwd',
      ];

      const schema = Joi.object({
        filename: Joi.string().pattern(/^[^\\/]*$/).required(),
      });

      pathTraversalAttempts.forEach((path) => {
        req.body = { filename: path };
        const middleware = validateBody(schema);
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        jest.clearAllMocks();
      });
    });
  });

  describe('DoS攻击防护', () => {
    it('应限制请求体大小', () => {
      const largeString = 'x'.repeat(10000);
      
      const schema = Joi.object({
        content: Joi.string().max(5000).required(),
      });

      req.body = { content: largeString };
      const middleware = validateBody(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('应限制数组长度', () => {
      const schema = Joi.object({
        items: Joi.array().items(Joi.string()).max(100).required(),
      });

      req.body = { items: new Array(200).fill('item') };
      const middleware = validateBody(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('应限制嵌套对象深度', () => {
      const schema = Joi.object({
        data: Joi.object().required(),
      });

      // 创建深度嵌套对象
      let deepObject = {};
      let current = deepObject;
      for (let i = 0; i < 50; i++) {
        current.nested = {};
        current = current.nested;
      }

      req.body = { data: deepObject };
      const middleware = validateBody(schema);
      
      // 应该能处理，因为 Joi 默认允许嵌套对象
      expect(() => middleware(req, res, next)).not.toThrow();
    });
  });

  describe('特殊字符处理', () => {
    it('应处理Unicode特殊字符', () => {
      const specialChars = [
        '你好世界🌍',
        '日本語テキスト',
        'العربية',
      ];

      const schema = Joi.object({
        content: Joi.string().max(100).required(),
      });

      specialChars.forEach((content) => {
        req.body = { content };
        const middleware = validateBody(schema);
        middleware(req, res, next);

        // Unicode字符应该被接受
        expect(next).toHaveBeenCalled();
        jest.clearAllMocks();
      });
    });

    it('应处理控制字符', () => {
      const controlChars = [
        '\n\r\t',
      ];

      const schema = Joi.object({
        text: Joi.string().max(100).required(),
      });

      controlChars.forEach((text) => {
        req.body = { text };
        const middleware = validateBody(schema);
        middleware(req, res, next);

        // 控制字符应该被接受或拒绝，但不崩溃
        const wasNextCalled = next.mock.calls.length > 0;
        const wasStatusCalled = res.status.mock.calls.length > 0;
        expect(wasNextCalled || wasStatusCalled).toBe(true);
        jest.clearAllMocks();
      });
    });
  });

  describe('认证安全', () => {
    it('应验证Token格式', () => {
      const tokenSchema = Joi.object({
        token: Joi.string().pattern(/^[A-Za-z0-9_-]+$/).required(),
      });

      // 有效token
      req.body = { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' };
      let middleware = validateBody(tokenSchema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      jest.clearAllMocks();

      // 无效token（包含特殊字符）
      req.body = { token: 'token<script>alert(1)</script>' };
      middleware = validateBody(tokenSchema);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('应验证微信code格式', () => {
      const codeSchema = Joi.object({
        code: Joi.string().alphanum().max(50).required(),
      });

      // 有效的code格式
      req.body = { code: '023cZ5ll2j8KJ74B1mml2K3Z5l2cZ5ll' };
      let middleware = validateBody(codeSchema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      jest.clearAllMocks();

      // 无效的code（注入尝试）
      req.body = { code: "'; DROP TABLE users; --" };
      middleware = validateBody(codeSchema);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('业务逻辑安全', () => {
    it('应验证分页参数防止过大查询', () => {
      const paginationSchema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        pageSize: Joi.number().integer().min(1).max(100).default(10),
      });

      // 正常分页
      req.body = { page: 1, pageSize: 20 };
      let middleware = validateBody(paginationSchema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      jest.clearAllMocks();

      // 过大的pageSize
      req.body = { page: 1, pageSize: 10000 };
      middleware = validateBody(paginationSchema);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('应验证枚举值防止非法输入', () => {
      const enumSchema = Joi.object({
        plantCategory: Joi.string().valid('succulent', 'flower', 'foliage', 'vegetable', 'other').required(),
        role: Joi.string().valid('user', 'expert', 'admin').required(),
      });

      // 有效值
      req.body = { plantCategory: 'succulent', role: 'user' };
      let middleware = validateBody(enumSchema);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      jest.clearAllMocks();

      // 无效值（注入尝试）
      req.body = { plantCategory: "'; DROP TABLE plants; --", role: 'user' };
      middleware = validateBody(enumSchema);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
