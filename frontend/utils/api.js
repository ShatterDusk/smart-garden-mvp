/**
 * 智能园艺助手 - API 服务层
 * 调用真实后端 API
 */

// 引入配置文件
var config = require('./config.js');

// API 基础地址配置
var API_BASE_URL = config.API_BASE_URL;

// Token 存储 Key
var TOKEN_KEY = 'auth_token';

// cos-upload 模块（延迟加载以避免循环依赖）
var cosUpload = null;

// ==================== 常量定义 ====================

/**
 * 分页默认配置
 */
var PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  DEFAULT_LIMIT: 20
};

/**
 * 请求超时配置（毫秒）
 */
var TIMEOUT = {
  DEFAULT: 30000,
  AI_MESSAGE: 35000  // AI消息需要更长的超时时间
};

/**
 * 对话历史配置
 */
var CONVERSATION = {
  MAX_HISTORY_MESSAGES: 6  // 保留最近6条消息作为上下文
};

/**
 * 调试日志开关
 * 仅在开发环境启用
 */
var DEBUG = false;

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
 * @returns {boolean} 是否保存成功
 */
function setToken(token) {
  try {
    wx.setStorageSync(TOKEN_KEY, token);
    return true;
  } catch (e) {
    if (DEBUG) {
      console.error('保存 Token 失败', e);
    }
    return false;
  }
}

/**
 * 清除 Token
 * @returns {boolean} 是否清除成功
 */
function clearToken() {
  try {
    wx.removeStorageSync(TOKEN_KEY);
    return true;
  } catch (e) {
    if (DEBUG) {
      console.error('清除 Token 失败', e);
    }
    return false;
  }
}

/**
 * 统一请求封装
 */
function request(options) {
  return new Promise(function(resolve, reject) {
    var token = getToken();

    // 调试日志（仅在开发环境）
    if (DEBUG) {
      console.log('发送请求:', options.method || 'GET', options.url, options.data || '');
    }

    // 构建 header，ES5 不支持对象展开运算符
    var header = {
      'Content-Type': 'application/json',
      'Authorization': token ? 'Bearer ' + token : ''
    };
    if (options.header) {
      for (var key in options.header) {
        if (options.header.hasOwnProperty(key)) {
          header[key] = options.header[key];
        }
      }
    }

    wx.request({
      url: API_BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: header,
      success: function(res) {
        if (DEBUG) {
          console.log('收到响应:', options.url, res.statusCode, res.data);
        }
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
        var errorMsg = '网络请求失败';
        if (err && err.errMsg) {
          if (err.errMsg.indexOf('timeout') !== -1) {
            errorMsg = '请求超时，请检查网络连接';
          } else if (err.errMsg.indexOf('fail') !== -1) {
            errorMsg = '网络连接失败，请检查网络设置';
          } else {
            errorMsg = '网络错误: ' + err.errMsg;
          }
        }
        reject(new Error(errorMsg));
      }
      // 移除 complete 回调，避免重复处理
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

// ==================== 统一响应处理工具 ====================

/**
 * 处理列表响应
 * @param {Object} res - 响应数据
 * @returns {Array} 列表数据
 */
function handleListResponse(res) {
  return (res && res.list) || [];
}

/**
 * 处理详情响应
 * @param {Object} res - 响应数据
 * @returns {Object|null} 详情数据
 */
function handleDetailResponse(res) {
  return res || null;
}

/**
 * 处理操作响应
 * @param {Object} res - 响应数据
 * @returns {boolean} 操作是否成功
 */
function handleActionResponse(res) {
  return !!res;
}

/**
 * 构建分页查询参数
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {string} 查询参数字符串
 */
function buildPaginationParams(page, pageSize) {
  var finalPage = page || PAGINATION.DEFAULT_PAGE;
  var finalPageSize = pageSize || PAGINATION.DEFAULT_PAGE_SIZE;
  return '?page=' + finalPage + '&pageSize=' + finalPageSize;
}

/**
 * 构建限制查询参数
 * @param {number} limit - 限制数量
 * @returns {string} 查询参数字符串
 */
function buildLimitParams(limit) {
  return '?limit=' + (limit || PAGINATION.DEFAULT_LIMIT);
}

// ==================== 用户模块 ====================

/**
 * 用户登录（微信登录）
 */
function login(data) {
  return post('/users/login', data).then(function(res) {
    if (res && res.token) {
      var success = setToken(res.token);
      if (!success && DEBUG) {
        console.error('登录成功但保存 Token 失败');
      }
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
      var success = setToken(res.token);
      if (!success && DEBUG) {
        console.error('游客登录成功但保存 Token 失败');
      }
    }
    return res;
  });
}

/**
 * 通过 OpenID 直接登录（开发者模式）
 * @param {string} openid - OpenID
 * @param {string} [nickname] - 昵称
 * @param {string} [avatarUrl] - 头像
 * @returns {Promise<Object>} 登录结果
 */
function loginByOpenid(openid, nickname, avatarUrl) {
  return post('/users/login-by-openid', {
    openid: openid,
    nickname: nickname || '开发者用户',
    avatarUrl: avatarUrl || ''
  }).then(function(res) {
    if (res && res.token) {
      var success = setToken(res.token);
      if (!success && DEBUG) {
        console.error('OpenID登录成功但保存 Token 失败');
      }
    }
    return res;
  });
}

/**
 * 获取登录模式
 * @returns {Promise<Object>} 登录模式信息
 */
function getAuthMode() {
  return get('/users/auth-mode');
}

/**
 * 获取用户信息
 * @param {string} [include] - 包含的关联数据，如 'plants,sessions'
 * @returns {Promise<Object>} 用户信息对象
 */
function getUserProfile(include) {
  var params = include ? '?include=' + include : '';
  return get('/users/profile' + params);
}

/**
 * 更新用户信息
 * @param {Object} data - 用户数据
 * @param {string} [data.nickname] - 昵称
 * @param {string} [data.avatarUrl] - 头像URL
 * @returns {Promise<Object>} 更新后的用户信息
 */
function updateUserProfile(data) {
  return put('/users/profile', data);
}

// ==================== 植物模块 ====================

/**
 * 获取植物列表
 */
function getPlantList(page, pageSize) {
  return get('/plants' + buildPaginationParams(page, pageSize)).then(handleListResponse);
}

/**
 * 获取植物详情
 * @param {string} plantId - 植物ID
 * @returns {Promise<Object>} 植物详情对象
 */
function getPlantDetail(plantId) {
  return get('/plants/' + plantId);
}

/**
 * 添加植物
 * @param {Object} data - 植物数据
 * @param {string} data.nickname - 植物昵称
 * @param {string} data.plantCategory - 植物分类
 * @returns {Promise<Object>} 创建的植物对象
 */
function addPlant(data) {
  return post('/plants', data);
}

/**
 * 更新植物
 * @param {string} plantId - 植物ID
 * @param {Object} data - 更新的植物数据
 * @returns {Promise<Object>} 更新后的植物对象
 */
function updatePlant(plantId, data) {
  return put('/plants/' + plantId, data);
}

/**
 * 删除植物
 * @param {string} plantId - 植物ID
 * @returns {Promise<Object>} 删除结果
 */
function deletePlant(plantId) {
  return del('/plants/' + plantId);
}

// ==================== 会话模块 ====================

/**
 * 获取会话列表
 */
function getSessionList(type, plantId, page, pageSize) {
  var params = buildPaginationParams(page, pageSize);
  if (type) params += '&type=' + type;
  if (plantId) params += '&plantId=' + plantId;
  return get('/sessions' + params).then(handleListResponse);
}

/**
 * 创建会话
 * @param {Object} data - 会话数据
 * @param {string} data.type - 会话类型：consultation(咨询) / plant(植物)
 * @param {string} [data.plantId] - 关联的植物ID（可选）
 * @returns {Promise<Object>} 创建的会话对象
 */
function createSession(data) {
  return post('/sessions', data);
}

/**
 * 获取会话详情
 * @param {string} sessionId - 会话ID
 * @returns {Promise<Object>} 会话详情对象
 */
function getSessionDetail(sessionId) {
  return get('/sessions/' + sessionId);
}

/**
 * 获取会话消息
 * @param {string} sessionId - 会话ID
 * @param {string} [before] - 获取此消息ID之前的消息（分页用）
 * @param {number} [limit] - 返回消息数量限制，默认20
 * @returns {Promise<Array>} 消息列表
 */
function getSessionMessages(sessionId, before, limit) {
  var params = buildLimitParams(limit);
  if (before) params += '&before=' + before;
  return get('/sessions/' + sessionId + '/messages' + params).then(handleListResponse);
}

/**
 * 标记会话为已读
 * @param {string} sessionId - 会话ID
 * @returns {Promise<Object>} 操作结果
 */
function markSessionAsRead(sessionId) {
  return post('/sessions/' + sessionId + '/read', {});
}

/**
 * 发送消息
 * 优化：增加超时处理，提升用户体验
 * 返回包含 requestTask 的 Promise，支持取消请求
 */
function sendMessage(sessionId, data) {
  var token = getToken();
  var startTime = Date.now();

  if (DEBUG) {
    console.log('发送消息:', sessionId, data);
  }

  var requestTask = null;

  var promise = new Promise(function(resolve, reject) {
    requestTask = wx.request({
      url: API_BASE_URL + '/sessions/' + sessionId + '/messages',
      method: 'POST',
      data: data || {},
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? 'Bearer ' + token : '',
      },
      // AI消息需要更长的超时时间
      timeout: TIMEOUT.AI_MESSAGE,
      success: function(res) {
        var duration = Date.now() - startTime;
        if (DEBUG) {
          console.log('收到响应:', '/sessions/' + sessionId + '/messages', res.statusCode, duration + 'ms');
        }

        if (res.statusCode === 200) {
          if (res.data.code === 0) {
            resolve(res.data.data);
          } else {
            reject(new Error(res.data.message || '请求失败'));
          }
        } else if (res.statusCode === 401) {
          clearToken();
          reject(new Error('请先登录'));
        } else {
          reject(new Error('请求失败: ' + res.statusCode));
        }
      },
      fail: function(err) {
        var duration = Date.now() - startTime;
        if (DEBUG) {
          console.error('请求失败:', '/sessions/' + sessionId + '/messages', err, duration + 'ms');
        }

        // 优化：区分超时错误和其他网络错误
        if (err.errMsg && err.errMsg.indexOf('timeout') !== -1) {
          reject(new Error('AI 分析超时，请稍后刷新页面查看结果'));
        } else {
          reject(new Error('网络请求失败，请检查网络连接'));
        }
      },
    });
  });

  // 将 requestTask 附加到 Promise 上，方便调用方取消请求
  promise.requestTask = requestTask;

  return promise;
}

/**
 * 升级会话为植物档案
 * @param {string} sessionId - 会话ID
 * @param {string} plantId - 植物ID
 * @returns {Promise<Object>} 升级后的植物对象
 */
function upgradeSessionToPlant(sessionId, plantId) {
  return post('/sessions/' + sessionId + '/upgrade', { plantId: plantId });
}

/**
 * 删除会话
 * @param {string} sessionId - 会话ID
 * @returns {Promise<Object>} 删除结果
 */
function deleteSession(sessionId) {
  return del('/sessions/' + sessionId);
}

// ==================== 养护记录模块 ====================

/**
 * 获取养护记录
 * @param {string} [plantId] - 植物ID（可选）
 * @param {number} [page] - 页码，默认1
 * @param {number} [pageSize] - 每页数量，默认20
 * @returns {Promise<Array>} 养护记录列表
 */
function getCareRecords(plantId, page, pageSize) {
  var params = buildPaginationParams(page, pageSize);
  if (plantId) params += '&plantId=' + plantId;
  return get('/care-records' + params).then(handleListResponse);
}

/**
 * 添加养护记录
 * @param {string} plantId - 植物ID
 * @param {Object} data - 养护记录数据
 * @param {string} data.type - 记录类型：water(浇水)/fertilize(施肥)/prune(修剪)/repot(换盆)
 * @param {string} [data.notes] - 备注
 * @returns {Promise<Object>} 创建的养护记录
 */
function addCareRecord(plantId, data) {
  var payload = { plantId: plantId };
  for (var key in data) {
    if (data.hasOwnProperty(key)) {
      payload[key] = data[key];
    }
  }
  return post('/care-records', payload);
}

/**
 * 更新养护记录
 * @param {string} recordId - 记录ID
 * @param {Object} data - 更新的数据
 * @returns {Promise<Object>} 更新后的养护记录
 */
function updateCareRecord(recordId, data) {
  return put('/care-records/' + recordId, data);
}

/**
 * 删除养护记录
 * @param {string} recordId - 记录ID
 * @returns {Promise<Object>} 删除结果
 */
function deleteCareRecord(recordId) {
  return del('/care-records/' + recordId);
}

// ==================== 设备模块 ====================

/**
 * 获取设备列表
 * @returns {Promise<Array>} 设备列表
 */
function getDeviceList() {
  return get('/devices');
}

/**
 * 绑定设备
 * @param {Object} data - 绑定数据
 * @param {string} data.deviceId - 设备ID
 * @param {string} [data.plantId] - 关联的植物ID
 * @returns {Promise<Object>} 绑定结果
 */
function bindDevice(data) {
  return post('/devices/bind', data);
}

/**
 * 解绑设备
 * @param {string} deviceId - 设备ID
 * @returns {Promise<Object>} 解绑结果
 */
function unbindDevice(deviceId) {
  return post('/devices/unbind', { deviceId: deviceId });
}

/**
 * 获取设备详情
 * @param {string} deviceId - 设备ID
 * @returns {Promise<Object>} 设备详情
 */
function getDeviceDetail(deviceId) {
  return get('/devices/' + deviceId);
}

// ==================== 诊断模块 ====================

/**
 * 获取诊断历史
 * @param {string} [plantId] - 植物ID（可选）
 * @param {number} [page] - 页码，默认1
 * @param {number} [pageSize] - 每页数量，默认20
 * @returns {Promise<Array>} 诊断历史列表
 */
function getDiagnosisHistory(plantId, page, pageSize) {
  var params = buildPaginationParams(page, pageSize);
  if (plantId) params += '&plantId=' + plantId;
  return get('/diagnosis' + params).then(handleListResponse);
}

/**
 * 获取诊断详情
 * @param {string} diagnosisCardId - 诊断卡ID
 * @returns {Promise<Object>} 诊断详情
 */
function getDiagnosisDetail(diagnosisCardId) {
  return get('/diagnosis/' + diagnosisCardId);
}

// ==================== AI 模块 ====================

/**
 * AI 分析
 * @param {Object} data - 分析数据
 * @param {string} data.sessionId - 会话ID
 * @param {string} data.content - 用户输入内容
 * @param {Array} [data.images] - 图片URL列表
 * @returns {Promise<Object>} AI分析结果
 */
function analyze(data) {
  return post('/ai/analyze', data);
}

// ==================== 用户配置模块 ====================

/**
 * 获取用户配置
 * @param {string} configKey - 配置键名
 * @returns {Promise<Object>} 配置值
 */
function getUserConfig(configKey) {
  return get('/users/config/' + configKey);
}

/**
 * 设置用户配置
 * @param {string} configKey - 配置键名
 * @param {*} configValue - 配置值
 * @param {string} [configType] - 配置类型，默认 'preference'
 * @returns {Promise<Object>} 设置结果
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
 * @param {string} plantId - 植物ID
 * @param {string} metricCode - 指标代码，如 temperature/humidity/light
 * @param {string} [timeRange] - 时间范围，默认 '7d'，可选 '24h'/'7d'/'30d'
 * @param {string} [dataSource] - 数据来源：sensor/weather_api/compensation
 * @returns {Promise<Object>} 指标历史数据
 */
function getMetricHistory(plantId, metricCode, timeRange, dataSource) {
  var params = '?plantId=' + plantId + '&metricCode=' + metricCode + '&timeRange=' + (timeRange || '7d');
  if (dataSource) {
    params += '&dataSource=' + dataSource;
  }
  return get('/environment/history' + params).then(handleDetailResponse);
}

// ==================== 环境数据模块 ====================

/**
 * 获取实时环境数据
 * @param {string} plantId - 植物ID
 * @returns {Promise<Object>} 实时环境数据
 */
function getCurrentEnvironment(plantId) {
  return get('/environment/current?plantId=' + plantId);
}

// ==================== 云存储模块 ====================

/**
 * 获取云存储上传链接（新接口 - COS 直传）
 * @param {string} filename - 文件名
 * @param {string} contentType - 文件类型，如 image/jpeg
 * @returns {Promise<Object>} 上传签名信息
 */
function getStorageUploadLink(filename, contentType) {
  return post('/cos/upload-sign', {
    filename: filename,
    contentType: contentType
  });
}

/**
 * 上传图片到云存储（COS 直传）
 * 使用 cos-upload.js 的统一实现
 * @param {string} filePath - 本地文件路径
 * @param {Function} onProgress - 进度回调函数 (progress, sent, total)
 * @returns {Promise<{url: string, fileId: string}>}
 */
function uploadImage(filePath, onProgress) {
  // 延迟加载 cos-upload 模块
  if (!cosUpload) {
    cosUpload = require('./cos-upload.js');
  }

  // 提取文件名和扩展名
  var fileName = filePath.split('/').pop() || 'image.jpg';
  var extMatch = fileName.match(/\.([^.]+)$/);
  var ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';

  // 根据扩展名设置 contentType
  var contentType = 'image/jpeg';
  if (ext === 'png') {
    contentType = 'image/png';
  } else if (ext === 'gif') {
    contentType = 'image/gif';
  } else if (ext === 'webp') {
    contentType = 'image/webp';
  }

  return cosUpload.uploadToCloudStorage(filePath, {
    filename: fileName,
    contentType: contentType,
    onProgress: onProgress
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
    data: { fileId: fileId }
  });
}

// ==================== 导出 ====================

module.exports = {
  // ==================== 基础请求方法 ====================
  request: request,
  get: get,
  post: post,
  put: put,
  del: del,

  // ==================== Token 管理 ====================
  getToken: getToken,
  setToken: setToken,
  clearToken: clearToken,

  // ==================== 用户模块 ====================
  login: login,
  guestLogin: guestLogin,
  loginByOpenid: loginByOpenid,
  getAuthMode: getAuthMode,
  getUserProfile: getUserProfile,
  updateUserProfile: updateUserProfile,
  getUserConfig: getUserConfig,
  setUserConfig: setUserConfig,

  // ==================== 植物模块 ====================
  getPlantList: getPlantList,
  getPlantDetail: getPlantDetail,
  addPlant: addPlant,
  updatePlant: updatePlant,
  deletePlant: deletePlant,

  // ==================== 会话模块 ====================
  getSessionList: getSessionList,
  createSession: createSession,
  getSessionDetail: getSessionDetail,
  getSessionMessages: getSessionMessages,
  markSessionAsRead: markSessionAsRead,
  sendMessage: sendMessage,
  upgradeSessionToPlant: upgradeSessionToPlant,
  deleteSession: deleteSession,

  // ==================== 养护记录模块 ====================
  getCareRecords: getCareRecords,
  addCareRecord: addCareRecord,
  updateCareRecord: updateCareRecord,
  deleteCareRecord: deleteCareRecord,

  // ==================== 设备模块 ====================
  getDeviceList: getDeviceList,
  bindDevice: bindDevice,
  unbindDevice: unbindDevice,
  getDeviceDetail: getDeviceDetail,

  // ==================== 诊断模块 ====================
  getDiagnosisHistory: getDiagnosisHistory,
  getDiagnosisDetail: getDiagnosisDetail,

  // ==================== AI 模块 ====================
  analyze: analyze,

  // ==================== 指标模块 ====================
  getMetricHistory: getMetricHistory,

  // ==================== 环境数据模块 ====================
  getCurrentEnvironment: getCurrentEnvironment,

  // ==================== 云存储模块 ====================
  getStorageUploadLink: getStorageUploadLink,
  uploadImage: uploadImage,
  deleteStorageFile: deleteStorageFile,

  // ==================== 响应处理工具 ====================
  handleListResponse: handleListResponse,
  handleDetailResponse: handleDetailResponse,
  handleActionResponse: handleActionResponse,

  // ==================== 工具函数 ====================
  buildPaginationParams: buildPaginationParams,
  buildLimitParams: buildLimitParams
};
