/**
 * 养护记录模块控制器
 * 处理养护记录相关的请求响应
 */

const { CareRecordService } = require('../services');
const { success, error } = require('../utils/response');

const careRecordService = new CareRecordService();

/**
 * 获取养护记录列表
 * GET /api/care-records
 */
const getCareRecords = async (req, res) => {
  try {
    const query = req.validatedQuery || req.query;
    const { plantId, page = 1, pageSize = 20 } = query;
    const userId = req.user.userId;

    const { count, records } = await careRecordService.getCareRecordList(userId, {
      plantId,
      page,
      pageSize,
    });

    const plantIds = records.filter(r => r.plantId).map(r => r.plantId);
    const plants = await careRecordService.getPlantsForRecords(plantIds);
    const plantMap = new Map(plants.map(p => [p.plantId, p]));

    const formattedRecords = records.map((record) => {
      const plant = record.plantId ? plantMap.get(record.plantId) : null;
      return {
        recordId: record.recordId,
        plantId: record.plantId,
        userId: record.userId,
        actionType: record.actionType,
        description: record.description,
        images: record.images,
        performedAt: record.performedAt,
        createdAt: record.createdAt,
        plant: plant
          ? {
              plantId: plant.plantId,
              nickname: plant.nickname,
              coverImageUrl: plant.coverImageUrl,
            }
          : null,
      };
    });

    return success(res, {
      list: formattedRecords,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total: count,
        totalPages: Math.ceil(count / parseInt(pageSize)),
      },
    });
  } catch (err) {
    console.error('获取养护记录列表失败:', err);
    return error(res, '获取养护记录列表失败', 500);
  }
};

/**
 * 创建养护记录
 * POST /api/care-records
 */
const createCareRecord = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { plantId, actionType, description, images, performedAt } = req.body;

    const record = await careRecordService.createCareRecord(plantId, userId, {
      actionType,
      description,
      images,
      performedAt,
    });

    if (!record) {
      return error(res, '植物不存在', 404, 404);
    }

    return success(res, {
      recordId: record.recordId,
      plantId: record.plantId,
      actionType: record.actionType,
      description: record.description,
      images: record.images,
      performedAt: record.performedAt,
      createdAt: record.createdAt,
    });
  } catch (err) {
    console.error('创建养护记录失败:', err);
    return error(res, '创建养护记录失败', 500);
  }
};

/**
 * 更新养护记录
 * PUT /api/care-records/:recordId
 */
const updateCareRecord = async (req, res) => {
  try {
    const { recordId } = req.params;
    const userId = req.user.userId;

    const record = await careRecordService.updateCareRecord(recordId, userId, req.body);

    if (!record) {
      return error(res, '养护记录不存在', 404, 404);
    }

    return success(res, {
      recordId: record.recordId,
      plantId: record.plantId,
      actionType: record.actionType,
      description: record.description,
      images: record.images,
      performedAt: record.performedAt,
      createdAt: record.createdAt,
    });
  } catch (err) {
    console.error('更新养护记录失败:', err);
    return error(res, '更新养护记录失败', 500);
  }
};

/**
 * 删除养护记录
 * DELETE /api/care-records/:recordId
 */
const deleteCareRecord = async (req, res) => {
  try {
    const { recordId } = req.params;
    const userId = req.user.userId;

    const deleted = await careRecordService.deleteCareRecord(recordId, userId);

    if (!deleted) {
      return error(res, '养护记录不存在', 404, 404);
    }

    return success(res, null, '删除成功');
  } catch (err) {
    console.error('删除养护记录失败:', err);
    return error(res, '删除养护记录失败', 500);
  }
};

module.exports = {
  getCareRecords,
  createCareRecord,
  updateCareRecord,
  deleteCareRecord,
};
