const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../../src/app');
const { User, Plant, Session, Message, sequelize } = require('../../../src/models');
const { createAuthenticatedUser, cleanupTestData } = require('../../setup/test-helpers');
const { createTestPlant, createTestSession } = require('../../setup/test-data');

describe('会话模块 API 测试', () => {
  let testUser;
  let testPlant;
  let testSession;
  let authToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/sessions - 创建会话', () => {
    beforeEach(async () => {
      const result = await createAuthenticatedUser();
      testUser = result.user;
      authToken = result.token;

      testPlant = await Plant.create(createTestPlant(testUser.user_id));
    });

    afterEach(async () => {
      await cleanupTestData([
        { model: Session, where: { user_id: testUser.user_id } },
        { model: Plant, where: { user_id: testUser.user_id } },
        { model: User, where: { user_id: testUser.user_id } },
      ]);
    });

    it('创建咨询会话成功', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'consultation',
          title: '新的咨询会话',
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.sessionId).toBeDefined();
      expect(res.body.data.type).toBe('consultation');
      expect(res.body.data.title).toBe('新的咨询会话');
      expect(res.body.data.status).toBe('active');
    });

    it('创建植物会话成功', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'plant',
          plantId: testPlant.plant_id,
          title: '植物诊断会话',
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.sessionId).toBeDefined();
      expect(res.body.data.type).toBe('plant');
      expect(res.body.data.plantId).toBe(testPlant.plant_id);
      expect(res.body.data.title).toBe('植物诊断会话');
    });
  });

  describe('GET /api/sessions - 获取会话列表', () => {
    beforeEach(async () => {
      const result = await createAuthenticatedUser();
      testUser = result.user;
      authToken = result.token;

      testPlant = await Plant.create(createTestPlant(testUser.user_id));
      testSession = await Session.create(createTestSession(testUser.user_id, testPlant.plant_id));
    });

    afterEach(async () => {
      await cleanupTestData([
        { model: Session, where: { user_id: testUser.user_id } },
        { model: Plant, where: { user_id: testUser.user_id } },
        { model: User, where: { user_id: testUser.user_id } },
      ]);
    });

    it('获取会话列表成功', async () => {
      const res = await request(app)
        .get('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.list).toBeDefined();
      expect(Array.isArray(res.body.data.list)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.pageSize).toBe(20);
      expect(res.body.data.pagination.total).toBeDefined();
    });

    it('按类型筛选会话列表', async () => {
      const res = await request(app)
        .get('/api/sessions')
        .query({ type: 'plant' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data.list).toBeDefined();
    });

    it('按植物ID筛选会话列表', async () => {
      const res = await request(app)
        .get('/api/sessions')
        .query({ plantId: testPlant.plant_id })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data.list).toBeDefined();
    });
  });

  describe('GET /api/sessions/:sessionId - 获取会话详情', () => {
    beforeEach(async () => {
      const result = await createAuthenticatedUser();
      testUser = result.user;
      authToken = result.token;

      testSession = await Session.create(createTestSession(testUser.user_id));
    });

    afterEach(async () => {
      await cleanupTestData([
        { model: Session, where: { user_id: testUser.user_id } },
        { model: User, where: { user_id: testUser.user_id } },
      ]);
    });

    it('获取会话详情成功', async () => {
      const res = await request(app)
        .get(`/api/sessions/${testSession.session_id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.sessionId).toBe(testSession.session_id);
      expect(res.body.data.type).toBe(testSession.type);
      expect(res.body.data.title).toBe(testSession.title);
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.messageCount).toBeDefined();
    });

    it('会话不存在返回404', async () => {
      const res = await request(app)
        .get('/api/sessions/NOT_EXIST_SESSION')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(404);
      expect(res.body.message).toBe('会话不存在');
    });
  });

  describe('GET /api/sessions/:sessionId/messages - 获取消息列表', () => {
    beforeEach(async () => {
      const result = await createAuthenticatedUser();
      testUser = result.user;
      authToken = result.token;

      testSession = await Session.create(createTestSession(testUser.user_id));
    });

    afterEach(async () => {
      await cleanupTestData([
        { model: Message, where: { session_id: testSession.session_id } },
        { model: Session, where: { user_id: testUser.user_id } },
        { model: User, where: { user_id: testUser.user_id } },
      ]);
    });

    it('获取消息列表成功', async () => {
      const res = await request(app)
        .get(`/api/sessions/${testSession.session_id}/messages`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.list).toBeDefined();
      expect(Array.isArray(res.body.data.list)).toBe(true);
      expect(res.body.data.hasMore).toBeDefined();
    });

    it('会话不存在返回404', async () => {
      const res = await request(app)
        .get('/api/sessions/NOT_EXIST_SESSION/messages')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(404);
    });
  });

  describe('POST /api/sessions/:sessionId/messages - 发送消息', () => {
    beforeEach(async () => {
      const result = await createAuthenticatedUser();
      testUser = result.user;
      authToken = result.token;

      testSession = await Session.create(createTestSession(testUser.user_id));
    });

    afterEach(async () => {
      await cleanupTestData([
        { model: Message, where: { session_id: testSession.session_id } },
        { model: Session, where: { user_id: testUser.user_id } },
        { model: User, where: { user_id: testUser.user_id } },
      ]);
    });

    it('发送文本消息成功', async () => {
      const res = await request(app)
        .post(`/api/sessions/${testSession.session_id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '这是一条测试消息',
          contentType: 'text',
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.userMessage).toBeDefined();
      expect(res.body.data.userMessage.messageId).toBeDefined();
      expect(res.body.data.userMessage.sessionId).toBe(testSession.session_id);
      expect(res.body.data.userMessage.role).toBe('user');
      expect(res.body.data.userMessage.contentType).toBe('text');
      expect(res.body.data.userMessage.content).toBe('这是一条测试消息');
      expect(res.body.data.userMessage.status).toBe('normal');
      expect(res.body.data.aiResponse).toBeDefined();
    });

    it('会话不存在返回404', async () => {
      const res = await request(app)
        .post('/api/sessions/NOT_EXIST_SESSION/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '测试消息',
          contentType: 'text',
        });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(404);
    });
  });

  describe('PUT /api/sessions/:sessionId - 更新会话', () => {
    beforeEach(async () => {
      const result = await createAuthenticatedUser();
      testUser = result.user;
      authToken = result.token;

      testSession = await Session.create(createTestSession(testUser.user_id));
    });

    afterEach(async () => {
      await cleanupTestData([
        { model: Session, where: { user_id: testUser.user_id } },
        { model: User, where: { user_id: testUser.user_id } },
      ]);
    });

    it('更新会话标题成功', async () => {
      const res = await request(app)
        .put(`/api/sessions/${testSession.session_id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '更新后的会话标题',
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.sessionId).toBe(testSession.session_id);
      expect(res.body.data.title).toBe('更新后的会话标题');
    });

    it('会话不存在返回404', async () => {
      const res = await request(app)
        .put('/api/sessions/NOT_EXIST_SESSION')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '新标题',
        });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(404);
    });
  });

  describe('DELETE /api/sessions/:sessionId - 删除会话', () => {
    let sessionToDelete;
    let userToken;
    let userId;

    beforeEach(async () => {
      const result = await createAuthenticatedUser();
      userToken = result.token;
      userId = result.userId;

      sessionToDelete = await Session.create(createTestSession(userId, null, { title: '待删除会话' }));
    });

    afterEach(async () => {
      await cleanupTestData([
        { model: Session, where: { user_id: userId } },
        { model: User, where: { user_id: userId } },
      ]);
    });

    it('删除会话成功', async () => {
      const res = await request(app)
        .delete(`/api/sessions/${sessionToDelete.session_id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.message).toBe('删除成功');

      const deletedSession = await Session.findByPk(sessionToDelete.session_id);
      expect(deletedSession).toBeNull();
    });

    it('会话不存在返回404', async () => {
      const res = await request(app)
        .delete('/api/sessions/NOT_EXIST_SESSION')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(404);
    });
  });

  describe('认证测试', () => {
    it('无 token 访问返回 401', async () => {
      const res = await request(app)
        .get('/api/sessions');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
      expect(res.body.message).toContain('Authorization');
    });

    it('无效 token 返回 401', async () => {
      const res = await request(app)
        .get('/api/sessions')
        .set('Authorization', 'Bearer invalid_token');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });
});
