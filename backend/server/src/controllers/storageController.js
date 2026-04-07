/**
 * 微信云存储上传控制器
 * 使用微信云托管对象存储（基于腾讯云 COS）
 */

const axios = require('axios');
const logger = require('../utils/logger');
const { success, error } = require('../utils/response');

/**
 * 获取文件上传链接
 * POST /api/storage/upload
 */
const getUploadLink = async (req, res) => {
  try {
    const { filename, contentType } = req.body;

    if (!filename) {
      return error(res, '文件名不能为空', 400);
    }

    // 调用微信 API 获取上传链接
    const accessToken = await getAccessToken();
    const uploadUrl = `https://api.weixin.qq.com/tcb/uploadfile?access_token=${accessToken}`;

    const response = await axios.post(uploadUrl, {
      env: process.env.WECHAT_ENV_ID,
      path: `uploads/${Date.now()}-${filename}`
    });

    if (response.data.errcode !== 0) {
      logger.error('获取上传链接失败', response.data);
      return error(res, '获取上传链接失败', 500);
    }

    const { url, token, authorization, cosFileId, fileId } = response.data;

    logger.info('获取上传链接成功', { fileId, cosFileId });

    return success(res, {
      uploadUrl: url,
      token: token,
      authorization: authorization,
      cosFileId: cosFileId,
      fileId: fileId,
      cloudID: `cloud://${fileId}`
    });

  } catch (err) {
    logger.error('获取上传链接失败', { error: err.message });
    return error(res, '获取上传链接失败', 500);
  }
};

/**
 * 获取 access_token
 */
let accessTokenCache = null;
let accessTokenExpiresAt = 0;

const getAccessToken = async () => {
  // 检查缓存
  if (accessTokenCache && Date.now() < accessTokenExpiresAt) {
    return accessTokenCache;
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${process.env.WECHAT_APPID}&secret=${process.env.WECHAT_SECRET}`;
  
  const response = await axios.get(url);
  const { access_token, expires_in } = response.data;

  if (!access_token) {
    throw new Error('获取 access_token 失败');
  }

  // 缓存 token（提前 5 分钟过期）
  accessTokenCache = access_token;
  accessTokenExpiresAt = Date.now() + (expires_in - 300) * 1000;

  return access_token;
};

module.exports = {
  getUploadLink,
  getAccessToken
};
