/**
 * 用户认证流程测试
 * 测试用户认证、获取信息、更新资料的完整流程
 */

const request = require('supertest');
const app = require('../../../src/app');
const { User, sequelize } = require('../../../src/models');
const { createAuthenticatedUser, cleanupTestData } = require('../../setup/test-helpers');

describe('用户认证流程', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('用户资料管理流程', () => {
    let authToken;
    let userId;

    beforeEach(async () => {
      const result = await createAuthenticatedUser({ nickname: '测试用户' });
      authToken = result.token;
      userId = result.userId;
    });

    afterEach(async () => {
      if (userId) {
        await cleanupTestData([
          { model: User, where: { user_id: userId } },
        ]);
      }
    });

    it('获取用户信息 → 更新用户资料 → 验证更新', async () => {
      // Step 1: 获取用户信息
      const getUserRes = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(getUserRes.status).toBe(200);
      expect(getUserRes.body.code).toBe(0);
      expect(getUserRes.body.data.userId).toBe(userId);
      expect(getUserRes.body.data.nickname).toBe('测试用户');

      // Step 2: 更新用户资料
      const updateRes = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nickname: '更新后的昵称',
          avatarUrl: 'https://example.com/new-avatar.jpg',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.code).toBe(0);
      expect(updateRes.body.data.nickname).toBe('更新后的昵称');

      // Step 3: 验证更新成功
      const verifyRes = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(verifyRes.body.data.nickname).toBe('更新后的昵称');
    });

    it('未授权访问返回401', async () => {
      const res = await request(app)
        .get('/api/users/me');

      expect(res.status).toBe(401);
    });

    it('无效token返回401', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid_token');

      expect(res.status).toBe(401);
    });
  });

  describe('用户数据隔离', () => {
    let userA, userB;
    let tokenA, tokenB;

    beforeEach(async () => {
      const resultA = await createAuthenticatedUser({ nickname: '用户A' });
      userA = resultA.userId;
      tokenA = resultA.token;

      const resultB = await createAuthenticatedUser({ nickname: '用户B' });
      userB = resultB.userId;
      tokenB = resultB.token;
    });

    afterEach(async () => {
      await cleanupTestData([
        { model: User, where: { user_id: [userA, userB] } },
      ]);
    });

    it('用户A无法访问用户B的数据', async () => {
      // 用户A获取自己的信息
      const resA = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(resA.body.data.userId).toBe(userA);
      expect(resA.body.data.nickname).toBe('用户A');

      // 用户B获取自己的信息
      const resB = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(resB.body.data.userId).toBe(userB);
      expect(resB.body.data.nickname).toBe('用户B');
    });
  });
});
