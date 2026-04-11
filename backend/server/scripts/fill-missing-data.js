/**
 * 补全缺失的环境数据
 * 用于服务器重启后补全缺失的历史数据
 */

const { Plant, ReadingTask, EnvironmentReading } = require('../src/models');
const { Op } = require('sequelize');
const logger = require('../src/utils/logger');
const weatherService = require('../src/services/weatherService');
const compensationService = require('../src/services/compensationService');
const { DATA_SOURCE, TASK_STATUS } = require('../src/config/environment');

/**
 * 获取最近N天内缺失的时间点
 */
function getMissingTimePoints(days = 3) {
  const points = [];
  const now = new Date();
  
  for (let d = 0; d < days; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    
    // 每天的双数整点：00, 02, 04, 06, 08, 10, 12, 14, 16, 18, 20, 22
    for (let h = 0; h < 24; h += 2) {
      const point = new Date(date);
      point.setHours(h, 0, 0, 0);
      
      // 只补过去的时间点
      if (point < now) {
        points.push(point);
      }
    }
  }
  
  return points.sort((a, b) => a - b);
}

/**
 * 检查某个时间点是否已有数据
 */
async function hasData(plantId, recordedAt, dataSource) {
  const existing = await EnvironmentReading.findOne({
    where: {
      plant_id: plantId,
      recorded_at: recordedAt,
      data_source: dataSource,
    },
  });
  return !!existing;
}

/**
 * 为单个植物补全天气数据
 */
async function fillWeatherDataForPlant(plant, recordedAt) {
  try {
    // 检查是否已有数据
    const exists = await hasData(plant.plant_id, recordedAt, DATA_SOURCE.WEATHER_API);
    if (exists) {
      logger.debug(`[fillWeatherDataForPlant] 数据已存在，跳过`, {
        plantId: plant.plant_id,
        recordedAt,
      });
      return { success: false, reason: 'exists' };
    }
    
    // 获取天气数据
    const weatherData = await weatherService.getWeatherForPlant(plant);
    
    if (!weatherData || Object.keys(weatherData).length === 0) {
      logger.warn(`[fillWeatherDataForPlant] 获取天气数据失败`, {
        plantId: plant.plant_id,
        recordedAt,
      });
      return { success: false, reason: 'no_data' };
    }
    
    // 创建读数
    const locationCode = plant.location_code;
    await compensationService.createWeatherReading(
      plant.plant_id,
      recordedAt,
      weatherData,
      locationCode
    );
    
    logger.info(`[fillWeatherDataForPlant] 补全数据成功`, {
      plantId: plant.plant_id,
      recordedAt,
      metrics: Object.keys(weatherData),
    });
    
    return { success: true };
  } catch (error) {
    logger.error(`[fillWeatherDataForPlant] 补全数据失败`, {
      plantId: plant.plant_id,
      recordedAt,
      error: error.message,
    });
    return { success: false, reason: 'error', error: error.message };
  }
}

/**
 * 主函数：补全所有缺失数据
 */
async function fillMissingData() {
  logger.info('========== 开始补全缺失的环境数据 ==========');
  
  try {
    // 获取所有有位置信息的植物
    const plants = await Plant.findAll({
      attributes: ['plant_id', 'location_code', 'location_lat', 'location_lng'],
      where: {
        [Op.or]: [
          { location_code: { [Op.ne]: null } },
          {
            [Op.and]: [
              { location_lat: { [Op.ne]: null } },
              { location_lng: { [Op.ne]: null } },
            ],
          },
        ],
      },
    });
    
    logger.info(`找到 ${plants.length} 株有位置信息的植物`);
    
    // 获取需要补全的时间点
    const timePoints = getMissingTimePoints(3);
    logger.info(`需要检查 ${timePoints.length} 个时间点`);
    
    let totalSuccess = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    
    // 为每个植物补全数据
    for (const plant of plants) {
      logger.info(`[fillMissingData] 处理植物 ${plant.plant_id}`);
      
      for (const recordedAt of timePoints) {
        const result = await fillWeatherDataForPlant(plant, recordedAt);
        
        if (result.success) {
          totalSuccess++;
        } else if (result.reason === 'exists') {
          totalSkipped++;
        } else {
          totalFailed++;
        }
        
        // 避免请求过快，添加小延迟
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    logger.info('========== 补全缺失数据完成 ==========', {
      totalSuccess,
      totalSkipped,
      totalFailed,
    });
    
  } catch (error) {
    logger.error('补全缺失数据失败', { error: error.message, stack: error.stack });
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  fillMissingData()
    .then(() => {
      setTimeout(() => process.exit(0), 2000);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  fillMissingData,
  fillWeatherDataForPlant,
};
