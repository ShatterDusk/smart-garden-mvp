/**
 * 预签名 URL 测试脚本
 */

const { getPresignedUrl } = require('../../backend/server/src/utils/cosPresignedUrl');

const testCosUrl = 'https://7072-prod-4g7ephngc4e53ec3-1401681523.cos.ap-shanghai.myqcloud.com/uploads/USER_49CC7481/2026-04-01/1775047882304-l1kfzv.jpg';

console.log('=== COS 预签名 URL 测试 ===\n');
console.log('测试 URL:', testCosUrl);
console.log('');

// 检测是否在云托管环境中
const isCloudRun = process.env.KUBERNETES_SERVICE_HOST;
if (!isCloudRun) {
  console.log('⚠️  警告：当前不在微信云托管环境中');
  console.log('   预签名 URL 功能需要在云托管环境中才能正常工作');
  console.log('   本地测试会失败，因为无法访问开放接口服务');
  console.log('   请在部署到云托管后测试此功能');
  console.log('');
}

(async () => {
  try {
    const presignedUrl = await getPresignedUrl(testCosUrl, 600);
    
    if (presignedUrl) {
      console.log('\n✅ 成功生成预签名 URL');
      console.log('URL:', presignedUrl);
      console.log('\n你可以复制上面的 URL 到浏览器测试是否能访问图片');
    } else {
      console.log('\n❌ 生成预签名 URL 失败');
      if (!isCloudRun) {
        console.log('   这是正常的，因为本地环境无法访问微信云托管开放接口服务');
        console.log('   请在部署到云托管后测试');
      } else {
        console.log('   请检查：');
        console.log('   1. 是否在云托管控制台配置了开放接口白名单 /_/cos/getauth');
        console.log('   2. 环境变量 WECHAT_ENV_ID 是否正确设置');
      }
    }
  } catch (err) {
    console.error('\n❌ 测试异常:', err.message);
    if (!isCloudRun) {
      console.log('   本地环境无法测试此功能，请部署到云托管后测试');
    }
  }
})();
