/**
 * 使用腾讯云 COS SDK 获取临时链接
 * 替代微信 API 的 getTempFileURL
 */

const COS = require('cos-nodejs-sdk-v5');
const logger = require('./logger');

// COS 配置
const cosConfig = {
  bucket: process.env.COS_BUCKET || '7072-prod-4g7ephngc4e53ec3-1401681523',
  region: process.env.COS_REGION || 'ap-shanghai',
};

// 创建 COS 实例
const cos = new COS({
  getAuthorization: function (options, callback) {
    // 使用临时密钥或永久密钥
    // 这里假设使用永久密钥，实际生产环境建议使用临时密钥
    callback({
      TmpSecretId: process.env.COS_SECRET_ID,
      TmpSecretKey: process.env.COS_SECRET_KEY,
      SecurityToken: process.env.COS_SECURITY_TOKEN,
      ExpiredTime: Math.floor(Date.now() / 1000) + 3600,
    });
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
 * 使用 COS SDK 获取临时链接
 * @param {string} cosUrl - COS URL
 * @param {number} expires - 过期时间（秒），默认 3600
 * @returns {Promise<string|null>} - 临时链接
 */
const getCosTempUrlBySdk = async (cosUrl, expires = 3600) => {
  try {
    logger.info('使用 COS SDK 获取临时链接', { cosUrl });

    const key = extractObjectKey(cosUrl);
    if (!key) {
      logger.error('无法提取对象键', { cosUrl });
      return null;
    }

    // 检查是否有 COS 密钥配置
    if (!process.env.COS_SECRET_ID || !process.env.COS_SECRET_KEY) {
      logger.warn('未配置 COS_SECRET_ID 或 COS_SECRET_KEY，无法使用 SDK 获取临时链接');
      return null;
    }

    const result = await cos.getObjectUrl({
      Bucket: cosConfig.bucket,
      Region: cosConfig.region,
      Key: key,
      Expires: expires,
      Sign: true,
    });

    if (result && result.Url) {
      logger.info('获取 COS 临时链接成功', { cosUrl, tempUrl: result.Url.substring(0, 100) + '...' });
      return result.Url;
    }

    logger.error('获取 COS 临时链接失败，返回为空', { cosUrl, result });
    return null;
  } catch (err) {
    logger.error('获取 COS 临时链接异常', { cosUrl, error: err.message, code: err.code });
    return null;
  }
};

module.exports = {
  getCosTempUrlBySdk,
  extractObjectKey,
};
