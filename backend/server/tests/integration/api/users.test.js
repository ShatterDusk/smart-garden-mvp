const request = require('supertest');
const app = require('../../../src/app');
const { User, UserConfig, sequelize } = require('../../../src/models');
const { generateToken } = require('../../../src/middleware/auth');
const { createTestUser } = require('../../setup/test-data');
const { createAuthenticatedUser, cleanupTestData } = require('../../setup/test-helpers');

describe('用户模块 API 测试', () => {
  let testUser;
  let testToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/users/guest-login - 游客登录', () => {
    it('游客登录成功', async () => {
      const response = await request(app)
        .post('/api/users/guest-login')
        .expect(200);

      expect(response.body).toHaveProperty('code', 200);
      expect(response.body).toHaveProperty('message', '游客登录成功');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('expiresIn', 604800);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('userId');
      expect(response.body.data.user).toHaveProperty('nickname', '游客用户');
    });

    it('返回有效 token', async () => {
      const response = await request(app)
        .post('/api/users/guest-login')
        .expect(200);
      
      const token = response.body.data.token;

      const profileResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(profileResponse.body).toHaveProperty('code', 200);
      expect(profileResponse.body.data).toHaveProperty('userId');
    });
  });

  describe('GET /api/users/profile - 获取用户信息', () => {
    beforeAll(async () => {
      const result = await createAuthenticatedUser();
      testUser = result.user;
      testToken = result.token;
    });

    afterAll(async () => {
      await cleanupTestData([
        { model: UserConfig, where: { user_id: testUser.user_id } },
        { model: User, where: { user_id: testUser.user_id } },
      ]);
    });

    it('获取用户信息成功', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('code', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data).toHaveProperty('nickname');
      expect(response.body.data).toHaveProperty('avatarUrl');
      expect(response.body.data).toHaveProperty('plantCount');
      expect(response.body.data).toHaveProperty('deviceCount');
    });

    it('无 token 返回 401', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body).toHaveProperty('code', 401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/缺少Authorization头|Authorization格式错误/);
    });
  });

  describe('PUT /api/users/profile - 更新用户信息', () => {
    let userToken;
    let userId;

    beforeEach(async () => {
      const result = await createAuthenticatedUser();
      userToken = result.token;
      userId = result.userId;
    });

    afterEach(async () => {
      await cleanupTestData([
        { model: UserConfig, where: { user_id: userId } },
        { model: User, where: { user_id: userId } },
      ]);
    });

    it('更新用户信息成功', async () => {
      const updateData = {
        nickname: '更新后的昵称',
        avatarUrl: 'https://example.com/avatar.png',
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('code', 200);
      expect(response.body).toHaveProperty('message', '更新成功');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data).toHaveProperty('nickname', '更新后的昵称');
      expect(response.body.data).toHaveProperty('avatarUrl', 'https://example.com/avatar.png');
    });

    it('无 token 返回 401', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .send({ nickname: '测试昵称' })
        .expect(401);

      expect(response.body).toHaveProperty('code', 401);
    });
  });

  describe('GET /api/users/settings - 获取用户设置', () => {
    let userToken;
    let userId;

    beforeEach(async () => {
      const result = await createAuthenticatedUser();
      userToken = result.token;
      userId = result.userId;
    });

    afterEach(async () => {
      await cleanupTestData([
        { model: UserConfig, where: { user_id: userId } },
        { model: User, where: { user_id: userId } },
      ]);
    });

    it('获取用户设置成功', async () => {
      const response = await request(app)
        .get('/api/users/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('code', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('notification');
      expect(response.body.data.notification).toHaveProperty('diagnosisReminder');
      expect(response.body.data.notification).toHaveProperty('careReminder');
      expect(response.body.data.notification).toHaveProperty('environmentAlert');
      expect(response.body.data.notification).toHaveProperty('reminderTime');
      expect(response.body.data).toHaveProperty('preferences');
    });

    it('无 token 返回 401', async () => {
      const response = await request(app)
        .get('/api/users/settings')
        .expect(401);

      expect(response.body).toHaveProperty('code', 401);
    });
  });

  describe('POST /api/users/config - 设置用户配置', () => {
    let userToken;
    let userId;

    beforeEach(async () => {
      const result = await createAuthenticatedUser();
      userToken = result.token;
      userId = result.userId;
    });

    afterEach(async () => {
      await cleanupTestData([
        { model: UserConfig, where: { user_id: userId } },
        { model: User, where: { user_id: userId } },
      ]);
    });

    it('设置用户配置成功', async () => {
      const configData = {
        configKey: 'test_config',
        configValue: {
          option1: 'value1',
          option2: true,
        },
        configType: 'preference',
      };

      const response = await request(app)
        .post('/api/users/config')
        .set('Authorization', `Bearer ${userToken}`)
        .send(configData)
        .expect(200);

      expect(response.body).toHaveProperty('code', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('configKey', 'test_config');
      expect(response.body.data).toHaveProperty('configValue');
      expect(response.body.data.configValue).toHaveProperty('option1', 'value1');
      expect(response.body.data.configValue).toHaveProperty('option2', true);
      expect(response.body.data).toHaveProperty('configType', 'preference');
    });

    it('无 token 返回 401', async () => {
      const response = await request(app)
        .post('/api/users/config')
        .send({ configKey: 'test', configValue: {} })
        .expect(401);

      expect(response.body).toHaveProperty('code', 401);
    });

    it('缺少 configKey 返回 400', async () => {
      const response = await request(app)
        .post('/api/users/config')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ configValue: { test: 'value' } })
        .expect(400);

      expect(response.body).toHaveProperty('code', 400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('configKey');
    });
  });

  describe('GET /api/users/config/:configKey - 获取用户配置项', () => {
    let userToken;
    let userId;

    beforeEach(async () => {
      const result = await createAuthenticatedUser();
      userToken = result.token;
      userId = result.userId;
    });

    afterEach(async () => {
      await cleanupTestData([
        { model: UserConfig, where: { user_id: userId } },
        { model: User, where: { user_id: userId } },
      ]);
    });

    it('获取已存在的配置项', async () => {
      await request(app)
        .post('/api/users/config')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          configKey: 'existing_config',
          configValue: { data: 'test' },
        });

      const response = await request(app)
        .get('/api/users/config/existing_config')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('code', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('configKey', 'existing_config');
      expect(response.body.data).toHaveProperty('configValue');
    });

    it('获取不存在的配置项返回默认值', async () => {
      const response = await request(app)
        .get('/api/users/config/non_existent_config')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('code', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('configKey', 'non_existent_config');
      expect(response.body.data).toHaveProperty('configValue', null);
    });
  });
});
