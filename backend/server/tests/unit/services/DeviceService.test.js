const DeviceService = require('../../../src/services/DeviceService');
const { Device, Plant } = require('../../../src/models');

jest.mock('../../../src/models', () => ({
  Device: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
  },
  Plant: {
    findOne: jest.fn(),
    update: jest.fn(),
    findAll: jest.fn(),
  },
}));

jest.mock('../../../src/services/EnvironmentService', () => {
  return jest.fn().mockImplementation(() => ({
    processDeviceEnvironmentData: jest.fn().mockResolvedValue({
      readingId: 'READ_123',
      recordedAt: new Date().toISOString(),
      isSupplement: false,
      isStale: false,
    }),
  }));
});

describe('DeviceService', () => {
  let deviceService;

  beforeEach(() => {
    deviceService = new DeviceService();
    jest.clearAllMocks();
  });

  describe('generateDeviceId', () => {
    it('生成以 DEVICE_ 开头的 ID', () => {
      const id = deviceService.generateDeviceId();
      expect(id).toMatch(/^DEVICE_[A-Fa-f0-9]+$/);
    });
  });

  describe('bindDevice', () => {
    it('绑定新设备', async () => {
      const mockDevice = {
        device_id: 'DEVICE_123',
        user_id: 'USER_123',
        mac_address: 'AA:BB:CC:DD:EE:FF',
        status: 'online',
        deviceId: 'DEVICE_123',
      };

      Device.findOne.mockResolvedValue(null);
      Device.create.mockResolvedValue(mockDevice);

      const result = await deviceService.bindDevice('USER_123', {
        macAddress: 'AA:BB:CC:DD:EE:FF',
        deviceName: '测试设备',
      });

      expect(result.deviceId).toBe('DEVICE_123');
      expect(Device.create).toHaveBeenCalled();
    });

    it('绑定已存在的设备', async () => {
      const mockDevice = {
        device_id: 'DEVICE_123',
        mac_address: 'AA:BB:CC:DD:EE:FF',
        deviceName: '旧设备',
        update: jest.fn(),
      };

      Device.findOne.mockResolvedValue(mockDevice);

      const result = await deviceService.bindDevice('USER_123', {
        macAddress: 'AA:BB:CC:DD:EE:FF',
        deviceName: '新名称',
      });

      expect(mockDevice.update).toHaveBeenCalled();
    });

    it('绑定设备并关联植物', async () => {
      const mockDevice = {
        device_id: 'DEVICE_123',
        user_id: 'USER_123',
        mac_address: 'AA:BB:CC:DD:EE:FF',
        status: 'online',
        deviceId: 'DEVICE_123',
      };

      Device.findOne.mockResolvedValue(null);
      Device.create.mockResolvedValue(mockDevice);
      Plant.update.mockResolvedValue([1]);

      await deviceService.bindDevice('USER_123', {
        macAddress: 'AA:BB:CC:DD:EE:FF',
        deviceName: '测试设备',
        plantId: 'PLANT_123',
      });

      expect(Plant.update).toHaveBeenCalledWith(
        { current_device_id: expect.stringMatching(/^DEVICE_/) },
        { where: { plant_id: 'PLANT_123', user_id: 'USER_123' } }
      );
    });

    it('同一设备绑定新植物时，旧植物的 current_device_id 应被清空', async () => {
      const mockDevice = {
        device_id: 'DEVICE_123',
        user_id: 'USER_123',
        mac_address: 'AA:BB:CC:DD:EE:FF',
        status: 'online',
        deviceId: 'DEVICE_123',
        update: jest.fn(),
      };

      const mockOldPlant = {
        plant_id: 'PLANT_OLD',
        current_device_id: 'DEVICE_123',
        plantId: 'PLANT_OLD',
        update: jest.fn(),
      };

      Device.findOne.mockResolvedValue(mockDevice);
      Plant.findOne.mockResolvedValue(mockOldPlant);

      await deviceService.bindDevice('USER_123', {
        macAddress: 'AA:BB:CC:DD:EE:FF',
        deviceName: '测试设备',
        plantId: 'PLANT_NEW',
      });

      expect(mockOldPlant.update).toHaveBeenCalledWith({ current_device_id: null });
    });
  });

  describe('unbindDevice', () => {
    it('解绑设备', async () => {
      const mockDevice = {
        device_id: 'DEVICE_123',
        user_id: 'USER_123',
        update: jest.fn(),
      };

      const mockBoundPlant = {
        plant_id: 'PLANT_123',
        update: jest.fn(),
      };

      Device.findOne.mockResolvedValue(mockDevice);
      Plant.findOne.mockResolvedValue(mockBoundPlant);

      const result = await deviceService.unbindDevice('DEVICE_123', 'USER_123');

      expect(result).toBeDefined();
      expect(mockBoundPlant.update).toHaveBeenCalledWith({ current_device_id: null });
    });

    it('设备不存在返回 null', async () => {
      Device.findOne.mockResolvedValue(null);

      const result = await deviceService.unbindDevice('NOT_EXIST', 'USER_123');

      expect(result).toBeNull();
    });
  });

  describe('getDeviceList', () => {
    it('返回设备列表', async () => {
      const mockDevices = [
        { device_id: 'DEVICE_1', status: 'online', deviceId: 'DEVICE_1' },
        { device_id: 'DEVICE_2', status: 'offline', deviceId: 'DEVICE_2' },
      ];

      Device.findAll.mockResolvedValue(mockDevices);

      const result = await deviceService.getDeviceList('USER_123');

      expect(result.length).toBe(2);
    });
  });

  describe('getDeviceById', () => {
    it('返回设备', async () => {
      const mockDevice = {
        device_id: 'DEVICE_123',
        user_id: 'USER_123',
        deviceId: 'DEVICE_123',
      };

      Device.findOne.mockResolvedValue(mockDevice);

      const result = await deviceService.getDeviceById('DEVICE_123', 'USER_123');

      expect(result.deviceId).toBe('DEVICE_123');
    });

    it('不验证用户时返回设备', async () => {
      const mockDevice = {
        device_id: 'DEVICE_123',
        deviceId: 'DEVICE_123',
      };

      Device.findByPk.mockResolvedValue(mockDevice);

      const result = await deviceService.getDeviceById('DEVICE_123');

      expect(result.deviceId).toBe('DEVICE_123');
    });
  });

  describe('getDeviceByMac', () => {
    it('通过 MAC 地址查找设备', async () => {
      const mockDevice = {
        device_id: 'DEVICE_123',
        mac_address: 'AA:BB:CC:DD:EE:FF',
        deviceId: 'DEVICE_123',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      Device.findOne.mockResolvedValue(mockDevice);

      const result = await deviceService.getDeviceByMac('AA:BB:CC:DD:EE:FF');

      expect(result.macAddress).toBe('AA:BB:CC:DD:EE:FF');
    });
  });

  describe('updateDeviceStatus', () => {
    it('更新设备状态', async () => {
      const mockDevice = {
        device_id: 'DEVICE_123',
        status: 'offline',
        update: jest.fn(),
      };

      Device.findByPk.mockResolvedValue(mockDevice);

      await deviceService.updateDeviceStatus('DEVICE_123', 'online', 80);

      expect(mockDevice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'online',
          battery_level: 80,
        })
      );
    });

    it('设备不存在返回 null', async () => {
      Device.findByPk.mockResolvedValue(null);

      const result = await deviceService.updateDeviceStatus('NOT_EXIST', 'online');

      expect(result).toBeNull();
    });
  });
});
