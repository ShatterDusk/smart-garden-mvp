/**
 * deviceAuth 中间件单元测试
 * 设备认证中间件测试
 */

jest.mock('../../../src/models', () => ({
  Device: {
    findOne: jest.fn()
  },
  Plant: {
    findOne: jest.fn()
  }
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

const { Device, Plant } = require('../../../src/models');
const logger = require('../../../src/utils/logger');
const {
  deviceAuthMiddleware,
  deviceKeyAuthMiddleware
} = require('../../../src/middleware/deviceAuth');

describe('deviceAuth Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();
  });

  describe('deviceAuthMiddleware', () => {
    it('应该成功认证有效的设备', async () => {
      req.body = { deviceId: 'device_123' };

      Device.findOne.mockResolvedValue({
        device_id: 'device_123',
        status: 'active'
      });

      Plant.findOne.mockResolvedValue({
        plant_id: 'plant_456'
      });

      await deviceAuthMiddleware(req, res, next);

      expect(Device.findOne).toHaveBeenCalledWith({
        where: { device_id: 'device_123' },
        attributes: ['device_id', 'status']
      });

      expect(Plant.findOne).toHaveBeenCalledWith({
        where: { current_device_id: 'device_123' },
        attributes: ['plant_id']
      });

      expect(req.device).toEqual({
        deviceId: 'device_123',
        status: 'active',
        boundPlantId: 'plant_456'
      });

      expect(next).toHaveBeenCalled();
    });

    it('应该处理设备存在但未绑定植物的情况', async () => {
      req.body = { deviceId: 'device_123' };

      Device.findOne.mockResolvedValue({
        device_id: 'device_123',
        status: 'active'
      });

      Plant.findOne.mockResolvedValue(null);

      await deviceAuthMiddleware(req, res, next);

      expect(req.device).toEqual({
        deviceId: 'device_123',
        status: 'active',
        boundPlantId: null
      });

      expect(next).toHaveBeenCalled();
    });

    it('应该返回400当缺少设备ID', async () => {
      req.body = {};

      await deviceAuthMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 400,
        message: '缺少设备ID',
        data: null
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('应该返回404当设备不存在', async () => {
      req.body = { deviceId: 'nonexistent_device' };

      Device.findOne.mockResolvedValue(null);

      await deviceAuthMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        code: 404,
        message: '设备不存在',
        data: null
      });
      expect(logger.warn).toHaveBeenCalledWith('设备认证失败：设备不存在', { deviceId: 'nonexistent_device' });
      expect(next).not.toHaveBeenCalled();
    });

    it('应该处理数据库错误', async () => {
      req.body = { deviceId: 'device_123' };

      Device.findOne.mockRejectedValue(new Error('Database connection failed'));

      await deviceAuthMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 500,
        message: '设备认证失败',
        data: null
      });
      expect(logger.error).toHaveBeenCalledWith('设备认证中间件错误', { error: 'Database connection failed' });
      expect(next).not.toHaveBeenCalled();
    });

    it('应该处理 Plant 查询错误', async () => {
      req.body = { deviceId: 'device_123' };

      Device.findOne.mockResolvedValue({
        device_id: 'device_123',
        status: 'active'
      });

      Plant.findOne.mockRejectedValue(new Error('Plant query failed'));

      await deviceAuthMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 500,
        message: '设备认证失败',
        data: null
      });
    });
  });

  describe('deviceKeyAuthMiddleware', () => {
    it('应该成功当提供了设备ID和密钥', async () => {
      req.body = {
        deviceId: 'device_123',
        deviceKey: 'secret_key_123'
      };

      await deviceKeyAuthMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('应该返回400当缺少设备ID', async () => {
      req.body = { deviceKey: 'secret_key_123' };

      await deviceKeyAuthMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 400,
        message: '缺少设备ID或密钥',
        data: null
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('应该返回400当缺少设备密钥', async () => {
      req.body = { deviceId: 'device_123' };

      await deviceKeyAuthMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 400,
        message: '缺少设备ID或密钥',
        data: null
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('应该返回400当设备ID和密钥都缺失', async () => {
      req.body = {};

      await deviceKeyAuthMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 400,
        message: '缺少设备ID或密钥',
        data: null
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('应该处理异常情况', async () => {
      req.body = {
        deviceId: 'device_123',
        deviceKey: 'secret_key_123'
      };

      // 模拟一个异常（虽然当前实现不太可能抛出异常）
      const error = new Error('Unexpected error');
      Object.defineProperty(req.body, 'deviceId', {
        get() { throw error; }
      });

      await deviceKeyAuthMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 500,
        message: '设备认证失败',
        data: null
      });
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
