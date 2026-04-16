/**
 * DiagnosisCard 模型单元测试
 */

const DiagnosisCard = require('../../../src/models/DiagnosisCard');

describe('DiagnosisCard 模型', () => {
  describe('模型定义', () => {
    it('应正确定义表名', () => {
      expect(DiagnosisCard.tableName).toBe('diagnosis_cards');
    });

    it('应启用时间戳', () => {
      expect(DiagnosisCard.options.timestamps).toBe(true);
    });

    it('应使用 created_at 作为创建时间字段', () => {
      expect(DiagnosisCard.options.createdAt).toBe('created_at');
    });

    it('应禁用 updatedAt', () => {
      expect(DiagnosisCard.options.updatedAt).toBe(false);
    });
  });

  describe('字段定义', () => {
    const fields = DiagnosisCard.rawAttributes;

    it('应定义 diagnosis_card_id 字段', () => {
      expect(fields.diagnosis_card_id).toBeDefined();
      expect(fields.diagnosis_card_id.type.key).toBe('STRING');
      expect(fields.diagnosis_card_id.primaryKey).toBe(true);
    });

    it('应定义 message_id 字段', () => {
      expect(fields.message_id).toBeDefined();
      expect(fields.message_id.type.key).toBe('STRING');
      expect(fields.message_id.allowNull).toBe(false);
    });

    it('message_id 应有外键引用', () => {
      expect(fields.message_id.references.model).toBe('messages');
      expect(fields.message_id.references.key).toBe('message_id');
    });

    it('应定义 plant_id 字段', () => {
      expect(fields.plant_id).toBeDefined();
      expect(fields.plant_id.type.key).toBe('STRING');
      expect(fields.plant_id.allowNull).toBe(true);
    });

    it('plant_id 应有外键引用', () => {
      expect(fields.plant_id.references.model).toBe('plants');
      expect(fields.plant_id.references.key).toBe('plant_id');
    });

    it('应定义 species 字段', () => {
      expect(fields.species).toBeDefined();
      expect(fields.species.type.key).toBe('STRING');
      expect(fields.species.allowNull).toBe(true);
    });

    it('应定义 analysis_type 字段', () => {
      expect(fields.analysis_type).toBeDefined();
      expect(fields.analysis_type.type.key).toBe('ENUM');
      expect(fields.analysis_type.allowNull).toBe(false);
    });

    it('analysis_type 字段应支持正确的枚举值', () => {
      const enumValues = fields.analysis_type.type.values;
      expect(enumValues).toContain('normal');
      expect(enumValues).toContain('deep');
    });

    it('应定义 health_score 字段', () => {
      expect(fields.health_score).toBeDefined();
      expect(fields.health_score.type.key).toBe('INTEGER');
      expect(fields.health_score.allowNull).toBe(true);
    });

    it('应定义 status 字段', () => {
      expect(fields.status).toBeDefined();
      expect(fields.status.type.key).toBe('ENUM');
      expect(fields.status.allowNull).toBe(true);
    });

    it('status 字段应支持正确的枚举值', () => {
      const enumValues = fields.status.type.values;
      expect(enumValues).toContain('healthy');
      expect(enumValues).toContain('warning');
      expect(enumValues).toContain('critical');
    });

    it('应定义 issues 字段', () => {
      expect(fields.issues).toBeDefined();
      expect(fields.issues.type.key).toBe('JSON');
      expect(fields.issues.allowNull).toBe(true);
    });

    it('应定义 suggestions 字段', () => {
      expect(fields.suggestions).toBeDefined();
      expect(fields.suggestions.type.key).toBe('JSON');
      expect(fields.suggestions.allowNull).toBe(true);
    });

    it('应定义 confidence 字段', () => {
      expect(fields.confidence).toBeDefined();
      expect(fields.confidence.type.key).toBe('DECIMAL');
      expect(fields.confidence.allowNull).toBe(true);
    });

    it('应定义 context_used 字段', () => {
      expect(fields.context_used).toBeDefined();
      expect(fields.context_used.type.key).toBe('JSON');
      expect(fields.context_used.allowNull).toBe(true);
    });
  });

  describe('索引定义', () => {
    it('应定义 plant_id + created_at 复合索引', () => {
      const indexes = DiagnosisCard.options.indexes;
      const index = indexes.find(i => i.name === 'idx_plant_time');
      expect(index).toBeDefined();
      expect(index.fields).toEqual(['plant_id', 'created_at']);
    });

    it('应定义 message_id 索引', () => {
      const indexes = DiagnosisCard.options.indexes;
      const index = indexes.find(i => i.name === 'idx_message');
      expect(index).toBeDefined();
      expect(index.fields).toEqual(['message_id']);
    });
  });

  describe('getter 方法', () => {
    it('应提供 diagnosisCardId getter', () => {
      expect(DiagnosisCard.options.getterMethods.diagnosisCardId).toBeDefined();
    });

    it('应提供 messageId getter', () => {
      expect(DiagnosisCard.options.getterMethods.messageId).toBeDefined();
    });

    it('应提供 plantId getter', () => {
      expect(DiagnosisCard.options.getterMethods.plantId).toBeDefined();
    });

    it('应提供 species getter', () => {
      expect(DiagnosisCard.options.getterMethods.species).toBeDefined();
    });

    it('应提供 analysisType getter', () => {
      expect(DiagnosisCard.options.getterMethods.analysisType).toBeDefined();
    });

    it('应提供 healthScore getter', () => {
      expect(DiagnosisCard.options.getterMethods.healthScore).toBeDefined();
    });

    it('应提供 contextUsed getter', () => {
      expect(DiagnosisCard.options.getterMethods.contextUsed).toBeDefined();
    });

    it('应提供 createdAt getter', () => {
      expect(DiagnosisCard.options.getterMethods.createdAt).toBeDefined();
    });
  });

  describe('实例创建', () => {
    it('应创建基本诊断卡实例', () => {
      const card = DiagnosisCard.build({
        diagnosis_card_id: 'CARD_001',
        message_id: 'MSG_001',
        analysis_type: 'normal',
      });
      expect(card.diagnosis_card_id).toBe('CARD_001');
      expect(card.message_id).toBe('MSG_001');
      expect(card.analysis_type).toBe('normal');
    });

    it('应支持植物品种识别', () => {
      const card = DiagnosisCard.build({
        diagnosis_card_id: 'CARD_002',
        message_id: 'MSG_002',
        analysis_type: 'deep',
        species: '绿萝',
      });
      expect(card.species).toBe('绿萝');
    });

    it('应支持健康评分', () => {
      const card = DiagnosisCard.build({
        diagnosis_card_id: 'CARD_003',
        message_id: 'MSG_003',
        analysis_type: 'normal',
        health_score: 85,
        status: 'healthy',
      });
      expect(card.health_score).toBe(85);
      expect(card.status).toBe('healthy');
    });

    it('应支持问题列表', () => {
      const issues = ['叶片发黄', '缺水'];
      const card = DiagnosisCard.build({
        diagnosis_card_id: 'CARD_004',
        message_id: 'MSG_004',
        analysis_type: 'deep',
        issues,
      });
      expect(card.issues).toEqual(issues);
    });

    it('应支持建议列表', () => {
      const suggestions = ['增加浇水频率', '移至阴凉处'];
      const card = DiagnosisCard.build({
        diagnosis_card_id: 'CARD_005',
        message_id: 'MSG_005',
        analysis_type: 'deep',
        suggestions,
      });
      expect(card.suggestions).toEqual(suggestions);
    });

    it('应支持置信度', () => {
      const card = DiagnosisCard.build({
        diagnosis_card_id: 'CARD_006',
        message_id: 'MSG_006',
        analysis_type: 'deep',
        confidence: 0.92,
      });
      expect(card.confidence).toBe(0.92);
    });

    it('应支持上下文记录', () => {
      const contextUsed = { plantInfo: true, environmentData: true };
      const card = DiagnosisCard.build({
        diagnosis_card_id: 'CARD_007',
        message_id: 'MSG_007',
        analysis_type: 'deep',
        context_used: contextUsed,
      });
      expect(card.context_used).toEqual(contextUsed);
    });

    it('应支持可选的 plant_id', () => {
      const card = DiagnosisCard.build({
        diagnosis_card_id: 'CARD_008',
        message_id: 'MSG_008',
        analysis_type: 'normal',
        plant_id: null,
      });
      expect(card.plant_id).toBeNull();
    });
  });

  describe('分析类型', () => {
    it('应支持 normal 分析类型', () => {
      const card = DiagnosisCard.build({
        diagnosis_card_id: 'CARD_NORMAL',
        message_id: 'MSG_NORMAL',
        analysis_type: 'normal',
      });
      expect(card.analysis_type).toBe('normal');
    });

    it('应支持 deep 分析类型', () => {
      const card = DiagnosisCard.build({
        diagnosis_card_id: 'CARD_DEEP',
        message_id: 'MSG_DEEP',
        analysis_type: 'deep',
      });
      expect(card.analysis_type).toBe('deep');
    });
  });

  describe('健康状态', () => {
    const statuses = ['healthy', 'warning', 'critical'];

    statuses.forEach(status => {
      it(`应支持 ${status} 状态`, () => {
        const card = DiagnosisCard.build({
          diagnosis_card_id: `CARD_${status.toUpperCase()}`,
          message_id: `MSG_${status.toUpperCase()}`,
          analysis_type: 'deep',
          status,
        });
        expect(card.status).toBe(status);
      });
    });
  });
});
