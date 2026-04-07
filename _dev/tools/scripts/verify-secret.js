/**
 * 验证 WECHAT_SECRET 是否有效
 */

const axios = require('axios');
const https = require('https');

const appId = process.env.WECHAT_APPID;
const secret = process.env.WECHAT_SECRET;

console.log('=== 验证 WECHAT_SECRET ===\n');
console.log('AppID:', appId);
console.log('Secret:', secret ? secret.substring(0, 5) + '***' : '(未设置)');
console.log('');

if (!appId || !secret) {
  console.error('❌ 错误: 缺少 AppID 或 Secret');
  process.exit(1);
}

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

const verifySecret = async () => {
  try {
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${secret}`;
    console.log('请求地址:', url.replace(secret, '***'));
    console.log('');

    const response = await axiosInstance.get(url);
    const { access_token, expires_in, errcode, errmsg } = response.data;

    console.log('响应结果:');
    console.log('  errcode:', errcode);
    console.log('  errmsg:', errmsg);
    console.log('  access_token:', access_token ? '获取成功' : '未获取');
    console.log('  expires_in:', expires_in);
    console.log('');

    if (access_token) {
      console.log('✅ Secret 验证成功！');
      console.log('   access_token 有效期:', expires_in, '秒');
      return true;
    } else {
      console.log('❌ Secret 验证失败！');
      console.log('   错误信息:', errmsg);
      console.log('');
      console.log('可能的原因:');
      console.log('   1. Secret 错误或被重置过');
      console.log('   2. AppID 和 Secret 不匹配');
      console.log('   3. 小程序账号异常');
      return false;
    }
  } catch (err) {
    console.error('❌ 请求异常:', err.message);
    return false;
  }
};

verifySecret().then(success => {
  process.exit(success ? 0 : 1);
});
