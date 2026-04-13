/**
 * BaseService 单元测试
 */

const BaseService = require('../../../src/services/BaseService');
const logger = require('../../../src/utils/logger');

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  error: jest.fn(),
}));

describe('BaseService', () => {
  let mockModel;
  let baseService;

  beforeEach(() => {
    // 创建 mock model
    mockModel = {
      findByPk: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      findAndCountAll: jest.fn(),
    };

    baseService = new BaseService(mockModel, 'TestModel');
    jest.clearAllMocks();
  });

  describe('构造函数', () => {
    it('应正确初始化 model 和 modelName', () => {
      expect(baseService.model).toBe(mockModel);
      expect(baseService.modelName).toBe('TestModel');
    });
  });

  describe('findById', () => {
    it('应通过主键查找记录', async () => {
      const mockRecord = { id: 1, name: 'Test' };
      mockModel.findByPk.mockResolvedValue(mockRecord);

      const result = await baseService.findById(1);

      expect(mockModel.findByPk).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockRecord);
    });

    it('应返回 null 当记录不存在', async () => {
      mockModel.findByPk.mockResolvedValue(null);

      const result = await baseService.findById(999);

      expect(result).toBeNull();
    });

    it('应在出错时记录日志并抛出错误', async () => {
      const error = new Error('Database error');
      mockModel.findByPk.mockRejectedValue(error);

      await expect(baseService.findById(1)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith('TestModel.findById error:', error);
    });
  });

  describe('findOne', () => {
    it('应根据条件查找单条记录', async () => {
      const mockRecord = { id: 1, name: 'Test', status: 'active' };
      mockModel.findOne.mockResolvedValue(mockRecord);
      const conditions = { status: 'active' };

      const result = await baseService.findOne(conditions);

      expect(mockModel.findOne).toHaveBeenCalledWith({ where: conditions });
      expect(result).toEqual(mockRecord);
    });

    it('应返回 null 当没有匹配记录', async () => {
      mockModel.findOne.mockResolvedValue(null);

      const result = await baseService.findOne({ status: 'nonexistent' });

      expect(result).toBeNull();
    });

    it('应在出错时记录日志并抛出错误', async () => {
      const error = new Error('Database error');
      mockModel.findOne.mockRejectedValue(error);

      await expect(baseService.findOne({})).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith('TestModel.findOne error:', error);
    });
  });

  describe('findAll', () => {
    it('应查找所有记录（无条件）', async () => {
      const mockRecords = [{ id: 1 }, { id: 2 }];
      mockModel.findAll.mockResolvedValue(mockRecords);

      const result = await baseService.findAll();

      expect(mockModel.findAll).toHaveBeenCalledWith({
        where: {},
      });
      expect(result).toEqual(mockRecords);
    });

    it('应根据条件查找记录', async () => {
      const mockRecords = [{ id: 1, status: 'active' }];
      mockModel.findAll.mockResolvedValue(mockRecords);
      const conditions = { status: 'active' };

      const result = await baseService.findAll(conditions);

      expect(mockModel.findAll).toHaveBeenCalledWith({
        where: conditions,
      });
      expect(result).toEqual(mockRecords);
    });

    it('应支持额外选项', async () => {
      const mockRecords = [{ id: 1 }];
      mockModel.findAll.mockResolvedValue(mockRecords);
      const options = { order: [['created_at', 'DESC']], limit: 10 };

      const result = await baseService.findAll({}, options);

      expect(mockModel.findAll).toHaveBeenCalledWith({
        where: {},
        order: [['created_at', 'DESC']],
        limit: 10,
      });
    });

    it('应在出错时记录日志并抛出错误', async () => {
      const error = new Error('Database error');
      mockModel.findAll.mockRejectedValue(error);

      await expect(baseService.findAll()).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith('TestModel.findAll error:', error);
    });
  });

  describe('create', () => {
    it('应创建新记录', async () => {
      const data = { name: 'New Record', status: 'active' };
      const mockRecord = { id: 1, ...data };
      mockModel.create.mockResolvedValue(mockRecord);

      const result = await baseService.create(data);

      expect(mockModel.create).toHaveBeenCalledWith(data);
      expect(result).toEqual(mockRecord);
    });

    it('应在出错时记录日志并抛出错误', async () => {
      const error = new Error('Validation error');
      mockModel.create.mockRejectedValue(error);

      await expect(baseService.create({})).rejects.toThrow('Validation error');
      expect(logger.error).toHaveBeenCalledWith('TestModel.create error:', error);
    });
  });

  describe('update', () => {
    it('应更新存在的记录', async () => {
      const mockRecord = {
        id: 1,
        name: 'Old Name',
        update: jest.fn().mockResolvedValue({ id: 1, name: 'New Name' }),
      };
      mockModel.findByPk.mockResolvedValue(mockRecord);

      const result = await baseService.update(1, { name: 'New Name' });

      expect(mockModel.findByPk).toHaveBeenCalledWith(1);
      expect(mockRecord.update).toHaveBeenCalledWith({ name: 'New Name' });
      expect(result).toEqual({ id: 1, name: 'New Name' });
    });

    it('应返回 null 当记录不存在', async () => {
      mockModel.findByPk.mockResolvedValue(null);

      const result = await baseService.update(999, { name: 'New Name' });

      expect(result).toBeNull();
    });

    it('应在出错时记录日志并抛出错误', async () => {
      const error = new Error('Database error');
      mockModel.findByPk.mockRejectedValue(error);

      await expect(baseService.update(1, {})).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith('TestModel.update error:', error);
    });
  });

  describe('delete', () => {
    it('应删除存在的记录', async () => {
      const mockRecord = {
        id: 1,
        destroy: jest.fn().mockResolvedValue(undefined),
      };
      mockModel.findByPk.mockResolvedValue(mockRecord);

      const result = await baseService.delete(1);

      expect(mockModel.findByPk).toHaveBeenCalledWith(1);
      expect(mockRecord.destroy).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('应返回 null 当记录不存在', async () => {
      mockModel.findByPk.mockResolvedValue(null);

      const result = await baseService.delete(999);

      expect(result).toBeNull();
    });

    it('应在出错时记录日志并抛出错误', async () => {
      const error = new Error('Database error');
      mockModel.findByPk.mockRejectedValue(error);

      await expect(baseService.delete(1)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith('TestModel.delete error:', error);
    });
  });

  describe('paginate', () => {
    it('应返回分页数据', async () => {
      const mockRows = [{ id: 1 }, { id: 2 }];
      mockModel.findAndCountAll.mockResolvedValue({
        count: 100,
        rows: mockRows,
      });

      const result = await baseService.paginate({}, 1, 20);

      expect(mockModel.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        offset: 0,
        limit: 20,
      });
      expect(result).toEqual({
        total: 100,
        page: 1,
        pageSize: 20,
        list: mockRows,
      });
    });

    it('应计算正确的 offset', async () => {
      mockModel.findAndCountAll.mockResolvedValue({
        count: 100,
        rows: [],
      });

      await baseService.paginate({}, 3, 10);

      expect(mockModel.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        offset: 20,
        limit: 10,
      });
    });

    it('应支持额外选项', async () => {
      mockModel.findAndCountAll.mockResolvedValue({
        count: 50,
        rows: [],
      });
      const options = { order: [['created_at', 'DESC']] };

      await baseService.paginate({ status: 'active' }, 1, 10, options);

      expect(mockModel.findAndCountAll).toHaveBeenCalledWith({
        where: { status: 'active' },
        offset: 0,
        limit: 10,
        order: [['created_at', 'DESC']],
      });
    });

    it('应在出错时记录日志并抛出错误', async () => {
      const error = new Error('Database error');
      mockModel.findAndCountAll.mockRejectedValue(error);

      await expect(baseService.paginate()).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith('TestModel.paginate error:', error);
    });
  });
});
