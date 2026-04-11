const request = require('supertest');
const app = require('../../src/app');
const { User, Plant, Session, Message, sequelize } = require('../../src/models');
const { createAuthenticatedUser, cleanupTestData } = require('../setup/test-helpers');
const { createTestPlant, createTestSession } = require('../setup/test-data');

describe('用户完整旅程 E2E 测试', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  }, 60000); // 增加超时到60秒

  afterAll(async () => {
    await sequelize.close();
  });

  describe('场景一：新用户完整旅程', () => {
    let authToken;
    let userId;
    let plantId;
    let sessionId;
    let messageIds = [];

    afterAll(async () => {
      if (messageIds.length > 0) {
        await Message.destroy({ where: { message_id: messageIds }, force: true });
      }
      if (sessionId) {
        await Session.destroy({ where: { session_id: sessionId }, force: true });
      }
      if (plantId) {
        await Plant.destroy({ where: { plant_id: plantId }, force: true });
      }
      if (userId) {
        await User.destroy({ where: { user_id: userId }, force: true });
      }
    });

    it('步骤1：游客登录成功', async () => {
      const res = await request(app)
        .post('/api/users/guest-login')
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.message).toBe('游客登录成功');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.nickname).toBe('游客用户');

      authToken = res.body.data.token;
      userId = res.body.data.user.userId;
    });

    it('步骤2：创建植物成功', async () => {
      const res = await request(app)
        .post('/api/plants')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nickname: '我的第一盆植物',
          species: '绿萝',
          plantCategory: 'foliage',
          locationName: '客厅',
        })
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.plantId).toBeDefined();
      expect(res.body.data.nickname).toBe('我的第一盆植物');
      expect(res.body.data.species).toBe('绿萝');
      expect(res.body.data.plantCategory).toBe('foliage');

      plantId = res.body.data.plantId;
    });

    it('步骤3：创建会话成功', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'plant',
          plantId: plantId,
          title: '植物诊断会话',
        })
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.sessionId).toBeDefined();
      expect(res.body.data.type).toBe('plant');
      expect(res.body.data.plantId).toBe(plantId);
      expect(res.body.data.status).toBe('active');

      sessionId = res.body.data.sessionId;
    });

    it('步骤4：发送消息成功', async () => {
      const res = await request(app)
        .post(`/api/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '我的植物叶子发黄了，请问是什么原因？',
          contentType: 'text',
        })
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.userMessage).toBeDefined();
      expect(res.body.data.userMessage.messageId).toBeDefined();
      expect(res.body.data.userMessage.sessionId).toBe(sessionId);
      expect(res.body.data.userMessage.role).toBe('user');
      expect(res.body.data.userMessage.content).toBe('我的植物叶子发黄了，请问是什么原因？');
      expect(res.body.data.userMessage.status).toBe('normal');

      messageIds.push(res.body.data.userMessage.messageId);
    }, 60000); // AI接口调用增加60秒超时

    it('步骤5：验证消息历史保存', async () => {
      const res = await request(app)
        .get(`/api/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.list).toBeDefined();
      expect(Array.isArray(res.body.data.list)).toBe(true);
      expect(res.body.data.list.length).toBeGreaterThanOrEqual(1);

      const userMessage = res.body.data.list.find(m => m.role === 'user');
      expect(userMessage).toBeDefined();
      expect(userMessage.content).toBe('我的植物叶子发黄了，请问是什么原因？');
    });

    it('步骤6：验证用户植物列表包含新创建的植物', async () => {
      const res = await request(app)
        .get('/api/plants')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.list).toBeDefined();
      expect(res.body.data.list.length).toBeGreaterThanOrEqual(1);

      const plant = res.body.data.list.find(p => p.plantId === plantId);
      expect(plant).toBeDefined();
      expect(plant.nickname).toBe('我的第一盆植物');
    });

    it('步骤7：验证用户会话列表包含新创建的会话', async () => {
      const res = await request(app)
        .get('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      expect(res.body.data.list).toBeDefined();
      expect(res.body.data.list.length).toBeGreaterThanOrEqual(1);

      const session = res.body.data.list.find(s => s.sessionId === sessionId);
      expect(session).toBeDefined();
      expect(session.type).toBe('plant');
      expect(session.plantId).toBe(plantId);
    });
  });

  describe('场景二：用户数据隔离验证', () => {
    let user1Token;
    let user1Id;
    let user2Token;
    let user2Id;
    let user1PlantId;
    let user1SessionId;

    afterAll(async () => {
      if (user1SessionId) {
        await Message.destroy({ where: { session_id: user1SessionId }, force: true });
        await Session.destroy({ where: { session_id: user1SessionId }, force: true });
      }
      if (user1PlantId) {
        await Plant.destroy({ where: { plant_id: user1PlantId }, force: true });
      }
      if (user1Id) {
        await User.destroy({ where: { user_id: user1Id }, force: true });
      }
      if (user2Id) {
        await User.destroy({ where: { user_id: user2Id }, force: true });
      }
    });

    it('用户1登录并创建数据', async () => {
      const loginRes = await request(app)
        .post('/api/users/guest-login')
        .expect(200);

      user1Token = loginRes.body.data.token;
      user1Id = loginRes.body.data.user.userId;

      const plantRes = await request(app)
        .post('/api/plants')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          nickname: '用户1的植物',
          species: '绿萝',
          plantCategory: 'foliage',
        })
        .expect(200);

      user1PlantId = plantRes.body.data.plantId;

      const sessionRes = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          type: 'consultation',
          title: '用户1的会话',
        })
        .expect(200);

      user1SessionId = sessionRes.body.data.sessionId;
    });

    it('用户2登录', async () => {
      const loginRes = await request(app)
        .post('/api/users/guest-login')
        .expect(200);

      user2Token = loginRes.body.data.token;
      user2Id = loginRes.body.data.user.userId;
    });

    it('用户2无法访问用户1的植物', async () => {
      const res = await request(app)
        .get(`/api/plants/${user1PlantId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.body.code).toBe(404);
      expect(res.body.message).toBe('植物不存在');
    });

    it('用户2无法访问用户1的会话', async () => {
      const res = await request(app)
        .get(`/api/sessions/${user1SessionId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.body.code).toBe(404);
      expect(res.body.message).toBe('会话不存在');
    });

    it('用户2无法向用户1的会话发送消息', async () => {
      const res = await request(app)
        .post(`/api/sessions/${user1SessionId}/messages`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          content: '尝试发送消息',
          contentType: 'text',
        });

      expect(res.body.code).toBe(404);
    });

    it('用户2植物列表不包含用户1的植物', async () => {
      const res = await request(app)
        .get('/api/plants')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      const plantIds = res.body.data.list.map(p => p.plantId);
      expect(plantIds).not.toContain(user1PlantId);
    });

    it('用户2会话列表不包含用户1的会话', async () => {
      const res = await request(app)
        .get('/api/sessions')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(res.body.code).toBe(0);
      const sessionIds = res.body.data.list.map(s => s.sessionId);
      expect(sessionIds).not.toContain(user1SessionId);
    });
  });
});
