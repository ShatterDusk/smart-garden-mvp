/**
 * COS 临时链接获取测试工具
 * 用于本地测试微信云托管 API 的响应
 */

const axios = require('axios');
const https = require('https');

// 从环境变量读取配置
const envConfig = {
  envId: process.env.WECHAT_ENV_ID,
  appId: process.env.WECHAT_APPID,
  secret: process.env.WECHAT_SECRET,
  // bucket 名称不应该包含 7072- 前缀，那是 COS 域名前缀
  bucket: process.env.COS_BUCKET || 'prod-4g7ephngc4e53ec3-1401681523',
  region: process.env.COS_REGION || 'ap-shanghai',
};

// 测试用的 fileId（cloud:// 格式）
// 注意：bucket 名称是 prod-4g7ephngc4e53ec3-1401681523，不包含 7072- 前缀
const testFileId = process.env.TEST_FILE_ID || 'cloud://prod-4g7ephngc4e53ec3.prod-4g7ephngc4e53ec3-1401681523/uploads/USER_49CC7481/2026-04-01/1775047882304-l1kfzv.jpg';

console.log('=== COS 临时链接获取测试 ===\n');
console.log('环境配置:');
console.log('  envId:', envConfig.envId || '(未设置)');
console.log('  appId:', envConfig.appId ? '已设置' : '(未设置)');
console.log('  secret:', envConfig.secret ? '已设置' : '(未设置)');
console.log('  bucket:', envConfig.bucket);
console.log('  region:', envConfig.region);
console.log('');

if (!envConfig.envId || !envConfig.appId || !envConfig.secret) {
  console.error('错误: 缺少必要的环境变量');
  console.error('请设置: WECHAT_ENV_ID, WECHAT_APPID, WECHAT_SECRET');
  process.exit(1);
}

if (!testFileId) {
  console.error('错误: 缺少测试用的 fileId');
  console.error('请设置: TEST_FILE_ID');
  console.error('示例: cloud://prod-4g7ephngc4e53ec3.7072-prod-4g7ephngc4e53ec3-1401681523/uploads/xxx.jpg');
  process.exit(1);
}

// 创建 axios 实例
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

// access_token 缓存
let accessTokenCache = null;

/**
 * 获取微信 access_token
 */
const getAccessToken = async () => {
  if (accessTokenCache) {
    console.log('使用缓存的 access_token');
    return accessTokenCache;
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${envConfig.appId}&secret=${envConfig.secret}`;
  console.log('请求 access_token...');

  try {
    const response = await axiosInstance.get(url);
    const { access_token, expires_in, errcode, errmsg } = response.data;

    console.log('Token 响应:', { errcode, errmsg, expires_in });

    if (!access_token) {
      throw new Error(`获取 access_token 失败: ${errmsg || JSON.stringify(response.data)}`);
    }

    accessTokenCache = access_token;
    console.log('获取 access_token 成功');
    return access_token;
  } catch (err) {
    console.error('获取 access_token 失败:', err.message);
    throw err;
  }
};

/**
 * 验证并格式化 fileId
 * 支持两种输入:
 * 1. cloud:// 开头的 fileId - 直接使用
 * 2. https:// 开头的 COS URL - 转换为 fileId
 */
const extractFileIdFromUrl = (input) => {
  console.log('\n处理 fileId...');
  console.log('  原始输入:', input);

  // 如果已经是 cloud:// 格式，直接使用
  if (input.startsWith('cloud://')) {
    console.log('  检测到 cloud:// 格式，直接使用');
    return input;
  }

  // 如果是 https:// URL，尝试解析
  try {
    const url = new URL(input);
    const path = url.pathname;
    const fileId = `cloud://${envConfig.envId}.${envConfig.bucket}${path}`;
    console.log('  从 HTTPS URL 解析成功:');
    console.log('    hostname:', url.hostname);
    console.log('    pathname:', path);
    console.log('    fileId:', fileId);
    return fileId;
  } catch (err) {
    console.error('  解析失败:', err.message);
    return null;
  }
};

/**
 * 获取 COS 临时访问链接
 * @param {string} fileIdOrUrl - fileId (cloud://) 或 COS URL (https://)
 * @param {number} maxAge - 链接有效期（秒），默认 3600
 */
const getCosTempUrl = async (fileIdOrUrl, maxAge = 3600) => {
  console.log('\n=== 开始获取临时链接 ===');

  const fileId = extractFileIdFromUrl(fileIdOrUrl);
  if (!fileId) {
    console.error('无法提取 fileId');
    return null;
  }

  const accessToken = await getAccessToken();
  const apiUrl = `https://api.weixin.qq.com/tcb/getTempFileURL?access_token=${accessToken}`;

  const requestData = {
    env: envConfig.envId,
    file_list: [{
      fileid: fileId,
      max_age: maxAge,
    }],
  };

  console.log('\n请求参数:');
  console.log('  API URL:', apiUrl.substring(0, 80) + '...');
  console.log('  env:', envConfig.envId);
  console.log('  fileid:', fileId);
  console.log('  max_age:', maxAge);

  try {
    const response = await axiosInstance.post(apiUrl, requestData);

    console.log('\n=== API 响应 ===');
    console.log('完整响应:', JSON.stringify(response.data, null, 2));

    const { errcode, errmsg, file_list } = response.data;

    if (errcode !== 0) {
      console.error('\n❌ 获取临时链接失败');
      console.error('  errcode:', errcode);
      console.error('  errmsg:', errmsg);
      return null;
    }

    const tempFileUrl = file_list?.[0]?.temp_file_url;
    if (!tempFileUrl) {
      console.error('\n❌ 临时链接为空');
      return null;
    }

    console.log('\n✅ 获取临时链接成功');
    console.log('  tempFileUrl:', tempFileUrl.substring(0, 100) + '...');
    return tempFileUrl;

  } catch (err) {
    console.error('\n❌ 请求异常:', err.message);
    if (err.response) {
      console.error('  状态码:', err.response.status);
      console.error('  响应数据:', err.response.data);
    }
    return null;
  }
};

// 执行测试
(async () => {
  try {
    const result = await getCosTempUrl(testFileId);
    if (result) {
      console.log('\n=== 测试通过 ===');
      process.exit(0);
    } else {
      console.log('\n=== 测试失败 ===');
      process.exit(1);
    }
  } catch (err) {
    console.error('\n=== 测试异常 ===');
    console.error(err.message);
    process.exit(1);
  }
})();
