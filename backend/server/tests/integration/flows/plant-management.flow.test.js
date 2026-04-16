/**
 * 植物管理流程测试
 * 测试植物创建、查询、更新、删除的完整流程
 */

const request = require('supertest');
const app = require('../../../src/app');
const { User, Plant, Device, sequelize } = require('../../../src/models');
const { createAuthenticatedUser, cleanupTestData } = require('../../setup/test-helpers');

describe('植物管理流程', () => {
  let authToken;
  let userId;

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
  });

  afterEach(async () => {
    await cleanupTestData([
      { model: Plant, where: { user_id: userId } },
      { model: Device, where: { user_id: userId } },
      { model: User, where: { user_id: userId } },
    ]);
  });

  describe('植物CRUD完整流程', () => {
    it('创建植物 → 查询详情 → 更新信息 → 删除植物', async () => {
      // Step 1: 创建植物
      const createRes = await request(app)
        .post('/api/plants')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nickname: '我的绿萝',
          species: '绿萝',
          plantCategory: 'foliage',
          locationName: '客厅',
          coverImageUrl: 'https://example.com/plant.jpg',
        });

      expect(createRes.status).toBe(200);
      expect(createRes.body.code).toBe(0);
      expect(createRes.body.data.plantId).toBeDefined();

      const plantId = createRes.body.data.plantId;

      // Step 2: 查询植物详情
      const getRes = await request(app)
        .get(`/api/plants/${plantId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.code).toBe(0);
      expect(getRes.body.data.nickname).toBe('我的绿萝');
      expect(getRes.body.data.species).toBe('绿萝');

      // Step 3: 更新植物信息
      const updateRes = await request(app)
        .put(`/api/plants/${plantId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nickname: '更新后的绿萝',
          locationName: '阳台',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.code).toBe(0);

      // Step 4: 验证更新
      const verifyRes = await request(app)
        .get(`/api/plants/${plantId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(verifyRes.body.data.nickname).toBe('更新后的绿萝');
      expect(verifyRes.body.data.locationName).toBe('阳台');

      // Step 5: 删除植物
      const deleteRes = await request(app)
        .delete(`/api/plants/${plantId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.code).toBe(0);

      // Step 6: 验证删除
      const checkRes = await request(app)
        .get(`/api/plants/${plantId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(checkRes.status).toBe(404);
    });

    it('批量创建和查询植物列表', async () => {
      // 创建多个植物
      const plants = [
        { nickname: '绿萝1', species: '绿萝', plantCategory: 'foliage' },
        { nickname: '多肉1', species: '仙人掌', plantCategory: 'succulent' },
        { nickname: '花卉1', species: '月季', plantCategory: 'flower' },
      ];

      for (const plant of plants) {
        await request(app)
          .post('/api/plants')
          .set('Authorization', `Bearer ${authToken}`)
          .send(plant);
      }

      // 查询植物列表
      const listRes = await request(app)
        .get('/api/plants')
        .set('Authorization', `Bearer ${authToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.code).toBe(0);
      expect(listRes.body.data.list).toHaveLength(3);
      expect(listRes.body.data.total).toBe(3);
    });

    it('创建植物时缺少必填字段返回400', async () => {
      const res = await request(app)
        .post('/api/plants')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // 缺少 nickname
          species: '绿萝',
        });

      expect(res.status).toBe(400);
    });

    it('访问不存在的植物返回404', async () => {
      const res = await request(app)
        .get('/api/plants/NON_EXISTENT_ID')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('无法更新其他用户的植物', async () => {
      // 创建植物
      const createRes = await request(app)
        .post('/api/plants')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nickname: '我的植物',
          species: '绿萝',
          plantCategory: 'foliage',
        });

      const plantId = createRes.body.data.plantId;

      // 创建其他用户
      const otherResult = await createAuthenticatedUser({ nickname: '其他用户' });
      const otherToken = otherResult.token;
      const otherUserId = otherResult.userId;

      // 尝试更新其他用户的植物
      const updateRes = await request(app)
        .put(`/api/plants/${plantId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ nickname: '恶意修改' });

      expect(updateRes.status).toBe(404); // 或 403，取决于实现

      // 清理
      await cleanupTestData([
        { model: User, where: { user_id: otherUserId } },
      ]);
    });
  });

  describe('植物与设备关联', () => {
    it('创建植物 → 绑定设备 → 查询植物包含设备信息', async () => {
      // 创建植物
      const plantRes = await request(app)
        .post('/api/plants')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nickname: '智能监测植物',
          species: '绿萝',
          plantCategory: 'foliage',
        });

      const plantId = plantRes.body.data.plantId;

      // 创建设备
      const deviceRes = await request(app)
        .post('/api/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          macAddress: 'AA:BB:CC:DD:EE:FF',
          deviceName: '环境监测器',
        });

      const deviceId = deviceRes.body.data.deviceId;

      // 绑定设备到植物
      const bindRes = await request(app)
        .post(`/api/plants/${plantId}/devices`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ deviceId });

      expect(bindRes.status).toBe(200);

      // 查询植物详情，验证包含设备信息
      const getRes = await request(app)
        .get(`/api/plants/${plantId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.body.data.currentDeviceId).toBe(deviceId);
    });
  });
});
