/**
 * PlantController 单元测试
 */

// 必须在导入 Controller 之前设置 Mock
jest.mock('../../../src/services', () => {
  const mockPlantService = {
    getPlantList: jest.fn(),
    getPlantDevices: jest.fn(),
    getLatestDiagnoses: jest.fn(),
    createPlant: jest.fn(),
    getPlantDetail: jest.fn(),
    updatePlant: jest.fn(),
    deletePlant: jest.fn(),
  };
  return {
    PlantService: jest.fn(() => mockPlantService),
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

const plantController = require('../../../src/controllers/plantController');
const { PlantService } = require('../../../src/services');
const { success, error } = require('../../../src/utils/response');

describe('PlantController', () => {
  let req;
  let res;
  let mockPlantService;

  beforeEach(() => {
    mockPlantService = new PlantService();

    req = {
      body: {},
      query: {},
      params: {},
      user: { userId: 'TEST_USER_123' },
      validatedQuery: null,
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe('getPlants', () => {
    it('获取植物列表成功', async () => {
      req.query = { page: '1', pageSize: '10' };

      const mockPlants = [
        {
          plantId: 'PLANT_1',
          nickname: '小绿',
          species: '绿萝',
          plantCategory: 'foliage',
          coverImageUrl: 'https://example.com/plant1.jpg',
          currentDeviceId: 'DEVICE_1',
          locationName: '客厅',
          locationCode: '110101',
          locationLat: 39.9,
          locationLng: 116.4,
          createdAt: new Date('2024-01-01'),
        },
      ];

      mockPlantService.getPlantList.mockResolvedValue({
        count: 1,
        plants: mockPlants,
      });
      mockPlantService.getPlantDevices.mockResolvedValue([
        { deviceId: 'DEVICE_1', deviceName: '设备1', status: 'online' },
      ]);
      mockPlantService.getLatestDiagnoses.mockResolvedValue(new Map());

      await plantController.getPlants(req, res);

      expect(mockPlantService.getPlantList).toHaveBeenCalledWith('TEST_USER_123', {
        page: '1',
        pageSize: '10',
      });
      expect(res.json).toHaveBeenCalled();
    });

    it('使用 validatedQuery 优先于 query', async () => {
      req.validatedQuery = { page: 2, pageSize: 20 };
      req.query = { page: '1', pageSize: '10' };

      mockPlantService.getPlantList.mockResolvedValue({ count: 0, plants: [] });
      mockPlantService.getPlantDevices.mockResolvedValue([]);
      mockPlantService.getLatestDiagnoses.mockResolvedValue(new Map());

      await plantController.getPlants(req, res);

      expect(mockPlantService.getPlantList).toHaveBeenCalledWith('TEST_USER_123', {
        page: 2,
        pageSize: 20,
      });
    });

    it('获取植物列表失败返回 500', async () => {
      mockPlantService.getPlantList.mockRejectedValue(new Error('数据库错误'));

      await plantController.getPlants(req, res);

      expect(error).toHaveBeenCalledWith(res, '获取植物列表失败', 500);
    });

    it('返回包含设备和诊断信息的植物列表', async () => {
      const mockPlants = [
        {
          plantId: 'PLANT_1',
          nickname: '小绿',
          species: '绿萝',
          plantCategory: 'foliage',
          coverImageUrl: 'https://example.com/plant1.jpg',
          currentDeviceId: 'DEVICE_1',
          locationName: '客厅',
          createdAt: new Date('2024-01-01'),
        },
      ];

      mockPlantService.getPlantList.mockResolvedValue({
        count: 1,
        plants: mockPlants,
      });
      mockPlantService.getPlantDevices.mockResolvedValue([
        { deviceId: 'DEVICE_1', deviceName: '设备1', status: 'online' },
      ]);
      mockPlantService.getLatestDiagnoses.mockResolvedValue(
        new Map([['PLANT_1', { diagnosisCardId: 'DIAG_1', healthScore: 85, status: 'healthy', createdAt: new Date() }]])
      );

      await plantController.getPlants(req, res);

      const successCall = success.mock.calls[0];
      expect(successCall[1].list[0]).toMatchObject({
        plantId: 'PLANT_1',
        nickname: '小绿',
        device: {
          deviceId: 'DEVICE_1',
          deviceName: '设备1',
          status: 'online',
        },
        latestDiagnosis: {
          diagnosisCardId: 'DIAG_1',
          healthScore: 85,
          status: 'healthy',
        },
      });
    });
  });

  describe('createPlant', () => {
    it('创建植物成功', async () => {
      req.body = {
        nickname: '小绿',
        species: '绿萝',
        plantCategory: 'foliage',
        coverImageUrl: 'https://example.com/plant.jpg',
        locationName: '客厅',
      };

      const mockPlant = {
        plantId: 'PLANT_NEW',
        nickname: '小绿',
        species: '绿萝',
        plantCategory: 'foliage',
        coverImageUrl: 'https://example.com/plant.jpg',
        currentDeviceId: null,
        locationName: '客厅',
        locationCode: null,
        locationLat: null,
        locationLng: null,
        createdAt: new Date(),
      };

      mockPlantService.createPlant.mockResolvedValue(mockPlant);

      await plantController.createPlant(req, res);

      expect(mockPlantService.createPlant).toHaveBeenCalledWith('TEST_USER_123', {
        nickname: '小绿',
        species: '绿萝',
        plantCategory: 'foliage',
        coverImageUrl: 'https://example.com/plant.jpg',
        locationName: '客厅',
        currentDeviceId: undefined,
        locationCode: undefined,
        locationLat: undefined,
        locationLng: undefined,
        firstDiagnosis: undefined,
      });
      expect(success).toHaveBeenCalled();
    });

    it('无法获取用户信息返回 401', async () => {
      req.user = null;

      await plantController.createPlant(req, res);

      expect(error).toHaveBeenCalledWith(res, '无法获取用户信息', 401);
    });

    it('创建植物失败返回 500', async () => {
      req.body = { nickname: '小绿', plantCategory: 'foliage' };
      mockPlantService.createPlant.mockRejectedValue(new Error('数据库错误'));

      await plantController.createPlant(req, res);

      expect(error).toHaveBeenCalledWith(res, '创建植物失败: 数据库错误', 500);
    });

    it('创建植物包含首次诊断', async () => {
      req.body = {
        nickname: '小绿',
        plantCategory: 'foliage',
        firstDiagnosis: {
          healthScore: 90,
          status: 'healthy',
        },
      };

      const mockPlant = {
        plantId: 'PLANT_NEW',
        nickname: '小绿',
        plantCategory: 'foliage',
        createdAt: new Date(),
      };

      mockPlantService.createPlant.mockResolvedValue(mockPlant);

      await plantController.createPlant(req, res);

      expect(mockPlantService.createPlant).toHaveBeenCalledWith(
        'TEST_USER_123',
        expect.objectContaining({
          firstDiagnosis: {
            healthScore: 90,
            status: 'healthy',
          },
        })
      );
    });
  });

  describe('getPlantDetail', () => {
    it('获取植物详情成功', async () => {
      req.params = { plantId: 'PLANT_1' };

      const mockDetail = {
        plant: {
          plantId: 'PLANT_1',
          nickname: '小绿',
          species: '绿萝',
          plantCategory: 'foliage',
          coverImageUrl: 'https://example.com/plant.jpg',
          currentDeviceId: 'DEVICE_1',
          locationName: '客厅',
          locationCode: '110101',
          locationLat: 39.9,
          locationLng: 116.4,
          createdAt: new Date(),
        },
        device: {
          deviceId: 'DEVICE_1',
          deviceName: '设备1',
          macAddress: 'AA:BB:CC:DD:EE:FF',
          status: 'online',
          batteryLevel: 80,
          lastHeartbeat: new Date(),
        },
        latestDiagnosis: {
          diagnosisCardId: 'DIAG_1',
          healthScore: 85,
          status: 'healthy',
          issues: [],
          suggestions: [],
          createdAt: new Date(),
        },
        diagnosisHistory: [],
        careRecords: [],
        environmentData: null,
      };

      mockPlantService.getPlantDetail.mockResolvedValue(mockDetail);

      await plantController.getPlantDetail(req, res);

      expect(mockPlantService.getPlantDetail).toHaveBeenCalledWith('PLANT_1', 'TEST_USER_123');
      expect(res.json).toHaveBeenCalled();
    });

    it('植物不存在返回 404', async () => {
      req.params = { plantId: 'NOT_EXIST' };

      mockPlantService.getPlantDetail.mockResolvedValue(null);

      await plantController.getPlantDetail(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('获取详情失败返回 500', async () => {
      req.params = { plantId: 'PLANT_1' };

      mockPlantService.getPlantDetail.mockRejectedValue(new Error('数据库错误'));

      await plantController.getPlantDetail(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('返回包含完整诊断历史的详情', async () => {
      req.params = { plantId: 'PLANT_1' };

      const mockDetail = {
        plant: {
          plantId: 'PLANT_1',
          nickname: '小绿',
          species: '绿萝',
          plantCategory: 'foliage',
          coverImageUrl: 'https://example.com/plant.jpg',
          currentDeviceId: null,
          locationName: '客厅',
          createdAt: new Date(),
        },
        device: null,
        latestDiagnosis: null,
        diagnosisHistory: [
          {
            diagnosisCardId: 'DIAG_1',
            healthScore: 85,
            status: 'healthy',
            issues: ['叶片发黄'],
            suggestions: ['增加光照'],
            createdAt: new Date('2024-01-01'),
          },
        ],
        careRecords: [
          {
            recordId: 'RECORD_1',
            actionType: 'water',
            description: '浇水',
            performedAt: new Date(),
            createdAt: new Date(),
          },
        ],
        environmentData: { temperature: 25, humidity: 60 },
      };

      mockPlantService.getPlantDetail.mockResolvedValue(mockDetail);

      await plantController.getPlantDetail(req, res);

      // 验证服务被调用且响应被返回
      expect(mockPlantService.getPlantDetail).toHaveBeenCalledWith('PLANT_1', 'TEST_USER_123');
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('updatePlant', () => {
    it('更新植物成功', async () => {
      req.params = { plantId: 'PLANT_1' };
      req.body = { nickname: '新名字', locationName: '阳台' };

      const mockPlant = {
        plantId: 'PLANT_1',
        nickname: '新名字',
        species: '绿萝',
        plantCategory: 'foliage',
        coverImageUrl: 'https://example.com/plant.jpg',
        currentDeviceId: null,
        locationName: '阳台',
        locationCode: null,
        locationLat: null,
        locationLng: null,
        updatedAt: new Date(),
      };

      mockPlantService.updatePlant.mockResolvedValue(mockPlant);

      await plantController.updatePlant(req, res);

      expect(mockPlantService.updatePlant).toHaveBeenCalledWith('PLANT_1', 'TEST_USER_123', {
        nickname: '新名字',
        locationName: '阳台',
      });
      expect(success).toHaveBeenCalled();
    });

    it('植物不存在返回 404', async () => {
      req.params = { plantId: 'NOT_EXIST' };
      req.body = { nickname: '新名字' };

      mockPlantService.updatePlant.mockResolvedValue(null);

      await plantController.updatePlant(req, res);

      expect(error).toHaveBeenCalledWith(res, '植物不存在', 404, 404);
    });

    it('更新失败返回 500', async () => {
      req.params = { plantId: 'PLANT_1' };
      req.body = { nickname: '新名字' };

      mockPlantService.updatePlant.mockRejectedValue(new Error('数据库错误'));

      await plantController.updatePlant(req, res);

      expect(error).toHaveBeenCalledWith(res, '更新植物失败', 500);
    });
  });

  describe('deletePlant', () => {
    it('删除植物成功', async () => {
      req.params = { plantId: 'PLANT_1' };

      mockPlantService.deletePlant.mockResolvedValue(true);

      await plantController.deletePlant(req, res);

      expect(mockPlantService.deletePlant).toHaveBeenCalledWith('PLANT_1', 'TEST_USER_123');
      expect(success).toHaveBeenCalledWith(res, null, '删除成功');
    });

    it('植物不存在返回 404', async () => {
      req.params = { plantId: 'NOT_EXIST' };

      mockPlantService.deletePlant.mockResolvedValue(false);

      await plantController.deletePlant(req, res);

      expect(error).toHaveBeenCalledWith(res, '植物不存在', 404, 404);
    });

    it('删除失败返回 500', async () => {
      req.params = { plantId: 'PLANT_1' };

      mockPlantService.deletePlant.mockRejectedValue(new Error('数据库错误'));

      await plantController.deletePlant(req, res);

      expect(error).toHaveBeenCalledWith(res, '删除植物失败', 500);
    });
  });
});
