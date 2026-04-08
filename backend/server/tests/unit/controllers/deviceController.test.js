/**
 * DeviceController 单元测试
 */

// 必须在导入 Controller 之前设置 Mock
jest.mock('../../../src/services', () => {
  const mockDeviceService = {
    getDeviceList: jest.fn(),
    getBoundPlant: jest.fn(),
    bindDevice: jest.fn(),
    unbindDevice: jest.fn(),
    getDeviceById: jest.fn(),
    reportDeviceData: jest.fn(),
  };
  return {
    DeviceService: jest.fn(() => mockDeviceService),
  };
});

jest.mock('../../../src/utils/response', () => ({
  success: jest.fn((res, data, message) => {
    res.json({ code: 0, message: message || 'success', data });
  }),
  error: jest.fn((res, message, code, statusCode) => {
    res.status(statusCode || code || 500).json({ code: code || 500, message, data: null });
  }),
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const deviceController = require('../../../src/controllers/deviceController');
const { DeviceService } = require('../../../src/services');
const { success, error } = require('../../../src/utils/response');

describe('DeviceController', () => {
  let req;
  let res;
  let mockDeviceService;

  beforeEach(() => {
    mockDeviceService = new DeviceService();

    req = {
      body: {},
      query: {},
      params: {},
      user: { userId: 'TEST_USER_123' },
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe('getDevices', () => {
    it('获取设备列表成功', async () => {
      const mockDevices = [
        {
          deviceId: 'DEVICE_1',
          macAddress: 'AA:BB:CC:DD:EE:FF',
          deviceName: '设备1',
          status: 'online',
          batteryLevel: 80,
          lastHeartbeat: new Date(),
          createdAt: new Date(),
        },
        {
          deviceId: 'DEVICE_2',
          macAddress: '11:22:33:44:55:66',
          deviceName: '设备2',
          status: 'offline',
          batteryLevel: 50,
          lastHeartbeat: null,
          createdAt: new Date(),
        },
      ];

      mockDeviceService.getDeviceList.mockResolvedValue(mockDevices);
      mockDeviceService.getBoundPlant
        .mockResolvedValueOnce({
          plantId: 'PLANT_1',
          nickname: '小绿',
          coverImageUrl: 'https://example.com/plant1.jpg',
        })
        .mockResolvedValueOnce(null);

      await deviceController.getDevices(req, res);

      expect(mockDeviceService.getDeviceList).toHaveBeenCalledWith('TEST_USER_123');
      expect(success).toHaveBeenCalledWith(
        res,
        expect.arrayContaining([
          expect.objectContaining({
            deviceId: 'DEVICE_1',
            macAddress: 'AA:BB:CC:DD:EE:FF',
            boundPlant: expect.objectContaining({
              plantId: 'PLANT_1',
              nickname: '小绿',
            }),
          }),
          expect.objectContaining({
            deviceId: 'DEVICE_2',
            boundPlant: null,
          }),
        ])
      );
    });

    it('获取设备列表失败返回 500', async () => {
      mockDeviceService.getDeviceList.mockRejectedValue(new Error('数据库错误'));

      await deviceController.getDevices(req, res);

      expect(error).toHaveBeenCalledWith(res, '获取设备列表失败', 500);
    });

    it('空设备列表返回空数组', async () => {
      mockDeviceService.getDeviceList.mockResolvedValue([]);

      await deviceController.getDevices(req, res);

      expect(success).toHaveBeenCalledWith(res, []);
    });
  });

  describe('bindDevice', () => {
    it('绑定设备成功（关联植物）', async () => {
      req.body = {
        macAddress: 'AA:BB:CC:DD:EE:FF',
        deviceName: '新设备',
        plantId: 'PLANT_1',
      };

      const mockDevice = {
        deviceId: 'DEVICE_NEW',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        deviceName: '新设备',
        status: 'online',
        batteryLevel: 100,
      };

      mockDeviceService.bindDevice.mockResolvedValue(mockDevice);
      mockDeviceService.getBoundPlant.mockResolvedValue({
        plantId: 'PLANT_1',
        nickname: '小绿',
        coverImageUrl: 'https://example.com/plant.jpg',
      });

      await deviceController.bindDevice(req, res);

      expect(mockDeviceService.bindDevice).toHaveBeenCalledWith('TEST_USER_123', {
        macAddress: 'AA:BB:CC:DD:EE:FF',
        deviceName: '新设备',
        plantId: 'PLANT_1',
      });
      expect(success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          deviceId: 'DEVICE_NEW',
          macAddress: 'AA:BB:CC:DD:EE:FF',
          boundPlantId: 'PLANT_1',
          message: '设备绑定成功',
        })
      );
    });

    it('绑定设备成功（不关联植物）', async () => {
      req.body = {
        macAddress: 'AA:BB:CC:DD:EE:FF',
        deviceName: '新设备',
      };

      const mockDevice = {
        deviceId: 'DEVICE_NEW',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        deviceName: '新设备',
        status: 'online',
        batteryLevel: 100,
      };

      mockDeviceService.bindDevice.mockResolvedValue(mockDevice);
      mockDeviceService.getBoundPlant.mockResolvedValue(null);

      await deviceController.bindDevice(req, res);

      expect(mockDeviceService.bindDevice).toHaveBeenCalledWith('TEST_USER_123', {
        macAddress: 'AA:BB:CC:DD:EE:FF',
        deviceName: '新设备',
        plantId: undefined,
      });
      expect(success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          boundPlantId: null,
        })
      );
    });

    it('绑定设备失败返回 500', async () => {
      req.body = {
        macAddress: 'AA:BB:CC:DD:EE:FF',
        deviceName: '新设备',
      };

      mockDeviceService.bindDevice.mockRejectedValue(new Error('设备已绑定'));

      await deviceController.bindDevice(req, res);

      expect(error).toHaveBeenCalledWith(res, '绑定设备失败', 500);
    });
  });

  describe('unbindDevice', () => {
    it('解绑设备成功', async () => {
      req.body = { deviceId: 'DEVICE_1' };

      const mockDevice = {
        deviceId: 'DEVICE_1',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        deviceName: '设备1',
      };

      mockDeviceService.unbindDevice.mockResolvedValue(mockDevice);

      await deviceController.unbindDevice(req, res);

      expect(mockDeviceService.unbindDevice).toHaveBeenCalledWith('DEVICE_1', 'TEST_USER_123');
      expect(success).toHaveBeenCalledWith(res, null, '设备解绑成功');
    });

    it('设备不存在返回 404', async () => {
      req.body = { deviceId: 'NOT_EXIST' };

      mockDeviceService.unbindDevice.mockResolvedValue(null);

      await deviceController.unbindDevice(req, res);

      expect(error).toHaveBeenCalledWith(res, '设备不存在', 404, 404);
    });

    it('解绑失败返回 500', async () => {
      req.body = { deviceId: 'DEVICE_1' };

      mockDeviceService.unbindDevice.mockRejectedValue(new Error('数据库错误'));

      await deviceController.unbindDevice(req, res);

      expect(error).toHaveBeenCalledWith(res, '解绑设备失败', 500);
    });
  });

  describe('getDeviceDetail', () => {
    it('获取设备详情成功', async () => {
      req.params = { deviceId: 'DEVICE_1' };

      const mockDevice = {
        deviceId: 'DEVICE_1',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        deviceName: '设备1',
        status: 'online',
        batteryLevel: 80,
        lastHeartbeat: new Date(),
        createdAt: new Date(),
      };

      mockDeviceService.getDeviceById.mockResolvedValue(mockDevice);
      mockDeviceService.getBoundPlant.mockResolvedValue({
        plantId: 'PLANT_1',
        nickname: '小绿',
        species: '绿萝',
        coverImageUrl: 'https://example.com/plant.jpg',
      });

      await deviceController.getDeviceDetail(req, res);

      expect(mockDeviceService.getDeviceById).toHaveBeenCalledWith('DEVICE_1', 'TEST_USER_123');
      expect(success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          deviceId: 'DEVICE_1',
          macAddress: 'AA:BB:CC:DD:EE:FF',
          boundPlant: expect.objectContaining({
            plantId: 'PLANT_1',
            nickname: '小绿',
            species: '绿萝',
          }),
        })
      );
    });

    it('设备不存在返回 404', async () => {
      req.params = { deviceId: 'NOT_EXIST' };

      mockDeviceService.getDeviceById.mockResolvedValue(null);

      await deviceController.getDeviceDetail(req, res);

      expect(error).toHaveBeenCalledWith(res, '设备不存在', 404, 404);
    });

    it('获取详情失败返回 500', async () => {
      req.params = { deviceId: 'DEVICE_1' };

      mockDeviceService.getDeviceById.mockRejectedValue(new Error('数据库错误'));

      await deviceController.getDeviceDetail(req, res);

      expect(error).toHaveBeenCalledWith(res, '获取设备详情失败', 500);
    });

    it('设备未绑定植物时 boundPlant 为 null', async () => {
      req.params = { deviceId: 'DEVICE_1' };

      const mockDevice = {
        deviceId: 'DEVICE_1',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        deviceName: '设备1',
        status: 'online',
        batteryLevel: 80,
        lastHeartbeat: new Date(),
        createdAt: new Date(),
      };

      mockDeviceService.getDeviceById.mockResolvedValue(mockDevice);
      mockDeviceService.getBoundPlant.mockResolvedValue(null);

      await deviceController.getDeviceDetail(req, res);

      const successCall = success.mock.calls[0];
      expect(successCall[1].boundPlant).toBeNull();
      expect(successCall[1].boundPlantId).toBeNull();
    });
  });

  describe('reportData', () => {
    it('设备数据上报成功', async () => {
      req.body = {
        deviceId: 'DEVICE_1',
        plantId: 'PLANT_1',
        timestamp: Date.now(),
        metrics: {
          temperature: 25.5,
          humidity: 60,
          light: 500,
          soilMoisture: 45,
        },
        isSupplement: false,
      };

      const mockResult = {
        readingId: 'READING_1',
        deviceId: 'DEVICE_1',
        plantId: 'PLANT_1',
        metrics: {
          temperature: 25.5,
          humidity: 60,
          light: 500,
          soilMoisture: 45,
        },
      };

      mockDeviceService.reportDeviceData.mockResolvedValue(mockResult);

      await deviceController.reportData(req, res);

      expect(mockDeviceService.reportDeviceData).toHaveBeenCalledWith({
        deviceId: 'DEVICE_1',
        plantId: 'PLANT_1',
        timestamp: expect.any(Number),
        metrics: {
          temperature: 25.5,
          humidity: 60,
          light: 500,
          soilMoisture: 45,
        },
        isSupplement: false,
      });
      expect(success).toHaveBeenCalledWith(res, mockResult, '数据上报成功');
    });

    it('缺少 deviceId 返回 400', async () => {
      req.body = {
        metrics: { temperature: 25 },
      };

      await deviceController.reportData(req, res);

      expect(error).toHaveBeenCalledWith(res, '缺少必要参数', 400);
    });

    it('缺少 metrics 返回 400', async () => {
      req.body = {
        deviceId: 'DEVICE_1',
      };

      await deviceController.reportData(req, res);

      expect(error).toHaveBeenCalledWith(res, '缺少必要参数', 400);
    });

    it('上报数据失败返回错误', async () => {
      req.body = {
        deviceId: 'DEVICE_1',
        metrics: { temperature: 25 },
      };

      mockDeviceService.reportDeviceData.mockResolvedValue({
        error: '设备不存在',
        code: 404,
      });

      await deviceController.reportData(req, res);

      expect(error).toHaveBeenCalledWith(res, '设备不存在', 404, 404);
    });

    it('上报数据异常返回 500', async () => {
      req.body = {
        deviceId: 'DEVICE_1',
        metrics: { temperature: 25 },
      };

      mockDeviceService.reportDeviceData.mockRejectedValue(new Error('数据库错误'));

      await deviceController.reportData(req, res);

      expect(error).toHaveBeenCalledWith(res, '设备数据上报失败', 500);
    });

    it('支持补充数据上报', async () => {
      req.body = {
        deviceId: 'DEVICE_1',
        plantId: 'PLANT_1',
        timestamp: Date.now() - 3600000, // 1小时前
        metrics: {
          temperature: 26,
          humidity: 55,
        },
        isSupplement: true,
      };

      mockDeviceService.reportDeviceData.mockResolvedValue({
        readingId: 'READING_2',
        isSupplement: true,
      });

      await deviceController.reportData(req, res);

      expect(mockDeviceService.reportDeviceData).toHaveBeenCalledWith(
        expect.objectContaining({
          isSupplement: true,
        })
      );
    });
  });
});
