/**
 * 环境数据同步配置
 */
module.exports = {
  // 同步周期：每2小时产生一次reading
  SYNC_INTERVAL: 2 * 60 * 60 * 1000, // 2小时（毫秒）

  // 传感器上传容忍期：整点后5分钟内允许上传
  TOLERANCE_PERIOD: 5 * 60 * 1000, // 5分钟（毫秒）

  // Task 富余数量：最新 RECEIVED 后保证有 N 个 PENDING Task
  TASK_SURPLUS_COUNT: 3, // 预生成 3 个未来周期的 PENDING Task

  // 定时任务配置
  CRON: {
    // 每2小时的整点执行
    SYNC_EXPRESSION: '0 */2 * * *',
    // 整点后5分钟执行补偿检查
    COMPENSATION_EXPRESSION: '5 */2 * * *',
  },

  // 数据来源类型
  DATA_SOURCE: {
    SENSOR: 'sensor',
    WEATHER_API: 'weather_api',
  },

  // 任务状态
  TASK_STATUS: {
    SENSOR: {
      PENDING: 'pending',
      RECEIVED: 'received',
      COMPENSATED: 'compensated',
      FAILED: 'failed',
    },
    WEATHER: {
      PENDING: 'pending',
      RECEIVED: 'received',
      FAILED: 'failed',
    },
  },
};
