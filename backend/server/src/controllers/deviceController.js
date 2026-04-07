/**
 * 设备模块控制器
 * 处理设备相关的请求响应
 */

const { DeviceService } = require('../services');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');

const deviceService = new DeviceService();

/**
 * 获取设备列表
 * GET /api/devices
 */
const getDevices = async (req, res) => {
  try {
    const userId = req.user.userId;

    const devices = await deviceService.getDeviceList(userId);

    const boundPlants = await Promise.all(
      devices.map(d => deviceService.getBoundPlant(d.deviceId))
    );
    const plantMap = new Map();
    boundPlants.forEach((p, i) => {
      if (p) {
        plantMap.set(devices[i].deviceId, p);
      }
    });

    const formattedDevices = devices.map((device) => {
      const boundPlant = plantMap.get(device.deviceId);
      return {
        deviceId: device.deviceId,
        macAddress: device.macAddress,
        deviceName: device.deviceName,
        status: device.status,
        boundPlantId: boundPlant ? boundPlant.plantId : null,
        batteryLevel: device.batteryLevel,
        lastHeartbeat: device.lastHeartbeat,
        createdAt: device.createdAt,
        boundPlant: boundPlant
          ? {
              plantId: boundPlant.plantId,
              nickname: boundPlant.nickname,
              coverImageUrl: boundPlant.coverImageUrl,
            }
          : null,
      };
    });

    return success(res, formattedDevices);
  } catch (err) {
    logger.error('获取设备列表失败', { error: err.message });
    return error(res, '获取设备列表失败', 500);
  }
};

/**
 * 绑定设备
 * POST /api/devices/bind
 */
const bindDevice = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { macAddress, deviceName, plantId } = req.body;

    const device = await deviceService.bindDevice(userId, {
      macAddress,
      deviceName,
      plantId,
    });

    const boundPlant = plantId ? await deviceService.getBoundPlant(device.deviceId) : null;

    return success(res, {
      deviceId: device.deviceId,
      macAddress: device.macAddress,
      deviceName: device.deviceName,
      status: device.status,
      boundPlantId: boundPlant ? boundPlant.plantId : null,
      batteryLevel: device.batteryLevel,
      message: '设备绑定成功',
    });
  } catch (err) {
    logger.error('绑定设备失败', { error: err.message });
    return error(res, '绑定设备失败', 500);
  }
};

/**
 * 解绑设备
 * POST /api/devices/unbind
 */
const unbindDevice = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { deviceId } = req.body;

    const device = await deviceService.unbindDevice(deviceId, userId);

    if (!device) {
      return error(res, '设备不存在', 404, 404);
    }

    return success(res, null, '设备解绑成功');
  } catch (err) {
    logger.error('解绑设备失败', { error: err.message });
    return error(res, '解绑设备失败', 500);
  }
};

/**
 * 获取设备详情
 * GET /api/devices/:deviceId
 */
const getDeviceDetail = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.userId;

    const device = await deviceService.getDeviceById(deviceId, userId);

    if (!device) {
      return error(res, '设备不存在', 404, 404);
    }

    const boundPlant = await deviceService.getBoundPlant(deviceId);

    return success(res, {
      deviceId: device.deviceId,
      macAddress: device.macAddress,
      deviceName: device.deviceName,
      status: device.status,
      boundPlantId: boundPlant ? boundPlant.plantId : null,
      batteryLevel: device.batteryLevel,
      lastHeartbeat: device.lastHeartbeat,
      createdAt: device.createdAt,
      boundPlant: boundPlant
        ? {
            plantId: boundPlant.plantId,
            nickname: boundPlant.nickname,
            species: boundPlant.species,
            coverImageUrl: boundPlant.coverImageUrl,
          }
        : null,
    });
  } catch (err) {
    logger.error('获取设备详情失败', { error: err.message });
    return error(res, '获取设备详情失败', 500);
  }
};

/**
 * 设备数据上报
 * POST /api/devices/data
 */
const reportData = async (req, res) => {
  try {
    const { deviceId, plantId, timestamp, metrics, isSupplement } = req.body;

    if (!deviceId || !metrics) {
      return error(res, '缺少必要参数', 400);
    }

    const result = await deviceService.reportDeviceData({
      deviceId,
      plantId,
      timestamp,
      metrics,
      isSupplement,
    });

    if (result.error) {
      return error(res, result.error, result.code, result.code);
    }

    return success(res, result, '数据上报成功');
  } catch (err) {
    logger.error('设备数据上报失败', { error: err.message });
    return error(res, '设备数据上报失败', 500);
  }
};

module.exports = {
  getDevices,
  bindDevice,
  unbindDevice,
  getDeviceDetail,
  reportData,
};
