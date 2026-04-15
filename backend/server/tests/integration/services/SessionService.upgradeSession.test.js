/**
 * SessionService.upgradeSession 集成测试
 * 测试会话升级逻辑，涉及会话更新和诊断卡批量更新
 */

const sessionService = require('../../../src/services/SessionService');
const {
  User,
  Plant,
  Session,
  Message,
  DiagnosisCard,
  sequelize,
} = require('../../../src/models');
const { createAuthenticatedUser, cleanupTestData } = require('../../setup/test-helpers');
const {
  createTestPlant,
  createTestSession,
  createTestMessage,
  createTestDiagnosisCard,
} = require('../../setup/test-data');

describe('SessionService.upgradeSession 集成测试', () => {
  let testUser;
  let testPlant;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    const result = await createAuthenticatedUser();
    testUser = result.user;
    testPlant = await Plant.create(createTestPlant(testUser.user_id, {
      nickname: '升级测试植物',
      species: '绿萝',
    }));
  });

  afterEach(async () => {
    await cleanupTestData([
      { model: DiagnosisCard, where: {} },
      { model: Message, where: {} },
      { model: Session, where: { user_id: testUser.user_id } },
      { model: Plant, where: { user_id: testUser.user_id } },
      { model: User, where: { user_id: testUser.user_id } },
    ]);
  });

  describe('成功场景', () => {
    it('咨询会话成功升级为植物会话', async () => {
      const consultationSession = await Session.create(createTestSession(testUser.user_id, null, {
        type: 'consultation',
        title: '咨询会话',
      }));

      const result = await sessionService.upgradeSession(
        consultationSession.session_id,
        testUser.user_id,
        testPlant.plant_id
      );

      expect(result.error).toBeUndefined();
      expect(result.session).toBeDefined();
      expect(result.plant).toBeDefined();
      expect(result.session.type).toBe('plant');
      expect(result.session.plant_id).toBe(testPlant.plant_id);
      expect(result.session.title).toContain('升级测试植物');
    });

    it('升级时会话标题更新为植物名称', async () => {
      const consultationSession = await Session.create(createTestSession(testUser.user_id, null, {
        type: 'consultation',
        title: '原来的标题',
      }));

      const result = await sessionService.upgradeSession(
        consultationSession.session_id,
        testUser.user_id,
        testPlant.plant_id
      );

      expect(result.session.title).toBe('升级测试植物 - 植物会话');
    });

    it('升级时更新该会话下所有诊断卡的 plant_id', async () => {
      const consultationSession = await Session.create(createTestSession(testUser.user_id, null, {
        type: 'consultation',
      }));

      // 创建多条消息和诊断卡（模拟咨询期间的诊断）
      const message1 = await Message.create(createTestMessage(consultationSession.session_id));
      const message2 = await Message.create(createTestMessage(consultationSession.session_id));

      const diagnosis1 = await DiagnosisCard.create(createTestDiagnosisCard(null, message1.message_id, {
        analysis_type: 'deep',
        plant_id: null,
        health_score: 85,
      }));
      const diagnosis2 = await DiagnosisCard.create(createTestDiagnosisCard(null, message2.message_id, {
        analysis_type: 'deep',
        plant_id: null,
        health_score: 90,
      }));

      await sessionService.upgradeSession(
        consultationSession.session_id,
        testUser.user_id,
        testPlant.plant_id
      );

      // 验证诊断卡的 plant_id 被更新
      const updatedDiagnosis1 = await DiagnosisCard.findByPk(diagnosis1.diagnosis_card_id);
      const updatedDiagnosis2 = await DiagnosisCard.findByPk(diagnosis2.diagnosis_card_id);

      expect(updatedDiagnosis1.plant_id).toBe(testPlant.plant_id);
      expect(updatedDiagnosis2.plant_id).toBe(testPlant.plant_id);
    });

    it('会话无消息时升级成功', async () => {
      const consultationSession = await Session.create(createTestSession(testUser.user_id, null, {
        type: 'consultation',
      }));

      const result = await sessionService.upgradeSession(
        consultationSession.session_id,
        testUser.user_id,
        testPlant.plant_id
      );

      expect(result.error).toBeUndefined();
      expect(result.session.type).toBe('plant');
    });
  });

  describe('失败场景', () => {
    it('已经是植物会话返回错误', async () => {
      const plantSession = await Session.create(createTestSession(testUser.user_id, testPlant.plant_id, {
        type: 'plant',
      }));

      const result = await sessionService.upgradeSession(
        plantSession.session_id,
        testUser.user_id,
        testPlant.plant_id
      );

      expect(result.error).toBe('已经是植物会话，无需升级');
      expect(result.code).toBe(400);
    });

    it('会话不存在返回错误', async () => {
      const result = await sessionService.upgradeSession(
        'NON_EXISTENT_SESSION',
        testUser.user_id,
        testPlant.plant_id
      );

      expect(result.error).toBe('会话不存在');
      expect(result.code).toBe(404);
    });

    it('其他用户的会话返回404（数据隔离）', async () => {
      const otherUser = await createAuthenticatedUser();
      const otherUserSession = await Session.create(createTestSession(otherUser.userId, null, {
        type: 'consultation',
      }));

      const result = await sessionService.upgradeSession(
        otherUserSession.session_id,
        testUser.user_id,
        testPlant.plant_id
      );

      expect(result.error).toBe('会话不存在');
      expect(result.code).toBe(404);

      // 清理其他用户数据
      await cleanupTestData([
        { model: Session, where: { user_id: otherUser.userId } },
        { model: User, where: { user_id: otherUser.userId } },
      ]);
    });

    it('植物不存在返回错误', async () => {
      const consultationSession = await Session.create(createTestSession(testUser.user_id, null, {
        type: 'consultation',
      }));

      const result = await sessionService.upgradeSession(
        consultationSession.session_id,
        testUser.user_id,
        'NON_EXISTENT_PLANT'
      );

      expect(result.error).toBe('植物不存在');
      expect(result.code).toBe(404);
    });

    it('其他用户的植物返回错误（数据隔离）', async () => {
      const otherUser = await createAuthenticatedUser();
      const otherUserPlant = await Plant.create(createTestPlant(otherUser.userId));

      const consultationSession = await Session.create(createTestSession(testUser.user_id, null, {
        type: 'consultation',
      }));

      const result = await sessionService.upgradeSession(
        consultationSession.session_id,
        testUser.user_id,
        otherUserPlant.plant_id
      );

      expect(result.error).toBe('植物不存在');
      expect(result.code).toBe(404);

      // 清理其他用户数据
      await cleanupTestData([
        { model: Plant, where: { user_id: otherUser.userId } },
        { model: User, where: { user_id: otherUser.userId } },
      ]);
    });
  });

  describe('边界情况', () => {
    it('升级后再次查询会话信息正确', async () => {
      const consultationSession = await Session.create(createTestSession(testUser.user_id, null, {
        type: 'consultation',
      }));

      await sessionService.upgradeSession(
        consultationSession.session_id,
        testUser.user_id,
        testPlant.plant_id
      );

      const updatedSession = await Session.findOne({
        where: { session_id: consultationSession.session_id },
      });

      expect(updatedSession.type).toBe('plant');
      expect(updatedSession.plant_id).toBe(testPlant.plant_id);
    });

    it('诊断卡更新不影响其他会话的诊断卡', async () => {
      // 创建两个咨询会话
      const session1 = await Session.create(createTestSession(testUser.user_id, null, {
        type: 'consultation',
      }));
      const session2 = await Session.create(createTestSession(testUser.user_id, null, {
        type: 'consultation',
      }));

      // 只在 session1 中创建诊断卡
      const message1 = await Message.create(createTestMessage(session1.session_id));
      const diagnosis1 = await DiagnosisCard.create(createTestDiagnosisCard(null, message1.message_id, {
        analysis_type: 'deep',
        plant_id: null,
      }));

      // 升级 session1
      await sessionService.upgradeSession(
        session1.session_id,
        testUser.user_id,
        testPlant.plant_id
      );

      // 验证诊断卡被更新
      const updatedDiagnosis = await DiagnosisCard.findByPk(diagnosis1.diagnosis_card_id);
      expect(updatedDiagnosis.plant_id).toBe(testPlant.plant_id);
    });
  });
});
