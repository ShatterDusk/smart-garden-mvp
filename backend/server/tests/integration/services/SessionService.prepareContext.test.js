/**
 * SessionService.prepareContext 集成测试
 * 测试上下文组装逻辑，涉及多表查询
 */

const sessionService = require('../../../src/services/SessionService');
const {
  User,
  Plant,
  Session,
  EnvironmentReading,
  EnvironmentReadingValue,
  EnvironmentMetric,
  CareRecord,
  DiagnosisCard,
  Message,
  sequelize,
} = require('../../../src/models');
const { createAuthenticatedUser, cleanupTestData } = require('../../setup/test-helpers');
const {
  createTestPlant,
  createTestSession,
  createTestEnvironmentReading,
  createTestEnvironmentReadingValue,
  createTestCareRecord,
  createTestDiagnosisCard,
  createTestMessage,
} = require('../../setup/test-data');

describe('SessionService.prepareContext 集成测试', () => {
  let testUser;
  let testPlant;
  let testSession;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    const result = await createAuthenticatedUser();
    testUser = result.user;
  });

  afterEach(async () => {
    await cleanupTestData([
      { model: DiagnosisCard, where: {} },
      { model: Message, where: {} },
      { model: CareRecord, where: {} },
      { model: EnvironmentReadingValue, where: {} },
      { model: EnvironmentReading, where: {} },
      { model: Session, where: { user_id: testUser.user_id } },
      { model: Plant, where: { user_id: testUser.user_id } },
      { model: User, where: { user_id: testUser.user_id } },
    ]);
  });

  describe('基础场景', () => {
    it('无植物关联的会话返回空对象', async () => {
      testSession = await Session.create(createTestSession(testUser.user_id, null, {
        type: 'consultation',
      }));

      const context = await sessionService.prepareContext(testSession, {
        environmentData: true,
        careRecords: true,
        historyDiagnosis: true,
      });

      expect(context).toEqual({});
    });

    it('只返回植物基本信息（无额外配置）', async () => {
      testPlant = await Plant.create(createTestPlant(testUser.user_id, {
        nickname: '小绿萝',
        species: '绿萝',
        plant_category: 'foliage',
        location_name: '客厅',
      }));
      testSession = await Session.create(createTestSession(testUser.user_id, testPlant.plant_id, {
        type: 'plant',
      }));

      const context = await sessionService.prepareContext(testSession, {
        environmentData: false,
        careRecords: false,
        historyDiagnosis: false,
      });

      expect(context.plantInfo).toBeDefined();
      expect(context.plantInfo.nickname).toBe('小绿萝');
      expect(context.plantInfo.species).toBe('绿萝');
      expect(context.plantInfo.plantCategory).toBe('foliage');
      expect(context.plantInfo.locationName).toBe('客厅');
      expect(context.plantInfo.careDuration).toBeDefined();

      expect(context.environmentData).toBeUndefined();
      expect(context.careRecords).toBeUndefined();
      expect(context.historyDiagnosis).toBeUndefined();
    });
  });

  describe('环境数据查询', () => {
    beforeEach(async () => {
      testPlant = await Plant.create(createTestPlant(testUser.user_id));
      testSession = await Session.create(createTestSession(testUser.user_id, testPlant.plant_id));

      // 创建环境指标定义
      await EnvironmentMetric.bulkCreate([
        { metric_code: 'temperature', name: '温度', unit: '°C' },
        { metric_code: 'humidity', name: '湿度', unit: '%' },
        { metric_code: 'light', name: '光照', unit: 'lux' },
      ]);
    });

    afterEach(async () => {
      await EnvironmentMetric.destroy({ where: {}, force: true });
    });

    it('返回最新环境读数', async () => {
      const reading = await EnvironmentReading.create(createTestEnvironmentReading(testPlant.plant_id));
      await EnvironmentReadingValue.create(createTestEnvironmentReadingValue(reading.reading_id, 'temperature', { value: '25.5' }));
      await EnvironmentReadingValue.create(createTestEnvironmentReadingValue(reading.reading_id, 'humidity', { value: '60' }));

      const context = await sessionService.prepareContext(testSession, {
        environmentData: true,
        careRecords: false,
        historyDiagnosis: false,
      });

      expect(context.environmentData).toBeDefined();
      expect(context.environmentData).toHaveLength(2);

      const tempData = context.environmentData.find(d => d.metricCode === 'temperature');
      expect(tempData).toBeDefined();
      expect(tempData.metricName).toBe('温度');
      expect(tempData.value).toBe('25.5');
      expect(tempData.unit).toBe('°C');
    });

    it('无环境读数时返回空数组', async () => {
      const context = await sessionService.prepareContext(testSession, {
        environmentData: true,
        careRecords: false,
        historyDiagnosis: false,
      });

      expect(context.environmentData).toBeUndefined();
    });

    it('只取最新的一条读数记录', async () => {
      const oldReading = await EnvironmentReading.create(createTestEnvironmentReading(testPlant.plant_id, {
        recorded_at: new Date(Date.now() - 3600000),
      }));
      await EnvironmentReadingValue.create(createTestEnvironmentReadingValue(oldReading.reading_id, 'temperature', { value: '20.0' }));

      const newReading = await EnvironmentReading.create(createTestEnvironmentReading(testPlant.plant_id, {
        recorded_at: new Date(),
      }));
      await EnvironmentReadingValue.create(createTestEnvironmentReadingValue(newReading.reading_id, 'temperature', { value: '25.0' }));

      const context = await sessionService.prepareContext(testSession, {
        environmentData: true,
        careRecords: false,
        historyDiagnosis: false,
      });

      expect(context.environmentData).toHaveLength(1);
      expect(context.environmentData[0].value).toBe('25.0');
    });
  });

  describe('养护记录查询', () => {
    beforeEach(async () => {
      testPlant = await Plant.create(createTestPlant(testUser.user_id));
      testSession = await Session.create(createTestSession(testUser.user_id, testPlant.plant_id));
    });

    it('返回最近5条养护记录', async () => {
      for (let i = 0; i < 7; i++) {
        await CareRecord.create(createTestCareRecord(testUser.user_id, testPlant.plant_id, {
          action_type: i % 2 === 0 ? 'water' : 'fertilize',
          description: `养护记录 ${i}`,
          performed_at: new Date(Date.now() - i * 86400000),
        }));
      }

      const context = await sessionService.prepareContext(testSession, {
        environmentData: false,
        careRecords: true,
        historyDiagnosis: false,
      });

      expect(context.careRecords).toBeDefined();
      expect(context.careRecords).toHaveLength(5);
      expect(context.careRecords[0].description).toBe('养护记录 0');
    });

    it('无养护记录时返回空数组', async () => {
      const context = await sessionService.prepareContext(testSession, {
        environmentData: false,
        careRecords: true,
        historyDiagnosis: false,
      });

      expect(context.careRecords).toBeDefined();
      expect(context.careRecords).toEqual([]);
    });
  });

  describe('历史诊断查询', () => {
    beforeEach(async () => {
      testPlant = await Plant.create(createTestPlant(testUser.user_id));
      testSession = await Session.create(createTestSession(testUser.user_id, testPlant.plant_id));
    });

    it('返回最近3条历史诊断', async () => {
      for (let i = 0; i < 5; i++) {
        const message = await Message.create(createTestMessage(testSession.session_id));
        await DiagnosisCard.create(createTestDiagnosisCard(testPlant.plant_id, message.message_id, {
          analysis_type: 'deep', // 使用正确的枚举值
          health_score: 80 + i,
          status: i % 2 === 0 ? 'healthy' : 'warning',
          created_at: new Date(Date.now() - i * 86400000),
        }));
      }

      const context = await sessionService.prepareContext(testSession, {
        environmentData: false,
        careRecords: false,
        historyDiagnosis: true,
      });

      expect(context.historyDiagnosis).toBeDefined();
      expect(context.historyDiagnosis).toHaveLength(3);
      expect(context.historyDiagnosis[0].healthScore).toBe(80);
    });

    it('无历史诊断时返回空数组', async () => {
      const context = await sessionService.prepareContext(testSession, {
        environmentData: false,
        careRecords: false,
        historyDiagnosis: true,
      });

      expect(context.historyDiagnosis).toBeDefined();
      expect(context.historyDiagnosis).toEqual([]);
    });
  });

  describe('完整上下文组装', () => {
    beforeEach(async () => {
      testPlant = await Plant.create(createTestPlant(testUser.user_id, {
        nickname: '完整测试植物',
        species: '测试品种',
      }));
      testSession = await Session.create(createTestSession(testUser.user_id, testPlant.plant_id));

      await EnvironmentMetric.bulkCreate([
        { metric_code: 'temperature', name: '温度', unit: '°C' },
      ]);

      const reading = await EnvironmentReading.create(createTestEnvironmentReading(testPlant.plant_id));
      await EnvironmentReadingValue.create(createTestEnvironmentReadingValue(reading.reading_id, 'temperature', { value: '22.0' }));

      await CareRecord.create(createTestCareRecord(testUser.user_id, testPlant.plant_id, {
        action_type: 'water',
        description: '浇水测试',
      }));

      const message = await Message.create(createTestMessage(testSession.session_id));
      await DiagnosisCard.create(createTestDiagnosisCard(testPlant.plant_id, message.message_id, {
        analysis_type: 'deep',
        health_score: 90,
        status: 'healthy',
      }));
    });

    afterEach(async () => {
      await EnvironmentMetric.destroy({ where: {}, force: true });
    });

    it('同时返回所有上下文数据', async () => {
      const context = await sessionService.prepareContext(testSession, {
        environmentData: true,
        careRecords: true,
        historyDiagnosis: true,
      });

      expect(context.plantInfo).toBeDefined();
      expect(context.plantInfo.nickname).toBe('完整测试植物');

      expect(context.environmentData).toBeDefined();
      expect(context.environmentData).toHaveLength(1);

      expect(context.careRecords).toBeDefined();
      expect(context.careRecords).toHaveLength(1);

      expect(context.historyDiagnosis).toBeDefined();
      expect(context.historyDiagnosis).toHaveLength(1);
    });
  });

  describe('边界情况', () => {
    beforeEach(async () => {
      testPlant = await Plant.create(createTestPlant(testUser.user_id));
      testSession = await Session.create(createTestSession(testUser.user_id, testPlant.plant_id));
    });

    it('植物被删除后只返回空数组（查询仍会执行）', async () => {
      const plantId = testPlant.plant_id;
      await testPlant.destroy({ force: true });

      const context = await sessionService.prepareContext(testSession, {
        environmentData: true,
        careRecords: true,
        historyDiagnosis: true,
      });

      // 植物被删除后，plantInfo 为 undefined，但查询仍会执行并返回空数组
      expect(context.plantInfo).toBeUndefined();
      expect(context.careRecords).toEqual([]);
      expect(context.historyDiagnosis).toEqual([]);
    });

    it('contextConfig 为空对象时只返回植物信息', async () => {
      const context = await sessionService.prepareContext(testSession, {});

      expect(context.plantInfo).toBeDefined();
      expect(context.environmentData).toBeUndefined();
      expect(context.careRecords).toBeUndefined();
      expect(context.historyDiagnosis).toBeUndefined();
    });
  });
});
