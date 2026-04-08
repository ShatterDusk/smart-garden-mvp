/**
 * 智能园艺助手 - API 服务层
 * 替代 mock-data.js，调用真实后端 API
 */

// 引入配置文件
const config = require('./config.js');

// API 基础地址配置
const API_BASE_URL = config.API_BASE_URL;

// Token 存储 Key
const TOKEN_KEY = 'auth_token';

/**
 * 获取存储的 Token
 */
function getToken() {
  try {
    return wx.getStorageSync(TOKEN_KEY) || '';
  } catch (e) {
    return '';
  }
}

/**
 * 保存 Token
 */
function setToken(token) {
  try {
    wx.setStorageSync(TOKEN_KEY, token);
  } catch (e) {
    console.error('保存 Token 失败', e);
  }
}

/**
 * 清除 Token
 */
function clearToken() {
  try {
    wx.removeStorageSync(TOKEN_KEY);
  } catch (e) {
    console.error('清除 Token 失败', e);
  }
}

/**
 * 统一请求封装
 */
function request(options) {
  return new Promise(function(resolve, reject) {
    const token = getToken();
    
    // 调试日志
    console.log('发送请求:', options.method || 'GET', options.url, options.data || '');
    
    wx.request({
      url: API_BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? 'Bearer ' + token : '',
        ...options.header
      },
      success: function(res) {
        console.log('收到响应:', options.url, res.statusCode, res.data);
        if (res.statusCode === 200) {
          // 后端返回格式: { code, message, data }
          if (res.data.code === 0) {
            resolve(res.data.data);
          } else {
            reject(new Error(res.data.message || '请求失败'));
          }
        } else if (res.statusCode === 401) {
          // Token 过期，清除并跳转登录
          clearToken();
          reject(new Error('请先登录'));
        } else {
          reject(new Error('请求失败: ' + res.statusCode));
        }
      },
      fail: function(err) {
        reject(new Error('网络请求失败'));
      },
      complete: function(res) {
        // 调试日志
        if (res.statusCode !== 200) {
          console.log('API 请求失败:', options.url, res.statusCode, res.data);
        }
      }
    });
  });
}

/**
 * GET 请求
 */
function get(url, data) {
  return request({ url: url, method: 'GET', data: data });
}

/**
 * POST 请求
 */
function post(url, data) {
  return request({ url: url, method: 'POST', data: data });
}

/**
 * PUT 请求
 */
function put(url, data) {
  return request({ url: url, method: 'PUT', data: data });
}

/**
 * DELETE 请求
 */
function del(url, data) {
  return request({ url: url, method: 'DELETE', data: data });
}

// ==================== 用户模块 ====================

/**
 * 用户登录（微信登录）
 */
function login(data) {
  return post('/users/login', data).then(function(res) {
    if (res && res.token) {
      setToken(res.token);
    }
    return res;
  });
}

/**
 * 游客登录
 */
function guestLogin() {
  return post('/users/guest-login', {}).then(function(res) {
    if (res && res.token) {
      setToken(res.token);
    }
    return res;
  });
}

/**
 * 获取用户信息
 */
function getUserProfile(include) {
  var params = include ? '?include=' + include : '';
  return get('/users/profile' + params);
}

/**
 * 更新用户信息
 */
function updateUserProfile(data) {
  return put('/users/profile', data);
}

/**
 * 获取用户设置
 */
function getUserSettings() {
  return get('/users/settings');
}

/**
 * 更新用户设置
 */
function updateUserSettings(data) {
  return put('/users/settings', data);
}

// ==================== 植物模块 ====================

/**
 * 获取植物列表
 */
function getPlantList(page, pageSize) {
  var params = '?page=' + (page || 1) + '&pageSize=' + (pageSize || 20);
  return get('/plants' + params).then(function(res) {
    return res.list || [];
  });
}

/**
 * 获取植物详情
 */
function getPlantDetail(plantId) {
  return get('/plants/' + plantId);
}

/**
 * 添加植物
 */
function addPlant(data) {
  return post('/plants', data);
}

/**
 * 更新植物
 */
function updatePlant(plantId, data) {
  return put('/plants/' + plantId, data);
}

/**
 * 删除植物
 */
function deletePlant(plantId) {
  return del('/plants/' + plantId);
}

// ==================== 会话模块 ====================

/**
 * 获取会话列表
 */
function getSessionList(type, plantId, page, pageSize) {
  var params = '?page=' + (page || 1) + '&pageSize=' + (pageSize || 20);
  if (type) params += '&type=' + type;
  if (plantId) params += '&plantId=' + plantId;
  return get('/sessions' + params).then(function(res) {
    return res.list || [];
  });
}

/**
 * 创建会话
 */
function createSession(data) {
  return post('/sessions', data);
}

/**
 * 获取会话详情
 */
function getSessionDetail(sessionId) {
  return get('/sessions/' + sessionId);
}

/**
 * 获取会话消息
 */
function getSessionMessages(sessionId, before, limit) {
  var params = '?limit=' + (limit || 20);
  if (before) params += '&before=' + before;
  return get('/sessions/' + sessionId + '/messages' + params).then(function(res) {
    return res.list || [];
  });
}

/**
 * 发送消息
 */
function sendMessage(sessionId, data) {
  return post('/sessions/' + sessionId + '/messages', data);
}

/**
 * 升级会话
 */
function upgradeSessionToPlant(sessionId, plantId) {
  return post('/sessions/' + sessionId + '/upgrade', { plantId: plantId });
}

/**
 * 删除会话
 */
function deleteSession(sessionId) {
  return del('/sessions/' + sessionId);
}

// ==================== 养护记录模块 ====================

/**
 * 获取养护记录
 */
function getCareRecords(plantId, page, pageSize) {
  var params = '?page=' + (page || 1) + '&pageSize=' + (pageSize || 20);
  if (plantId) params += '&plantId=' + plantId;
  return get('/care-records' + params).then(function(res) {
    return res.list || [];
  });
}

/**
 * 添加养护记录
 */
function addCareRecord(plantId, data) {
  return post('/care-records', { plantId: plantId, ...data });
}

/**
 * 更新养护记录
 */
function updateCareRecord(recordId, data) {
  return put('/care-records/' + recordId, data);
}

/**
 * 删除养护记录
 */
function deleteCareRecord(recordId) {
  return del('/care-records/' + recordId);
}

// ==================== 设备模块 ====================

/**
 * 获取设备列表
 */
function getDeviceList() {
  return get('/devices');
}

/**
 * 绑定设备
 */
function bindDevice(data) {
  return post('/devices/bind', data);
}

/**
 * 解绑设备
 */
function unbindDevice(deviceId) {
  return post('/devices/unbind', { deviceId: deviceId });
}

/**
 * 获取设备详情
 */
function getDeviceDetail(deviceId) {
  return get('/devices/' + deviceId);
}

// ==================== 诊断模块 ====================

/**
 * 获取诊断历史
 */
function getDiagnosisHistory(plantId, page, pageSize) {
  var params = '?page=' + (page || 1) + '&pageSize=' + (pageSize || 20);
  if (plantId) params += '&plantId=' + plantId;
  return get('/diagnosis' + params).then(function(res) {
    return res.list || [];
  });
}

/**
 * 获取诊断详情
 */
function getDiagnosisDetail(diagnosisCardId) {
  return get('/diagnosis/' + diagnosisCardId);
}

// ==================== AI 模块 ====================

/**
 * AI 分析
 */
function analyze(data) {
  return post('/ai/analyze', data);
}

// ==================== 用户配置模块 ====================

/**
 * 获取用户配置
 */
function getUserConfig(configKey) {
  return get('/users/config/' + configKey);
}

/**
 * 设置用户配置
 */
function setUserConfig(configKey, configValue, configType) {
  return post('/users/config', {
    configKey: configKey,
    configValue: configValue,
    configType: configType || 'preference'
  });
}

// ==================== 指标历史数据模块 ====================

/**
 * 获取指标历史数据
 */
function getMetricHistory(plantId, metricCode, timeRange, dataSource) {
  var params = '?plantId=' + plantId + '&metricCode=' + metricCode + '&timeRange=' + (timeRange || '7d');
  if (dataSource) {
    params += '&dataSource=' + dataSource;
  }
  return get('/environment/history' + params).then(function(res) {
    return res || {};
  });
}

// ==================== 环境数据模块 ====================

/**
 * 获取实时环境数据
 */
function getCurrentEnvironment(plantId) {
  return get('/environment/current?plantId=' + plantId);
}

// ==================== 云存储模块 ====================

/**
 * 获取云存储上传链接（新接口 - COS 直传）
 */
function getStorageUploadLink(filename, contentType) {
  return post('/cos/upload-sign', {
    filename: filename,
    contentType: contentType
  });
}

/**
 * 上传图片到云存储（COS 直传）
 * @returns {Promise<{url: string, fileId: string, key: string}>}
 */
function uploadImage(filePath) {
  const fileName = filePath.split('/').pop() || 'image.jpg';
  
  return getStorageUploadLink(fileName, 'image/jpeg').then(function(uploadInfo) {
    return new Promise(function(resolve, reject) {
      wx.uploadFile({
        url: uploadInfo.uploadUrl,
        filePath: filePath,
        name: 'file',
        header: {
          'Authorization': uploadInfo.authorization,
        },
        formData: {
          key: uploadInfo.key,
          Signature: uploadInfo.authorization,
          'x-cos-security-token': uploadInfo.token,
          'x-cos-meta-fileid': uploadInfo.fileId,
        },
        success: function(res) {
          // COS 上传成功返回 200 或 204，响应体为空
          if (res.statusCode === 200 || res.statusCode === 204) {
            resolve({
              url: uploadInfo.fileUrl,      // 文件访问 URL
              fileId: uploadInfo.fileId,    // 文件 ID
              key: uploadInfo.key,          // 文件路径
            });
          } else {
            reject(new Error('上传失败，状态码：' + res.statusCode));
          }
        },
        fail: function(err) {
          reject(new Error('上传失败：' + JSON.stringify(err)));
        }
      });
    });
  });
}

/**
 * 删除云存储文件
 * @param {string} fileId - 文件 fileId
 */
function deleteStorageFile(fileId) {
  return request({
    url: '/cos/delete',
    method: 'DELETE',
    data: { fileId }
  });
}

// ==================== 消息模块 ====================

/**
 * 获取会话消息列表
 */
function getMessages(sessionId) {
  return get('/sessions/' + sessionId + '/messages').then(function(res) {
    return res.list || [];
  });
}

/**
 * 添加消息到会话
 */
function addMessage(sessionId, message) {
  return post('/sessions/' + sessionId + '/messages', message);
}

/**
 * 标记会话已读
 */
function markSessionAsRead(sessionId) {
  return post('/sessions/' + sessionId + '/read');
}

/**
 * 更新会话
 */
function updateSession(sessionId, data) {
  return put('/sessions/' + sessionId, data);
}

// ==================== 导出 ====================

module.exports = {
  // 基础请求方法
  request: request,
  get: get,
  post: post,
  put: put,
  del: del,
  
  // Token 管理
  getToken: getToken,
  setToken: setToken,
  clearToken: clearToken,
  
  // 用户模块
  login: login,
  guestLogin: guestLogin,
  getUserProfile: getUserProfile,
  updateUserProfile: updateUserProfile,
  getUserSettings: getUserSettings,
  updateUserSettings: updateUserSettings,
  getUserConfig: getUserConfig,
  setUserConfig: setUserConfig,
  
  // 植物模块
  getPlantList: getPlantList,
  getPlantDetail: getPlantDetail,
  addPlant: addPlant,
  updatePlant: updatePlant,
  deletePlant: deletePlant,
  
  // 会话模块
  getSessionList: getSessionList,
  createSession: createSession,
  getSessionDetail: getSessionDetail,
  getSessionMessages: getSessionMessages,
  getMessages: getMessages,
  addMessage: addMessage,
  sendMessage: sendMessage,
  markSessionAsRead: markSessionAsRead,
  updateSession: updateSession,
  upgradeSessionToPlant: upgradeSessionToPlant,
  deleteSession: deleteSession,
  
  // 养护记录模块
  getCareRecords: getCareRecords,
  addCareRecord: addCareRecord,
  updateCareRecord: updateCareRecord,
  deleteCareRecord: deleteCareRecord,
  
  // 设备模块
  getDeviceList: getDeviceList,
  bindDevice: bindDevice,
  unbindDevice: unbindDevice,
  getDeviceDetail: getDeviceDetail,
  
  // 诊断模块
  getDiagnosisHistory: getDiagnosisHistory,
  getDiagnosisDetail: getDiagnosisDetail,
  
  // AI 模块
  analyze: analyze,
  
  // 指标模块
  getMetricHistory: getMetricHistory,
  
  // 环境数据模块
  getCurrentEnvironment: getCurrentEnvironment,
  
  // 云存储模块
  getStorageUploadLink: getStorageUploadLink,
  uploadImage: uploadImage,
  deleteStorageFile: deleteStorageFile,
  
  // 兼容旧接口
  currentUser: {
    userId: 'USER_001',
    nickname: '测试用户',
    avatarUrl: 'https://picsum.photos/100/100?random=1'
  },
  
  // 响应格式化（兼容 mock）
  response: function(success, data, message) {
    return {
      success: success,
      data: data,
      message: message || ''
    };
  }
};
