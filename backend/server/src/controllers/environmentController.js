/**
 * 环境数据模块控制器
 * 处理环境数据相关的请求响应
 * 
 * 注意：设备数据上报请使用 POST /api/devices/data
 * 本模块仅提供环境数据查询功能
 */

const { EnvironmentService } = require('../services');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');

const environmentService = new EnvironmentService();

/**
 * 获取实时环境数据
 * GET /api/environment/current
 */
const getCurrentEnvironment = async (req, res) => {
  try {
    const { plantId, recordedAt } = req.query;
    const userId = req.user.userId;

    if (!plantId) {
      return error(res, '缺少植物ID', 400);
    }

    const plant = await environmentService.getPlantById(plantId, userId);
    if (!plant) {
      return error(res, '植物不存在', 404, 404);
    }

    const data = await environmentService.getCurrentData(plantId, recordedAt);
    return success(res, data);
  } catch (err) {
    logger.error('获取实时环境数据失败', { error: err.message });
    return error(res, '获取实时环境数据失败', 500);
  }
};

/**
 * 获取指标历史数据
 * GET /api/environment/history
 */
const getMetricHistory = async (req, res) => {
  try {
    const { plantId, metricCode, timeRange = '7d', dataSource } = req.query;
    const userId = req.user.userId;

    if (!plantId || !metricCode) {
      return error(res, '缺少必要参数', 400);
    }

    const plant = await environmentService.getPlantById(plantId, userId);
    if (!plant) {
      return error(res, '植物不存在', 404, 404);
    }

    const data = await environmentService.getHistoryData(plantId, {
      metricCode,
      timeRange,
      dataSource,
    });

    return success(res, data);
  } catch (err) {
    logger.error('获取指标历史失败', { error: err.message });
    return error(res, '获取指标历史失败', 500);
  }
};

module.exports = {
  getCurrentEnvironment,
  getMetricHistory,
};
