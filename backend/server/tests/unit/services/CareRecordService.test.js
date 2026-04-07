/**
 * CareRecordService 单元测试
 */

const CareRecordService = require('../../../src/services/CareRecordService');
const { CareRecord, Plant } = require('../../../src/models');
const logger = require('../../../src/utils/logger');

// Mock 依赖
jest.mock('../../../src/models', () => ({
  CareRecord: {
    create: jest.fn(),
    findAndCountAll: jest.fn(),
    findOne: jest.fn(),
  },
  Plant: {
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('CareRecordService', () => {
  let careRecordService;

  beforeEach(() => {
    careRecordService = new CareRecordService();
    jest.clearAllMocks();
  });

  describe('generateRecordId', () => {
    it('生成正确的记录ID格式', () => {
      const recordId = careRecordService.generateRecordId();

      // ID 格式为 CARE_ 前缀 + 16位十六进制字符（支持大小写）
      expect(recordId).toMatch(/^CARE_[A-Fa-f0-9]{16}$/);
    });

    it('每次生成不同的ID', () => {
      const id1 = careRecordService.generateRecordId();
      const id2 = careRecordService.generateRecordId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('createCareRecord', () => {
    it('创建养护记录成功', async () => {
      const mockPlant = {
        plant_id: 'PLANT_1',
        user_id: 'USER_1',
      };

      const mockRecord = {
        record_id: 'CARE_123',
        plant_id: 'PLANT_1',
        user_id: 'USER_1',
        action_type: 'water',
        description: '浇水',
      };

      Plant.findOne.mockResolvedValue(mockPlant);
      CareRecord.create.mockResolvedValue(mockRecord);

      const result = await careRecordService.createCareRecord('PLANT_1', 'USER_1', {
        actionType: 'water',
        description: '浇水',
      });

      expect(Plant.findOne).toHaveBeenCalledWith({
        where: { plant_id: 'PLANT_1', user_id: 'USER_1' },
      });
      expect(CareRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          plant_id: 'PLANT_1',
          user_id: 'USER_1',
          action_type: 'water',
          description: '浇水',
        })
      );
      expect(result).toEqual(mockRecord);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('CareRecord created'));
    });

    it('植物不存在返回 null', async () => {
      Plant.findOne.mockResolvedValue(null);

      const result = await careRecordService.createCareRecord('NOT_EXIST', 'USER_1', {
        actionType: 'water',
      });

      expect(result).toBeNull();
      expect(CareRecord.create).not.toHaveBeenCalled();
    });

    it('设置默认执行时间', async () => {
      const mockPlant = { plant_id: 'PLANT_1', user_id: 'USER_1' };
      Plant.findOne.mockResolvedValue(mockPlant);
      CareRecord.create.mockResolvedValue({ record_id: 'CARE_123' });

      await careRecordService.createCareRecord('PLANT_1', 'USER_1', {
        actionType: 'water',
      });

      expect(CareRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          performed_at: expect.any(Date),
        })
      );
    });

    it('创建失败抛出错误', async () => {
      const mockPlant = { plant_id: 'PLANT_1', user_id: 'USER_1' };
      Plant.findOne.mockResolvedValue(mockPlant);
      CareRecord.create.mockRejectedValue(new Error('数据库错误'));

      await expect(
        careRecordService.createCareRecord('PLANT_1', 'USER_1', { actionType: 'water' })
      ).rejects.toThrow('数据库错误');

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getCareRecordList', () => {
    it('获取养护记录列表', async () => {
      const mockRecords = [
        { record_id: 'CARE_1', action_type: 'water' },
        { record_id: 'CARE_2', action_type: 'fertilize' },
      ];

      CareRecord.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockRecords,
      });

      const result = await careRecordService.getCareRecordList('USER_1', { page: 1, pageSize: 10 });

      expect(CareRecord.findAndCountAll).toHaveBeenCalledWith({
        where: { user_id: 'USER_1' },
        order: [['performed_at', 'DESC']],
        offset: 0,
        limit: 10,
      });
      expect(result.count).toBe(2);
      expect(result.records).toEqual(mockRecords);
    });

    it('按植物ID筛选', async () => {
      CareRecord.findAndCountAll.mockResolvedValue({ count: 1, rows: [] });

      await careRecordService.getCareRecordList('USER_1', {
        plantId: 'PLANT_1',
        page: 1,
        pageSize: 10,
      });

      expect(CareRecord.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id: 'USER_1', plant_id: 'PLANT_1' },
        })
      );
    });

    it('分页计算正确', async () => {
      CareRecord.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await careRecordService.getCareRecordList('USER_1', { page: 3, pageSize: 20 });

      expect(CareRecord.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 40, // (3-1) * 20
          limit: 20,
        })
      );
    });
  });

  describe('getRecordById', () => {
    it('根据ID获取记录', async () => {
      const mockRecord = { record_id: 'CARE_1', action_type: 'water' };
      CareRecord.findOne.mockResolvedValue(mockRecord);

      const result = await careRecordService.getRecordById('CARE_1', 'USER_1');

      expect(CareRecord.findOne).toHaveBeenCalledWith({
        where: { record_id: 'CARE_1', user_id: 'USER_1' },
      });
      expect(result).toEqual(mockRecord);
    });
  });

  describe('updateCareRecord', () => {
    it('更新养护记录成功', async () => {
      const mockRecord = {
        record_id: 'CARE_1',
        update: jest.fn().mockResolvedValue(true),
      };

      CareRecord.findOne.mockResolvedValue(mockRecord);

      const result = await careRecordService.updateCareRecord('CARE_1', 'USER_1', {
        description: '新描述',
        actionType: 'prune',
      });

      expect(mockRecord.update).toHaveBeenCalledWith({
        description: '新描述',
        action_type: 'prune',
      });
      expect(result).toEqual(mockRecord);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('CareRecord updated'));
    });

    it('记录不存在返回 null', async () => {
      CareRecord.findOne.mockResolvedValue(null);

      const result = await careRecordService.updateCareRecord('NOT_EXIST', 'USER_1', {
        description: '新描述',
      });

      expect(result).toBeNull();
    });

    it('空更新数据直接返回记录', async () => {
      const mockRecord = {
        record_id: 'CARE_1',
        update: jest.fn(),
      };

      CareRecord.findOne.mockResolvedValue(mockRecord);

      const result = await careRecordService.updateCareRecord('CARE_1', 'USER_1', {});

      expect(mockRecord.update).not.toHaveBeenCalled();
      expect(result).toEqual(mockRecord);
    });

    it('过滤不允许的字段', async () => {
      const mockRecord = {
        record_id: 'CARE_1',
        update: jest.fn().mockResolvedValue(true),
      };

      CareRecord.findOne.mockResolvedValue(mockRecord);

      await careRecordService.updateCareRecord('CARE_1', 'USER_1', {
        description: '新描述',
        invalidField: '不应该被更新',
        record_id: '不应该被更新',
      });

      expect(mockRecord.update).toHaveBeenCalledWith({
        description: '新描述',
      });
    });
  });

  describe('deleteCareRecord', () => {
    it('删除养护记录成功', async () => {
      const mockRecord = {
        record_id: 'CARE_1',
        destroy: jest.fn().mockResolvedValue(true),
      };

      CareRecord.findOne.mockResolvedValue(mockRecord);

      const result = await careRecordService.deleteCareRecord('CARE_1', 'USER_1');

      expect(mockRecord.destroy).toHaveBeenCalled();
      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('CareRecord deleted'));
    });

    it('记录不存在返回 false', async () => {
      CareRecord.findOne.mockResolvedValue(null);

      const result = await careRecordService.deleteCareRecord('NOT_EXIST', 'USER_1');

      expect(result).toBe(false);
    });
  });

  describe('getPlantsForRecords', () => {
    it('获取植物信息', async () => {
      const mockPlants = [
        { plant_id: 'PLANT_1', nickname: '小绿' },
        { plant_id: 'PLANT_2', nickname: '小红' },
      ];

      Plant.findAll.mockResolvedValue(mockPlants);

      const result = await careRecordService.getPlantsForRecords(['PLANT_1', 'PLANT_2']);

      expect(Plant.findAll).toHaveBeenCalledWith({
        where: { plant_id: ['PLANT_1', 'PLANT_2'] },
        attributes: ['plant_id', 'nickname', 'cover_image_url'],
      });
      expect(result).toEqual(mockPlants);
    });

    it('空数组返回空数组', async () => {
      const result = await careRecordService.getPlantsForRecords([]);

      expect(result).toEqual([]);
      expect(Plant.findAll).not.toHaveBeenCalled();
    });

    it('null 参数返回空数组', async () => {
      const result = await careRecordService.getPlantsForRecords(null);

      expect(result).toEqual([]);
      expect(Plant.findAll).not.toHaveBeenCalled();
    });

    it('查询失败返回空数组', async () => {
      Plant.findAll.mockRejectedValue(new Error('数据库错误'));

      const result = await careRecordService.getPlantsForRecords(['PLANT_1']);

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
