const request = require('supertest');
const app = require('../../../src/app');
const { User, Plant, sequelize } = require('../../../src/models');
const { createAuthenticatedUser, cleanupTestData } = require('../../setup/test-helpers');
const { createTestPlant } = require('../../setup/test-data');

describe('植物模块 API 测试', () => {
  let testUser;
  let testToken;
  let testPlantId;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/plants - 创建植物', () => {
    beforeEach(async () => {
      const result = await createAuthenticatedUser();
      testUser = result.user;
      testToken = result.token;
    });

    afterEach(async () => {
      await cleanupTestData([
        { model: Plant, where: { user_id: testUser.user_id } },
        { model: User, where: { user_id: testUser.user_id } },
      ]);
    });

    it('创建植物成功', async () => {
      const res = await request(app)
        .post('/api/plants')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          nickname: '测试绿萝',
          species: '绿萝',
          plantCategory: 'foliage',
          coverImageUrl: 'https://example.com/image.jpg',
          locationName: '客厅',
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data).toHaveProperty('plantId');
      expect(res.body.data.nickname).toBe('测试绿萝');
      expect(res.body.data.species).toBe('绿萝');
      expect(res.body.data.plantCategory).toBe('foliage');

      testPlantId = res.body.data.plantId;
    });

    it('缺少必填字段返回 400', async () => {
      const res = await request(app)
        .post('/api/plants')
        .set('Authorization', `Bearer ${testToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/plants - 获取植物列表', () => {
    let userToken;
    let userId;

    beforeEach(async () => {
      const result = await createAuthenticatedUser();
      userToken = result.token;
      userId = result.userId;

      await Plant.create(createTestPlant(userId, { nickname: '植物1' }));
      await Plant.create(createTestPlant(userId, { nickname: '植物2' }));
    });

    afterEach(async () => {
      await cleanupTestData([
        { model: Plant, where: { user_id: userId } },
        { model: User, where: { user_id: userId } },
      ]);
    });

    it('获取植物列表成功', async () => {
      const res = await request(app)
        .get('/api/plants')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data).toHaveProperty('list');
      expect(res.body.data).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data.list)).toBe(true);
      expect(res.body.data.list.length).toBe(2);
    });
  });

  describe('GET /api/plants/:plantId - 获取植物详情', () => {
    let userToken;
    let userId;
    let plantId;

    beforeEach(async () => {
      const result = await createAuthenticatedUser();
      userToken = result.token;
      userId = result.userId;

      const plant = await Plant.create(createTestPlant(userId));
      plantId = plant.plant_id;
    });

    afterEach(async () => {
      await cleanupTestData([
        { model: Plant, where: { user_id: userId } },
        { model: User, where: { user_id: userId } },
      ]);
    });

    it('获取植物详情成功', async () => {
      const res = await request(app)
        .get(`/api/plants/${plantId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data).toHaveProperty('plantId', plantId);
      expect(res.body.data).toHaveProperty('nickname');
      expect(res.body.data).toHaveProperty('species');
      expect(res.body.data).toHaveProperty('plantCategory');
    });

    it('不存在的 ID 返回 404', async () => {
      const res = await request(app)
        .get('/api/plants/PLANT_NOT_EXIST_12345')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(404);
      expect(res.body.message).toBe('植物不存在');
    });
  });

  describe('PUT /api/plants/:plantId - 更新植物', () => {
    let userToken;
    let userId;
    let plantId;

    beforeEach(async () => {
      const result = await createAuthenticatedUser();
      userToken = result.token;
      userId = result.userId;

      const plant = await Plant.create(createTestPlant(userId));
      plantId = plant.plant_id;
    });

    afterEach(async () => {
      await cleanupTestData([
        { model: Plant, where: { user_id: userId } },
        { model: User, where: { user_id: userId } },
      ]);
    });

    it('更新植物信息成功', async () => {
      const res = await request(app)
        .put(`/api/plants/${plantId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          nickname: '更新后的绿萝',
          locationName: '阳台',
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data.nickname).toBe('更新后的绿萝');
      expect(res.body.data.locationName).toBe('阳台');
    });
  });

  describe('DELETE /api/plants/:plantId - 删除植物', () => {
    let userToken;
    let userId;
    let plantId;

    beforeEach(async () => {
      const result = await createAuthenticatedUser();
      userToken = result.token;
      userId = result.userId;

      const plant = await Plant.create(createTestPlant(userId, { nickname: '待删除植物' }));
      plantId = plant.plant_id;
    });

    afterEach(async () => {
      await cleanupTestData([
        { model: Plant, where: { user_id: userId } },
        { model: User, where: { user_id: userId } },
      ]);
    });

    it('删除植物成功', async () => {
      const res = await request(app)
        .delete(`/api/plants/${plantId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.message).toBe('删除成功');

      const deletedPlant = await Plant.findByPk(plantId);
      expect(deletedPlant).toBeNull();
    });
  });

  describe('认证测试', () => {
    it('无 token 访问返回 401', async () => {
      const res = await request(app).get('/api/plants');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
      expect(res.body.message).toContain('Authorization');
    });
  });

  describe('用户数据隔离测试', () => {
    let user1Token;
    let user1Id;
    let user1PlantId;
    let user2Token;
    let user2Id;

    beforeEach(async () => {
      const user1 = await createAuthenticatedUser();
      user1Token = user1.token;
      user1Id = user1.userId;

      const user2 = await createAuthenticatedUser();
      user2Token = user2.token;
      user2Id = user2.userId;

      const plant = await Plant.create(createTestPlant(user1Id, { nickname: '用户1的植物' }));
      user1PlantId = plant.plant_id;
    });

    afterEach(async () => {
      await cleanupTestData([
        { model: Plant, where: { user_id: user1Id } },
        { model: Plant, where: { user_id: user2Id } },
        { model: User, where: { user_id: user1Id } },
        { model: User, where: { user_id: user2Id } },
      ]);
    });

    it('用户2无法获取用户1的植物详情', async () => {
      const res = await request(app)
        .get(`/api/plants/${user1PlantId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('植物不存在');
    });

    it('用户2无法更新用户1的植物', async () => {
      const res = await request(app)
        .put(`/api/plants/${user1PlantId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ nickname: '被篡改的名称' });

      expect(res.status).toBe(404);
    });

    it('用户2无法删除用户1的植物', async () => {
      const res = await request(app)
        .delete(`/api/plants/${user1PlantId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(404);

      const plant = await Plant.findByPk(user1PlantId);
      expect(plant).not.toBeNull();
    });

    it('用户1的植物列表只包含自己的植物', async () => {
      const user2Plant = await Plant.create(createTestPlant(user2Id, { nickname: '用户2的植物' }));

      const res = await request(app)
        .get('/api/plants')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      const plantIds = res.body.data.list.map(p => p.plantId);
      expect(plantIds).toContain(user1PlantId);
      expect(plantIds).not.toContain(user2Plant.plant_id);
    });
  });
});
