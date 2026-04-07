const PlantService = require('../../../src/services/PlantService');
const { Plant, Device, DiagnosisCard, CareRecord } = require('../../../src/models');

jest.mock('../../../src/models', () => ({
  Plant: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  Device: {
    findOne: jest.fn(),
    update: jest.fn(),
    findAll: jest.fn(),
  },
  DiagnosisCard: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
  },
  CareRecord: {
    findAll: jest.fn(),
  },
}));

jest.mock('../../../src/services/EnvironmentService', () => {
  return jest.fn().mockImplementation(() => ({
    getCurrentData: jest.fn().mockResolvedValue({}),
  }));
});

describe('PlantService', () => {
  let plantService;

  beforeEach(() => {
    plantService = new PlantService();
    jest.clearAllMocks();
  });

  describe('generatePlantId', () => {
    it('生成以 PLANT_ 开头的 ID', () => {
      const id = plantService.generatePlantId();
      expect(id).toMatch(/^PLANT_[A-Fa-f0-9]+$/);
    });
  });

  describe('createPlant', () => {
    it('创建植物', async () => {
      const mockPlant = {
        plant_id: 'PLANT_123',
        user_id: 'USER_123',
        nickname: '测试植物',
        species: '虎皮兰',
        plant_category: 'succulent',
      };

      Plant.create.mockResolvedValue(mockPlant);

      const result = await plantService.createPlant('USER_123', {
        nickname: '测试植物',
        species: '虎皮兰',
        plantCategory: 'succulent',
      });

      expect(result.plant_id).toBe('PLANT_123');
      expect(Plant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'USER_123',
          nickname: '测试植物',
          species: '虎皮兰',
        })
      );
    });

    it('创建植物并绑定设备', async () => {
      const mockPlant = {
        plant_id: 'PLANT_123',
        user_id: 'USER_123',
      };

      Plant.create.mockResolvedValue(mockPlant);

      await plantService.createPlant('USER_123', {
        nickname: '测试植物',
        species: '虎皮兰',
        plantCategory: 'succulent',
        currentDeviceId: 'DEVICE_123',
      });

      expect(Plant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          current_device_id: 'DEVICE_123',
        })
      );
    });
  });

  describe('getPlantById', () => {
    it('返回植物', async () => {
      const mockPlant = {
        plant_id: 'PLANT_123',
        user_id: 'USER_123',
      };

      Plant.findOne.mockResolvedValue(mockPlant);

      const result = await plantService.getPlantById('PLANT_123', 'USER_123');

      expect(result.plant_id).toBe('PLANT_123');
    });

    it('不验证用户时返回植物', async () => {
      const mockPlant = {
        plant_id: 'PLANT_123',
      };

      Plant.findByPk.mockResolvedValue(mockPlant);

      const result = await plantService.getPlantById('PLANT_123');

      expect(result.plant_id).toBe('PLANT_123');
    });
  });

  describe('getPlantList', () => {
    it('返回植物列表', async () => {
      const mockPlants = [
        { plant_id: 'PLANT_1', nickname: '植物1' },
        { plant_id: 'PLANT_2', nickname: '植物2' },
      ];

      Plant.findAndCountAll.mockResolvedValue({ count: 2, rows: mockPlants });

      const result = await plantService.getPlantList('USER_123', { page: 1, pageSize: 20 });

      expect(result.count).toBe(2);
      expect(result.plants.length).toBe(2);
    });
  });

  describe('updatePlant', () => {
    it('更新植物', async () => {
      const mockPlant = {
        plant_id: 'PLANT_123',
        user_id: 'USER_123',
        nickname: '旧昵称',
        update: jest.fn(),
      };

      Plant.findOne.mockResolvedValue(mockPlant);

      await plantService.updatePlant('PLANT_123', 'USER_123', { nickname: '新昵称' });

      expect(mockPlant.update).toHaveBeenCalled();
    });

    it('植物不存在返回 null', async () => {
      Plant.findOne.mockResolvedValue(null);

      const result = await plantService.updatePlant('NOT_EXIST', 'USER_123', { nickname: '新昵称' });

      expect(result).toBeNull();
    });
  });

  describe('deletePlant', () => {
    it('删除植物', async () => {
      const mockPlant = {
        plant_id: 'PLANT_123',
        user_id: 'USER_123',
        destroy: jest.fn(),
      };

      Plant.findOne.mockResolvedValue(mockPlant);

      const result = await plantService.deletePlant('PLANT_123', 'USER_123');

      expect(result).toBe(true);
      expect(mockPlant.destroy).toHaveBeenCalled();
    });

    it('植物不存在返回 false', async () => {
      Plant.findOne.mockResolvedValue(null);

      const result = await plantService.deletePlant('NOT_EXIST', 'USER_123');

      expect(result).toBe(false);
    });
  });

  describe('getPlantDetail', () => {
    it('返回植物详情', async () => {
      const mockPlant = {
        plant_id: 'PLANT_123',
        user_id: 'USER_123',
        current_device_id: null,
      };

      Plant.findOne.mockResolvedValue(mockPlant);
      DiagnosisCard.findOne.mockResolvedValue(null);
      DiagnosisCard.findAll.mockResolvedValue([]);
      CareRecord.findAll.mockResolvedValue([]);

      const result = await plantService.getPlantDetail('PLANT_123', 'USER_123');

      expect(result.plant).toBeDefined();
      expect(result.device).toBeNull();
      expect(result.latestDiagnosis).toBeNull();
    });
  });
});
