/**
 * COS 统一服务
 * 整合所有腾讯云对象存储相关功能
 * 
 * 使用场景：
 * 1. 获取上传签名（微信小程序直传COS）
 * 2. 获取临时访问链接（私有文件访问）
 * 3. 删除COS文件
 * 4. 生成预签名URL（AI服务等内部使用）
 */

const axios = require('axios');
const https = require('https');
const COS = require('cos-nodejs-sdk-v5');
const logger = require('./logger');

// ==================== 配置 ====================

const cosConfig = {
  envId: process.env.WECHAT_ENV_ID,
  bucket: process.env.COS_BUCKET,
  region: process.env.COS_REGION || 'ap-shanghai',
};

// 验证必需配置
function validateConfig() {
  if (!cosConfig.bucket) {
    throw new Error('COS_BUCKET 环境变量必须设置');
  }
  if (!cosConfig.envId) {
    throw new Error('WECHAT_ENV_ID 环境变量必须设置');
  }
}

// ==================== 通用工具 ====================

// 创建 axios 实例
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: process.env.SSL_VERIFY !== 'false',
  }),
});

// access_token 缓存
let accessTokenCache = null;
let accessTokenExpiresAt = 0;

/**
 * 获取微信 access_token
 * @param {boolean} forceRefresh - 强制刷新
 * @returns {Promise<string>}
 */
async function getAccessToken(forceRefresh = false) {
  if (!forceRefresh && accessTokenCache && Date.now() < accessTokenExpiresAt) {
    logger.debug('[COS] 使用缓存的 access_token');
    return accessTokenCache;
  }

  const appId = process.env.WECHAT_APPID;
  const secret = process.env.WECHAT_SECRET;

  if (!appId || !secret) {
    throw new Error('WECHAT_APPID 或 WECHAT_SECRET 环境变量未设置');
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${secret}`;

  try {
    const response = await axiosInstance.get(url);
    const { access_token, expires_in, errcode, errmsg } = response.data;

    if (errcode && errcode !== 0) {
      throw new Error(`微信接口错误: ${errcode} - ${errmsg}`);
    }

    if (!access_token) {
      throw new Error('获取 access_token 失败: ' + JSON.stringify(response.data));
    }

    // 缓存 token（提前 5 分钟过期）
    accessTokenCache = access_token;
    accessTokenExpiresAt = Date.now() + (expires_in - 300) * 1000;

    logger.info('[COS] 获取 access_token 成功');
    return access_token;
  } catch (err) {
    // 清除缓存，下次重新获取
    accessTokenCache = null;
    accessTokenExpiresAt = 0;
    throw err;
  }
}

/**
 * 清除 access_token 缓存
 * 当收到 token 失效错误时调用
 */
function clearAccessTokenCache() {
  accessTokenCache = null;
  accessTokenExpiresAt = 0;
  logger.info('[COS] access_token 缓存已清除');
}

/**
 * 从 COS URL 中提取对象键 (Key)
 * @param {string} cosUrl - COS URL
 * @returns {string|null}
 */
function extractObjectKey(cosUrl) {
  try {
    const url = new URL(cosUrl);
    return url.pathname.substring(1); // 去掉开头的 /
  } catch (err) {
    logger.error('[COS] 解析 URL 失败', { cosUrl, error: err.message });
    return null;
  }
}

/**
 * 从 COS URL 中提取 fileId（微信云托管格式）
 * @param {string} cosUrl - COS URL
 * @returns {string|null}
 */
function extractFileId(cosUrl) {
  if (!cosUrl || typeof cosUrl !== 'string') {
    return null;
  }

  try {
    const url = new URL(cosUrl);
    const path = url.pathname;
    // fileId 格式: cloud://{envId}.{bucket}{path}
    return `cloud://${cosConfig.envId}.${cosConfig.bucket}${path}`;
  } catch (err) {
    logger.error('[COS] 提取 fileId 失败', { cosUrl, error: err.message });
    return null;
  }
}

/**
 * 检查 URL 是否为微信云托管 COS URL
 * @param {string} url
 * @returns {boolean}
 */
function isCosUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // 如果 URL 已经带有签名参数，说明已经是临时链接
  if (url.includes('sign=') && url.includes('t=')) {
    return false;
  }

  const isWechatCloud = url.includes('myqcloud.com') || url.includes('tcb.qcloud.la');
  const hasBucket = url.includes(cosConfig.bucket);
  return isWechatCloud && hasBucket;
}

// ==================== 核心功能 ====================

/**
 * 获取上传签名（微信小程序直传COS）
 * @param {Object} options
 * @param {string} options.key - 文件路径
 * @param {string} options.userId - 用户ID（用于日志）
 * @returns {Promise<Object>}
 */
async function getUploadSign({ key, userId }) {
  validateConfig();

  try {
    const accessToken = await getAccessToken();
    const uploadUrl = `https://api.weixin.qq.com/tcb/uploadfile?access_token=${accessToken}`;

    const response = await axiosInstance.post(uploadUrl, {
      env: cosConfig.envId,
      path: key,
    });

    if (response.data.errcode !== 0) {
      // token 失效，清除缓存
      if (response.data.errcode === 40001 || response.data.errcode === 42001) {
        clearAccessTokenCache();
      }
      throw new Error(`获取上传链接失败: ${response.data.errmsg}`);
    }

    const { url, token, authorization, cos_file_id, file_id } = response.data;
    const fileUrl = `https://${cosConfig.bucket}.tcb.qcloud.la/${key}`;

    logger.info('[COS] 获取上传签名成功', { userId, key, fileId: file_id });

    return {
      uploadUrl: url,
      token,
      authorization,
      cosFileId: cos_file_id,
      fileId: file_id,
      fileUrl,
      key,
      expiresIn: 3600,
    };
  } catch (err) {
    logger.error('[COS] 获取上传签名失败', { userId, key, error: err.message });
    throw err;
  }
}

/**
 * 获取临时访问链接（微信云托管 API）
 * @param {string} fileId - 文件 fileId
 * @param {number} maxAge - 有效期（秒），默认 3600
 * @returns {Promise<string|null>}
 */
async function getTempFileUrl(fileId, maxAge = 3600) {
  validateConfig();

  if (!fileId) {
    throw new Error('fileId 不能为空');
  }

  try {
    const accessToken = await getAccessToken();
    const tempUrl = `https://api.weixin.qq.com/tcb/getTempFileURL?access_token=${accessToken}`;

    const response = await axiosInstance.post(tempUrl, {
      env: cosConfig.envId,
      file_list: [{
        fileid: fileId,
        max_age: maxAge,
      }],
    });

    if (response.data.errcode !== 0) {
      if (response.data.errcode === 40001 || response.data.errcode === 42001) {
        clearAccessTokenCache();
      }
      throw new Error(`获取临时链接失败: ${response.data.errmsg}`);
    }

    const tempFileUrl = response.data.file_list?.[0]?.temp_file_url;
    logger.info('[COS] 获取临时链接成功', { fileId });
    return tempFileUrl || null;
  } catch (err) {
    logger.error('[COS] 获取临时链接失败', { fileId, error: err.message });
    throw err;
  }
}

/**
 * 从 COS URL 获取临时访问链接
 * @param {string} cosUrl - COS URL
 * @param {number} maxAge - 有效期（秒）
 * @returns {Promise<string|null>}
 */
async function getTempUrlFromCosUrl(cosUrl, maxAge = 3600) {
  const fileId = extractFileId(cosUrl);
  if (!fileId) {
    throw new Error('无法从 URL 提取 fileId');
  }
  return getTempFileUrl(fileId, maxAge);
}

/**
 * 删除 COS 文件
 * @param {string} fileId - 文件 fileId
 * @returns {Promise<boolean>}
 */
async function deleteFile(fileId) {
  validateConfig();

  if (!fileId) {
    throw new Error('fileId 不能为空');
  }

  try {
    const accessToken = await getAccessToken();
    const deleteUrl = `https://api.weixin.qq.com/tcb/deletefile?access_token=${accessToken}`;

    const response = await axiosInstance.post(deleteUrl, {
      env: cosConfig.envId,
      fileid_list: [fileId],
    });

    if (response.data.errcode !== 0) {
      if (response.data.errcode === 40001 || response.data.errcode === 42001) {
        clearAccessTokenCache();
      }
      throw new Error(`删除文件失败: ${response.data.errmsg}`);
    }

    logger.info('[COS] 删除文件成功', { fileId });
    return true;
  } catch (err) {
    logger.error('[COS] 删除文件失败', { fileId, error: err.message });
    throw err;
  }
}

/**
 * 生成预签名 URL（使用 COS SDK，适用于 AI 服务等内部调用）
 * 需要配置 COS_SECRET_ID 和 COS_SECRET_KEY
 * @param {string} cosUrl - COS URL
 * @param {number} expires - 过期时间（秒）
 * @returns {Promise<string|null>}
 */
async function getPresignedUrl(cosUrl, expires = 3600) {
  // 检查是否有 COS 密钥配置
  if (!process.env.COS_SECRET_ID || !process.env.COS_SECRET_KEY) {
    logger.warn('[COS] 未配置 COS_SECRET_ID 或 COS_SECRET_KEY，无法生成预签名 URL');
    // 降级：使用微信云托管临时链接
    return getTempUrlFromCosUrl(cosUrl, expires);
  }

  const key = extractObjectKey(cosUrl);
  if (!key) {
    throw new Error('无法从 URL 提取对象键');
  }

  try {
    const cos = new COS({
      getAuthorization: function (options, callback) {
        callback({
          TmpSecretId: process.env.COS_SECRET_ID,
          TmpSecretKey: process.env.COS_SECRET_KEY,
          SecurityToken: process.env.COS_SECURITY_TOKEN,
          ExpiredTime: Math.floor(Date.now() / 1000) + expires,
        });
      },
    });

    const result = await cos.getObjectUrl({
      Bucket: cosConfig.bucket,
      Region: cosConfig.region,
      Key: key,
      Sign: true,
      Expires: expires,
      Protocol: 'https:',
    });

    if (result && result.Url) {
      logger.info('[COS] 生成预签名 URL 成功', { cosUrl });
      return result.Url;
    }

    throw new Error('生成预签名 URL 失败，返回为空');
  } catch (err) {
    logger.error('[COS] 生成预签名 URL 失败', { cosUrl, error: err.message });
    // 降级：使用微信云托管临时链接
    return getTempUrlFromCosUrl(cosUrl, expires);
  }
}

// ==================== 导出 ====================

module.exports = {
  // 核心功能
  getUploadSign,
  getTempFileUrl,
  getTempUrlFromCosUrl,
  getPresignedUrl,
  deleteFile,

  // 工具函数
  extractObjectKey,
  extractFileId,
  isCosUrl,
  getAccessToken,
  clearAccessTokenCache,
};
