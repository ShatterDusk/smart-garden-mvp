const request = require('supertest');
const app = require('../../../src/app');
const { User, Plant, Device, sequelize } = require('../../../src/models');
const { createAuthenticatedUser, cleanupTestData } = require('../../setup/test-helpers');
const { createTestPlant, createTestDevice } = require('../../setup/test-data');

describe('设备模块 API 测试', () => {
  let testUser;
  let testToken;
  let testPlant;
  let testDevice;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/devices/bind - 绑定设备', () => {
    beforeEach(async () => {
      const result = await createAuthenticatedUser();
      testUser = result.user;
      testToken = result.token;

      testPlant = await Plant.create(createTestPlant(testUser.user_id));
    });

    afterEach(async () => {
      await cleanupTestData([
        { model: Device, where: { user_id: testUser.user_id } },
        { model: Plant, where: { user_id: testUser.user_id } },
        { model: User, where: { user_id: testUser.user_id } },
      ]);
    });

    it('绑定设备成功', async () => {
      const res = await request(app)
        .post('/api/devices/bind')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          macAddress: 'AA:BB:CC:DD:EE:FF',
          deviceName: '测试设备',
          plantId: testPlant.plant_id,
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('deviceId');
      expect(res.body.data.macAddress).toBe('AA:BB:CC:DD:EE:FF');
      expect(res.body.data.deviceName).toBe('测试设备');
      expect(res.body.data.boundPlantId).toBe(testPlant.plant_id);

      testDevice = await Device.findOne({
        where: { device_id: res.body.data.deviceId },
      });

      const updatedPlant = await Plant.findByPk(testPlant.plant_id);
      expect(updatedPlant.current_device_id).toBe(res.body.data.deviceId);
    });

    it('绑定设备成功（不关联植物）', async () => {
      const res = await request(app)
        .post('/api/devices/bind')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          macAddress: '11:22:33:44:55:66',
          deviceName: '独立设备',
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('deviceId');
      expect(res.body.data.boundPlantId).toBeNull();
    });
  });

  describe('GET /api/devices - 获取设备列表', () => {
    let userToken;
    let userId;
    let device;
    let plant;

    beforeEach(async () => {
      const result = await createAuthenticatedUser();
      userToken = result.token;
      userId = result.userId;

      device = await Device.create(createTestDevice(userId));
      plant = await Plant.create(createTestPlant(userId, { current_device_id: device.device_id }));
    });

    afterEach(async () => {
      await cleanupTestData([
        { model: Device, where: { user_id: userId } },
        { model: Plant, where: { user_id: userId } },
        { model: User, where: { user_id: userId } },
      ]);
    });

    it('获取设备列表成功', async () => {
      const res = await request(app)
        .get('/api/devices')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const foundDevice = res.body.data.find((d) => d.deviceId === device.device_id);
      expect(foundDevice).toBeDefined();
      expect(foundDevice.macAddress).toBeDefined();
    });
  });

  describe('GET /api/devices/:deviceId - 获取设备详情', () => {
    let userToken;
    let userId;
    let device;
    let plant;

    beforeEach(async () => {
      const result = await createAuthenticatedUser();
      userToken = result.token;
      userId = result.userId;

      device = await Device.create(createTestDevice(userId));
      plant = await Plant.create(createTestPlant(userId, { current_device_id: device.device_id }));
    });

    afterEach(async () => {
      await cleanupTestData([
        { model: Device, where: { user_id: userId } },
        { model: Plant, where: { user_id: userId } },
        { model: User, where: { user_id: userId } },
      ]);
    });

    it('获取设备详情成功', async () => {
      const res = await request(app)
        .get(`/api/devices/${device.device_id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.deviceId).toBe(device.device_id);
      expect(res.body.data.macAddress).toBeDefined();
    });

    it('设备不存在返回 404', async () => {
      const res = await request(app)
        .get('/api/devices/DEVICE_NOT_EXIST')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(404);
      expect(res.body.message).toBe('设备不存在');
    });
  });

  describe('POST /api/devices/unbind - 解绑设备', () => {
    let userToken;
    let userId;
    let device;
    let plant;

    beforeEach(async () => {
      const result = await createAuthenticatedUser();
      userToken = result.token;
      userId = result.userId;

      device = await Device.create(createTestDevice(userId));
      plant = await Plant.create(createTestPlant(userId, { current_device_id: device.device_id }));
    });

    afterEach(async () => {
      await cleanupTestData([
        { model: Device, where: { user_id: userId } },
        { model: Plant, where: { user_id: userId } },
        { model: User, where: { user_id: userId } },
      ]);
    });

    it('解绑设备成功', async () => {
      const res = await request(app)
        .post('/api/devices/unbind')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          deviceId: device.device_id,
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.message).toBe('设备解绑成功');

      const updatedDevice = await Device.findByPk(device.device_id);
      expect(updatedDevice.status).toBe('unbound');

      const updatedPlant = await Plant.findByPk(plant.plant_id);
      expect(updatedPlant.current_device_id).toBeNull();
    });

    it('设备不存在返回 404', async () => {
      const res = await request(app)
        .post('/api/devices/unbind')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          deviceId: 'DEVICE_NOT_EXIST',
        });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(404);
      expect(res.body.message).toBe('设备不存在');
    });
  });

  describe('无 token 访问返回 401', () => {
    it('获取设备列表无 token 返回 401', async () => {
      const res = await request(app).get('/api/devices');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });

    it('绑定设备无 token 返回 401', async () => {
      const res = await request(app)
        .post('/api/devices/bind')
        .send({
          macAddress: 'AA:BB:CC:DD:EE:FF',
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });
});
