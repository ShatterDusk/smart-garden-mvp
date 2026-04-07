/**
 * CareRecordController 单元测试
 */

// 必须在导入 Controller 之前设置 Mock
jest.mock('../../../src/services', () => {
  const mockCareRecordService = {
    getCareRecordList: jest.fn(),
    getPlantsForRecords: jest.fn(),
    createCareRecord: jest.fn(),
    updateCareRecord: jest.fn(),
    deleteCareRecord: jest.fn(),
  };
  return {
    CareRecordService: jest.fn(() => mockCareRecordService),
  };
});

jest.mock('../../../src/utils/response', () => ({
  success: jest.fn((res, data, message) => {
    res.json({ code: 200, message: message || 'success', data });
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

const careRecordController = require('../../../src/controllers/careRecordController');
const { CareRecordService } = require('../../../src/services');
const { success, error } = require('../../../src/utils/response');

describe('CareRecordController', () => {
  let req;
  let res;
  let mockCareRecordService;

  beforeEach(() => {
    mockCareRecordService = new CareRecordService();

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

  describe('getCareRecords', () => {
    it('获取养护记录列表成功', async () => {
      req.query = { plantId: 'PLANT_1', page: '1', pageSize: '10' };

      const mockRecords = [
        {
          get: jest.fn(() => ({
            record_id: 'RECORD_1',
            plant_id: 'PLANT_1',
            user_id: 'TEST_USER_123',
            action_type: 'water',
            description: '浇水',
            images: ['https://example.com/water.jpg'],
            performed_at: new Date(),
            created_at: new Date(),
          })),
        },
        {
          get: jest.fn(() => ({
            record_id: 'RECORD_2',
            plant_id: 'PLANT_1',
            user_id: 'TEST_USER_123',
            action_type: 'fertilize',
            description: '施肥',
            images: null,
            performed_at: new Date(),
            created_at: new Date(),
          })),
        },
      ];

      mockCareRecordService.getCareRecordList.mockResolvedValue({
        count: 2,
        records: mockRecords,
      });
      mockCareRecordService.getPlantsForRecords.mockResolvedValue([
        { plant_id: 'PLANT_1', nickname: '小绿', cover_image_url: 'https://example.com/plant.jpg' },
      ]);

      await careRecordController.getCareRecords(req, res);

      expect(mockCareRecordService.getCareRecordList).toHaveBeenCalledWith('TEST_USER_123', {
        plantId: 'PLANT_1',
        page: '1',
        pageSize: '10',
      });
      expect(success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          list: expect.arrayContaining([
            expect.objectContaining({
              recordId: 'RECORD_1',
              actionType: 'water',
              description: '浇水',
            }),
            expect.objectContaining({
              recordId: 'RECORD_2',
              actionType: 'fertilize',
              description: '施肥',
            }),
          ]),
          pagination: expect.objectContaining({
            page: 1,
            pageSize: 10,
            total: 2,
            totalPages: 1,
          }),
        })
      );
    });

    it('使用 validatedQuery 优先于 query', async () => {
      req.validatedQuery = { page: 2, pageSize: 20 };
      req.query = { page: '1', pageSize: '10' };

      mockCareRecordService.getCareRecordList.mockResolvedValue({ count: 0, records: [] });
      mockCareRecordService.getPlantsForRecords.mockResolvedValue([]);

      await careRecordController.getCareRecords(req, res);

      expect(mockCareRecordService.getCareRecordList).toHaveBeenCalledWith('TEST_USER_123', {
        plantId: undefined,
        page: 2,
        pageSize: 20,
      });
    });

    it('获取养护记录失败返回 500', async () => {
      mockCareRecordService.getCareRecordList.mockRejectedValue(new Error('数据库错误'));

      await careRecordController.getCareRecords(req, res);

      expect(error).toHaveBeenCalledWith(res, '获取养护记录列表失败', 500);
    });

    it('空记录列表返回空数组', async () => {
      mockCareRecordService.getCareRecordList.mockResolvedValue({ count: 0, records: [] });
      mockCareRecordService.getPlantsForRecords.mockResolvedValue([]);

      await careRecordController.getCareRecords(req, res);

      expect(success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          list: [],
          pagination: expect.objectContaining({
            total: 0,
            totalPages: 0,
          }),
        })
      );
    });
  });

  describe('createCareRecord', () => {
    it('创建养护记录成功', async () => {
      req.body = {
        plantId: 'PLANT_1',
        actionType: 'water',
        description: '浇水 200ml',
        images: ['https://example.com/water.jpg'],
        performedAt: new Date().toISOString(),
      };

      const mockRecord = {
        get: jest.fn(() => ({
          record_id: 'RECORD_NEW',
          plant_id: 'PLANT_1',
          user_id: 'TEST_USER_123',
          action_type: 'water',
          description: '浇水 200ml',
          images: ['https://example.com/water.jpg'],
          performed_at: new Date(),
          created_at: new Date(),
        })),
      };

      mockCareRecordService.createCareRecord.mockResolvedValue(mockRecord);

      await careRecordController.createCareRecord(req, res);

      expect(mockCareRecordService.createCareRecord).toHaveBeenCalledWith(
        'PLANT_1',
        'TEST_USER_123',
        {
          actionType: 'water',
          description: '浇水 200ml',
          images: ['https://example.com/water.jpg'],
          performedAt: expect.any(String),
        }
      );
      expect(success).toHaveBeenCalled();
    });

    it('植物不存在返回 404', async () => {
      req.body = {
        plantId: 'NOT_EXIST',
        actionType: 'water',
        description: '浇水',
      };

      mockCareRecordService.createCareRecord.mockResolvedValue(null);

      await careRecordController.createCareRecord(req, res);

      expect(error).toHaveBeenCalledWith(res, '植物不存在', 404, 404);
    });

    it('创建养护记录失败返回 500', async () => {
      req.body = {
        plantId: 'PLANT_1',
        actionType: 'water',
        description: '浇水',
      };

      mockCareRecordService.createCareRecord.mockRejectedValue(new Error('数据库错误'));

      await careRecordController.createCareRecord(req, res);

      expect(error).toHaveBeenCalledWith(res, '创建养护记录失败', 500);
    });

    it('支持不带图片的养护记录', async () => {
      req.body = {
        plantId: 'PLANT_1',
        actionType: 'prune',
        description: '修剪枯叶',
      };

      const mockRecord = {
        get: jest.fn(() => ({
          record_id: 'RECORD_NEW',
          plant_id: 'PLANT_1',
          action_type: 'prune',
          description: '修剪枯叶',
          images: null,
          performed_at: new Date(),
          created_at: new Date(),
        })),
      };

      mockCareRecordService.createCareRecord.mockResolvedValue(mockRecord);

      await careRecordController.createCareRecord(req, res);

      const successCall = success.mock.calls[0];
      expect(successCall[1].images).toBeNull();
    });
  });

  describe('updateCareRecord', () => {
    it('更新养护记录成功', async () => {
      req.params = { recordId: 'RECORD_1' };
      req.body = {
        description: '更新后的描述',
        images: ['https://example.com/new.jpg'],
      };

      const mockRecord = {
        get: jest.fn(() => ({
          record_id: 'RECORD_1',
          plant_id: 'PLANT_1',
          action_type: 'water',
          description: '更新后的描述',
          images: ['https://example.com/new.jpg'],
          performed_at: new Date(),
          created_at: new Date(),
        })),
      };

      mockCareRecordService.updateCareRecord.mockResolvedValue(mockRecord);

      await careRecordController.updateCareRecord(req, res);

      expect(mockCareRecordService.updateCareRecord).toHaveBeenCalledWith(
        'RECORD_1',
        'TEST_USER_123',
        {
          description: '更新后的描述',
          images: ['https://example.com/new.jpg'],
        }
      );
      expect(success).toHaveBeenCalled();
    });

    it('养护记录不存在返回 404', async () => {
      req.params = { recordId: 'NOT_EXIST' };
      req.body = { description: '更新' };

      mockCareRecordService.updateCareRecord.mockResolvedValue(null);

      await careRecordController.updateCareRecord(req, res);

      expect(error).toHaveBeenCalledWith(res, '养护记录不存在', 404, 404);
    });

    it('更新失败返回 500', async () => {
      req.params = { recordId: 'RECORD_1' };
      req.body = { description: '更新' };

      mockCareRecordService.updateCareRecord.mockRejectedValue(new Error('数据库错误'));

      await careRecordController.updateCareRecord(req, res);

      expect(error).toHaveBeenCalledWith(res, '更新养护记录失败', 500);
    });
  });

  describe('deleteCareRecord', () => {
    it('删除养护记录成功', async () => {
      req.params = { recordId: 'RECORD_1' };

      mockCareRecordService.deleteCareRecord.mockResolvedValue(true);

      await careRecordController.deleteCareRecord(req, res);

      expect(mockCareRecordService.deleteCareRecord).toHaveBeenCalledWith('RECORD_1', 'TEST_USER_123');
      expect(success).toHaveBeenCalledWith(res, null, '删除成功');
    });

    it('养护记录不存在返回 404', async () => {
      req.params = { recordId: 'NOT_EXIST' };

      mockCareRecordService.deleteCareRecord.mockResolvedValue(false);

      await careRecordController.deleteCareRecord(req, res);

      expect(error).toHaveBeenCalledWith(res, '养护记录不存在', 404, 404);
    });

    it('删除失败返回 500', async () => {
      req.params = { recordId: 'RECORD_1' };

      mockCareRecordService.deleteCareRecord.mockRejectedValue(new Error('数据库错误'));

      await careRecordController.deleteCareRecord(req, res);

      expect(error).toHaveBeenCalledWith(res, '删除养护记录失败', 500);
    });
  });
});
