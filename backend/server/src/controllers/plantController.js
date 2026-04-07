/**
 * 植物模块控制器
 * 处理植物相关的请求响应
 */

const { PlantService } = require('../services');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');

const plantService = new PlantService();

/**
 * 获取植物列表
 * GET /api/plants
 */
const getPlants = async (req, res) => {
  try {
    const query = req.validatedQuery || req.query;
    const { page = 1, pageSize = 20 } = query;
    const userId = req.user.userId;

    const { count, plants } = await plantService.getPlantList(userId, { page, pageSize });

    const deviceIds = plants.filter(p => p.currentDeviceId).map(p => p.currentDeviceId);
    const devices = await plantService.getPlantDevices(deviceIds);
    const deviceMap = new Map(devices.map(d => [d.deviceId, d]));

    const plantIds = plants.map(p => p.plantId);
    const diagnosisMap = await plantService.getLatestDiagnoses(plantIds);

    const formattedPlants = plants.map((plant) => {
      const device = plant.currentDeviceId ? deviceMap.get(plant.currentDeviceId) : null;
      const latestDiagnosis = diagnosisMap.get(plant.plantId);

      const createdAt = new Date(plant.createdAt);
      const now = new Date();
      const joinedDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

      return {
        plantId: plant.plantId,
        nickname: plant.nickname,
        species: plant.species || '',
        plantCategory: plant.plantCategory,
        coverImageUrl: plant.coverImageUrl,
        currentDeviceId: plant.currentDeviceId,
        locationName: plant.locationName,
        locationCode: plant.locationCode,
        locationLat: plant.locationLat,
        locationLng: plant.locationLng,
        createdAt: plant.createdAt,
        joinedDays: joinedDays,
        device: device
          ? {
              deviceId: device.deviceId,
              deviceName: device.deviceName,
              status: device.status,
            }
          : null,
        latestDiagnosis: latestDiagnosis
          ? {
              diagnosisCardId: latestDiagnosis.diagnosisCardId,
              healthScore: latestDiagnosis.healthScore,
              status: latestDiagnosis.status,
              createdAt: latestDiagnosis.createdAt,
            }
          : null,
      };
    });

    return success(res, {
      list: formattedPlants,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total: count,
        totalPages: Math.ceil(count / parseInt(pageSize)),
      },
    });
  } catch (err) {
    console.error('获取植物列表失败:', err);
    return error(res, '获取植物列表失败', 500);
  }
};

/**
 * 创建植物
 * POST /api/plants
 */
const createPlant = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      logger.error('创建植物失败: 无法获取用户信息', { user: req.user });
      return error(res, '无法获取用户信息', 401);
    }

    const userId = req.user.userId;
    logger.info('开始创建植物', { userId, body: req.body });

    const {
      nickname,
      species,
      plantCategory,
      coverImageUrl,
      currentDeviceId,
      locationName,
      locationCode,
      locationLat,
      locationLng,
      firstDiagnosis,
    } = req.body;

    const plant = await plantService.createPlant(userId, {
      nickname,
      species,
      plantCategory,
      coverImageUrl,
      currentDeviceId,
      locationName,
      locationCode,
      locationLat,
      locationLng,
      firstDiagnosis,
    });

    return success(res, {
      plantId: plant.plantId,
      nickname: plant.nickname,
      species: plant.species,
      plantCategory: plant.plantCategory,
      coverImageUrl: plant.coverImageUrl,
      currentDeviceId: plant.currentDeviceId,
      locationName: plant.locationName,
      locationCode: plant.locationCode,
      locationLat: plant.locationLat,
      locationLng: plant.locationLng,
      createdAt: plant.createdAt,
    });
  } catch (err) {
    console.error('创建植物失败:', err);
    logger.error('创建植物失败 - 详细错误:', {
      message: err.message,
      name: err.name,
      stack: err.stack,
      errors: err.errors,
      sql: err.sql,
      original: err.original,
      userId: req.user?.userId,
      body: req.body,
    });
    return error(res, '创建植物失败: ' + err.message, 500);
  }
};

/**
 * 获取植物详情
 * GET /api/plants/:plantId
 */
const getPlantDetail = async (req, res) => {
  try {
    const { plantId } = req.params;
    const userId = req.user.userId;

    const detail = await plantService.getPlantDetail(plantId, userId);

    if (!detail) {
      return error(res, '植物不存在', 404, 404);
    }

    const { plant, device, latestDiagnosis, diagnosisHistory, careRecords, environmentData } = detail;

    return success(res, {
      plantId: plant.plantId,
      nickname: plant.nickname,
      species: plant.species,
      plantCategory: plant.plantCategory,
      coverImageUrl: plant.coverImageUrl,
      currentDeviceId: plant.currentDeviceId,
      locationName: plant.locationName,
      locationCode: plant.locationCode,
      locationLat: plant.locationLat,
      locationLng: plant.locationLng,
      createdAt: plant.createdAt,
      device: device
        ? {
            deviceId: device.deviceId,
            deviceName: device.deviceName,
            macAddress: device.macAddress,
            status: device.status,
            batteryLevel: device.batteryLevel,
            lastHeartbeat: device.lastHeartbeat,
          }
        : null,
      firstDiagnosis: latestDiagnosis
        ? {
            cardId: latestDiagnosis.diagnosisCardId,
            healthScore: latestDiagnosis.healthScore,
            status: latestDiagnosis.status,
            issues: latestDiagnosis.issues,
            suggestions: latestDiagnosis.suggestions,
            createdAt: latestDiagnosis.createdAt,
          }
        : null,
      diagnosisHistory: diagnosisHistory.map(d => ({
        cardId: d.diagnosisCardId,
        healthScore: d.healthScore,
        status: d.status,
        issues: d.issues,
        suggestions: d.suggestions,
        createdAt: d.createdAt,
      })),
      careRecords: careRecords.map(r => ({
        recordId: r.recordId,
        actionType: r.actionType,
        description: r.description,
        performedAt: r.performedAt,
        createdAt: r.createdAt,
      })),
      environmentData,
    });
  } catch (err) {
    console.error('获取植物详情失败:', err);
    return error(res, '获取植物详情失败', 500);
  }
};

/**
 * 更新植物
 * PUT /api/plants/:plantId
 */
const updatePlant = async (req, res) => {
  try {
    const { plantId } = req.params;
    const userId = req.user.userId;

    const plant = await plantService.updatePlant(plantId, userId, req.body);

    if (!plant) {
      return error(res, '植物不存在', 404, 404);
    }

    return success(res, {
      plantId: plant.plantId,
      nickname: plant.nickname,
      species: plant.species,
      plantCategory: plant.plantCategory,
      coverImageUrl: plant.coverImageUrl,
      currentDeviceId: plant.currentDeviceId,
      locationName: plant.locationName,
      locationCode: plant.locationCode,
      locationLat: plant.locationLat,
      locationLng: plant.locationLng,
      updatedAt: plant.updatedAt,
    });
  } catch (err) {
    console.error('更新植物失败:', err);
    return error(res, '更新植物失败', 500);
  }
};

/**
 * 删除植物
 * DELETE /api/plants/:plantId
 */
const deletePlant = async (req, res) => {
  try {
    const { plantId } = req.params;
    const userId = req.user.userId;

    const deleted = await plantService.deletePlant(plantId, userId);

    if (!deleted) {
      return error(res, '植物不存在', 404, 404);
    }

    return success(res, null, '删除成功');
  } catch (err) {
    console.error('删除植物失败:', err);
    return error(res, '删除植物失败', 500);
  }
};

module.exports = {
  getPlants,
  createPlant,
  getPlantDetail,
  updatePlant,
  deletePlant,
};
