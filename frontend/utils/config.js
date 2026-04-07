/**
 * 前端全局配置文件
 * 管理不同环境的 API 地址和其他配置
 */

// 环境配置
const ENV = {
  // 开发环境
  development: {
    API_BASE_URL: 'http://localhost:3000',
    COS_BASE_URL: 'https://7072-prod-4g7ephngc4e53ec3-1401681523.cos.ap-shanghai.myqcloud.com',
    ENV_TYPE: 'development'
  },

  // 生产环境（微信云托管）
  production: {
    // 云托管服务地址（包含 /api 前缀）
    API_BASE_URL: 'https://plant-backend-240450-4-1401681523.sh.run.tcloudbase.com/api',
    COS_BASE_URL: 'https://7072-prod-4g7ephngc4e53ec3-1401681523.cos.ap-shanghai.myqcloud.com',
    ENV_TYPE: 'production'
  },

  // 测试环境
  test: {
    API_BASE_URL: 'https://test-api.example.com',
    COS_BASE_URL: 'https://test-cos.example.com',
    ENV_TYPE: 'test'
  }
};

// 当前环境（可以根据需要修改）
// const CURRENT_ENV = 'development'; // 开发时用这个
const CURRENT_ENV = 'production'; // 发布时用这个

// 获取当前环境配置
function getConfig() {
  return ENV[CURRENT_ENV] || ENV.development;
}

// 导出配置
module.exports = {
  // 环境类型
  ENV_TYPE: getConfig().ENV_TYPE,
  
  // API 基础地址
  API_BASE_URL: getConfig().API_BASE_URL,
  
  // COS 基础地址
  COS_BASE_URL: getConfig().COS_BASE_URL,
  
  // 是否是开发环境
  isDev: () => CURRENT_ENV === 'development',
  
  // 是否是生产环境
  isProd: () => CURRENT_ENV === 'production',
  
  // 切换环境（用于调试）
  switchEnv: (env) => {
    if (ENV[env]) {
      console.log(`[Config] 切换到 ${env} 环境`);
      return ENV[env];
    }
    console.warn(`[Config] 未知环境: ${env}`);
    return ENV.development;
  },
  
  // 获取完整配置
  getConfig
};
