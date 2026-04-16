/**
 * 通过 OpenID 修复登录问题
 * 将指定用户的 OpenID 更新为新的值，使其能够正常登录
 */

const { User } = require('../src/models');

async function fixLoginByOpenId(userId, newOpenId) {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      console.error(`❌ 用户不存在: ${userId}`);
      return;
    }

    console.log(`\n========== 修复登录问题 ==========`);
    console.log(`用户ID: ${userId}`);
    console.log(`当前 OpenID: ${user.wx_openid || '无'}`);
    console.log(`新 OpenID: ${newOpenId}`);

    // 检查新 openid 是否被其他用户使用
    const existing = await User.findOne({ where: { wx_openid: newOpenId } });
    if (existing && existing.user_id !== userId) {
      console.error(`❌ 该 OpenID 已被用户 ${existing.user_id} 使用`);
      return;
    }

    await user.update({ wx_openid: newOpenId });
    console.log(`✅ 更新成功！现在可以使用新账号登录了`);
    console.log(`==================================\n`);

  } catch (error) {
    console.error('修复失败:', error.message);
  } finally {
    process.exit(0);
  }
}

// 命令行用法
const userId = process.argv[2];
const newOpenId = process.argv[3];

if (!userId || !newOpenId) {
  console.log(`
用法: node fix-login-by-openid.js <用户ID> <新OpenID>

示例:
  node fix-login-by-openid.js USER_E2C0DBFB dev_abc123xyz

说明:
  1. 先登录小程序，在控制台查看当前生成的 openid
  2. 将该 openid 绑定到原账号上
  3. 之后用相同方式登录就能访问原账号数据了
`);
  process.exit(0);
}

fixLoginByOpenId(userId, newOpenId);
