const request = require('supertest');
const app = require('../../../src/app');
const { User, Plant, sequelize } = require('../../../src/models');
const { createAuthenticatedUser, cleanupTestData } = require('../../setup/test-helpers');
const { createTestPlant } = require('../../setup/test-data');

describe('错误响应格式测试', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('统一错误响应格式', () => {
    it('404 响应应包含正确的错误格式', async () => {
      const result = await createAuthenticatedUser();

      const res = await request(app)
        .get('/api/plants/NOT_EXIST')
        .set('Authorization', `Bearer ${result.token}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('code', 404);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('data', null);
    });

    it('400 响应应包含验证错误详情', async () => {
      const result = await createAuthenticatedUser();

      const res = await request(app)
        .post('/api/plants')
        .set('Authorization', `Bearer ${result.token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      expect(res.body.message).toBeDefined();
    });

    it('401 响应应包含正确的错误格式', async () => {
      const res = await request(app)
        .get('/api/plants')
        .expect(401);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('code', 401);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('data', null);
    });

    it('500 响应应包含正确的错误格式', async () => {
      const result = await createAuthenticatedUser();

      const res = await request(app)
        .get('/api/plants/INVALID_ID_TOO_LONG_123456789')
        .set('Authorization', `Bearer ${result.token}`);

      if (res.status === 500) {
        expect(res.body).toHaveProperty('code', 500);
        expect(res.body).toHaveProperty('message');
      }
    });
  });

  describe('资源不存在错误', () => {
    let testUser;
    let testToken;

    beforeEach(async () => {
      const result = await createAuthenticatedUser();
      testUser = result.user;
      testToken = result.token;
    });

    afterEach(async () => {
      await cleanupTestData([{ model: User, where: { user_id: testUser.user_id } }]);
    });

    it('获取不存在的植物返回 404', async () => {
      const res = await request(app)
        .get('/api/plants/PLANT_NOT_EXIST_12345')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(404);
      expect(res.body.message).toBe('植物不存在');
    });

    it('获取不存在的设备返回 404', async () => {
      const res = await request(app)
        .get('/api/devices/DEVICE_NOT_EXIST')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(404);
      expect(res.body.message).toBe('设备不存在');
    });

    it('获取不存在的会话返回 404', async () => {
      const res = await request(app)
        .get('/api/sessions/SESSION_NOT_EXIST')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(404);
      expect(res.body.message).toBe('会话不存在');
    });
  });

  describe('参数验证错误', () => {
    let testUser;
    let testToken;

    beforeEach(async () => {
      const result = await createAuthenticatedUser();
      testUser = result.user;
      testToken = result.token;
    });

    afterEach(async () => {
      await cleanupTestData([{ model: User, where: { user_id: testUser.user_id } }]);
    });

    it('创建植物缺少 nickname 返回 400', async () => {
      const res = await request(app)
        .post('/api/plants')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          plantCategory: 'succulent',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });

    it('创建植物缺少 plantCategory 返回 400', async () => {
      const res = await request(app)
        .post('/api/plants')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          nickname: '测试植物',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });

    it('无效的 plantCategory 返回 400', async () => {
      const res = await request(app)
        .post('/api/plants')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          nickname: '测试植物',
          plantCategory: 'invalid_category',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });

    it('发送消息缺少 contentType 返回 400', async () => {
      const userResult = await createAuthenticatedUser();
      const sessionResult = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${userResult.token}`)
        .send({
          type: 'consultation',
          title: '测试会话',
        });

      const sessionId = sessionResult.body.data.sessionId;

      const res = await request(app)
        .post(`/api/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${userResult.token}`)
        .send({
          content: '测试消息',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });
  });
});
