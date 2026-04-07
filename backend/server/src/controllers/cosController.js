/**
 * 微信云托管存储控制器
 * 使用微信云托管内置对象存储（免密钥）
 */

const axios = require('axios');
const https = require('https');
const logger = require('../utils/logger');
const { success, error } = require('../utils/response');

// 云托管环境配置
const envConfig = {
  envId: process.env.WECHAT_ENV_ID,
  bucket: process.env.COS_BUCKET || '7072-prod-4g7ephngc4e53ec3-1401681523',
  region: process.env.COS_REGION || 'ap-shanghai',
};

// 创建 axios 实例，忽略 SSL 证书验证（解决 self-signed certificate 错误）
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

/**
 * 获取微信 access_token
 */
let accessTokenCache = null;
let accessTokenExpiresAt = 0;

const getAccessToken = async () => {
  // 检查缓存
  if (accessTokenCache && Date.now() < accessTokenExpiresAt) {
    return accessTokenCache;
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${process.env.WECHAT_APPID}&secret=${process.env.WECHAT_SECRET}`;

  const response = await axiosInstance.get(url);
  const { access_token, expires_in } = response.data;

  if (!access_token) {
    throw new Error('获取 access_token 失败: ' + JSON.stringify(response.data));
  }

  // 缓存 token（提前 5 分钟过期）
  accessTokenCache = access_token;
  accessTokenExpiresAt = Date.now() + (expires_in - 300) * 1000;

  return access_token;
};

/**
 * 获取云托管存储上传链接
 * POST /api/cos/upload-sign
 */
const getUploadSign = async (req, res) => {
  try {
    const { filename, contentType = 'image/jpeg' } = req.body;
    const { userId } = req.user;

    if (!filename) {
      return error(res, '文件名不能为空', 400);
    }

    // 生成文件路径：用户ID/日期/随机文件名
    const date = new Date().toISOString().slice(0, 10);
    const ext = filename.split('.').pop() || 'jpg';
    const key = `uploads/${userId}/${date}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    // 获取 access_token
    const accessToken = await getAccessToken();

    // 调用微信云托管存储 API 获取上传链接
    const uploadUrl = `https://api.weixin.qq.com/tcb/uploadfile?access_token=${accessToken}`;
    
    const response = await axiosInstance.post(uploadUrl, {
      env: envConfig.envId,
      path: key,
    });

    if (response.data.errcode !== 0) {
      logger.error('获取上传链接失败', response.data);
      return error(res, '获取上传链接失败: ' + response.data.errmsg, 500);
    }

    const { url, token, authorization, cos_file_id, file_id } = response.data;

    // 构建访问 URL - 使用微信云托管 CDN 域名（带签名）
    // 注意：tcb.qcloud.la 域名自带签名，可以直接访问
    const fileUrl = `https://${envConfig.bucket}.tcb.qcloud.la/${key}`;

    logger.info('获取云托管上传链接成功', { userId, key, fileId: file_id, fileUrl });

    return success(res, {
      uploadUrl: url,
      token,
      authorization,
      cosFileId: cos_file_id,
      fileId: file_id,
      fileUrl,
      key,
      expiresIn: 3600,
    });

  } catch (err) {
    logger.error('获取上传链接失败', { error: err.message, stack: err.stack });
    return error(res, '获取上传链接失败: ' + err.message, 500);
  }
};

/**
 * 获取云托管临时访问链接
 * POST /api/cos/temp-url
 * 
 * 用于获取私有文件的临时访问链接
 */
const getTempFileUrl = async (req, res) => {
  try {
    const { fileId } = req.body;
    const { userId } = req.user;

    if (!fileId) {
      return error(res, '文件 fileId 不能为空', 400);
    }

    // 获取 access_token
    const accessToken = await getAccessToken();

    // 调用微信云托管 API 获取临时访问链接
    const tempUrl = `https://api.weixin.qq.com/tcb/getTempFileURL?access_token=${accessToken}`;
    
    const response = await axiosInstance.post(tempUrl, {
      env: envConfig.envId,
      file_list: [{
        fileid: fileId,
        max_age: 3600, // 1小时有效期
      }],
    });

    if (response.data.errcode !== 0) {
      logger.error('获取临时访问链接失败', response.data);
      return error(res, '获取临时访问链接失败: ' + response.data.errmsg, 500);
    }

    const tempFileUrl = response.data.file_list?.[0]?.temp_file_url;
    
    if (!tempFileUrl) {
      return error(res, '无法获取临时访问链接', 500);
    }

    logger.info('获取云托管临时访问链接成功', { userId, fileId });
    
    return success(res, {
      tempFileUrl,
      expiresIn: 3600,
    });

  } catch (err) {
    logger.error('获取临时访问链接失败', { error: err.message });
    return error(res, '获取临时访问链接失败: ' + err.message, 500);
  }
};

/**
 * 删除云托管存储文件
 * DELETE /api/cos/delete
 */
const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.body;
    const { userId } = req.user;

    if (!fileId) {
      return error(res, '文件 fileId 不能为空', 400);
    }

    // 获取 access_token
    const accessToken = await getAccessToken();

    // 调用微信云托管存储 API 删除文件
    const deleteUrl = `https://api.weixin.qq.com/tcb/deletefile?access_token=${accessToken}`;
    
    const response = await axiosInstance.post(deleteUrl, {
      env: envConfig.envId,
      fileid_list: [fileId],
    });

    if (response.data.errcode !== 0) {
      logger.error('删除文件失败', response.data);
      return error(res, '删除文件失败: ' + response.data.errmsg, 500);
    }

    logger.info('删除云托管文件成功', { userId, fileId });
    return success(res, { message: '删除成功' });

  } catch (err) {
    logger.error('删除文件失败', { error: err.message });
    return error(res, '删除文件失败: ' + err.message, 500);
  }
};

module.exports = {
  getUploadSign,
  getTempFileUrl,
  deleteFile,
};
