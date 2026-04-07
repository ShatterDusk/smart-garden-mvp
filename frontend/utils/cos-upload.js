/**
 * 微信云托管存储上传工具
 * 小程序前端直传到微信云托管对象存储
 */

const api = require('./api');

/**
 * 上传文件到微信云托管存储
 * @param {string} filePath - 本地文件路径
 * @param {Object} options - 配置选项
 * @returns {Promise<{url: string, fileId: string}>}
 */
async function uploadToCloudStorage(filePath, options = {}) {
  const { filename, onProgress } = options;
  
  try {
    // 1. 从后端获取上传签名
    const fileName = filename || filePath.split('/').pop();
    const signRes = await api.request({
      url: '/cos/upload-sign',
      method: 'POST',
      data: {
        filename: fileName,
        contentType: options.contentType || 'image/jpeg',
      },
    });

    const { uploadUrl, token, authorization, fileId, fileUrl } = signRes;

    // 2. 直接上传到微信云托管存储
    const uploadRes = await new Promise((resolve, reject) => {
      const uploadTask = wx.uploadFile({
        url: uploadUrl,
        filePath: filePath,
        name: 'file',
        header: {
          'Authorization': authorization,
        },
        formData: {
          key: signRes.key,
          Signature: authorization,
          'x-cos-security-token': token,
          'x-cos-meta-fileid': fileId,
        },
        success: resolve,
        fail: reject,
      });

      // 监听上传进度
      if (onProgress && uploadTask) {
        uploadTask.onProgressUpdate((res) => {
          onProgress(res.progress, res.totalBytesSent, res.totalBytesExpectedToSend);
        });
      }
    });

    if (uploadRes.statusCode !== 200 && uploadRes.statusCode !== 204) {
      console.error('上传响应:', uploadRes);
      throw new Error('上传失败，状态码: ' + uploadRes.statusCode);
    }

    return {
      url: fileUrl,
      fileId: fileId,
      success: true,
    };

  } catch (err) {
    console.error('云托管存储上传失败:', err);
    throw err;
  }
}

/**
 * 批量上传文件
 * @param {Array<string>} filePaths - 本地文件路径数组
 * @param {Object} options - 配置选项
 * @returns {Promise<Array>}
 */
async function batchUploadToCloudStorage(filePaths, options = {}) {
  const { onProgress } = options;
  const results = [];
  
  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    
    try {
      const result = await uploadToCloudStorage(filePath, {
        ...options,
        onProgress: onProgress ? (progress, sent, total) => {
          onProgress(i, filePaths.length, progress, sent, total);
        } : null,
      });
      
      results.push(result);
    } catch (err) {
      results.push({
        url: null,
        fileId: null,
        success: false,
        error: err.message,
      });
    }
  }
  
  return results;
}

/**
 * 删除云托管存储文件
 * @param {string} fileId - 文件 fileId
 */
async function deleteCloudStorageFile(fileId) {
  return await api.request({
    url: '/cos/delete',
    method: 'DELETE',
    data: { fileId },
  });
}

module.exports = {
  uploadToCloudStorage,
  batchUploadToCloudStorage,
  deleteCloudStorageFile,
};
