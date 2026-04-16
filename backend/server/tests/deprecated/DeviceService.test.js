/**
 * DeviceService 单元测试 - 核心功能
 */

const DeviceService = require('../../../src/services/DeviceService');
const logger = require('../../../src/utils/logger');

jest.mock('../../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

describe('DeviceService', () => {
  let deviceService;

  beforeEach(() => {
    deviceService = new DeviceService();
    jest.clearAllMocks();
  });

  describe('generateDeviceId', () => {
    it('应生成正确格式的设备ID', () => {
      const deviceId = deviceService.generateDeviceId();
      expect(deviceId).toMatch(/^DEVICE_[A-F0-9]{16}$/);
    });

    it('应生成不同的设备ID', () => {
      const id1 = deviceService.generateDeviceId();
      const id2 = deviceService.generateDeviceId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('构造函数', () => {
    it('应正确初始化 model 和 modelName', () => {
      expect(deviceService.model).toBeDefined();
      expect(deviceService.modelName).toBe('Device');
    });
  });
});
