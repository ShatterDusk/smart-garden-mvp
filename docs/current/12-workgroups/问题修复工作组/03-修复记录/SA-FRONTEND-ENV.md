# 修复记录: SA-FRONTEND-ENV

## 问题信息
- **编号**: SA-FRONTEND-ENV
- **来源**: 静态分析工作小组（前端环境变量分析）
- **严重程度**: 🟠 中危（含 🔴 高危安全项）
- **问题类型**: 安全/代码规范
- **问题描述**: 前端环境变量配置不合理，存在硬编码敏感信息和环境切换不便捷问题

## 问题分析

### 问题定位
- **文件位置**: 
  - `frontend/utils/config.js`
  - `frontend/utils/logApi.js`
- **问题代码**:

```javascript
// config.js - 环境切换需要手动修改代码
const CURRENT_ENV = 'production'; // 发布时用这个

// logApi.js - 硬编码敏感信息
const ACCESS_KEY = 'prod-log-key-2024';
```

### 根因分析
1. **config.js**: 通过手动注释/取消注释切换环境，容易出错且不符合微信小程序规范
2. **logApi.js**: 前端错误地封装了日志查看功能，导致需要硬编码 access_key
3. **设计问题**: 日志查看是管理功能，不应该在小程序前端实现

### 影响范围
- 环境切换容易出错
- 敏感密钥泄露风险
- 代码维护困难

### 修复风险评估
- **风险等级**: 低
- **可能影响**: 日志查看功能（已确认前端不需要）
- **回滚方案**: 恢复原始文件

## 修复方案

### 方案概述
- **修复思路**: 
  1. 简化 logApi.js，只保留日志推送功能（移除查看/搜索/清空功能）
  2. 改进 config.js，使用微信小程序环境自动检测
  3. 移除所有硬编码敏感信息

### 代码变更

#### 1. logApi.js - 简化只保留日志推送
```javascript
/**
 * 日志 API 封装
 * 仅用于推送前端日志到后端
 * 日志查看功能请直接调用后端 API（无封装）
 */

const config = require('./config.js');

/**
 * 发送请求
 */
function request(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      url,
      method,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          resolve(res.data.data);
        } else {
          reject(new Error(res.data.message || '请求失败'));
        }
      },
      fail: (err) => {
        reject(new Error('网络请求失败: ' + err.errMsg));
      }
    };

    if (data) {
      options.data = data;
    }

    wx.request(options);
  });
}

/**
 * 日志 API 对象
 */
const logApi = {
  /**
   * 推送前端日志到后端
   * @param {Array} logs - 日志数组，每项包含 {timestamp, level, message, data}
   * @returns {Promise<{received: number, file: string}>}
   */
  pushFrontendLogs(logs) {
    const url = `${config.API_BASE_URL}/logs/frontend`;
    return request(url, 'POST', logs);
  }
};

module.exports = logApi;
```

#### 2. config.js - 使用环境自动检测
```javascript
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
  const envVersion = typeof __wxConfig !== 'undefined' 
    ? __wxConfig.envVersion 
    : 'release';

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
```

## 修复执行

- **修复人**: AI Assistant
- **修复时间**: 2026-04-11
- **修改文件**:
  - `frontend/utils/logApi.js`
  - `frontend/utils/config.js`

## 验证结果

### 测试环境
- **分支**: main
- **Node版本**: -（前端代码）
- **数据库**: 不涉及

### 功能测试
| 测试项 | 预期结果 | 实际结果 | 状态 |
|:---|:---|:---|:---:|
| 日志推送功能正常 | 前端日志可正常上报 | - | ⏳ |
| 环境自动检测 | 根据小程序版本自动切换配置 | - | ⏳ |
| 无硬编码密钥 | 代码中无 ACCESS_KEY | - | ⏳ |

### 回归测试
- [ ] 相关功能正常
- [ ] 无新引入问题

## 状态更新
- **当前状态**: 🔄 修复中
- **更新时间**: 2026-04-11
