/**
 * 前端全局配置文件
 * 使用微信小程序环境自动检测
 */

/**
 * 获取当前运行环境配置
 * 基于微信小程序的 __wxConfig.envVersion 自动检测
 */
const getEnvConfig = () => {
  // 获取小程序运行环境版本
  // develop: 开发版（微信开发者工具预览）
  // trial: 体验版（上传为体验版）
  // release: 正式版（发布版本）

  // 【临时强制指定为体验版】调试用，用完请恢复自动检测
  const envVersion = 'trial';

  // 【自动检测】恢复时请使用下面这行
  // const envVersion = typeof __wxConfig !== 'undefined'
  //   ? __wxConfig.envVersion
  //   : 'release';

  const configs = {
    // 开发版（微信开发者工具预览）
    develop: {
      API_BASE_URL: 'http://localhost:3000',
      ENV_TYPE: 'develop'
    },

    // 体验版（上传为体验版）
    trial: {
      API_BASE_URL: 'https://plant-backend-240450-4-1401681523.sh.run.tcloudbase.com/api',
      ENV_TYPE: 'trial'
    },

    // 正式版（发布版本）
    release: {
      API_BASE_URL: 'https://plant-backend-240450-4-1401681523.sh.run.tcloudbase.com/api',
      ENV_TYPE: 'production'
    }
  };

  return configs[envVersion] || configs.release;
};

const currentConfig = getEnvConfig();

// 导出配置
module.exports = {
  // 环境类型
  ENV_TYPE: currentConfig.ENV_TYPE,

  // API 基础地址
  API_BASE_URL: currentConfig.API_BASE_URL,

  // 是否是开发环境
  isDev: () => currentConfig.ENV_TYPE === 'develop',

  // 是否是生产环境
  isProd: () => currentConfig.ENV_TYPE === 'production',

  // 获取完整配置
  getConfig: () => currentConfig
};
