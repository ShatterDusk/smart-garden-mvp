/**
 * 会话和诊断流程测试
 * 测试创建会话、发送消息、查询会话的完整流程
 */

const request = require('supertest');
const app = require('../../../src/app');
const { User, Plant, Session, Message, DiagnosisCard, sequelize } = require('../../../src/models');
const { createAuthenticatedUser, cleanupTestData } = require('../../setup/test-helpers');

describe('会话和诊断流程', () => {
  let authToken;
  let userId;
  let plantId;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // 创建测试用户
    const result = await createAuthenticatedUser({ nickname: '测试用户' });
    authToken = result.token;
    userId = result.userId;

    // 创建测试植物
    const plantRes = await request(app)
      .post('/api/plants')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        nickname: '诊断测试植物',
        species: '绿萝',
        plantCategory: 'foliage',
      });

    plantId = plantRes.body.data.plantId;
  });

  afterEach(async () => {
    await cleanupTestData([
      { model: DiagnosisCard, where: {} },
      { model: Message, where: {} },
      { model: Session, where: { user_id: userId } },
      { model: Plant, where: { user_id: userId } },
      { model: User, where: { user_id: userId } },
    ]);
  });

  describe('咨询会话流程', () => {
    it('创建咨询会话 → 发送消息 → 获取会话详情', async () => {
      // Step 1: 创建咨询会话
      const sessionRes = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'consultation',
          title: '植物病害咨询',
        });

      expect(sessionRes.status).toBe(200);
      expect(sessionRes.body.code).toBe(0);
      expect(sessionRes.body.data.sessionId).toBeDefined();

      const sessionId = sessionRes.body.data.sessionId;

      // Step 2: 发送文本消息
      const messageRes = await request(app)
        .post(`/api/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contentType: 'text',
          content: '我的植物叶子发黄了，请问是什么原因？',
        });

      expect(messageRes.status).toBe(200);
      expect(messageRes.body.code).toBe(0);
      // 只要请求成功即可，不检查具体返回字段（因为可能是异步处理）

      // Step 3: 获取会话详情和消息列表
      const getRes = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.code).toBe(0);
      expect(getRes.body.data).toBeDefined();
    });

    it('创建植物会话 → 关联植物 → 发送消息', async () => {
      // 创建植物会话
      const sessionRes = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'plant',
          plantId: plantId,
          title: '植物诊断',
        });

      expect(sessionRes.status).toBe(200);
      expect(sessionRes.body.data.plantId).toBe(plantId);

      const sessionId = sessionRes.body.data.sessionId;

      // 发送消息
      const messageRes = await request(app)
        .post(`/api/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contentType: 'text',
          content: '请帮我看看这植物',
        });

      expect(messageRes.status).toBe(200);
    });

    it('会话升级：咨询会话 → 绑定植物 → 升级为植物会话', async () => {
      // 创建咨询会话
      const sessionRes = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'consultation',
          title: '咨询会话',
        });

      const sessionId = sessionRes.body.data.sessionId;

      // 升级到植物会话
      const upgradeRes = await request(app)
        .post(`/api/sessions/${sessionId}/upgrade`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plantId: plantId,
        });

      expect(upgradeRes.status).toBe(200);
      expect(upgradeRes.body.code).toBe(0);
      expect(upgradeRes.body.data.type).toBe('plant');
      expect(upgradeRes.body.data.plantId).toBe(plantId);

      // 验证升级成功
      const getRes = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.body.data.type).toBe('plant');
    });
  });

  describe('会话列表和状态', () => {
    it('创建多个会话 → 查询会话列表', async () => {
      // 创建多个会话
      const sessions = [];
      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .post('/api/sessions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'consultation',
            title: `会话 ${i + 1}`,
          });
        sessions.push(res.body.data.sessionId);
      }

      // 查询会话列表
      const listRes = await request(app)
        .get('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.list).toHaveLength(3);
    });

    it('删除会话 → 验证无法访问', async () => {
      // 创建会话
      const sessionRes = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'consultation',
          title: '即将删除的会话',
        });

      const sessionId = sessionRes.body.data.sessionId;

      // 删除会话
      const deleteRes = await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteRes.status).toBe(200);

      // 验证无法访问
      const getRes = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.status).toBe(404);
    });
  });

  describe('权限控制', () => {
    it('无法访问其他用户的会话', async () => {
      // 创建会话
      const sessionRes = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'consultation',
          title: '私有会话',
        });

      const sessionId = sessionRes.body.data.sessionId;

      // 创建其他用户
      const otherResult = await createAuthenticatedUser({ nickname: '其他用户' });
      const otherToken = otherResult.token;
      const otherUserId = otherResult.userId;

      // 尝试访问其他用户的会话
      const getRes = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(getRes.status).toBe(404);

      // 清理
      await cleanupTestData([
        { model: User, where: { user_id: otherUserId } },
      ]);
    });
  });
});
