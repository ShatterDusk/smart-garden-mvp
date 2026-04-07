/**
 * 设备认证中间件
 * 用于验证设备数据上报请求的合法性
 */

const { Device, Plant } = require('../models');
const logger = require('../utils/logger');

/**
 * 简单的设备认证中间件
 * 验证 deviceId 是否存在于数据库中
 * 可选：验证设备密钥（如果需要更高安全性）
 */
const deviceAuthMiddleware = async (req, res, next) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        code: 400,
        message: '缺少设备ID',
        data: null,
      });
    }

    const device = await Device.findOne({
      where: { device_id: deviceId },
      attributes: ['device_id', 'status'],
    });

    if (!device) {
      logger.warn('设备认证失败：设备不存在', { deviceId });
      return res.status(404).json({
        code: 404,
        message: '设备不存在',
        data: null,
      });
    }

    const boundPlant = await Plant.findOne({
      where: { current_device_id: deviceId },
      attributes: ['plant_id'],
    });

    req.device = {
      deviceId: device.device_id,
      status: device.status,
      boundPlantId: boundPlant ? boundPlant.plant_id : null,
    };

    next();
  } catch (error) {
    logger.error('设备认证中间件错误', { error: error.message });
    return res.status(500).json({
      code: 500,
      message: '设备认证失败',
      data: null,
    });
  }
};

/**
 * 可选的设备密钥认证（高级安全）
 * 如果需要在设备上配置密钥，可以使用此中间件
 */
const deviceKeyAuthMiddleware = async (req, res, next) => {
  try {
    const { deviceId, deviceKey } = req.body;

    if (!deviceId || !deviceKey) {
      return res.status(400).json({
        code: 400,
        message: '缺少设备ID或密钥',
        data: null,
      });
    }

    next();
  } catch (error) {
    logger.error('设备密钥认证失败', { error: error.message });
    return res.status(500).json({
      code: 500,
      message: '设备认证失败',
      data: null,
    });
  }
};

module.exports = {
  deviceAuthMiddleware,
  deviceKeyAuthMiddleware,
};
