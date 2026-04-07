/**
 * COS 临时访问链接工具
 * 用于获取微信云托管 COS 的临时访问链接
 */

const axios = require('axios');
const https = require('https');
const logger = require('./logger');

// 云托管环境配置
const envConfig = {
  envId: process.env.WECHAT_ENV_ID,
  // bucket 名称不应该包含 7072- 前缀，那是 COS 域名前缀
  bucket: process.env.COS_BUCKET || 'prod-4g7ephngc4e53ec3-1401681523',
  region: process.env.COS_REGION || 'ap-shanghai',
};

// 启动时检查环境变量
if (!envConfig.envId) {
  logger.error('WECHAT_ENV_ID 环境变量未配置');
}
if (!process.env.WECHAT_APPID) {
  logger.error('WECHAT_APPID 环境变量未配置');
}
if (!process.env.WECHAT_SECRET) {
  logger.error('WECHAT_SECRET 环境变量未配置');
}

// 创建 axios 实例，忽略 SSL 证书验证
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

// access_token 缓存
let accessTokenCache = null;
let accessTokenExpiresAt = 0;

/**
 * 获取微信 access_token
 */
const getAccessToken = async () => {
  logger.debug('开始获取 access_token', {
    hasCache: !!accessTokenCache,
    expiresAt: accessTokenExpiresAt,
    now: Date.now(),
    isExpired: Date.now() >= accessTokenExpiresAt,
  });

  if (accessTokenCache && Date.now() < accessTokenExpiresAt) {
    logger.debug('使用缓存的 access_token');
    return accessTokenCache;
  }

  const appId = process.env.WECHAT_APPID;
  const secret = process.env.WECHAT_SECRET;

  logger.debug('请求新的 access_token', {
    appId: appId ? '已配置' : '未配置',
    secret: secret ? '已配置' : '未配置',
    appIdLength: appId?.length,
    secretLength: secret?.length,
  });

  if (!appId || !secret) {
    throw new Error('WECHAT_APPID 或 WECHAT_SECRET 未配置');
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${secret}`;

  logger.debug('请求微信 token API', { url: url.replace(secret, '***') });

  try {
    const response = await axiosInstance.get(url);
    const { access_token, expires_in, errcode, errmsg } = response.data;

    logger.debug('微信 token API 响应', {
      hasAccessToken: !!access_token,
      expiresIn: expires_in,
      errcode,
      errmsg,
      responseKeys: Object.keys(response.data),
    });

    if (!access_token) {
      throw new Error(`获取 access_token 失败: ${errmsg || JSON.stringify(response.data)}`);
    }

    accessTokenCache = access_token;
    accessTokenExpiresAt = Date.now() + (expires_in - 300) * 1000;

    logger.info('获取 access_token 成功', {
      expiresIn: expires_in,
      cacheUntil: new Date(accessTokenExpiresAt).toISOString(),
    });

    return access_token;
  } catch (err) {
    logger.error('获取 access_token 请求失败', {
      error: err.message,
      responseData: err.response?.data,
      status: err.response?.status,
    });
    throw err;
  }
};

/**
 * 从 COS URL 中提取 fileId
 * @param {string} cosUrl - COS 文件 URL
 * @returns {string|null} - fileId 或 null
 */
const extractFileIdFromUrl = (cosUrl) => {
  logger.debug('开始提取 fileId', { cosUrl, type: typeof cosUrl });

  if (!cosUrl || typeof cosUrl !== 'string') {
    logger.warn('cosUrl 无效', { cosUrl, type: typeof cosUrl });
    return null;
  }

  // 微信云托管 COS URL 格式:
  // https://7072-prod-4g7ephngc4e53ec3-1401681523.cos.ap-shanghai.myqcloud.com/uploads/...
  // fileId 格式: cloud://prod-4g7ephngc4e53ec3.prod-4g7ephngc4e53ec3-1401681523/uploads/...
  // 注意：bucket 名称是 prod-4g7ephngc4e53ec3-1401681523，不包含 7072- 前缀

  try {
    const url = new URL(cosUrl);
    const path = url.pathname;

    logger.debug('解析 URL 成功', {
      hostname: url.hostname,
      pathname: path,
      envId: envConfig.envId,
      bucket: envConfig.bucket,
    });

    // 构建 fileId
    const fileId = `cloud://${envConfig.envId}.${envConfig.bucket}${path}`;

    logger.debug('构建 fileId 成功', { fileId });
    return fileId;
  } catch (err) {
    logger.error('解析 COS URL 失败', { cosUrl, error: err.message, stack: err.stack });
    return null;
  }
};

/**
 * 获取 COS 临时访问链接
 * @param {string} cosUrl - COS 文件 URL
 * @param {number} maxAge - 链接有效期（秒），默认 3600
 * @returns {Promise<string|null>} - 临时访问链接或 null
 */
const getCosTempUrl = async (cosUrl, maxAge = 3600) => {
  try {
    // 记录开始获取临时链接
    logger.info('开始获取 COS 临时链接', {
      cosUrl,
      maxAge,
      envId: envConfig.envId,
      bucket: envConfig.bucket,
    });

    const fileId = extractFileIdFromUrl(cosUrl);
    if (!fileId) {
      logger.error('无法从 URL 提取 fileId', { cosUrl });
      return null;
    }

    // 记录提取的 fileId
    logger.info('提取 fileId 成功', { cosUrl, fileId });

    const accessToken = await getAccessToken();
    const tempUrl = `https://api.weixin.qq.com/tcb/getTempFileURL?access_token=${accessToken}`;

    // 记录请求参数
    logger.info('请求微信云托管 API', {
      apiUrl: tempUrl.substring(0, 100) + '...',
      env: envConfig.envId,
      fileId,
      maxAge,
    });

    const response = await axiosInstance.post(tempUrl, {
      env: envConfig.envId,
      file_list: [{
        fileid: fileId,
        max_age: maxAge,
      }],
    });

    // 记录完整响应（使用 error 级别确保被记录）
    logger.error('微信云托管 API 响应', {
      errcode: response.data.errcode,
      errmsg: response.data.errmsg,
      fileListLength: response.data.file_list?.length,
      responseData: JSON.stringify(response.data),
    });

    if (response.data.errcode !== 0) {
      logger.error('获取临时访问链接失败', { 
        cosUrl, 
        fileId,
        envId: envConfig.envId,
        bucket: envConfig.bucket,
        errcode: response.data.errcode, 
        errmsg: response.data.errmsg,
        fullResponse: JSON.stringify(response.data),
        requestData: {
          env: envConfig.envId,
          fileid: fileId,
          max_age: maxAge,
        }
      });
      return null;
    }

    const tempFileUrl = response.data.file_list?.[0]?.temp_file_url;
    if (!tempFileUrl) {
      logger.error('临时访问链接为空', { cosUrl, fileId, response: response.data });
      return null;
    }

    // 调试日志：记录成功获取的临时链接
    logger.debug('获取 COS 临时链接成功', {
      cosUrl,
      fileId,
      tempFileUrl: tempFileUrl.substring(0, 100) + '...', // 截断显示
      tempFileUrlLength: tempFileUrl.length,
    });

    logger.info('获取 COS 临时访问链接成功', { cosUrl, fileId });
    return tempFileUrl;

  } catch (err) {
    logger.error('获取 COS 临时访问链接异常', {
      cosUrl,
      error: err.message,
      errorCode: err.code,
      responseStatus: err.response?.status,
      responseData: err.response?.data,
    });
    return null;
  }
};

/**
 * 检查 URL 是否为微信云托管 COS URL
 * 支持两种域名格式:
 * - myqcloud.com (COS 原生域名)
 * - tcb.qcloud.la (微信云托管 CDN 域名)
 * 
 * 注意：如果 URL 已经带有签名参数（sign=xxx），则不需要获取临时链接
 * 
 * @param {string} url - 要检查的 URL
 * @returns {boolean}
 */
const isCosUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  // 如果 URL 已经带有签名参数，说明已经是临时链接，不需要再获取
  if (url.includes('sign=') && url.includes('t=')) {
    logger.debug('URL 已带签名，不需要获取临时链接', { url });
    return false;
  }
  
  // 检查是否为微信云托管相关域名
  const isWechatCloud = url.includes('myqcloud.com') || url.includes('tcb.qcloud.la');
  // 检查是否包含 bucket 名称
  const hasBucket = url.includes(envConfig.bucket);
  return isWechatCloud && hasBucket;
};

module.exports = {
  getCosTempUrl,
  extractFileIdFromUrl,
  isCosUrl,
};
