/**
 * COS 预签名 URL 生成工具
 * 使用微信云托管临时密钥生成预签名 URL 供 AI 调用
 */

const axios = require('axios');
const https = require('https');
const COS = require('cos-nodejs-sdk-v5');
const logger = require('./logger');

// COS 配置
const cosConfig = {
  bucket: process.env.COS_BUCKET || '7072-prod-4g7ephngc4e53ec3-1401681523',
  region: process.env.COS_REGION || 'ap-shanghai',
  envId: process.env.WECHAT_ENV_ID,
};

// 创建 axios 实例
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

// 临时密钥缓存
let tempKeyCache = null;
let tempKeyExpiresAt = 0;

/**
 * 获取微信 access_token
 */
const getAccessToken = async () => {
  const appId = process.env.WECHAT_APPID;
  const secret = process.env.WECHAT_SECRET;

  if (!appId || !secret) {
    throw new Error('WECHAT_APPID 或 WECHAT_SECRET 未配置');
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${secret}`;
  const response = await axiosInstance.get(url);
  
  if (!response.data.access_token) {
    throw new Error(`获取 access_token 失败: ${response.data.errmsg}`);
  }
  
  return response.data.access_token;
};

/**
 * 获取微信云托管临时密钥
 */
const getTempCosKeys = async () => {
  // 检查缓存
  if (tempKeyCache && Date.now() < tempKeyExpiresAt) {
    logger.debug('使用缓存的临时密钥');
    return tempKeyCache;
  }

  logger.info('获取微信云托管临时密钥...');

  try {
    const accessToken = await getAccessToken();
    // 检测是否在云托管环境中
    const isCloudRun = process.env.KUBERNETES_SERVICE_HOST || process.env.WECHAT_ENV_ID;
    // 在云托管环境中使用 HTTP，本地使用 HTTPS
    const protocol = isCloudRun ? 'http' : 'https';
    const url = `${protocol}://api.weixin.qq.com/_/cos/getauth?access_token=${accessToken}`;
    
    const response = await axiosInstance.post(url, {
      env: cosConfig.envId,
    });

    if (response.data.errcode !== 0) {
      throw new Error(`获取临时密钥失败: ${response.data.errmsg}`);
    }

    const { TmpSecretId, TmpSecretKey, Token, ExpiredTime } = response.data.data;
    
    tempKeyCache = {
      TmpSecretId,
      TmpSecretKey,
      Token,
      ExpiredTime,
    };
    
    // 提前 5 分钟过期
    tempKeyExpiresAt = (ExpiredTime - 300) * 1000;
    
    logger.info('获取临时密钥成功', { 
      expiresAt: new Date(ExpiredTime * 1000).toISOString(),
      cacheUntil: new Date(tempKeyExpiresAt).toISOString(),
    });

    return tempKeyCache;
  } catch (err) {
    logger.error('获取临时密钥失败', { error: err.message });
    throw err;
  }
};

// 创建 COS 实例
const cos = new COS({
  getAuthorization: async function (options, callback) {
    try {
      const keys = await getTempCosKeys();
      callback({
        TmpSecretId: keys.TmpSecretId,
        TmpSecretKey: keys.TmpSecretKey,
        SecurityToken: keys.Token,
        ExpiredTime: keys.ExpiredTime,
      });
    } catch (err) {
      logger.error('COS 授权失败', { error: err.message });
      callback({});
    }
  },
});

/**
 * 从 COS URL 中提取对象键 (Key)
 * @param {string} cosUrl - COS URL
 * @returns {string|null} - 对象键
 */
const extractObjectKey = (cosUrl) => {
  try {
    const url = new URL(cosUrl);
    // 去掉开头的 /
    return url.pathname.substring(1);
  } catch (err) {
    logger.error('解析 COS URL 失败', { cosUrl, error: err.message });
    return null;
  }
};

/**
 * 生成预签名 URL 供 AI 调用
 * @param {string} cosUrl - COS URL
 * @param {number} expires - 过期时间（秒），默认 3600
 * @returns {Promise<string|null>} - 预签名 URL
 */
const getPresignedUrl = async (cosUrl, expires = 3600) => {
  try {
    logger.info('生成 COS 预签名 URL', { cosUrl });

    const key = extractObjectKey(cosUrl);
    if (!key) {
      logger.error('无法提取对象键', { cosUrl });
      return null;
    }

    const result = await cos.getObjectUrl({
      Bucket: cosConfig.bucket,
      Region: cosConfig.region,
      Key: key,
      Sign: true,
      Expires: expires,
      Protocol: 'https:',
    });

    if (result && result.Url) {
      // 确保 URL 包含 security token
      let presignedUrl = result.Url;
      const keys = await getTempCosKeys();
      
      if (!presignedUrl.includes('x-cos-security-token')) {
        const separator = presignedUrl.includes('?') ? '&' : '?';
        presignedUrl += `${separator}x-cos-security-token=${encodeURIComponent(keys.Token)}`;
      }
      
      logger.info('生成预签名 URL 成功', { 
        cosUrl, 
        presignedUrl: presignedUrl.substring(0, 100) + '...',
      });
      
      return presignedUrl;
    }

    logger.error('生成预签名 URL 失败，返回为空', { cosUrl, result });
    return null;
  } catch (err) {
    logger.error('生成预签名 URL 异常', { cosUrl, error: err.message, code: err.code });
    return null;
  }
};

module.exports = {
  getPresignedUrl,
  getTempCosKeys,
  extractObjectKey,
};
