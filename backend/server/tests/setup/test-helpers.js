const request = require('supertest');
const app = require('../../src/app');
const { User } = require('../../src/models');
const { generateToken } = require('../../src/middleware/auth');

async function createAuthenticatedUser(userData = {}) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  const user = await User.create({
    user_id: `TEST_AUTH_USER_${timestamp}_${random}`,
    wx_openid: `test_auth_openid_${timestamp}_${random}`,
    nickname: '认证测试用户',
    avatar_url: null,
    role: 'user',
    status: 'active',
    last_login_at: new Date(),
    ...userData,
  });

  const token = generateToken({ user_id: user.user_id });

  return {
    user,
    token,
    userId: user.user_id,
  };
}

function authRequest(method, path, token) {
  const methods = ['get', 'post', 'put', 'delete', 'patch'];
  const m = method.toLowerCase();
  if (!methods.includes(m)) {
    throw new Error(`Invalid method: ${method}`);
  }
  return request(app)[m](path).set('Authorization', `Bearer ${token}`);
}

async function cleanupTestData(cleanupList) {
  for (const item of cleanupList) {
    const { model, where } = item;
    try {
      await model.destroy({ where, force: true });
    } catch (err) {
      // ignore cleanup errors
    }
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateUniqueTimestamp() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

module.exports = {
  createAuthenticatedUser,
  authRequest,
  cleanupTestData,
  wait,
  generateUniqueTimestamp,
};
