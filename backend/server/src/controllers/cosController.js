/**
 * 微信云托管存储控制器
 * 使用微信云托管内置对象存储（免密钥）
 */

const logger = require('../utils/logger');
const { success, error } = require('../utils/response');
const cosService = require('../utils/cosService');

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

    // 检查 COS 配置
    if (!process.env.WECHAT_ENV_ID || !process.env.COS_BUCKET || 
        !process.env.WECHAT_APPID || !process.env.WECHAT_SECRET) {
      logger.error('[COS Controller] 环境变量缺失', {
        WECHAT_ENV_ID: !!process.env.WECHAT_ENV_ID,
        COS_BUCKET: !!process.env.COS_BUCKET,
        WECHAT_APPID: !!process.env.WECHAT_APPID,
        WECHAT_SECRET: !!process.env.WECHAT_SECRET,
      });
      return error(res, '服务器配置错误：COS 环境变量未设置', 500);
    }

    // 生成文件路径：用户ID/日期/随机文件名
    const date = new Date().toISOString().slice(0, 10);
    const ext = filename.split('.').pop() || 'jpg';
    const key = `uploads/${userId}/${date}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const result = await cosService.getUploadSign({ key, userId });
    return success(res, result);

  } catch (err) {
    logger.error('[COS Controller] 获取上传链接失败', { error: err.message, stack: err.stack });
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

    const tempFileUrl = await cosService.getTempFileUrl(fileId, 3600);
    
    if (!tempFileUrl) {
      return error(res, '无法获取临时访问链接', 500);
    }

    logger.info('[COS Controller] 获取临时访问链接成功', { userId, fileId });
    
    return success(res, {
      tempFileUrl,
      expiresIn: 3600,
    });

  } catch (err) {
    logger.error('[COS Controller] 获取临时访问链接失败', { error: err.message });
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

    await cosService.deleteFile(fileId);

    logger.info('[COS Controller] 删除文件成功', { userId, fileId });
    return success(res, { message: '删除成功' });

  } catch (err) {
    logger.error('[COS Controller] 删除文件失败', { error: err.message });
    return error(res, '删除文件失败: ' + err.message, 500);
  }
};

module.exports = {
  getUploadSign,
  getTempFileUrl,
  deleteFile,
};
