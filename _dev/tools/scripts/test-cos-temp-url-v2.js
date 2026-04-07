/**
 * COS 临时链接获取测试工具 V2
 * 测试不同的 fileId 格式
 */

const axios = require('axios');
const https = require('https');

const envConfig = {
  envId: process.env.WECHAT_ENV_ID,
  appId: process.env.WECHAT_APPID,
  secret: process.env.WECHAT_SECRET,
};

// 测试多种 fileId 格式
const testFileIds = [
  // 格式1: 原始格式（包含 7072-）
  'cloud://prod-4g7ephngc4e53ec3.7072-prod-4g7ephngc4e53ec3-1401681523/uploads/USER_49CC7481/2026-04-01/1775047882304-l1kfzv.jpg',
  // 格式2: 去掉 7072- 前缀
  'cloud://prod-4g7ephngc4e53ec3.prod-4g7ephngc4e53ec3-1401681523/uploads/USER_49CC7481/2026-04-01/1775047882304-l1kfzv.jpg',
  // 格式3: 只有 envId + 路径
  'cloud://prod-4g7ephngc4e53ec3/uploads/USER_49CC7481/2026-04-01/1775047882304-l1kfzv.jpg',
  // 格式4: envId.cos.region.myqcloud.com 格式
  'cloud://prod-4g7ephngc4e53ec3.cos.ap-shanghai.myqcloud.com/uploads/USER_49CC7481/2026-04-01/1775047882304-l1kfzv.jpg',
];

console.log('=== COS 临时链接获取测试 V2 ===\n');
console.log('环境配置:');
console.log('  envId:', envConfig.envId || '(未设置)');
console.log('  appId:', envConfig.appId ? '已设置' : '(未设置)');
console.log('  secret:', envConfig.secret ? '已设置' : '(未设置)');
console.log('');

if (!envConfig.envId || !envConfig.appId || !envConfig.secret) {
  console.error('错误: 缺少必要的环境变量');
  process.exit(1);
}

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

let accessTokenCache = null;

const getAccessToken = async () => {
  if (accessTokenCache) return accessTokenCache;
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${envConfig.appId}&secret=${envConfig.secret}`;
  const response = await axiosInstance.get(url);
  accessTokenCache = response.data.access_token;
  return accessTokenCache;
};

const testFileId = async (fileId, index) => {
  console.log(`\n--- 测试格式 ${index + 1} ---`);
  console.log('fileId:', fileId);

  try {
    const accessToken = await getAccessToken();
    const apiUrl = `https://api.weixin.qq.com/tcb/getTempFileURL?access_token=${accessToken}`;

    const response = await axiosInstance.post(apiUrl, {
      env: envConfig.envId,
      file_list: [{ fileid: fileId, max_age: 3600 }],
    });

    const { errcode, errmsg, file_list } = response.data;

    if (errcode === 0) {
      console.log('✅ 成功!');
      console.log('  tempFileURL:', file_list?.[0]?.tempFileURL?.substring(0, 80) + '...');
      return true;
    } else {
      console.log('❌ 失败:', errcode, errmsg);
      return false;
    }
  } catch (err) {
    console.log('❌ 异常:', err.message);
    return false;
  }
};

(async () => {
  console.log('开始测试', testFileIds.length, '种 fileId 格式...\n');

  for (let i = 0; i < testFileIds.length; i++) {
    await testFileId(testFileIds[i], i);
  }

  console.log('\n=== 测试完成 ===');
})();
