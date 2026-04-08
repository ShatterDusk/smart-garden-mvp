const { formatDiagnosisCard, formatDiagnosisCards } = require('../../../src/utils/formatters');

describe('formatters', () => {
  describe('formatDiagnosisCard', () => {
    it('格式化完整的诊断卡数据', () => {
      const mockCard = {
        diagnosis_card_id: 'DIAG_001',
        message_id: 'MSG_001',
        plant_id: 'PLANT_001',
        species: '罗勒',
        health_score: 85,
        status: 'healthy',
        issues: [{ type: 'watering', name: '浇水过多' }],
        suggestions: [{ type: 'watering', action: '减少浇水' }],
        confidence: 0.75,
        analysis_type: 'normal',
        created_at: '2026-04-08T08:00:00Z',
      };

      const result = formatDiagnosisCard(mockCard);

      expect(result.diagnosisCardId).toBe('DIAG_001');
      expect(result.messageId).toBe('MSG_001');
      expect(result.plantId).toBe('PLANT_001');
      expect(result.species).toBe('罗勒');
      expect(result.healthScore).toBe(85);
      expect(result.status).toBe('healthy');
      expect(result.issues).toHaveLength(1);
      expect(result.suggestions).toHaveLength(1);
      expect(result.confidence).toBe(0.75);
      expect(result.analysisType).toBe('normal');
      expect(result.createdAt).toBe('2026-04-08T08:00:00Z');
    });

    it('处理 Sequelize 实例（带 toJSON 方法）', () => {
      const mockSequelizeInstance = {
        toJSON: () => ({
          diagnosisCardId: 'DIAG_002',
          messageId: 'MSG_002',
          plantId: 'PLANT_002',
          species: '薄荷',
          healthScore: 90,
          status: 'healthy',
          issues: [],
          suggestions: [],
          confidence: 0.8,
          analysisType: 'normal',
          createdAt: '2026-04-08T09:00:00Z',
        }),
      };

      const result = formatDiagnosisCard(mockSequelizeInstance);

      expect(result.diagnosisCardId).toBe('DIAG_002');
      expect(result.species).toBe('薄荷');
    });

    it('species 为空时返回默认值', () => {
      const mockCard = {
        diagnosis_card_id: 'DIAG_003',
        message_id: 'MSG_003',
        species: null,
        health_score: 70,
        status: 'warning',
        issues: [],
        suggestions: [],
        confidence: 0.5,
        analysis_type: 'normal',
        created_at: '2026-04-08T10:00:00Z',
      };

      const result = formatDiagnosisCard(mockCard);

      expect(result.species).toBe('未知植物');
    });

    it('species 为 undefined 时返回默认值', () => {
      const mockCard = {
        diagnosis_card_id: 'DIAG_004',
        message_id: 'MSG_004',
        health_score: 70,
        status: 'warning',
        issues: [],
        suggestions: [],
        confidence: 0.5,
        analysis_type: 'normal',
        created_at: '2026-04-08T11:00:00Z',
      };

      const result = formatDiagnosisCard(mockCard);

      expect(result.species).toBe('未知植物');
    });

    it('其他字段为空时返回默认值', () => {
      const mockCard = {
        diagnosis_card_id: 'DIAG_005',
        message_id: 'MSG_005',
        species: '罗勒',
      };

      const result = formatDiagnosisCard(mockCard);

      expect(result.healthScore).toBe(0);
      expect(result.status).toBe('');
      expect(result.issues).toEqual([]);
      expect(result.suggestions).toEqual([]);
      expect(result.confidence).toBe(0);
      expect(result.analysisType).toBe('normal');
    });

    it('输入为 null 时返回 null', () => {
      const result = formatDiagnosisCard(null);
      expect(result).toBeNull();
    });

    it('输入为 undefined 时返回 null', () => {
      const result = formatDiagnosisCard(undefined);
      expect(result).toBeNull();
    });
  });

  describe('formatDiagnosisCards', () => {
    it('格式化诊断卡数组', () => {
      const mockCards = [
        {
          diagnosis_card_id: 'DIAG_001',
          message_id: 'MSG_001',
          species: '罗勒',
          health_score: 85,
          status: 'healthy',
          issues: [],
          suggestions: [],
          confidence: 0.75,
          analysis_type: 'normal',
          created_at: '2026-04-08T08:00:00Z',
        },
        {
          diagnosis_card_id: 'DIAG_002',
          message_id: 'MSG_002',
          species: '薄荷',
          health_score: 90,
          status: 'healthy',
          issues: [],
          suggestions: [],
          confidence: 0.8,
          analysis_type: 'normal',
          created_at: '2026-04-08T09:00:00Z',
        },
      ];

      const result = formatDiagnosisCards(mockCards);

      expect(result).toHaveLength(2);
      expect(result[0].diagnosisCardId).toBe('DIAG_001');
      expect(result[1].diagnosisCardId).toBe('DIAG_002');
    });

    it('过滤掉 null 值', () => {
      const mockCards = [
        {
          diagnosis_card_id: 'DIAG_001',
          message_id: 'MSG_001',
          species: '罗勒',
          health_score: 85,
          status: 'healthy',
          issues: [],
          suggestions: [],
          confidence: 0.75,
          analysis_type: 'normal',
          created_at: '2026-04-08T08:00:00Z',
        },
        null,
        {
          diagnosis_card_id: 'DIAG_002',
          message_id: 'MSG_002',
          species: '薄荷',
          health_score: 90,
          status: 'healthy',
          issues: [],
          suggestions: [],
          confidence: 0.8,
          analysis_type: 'normal',
          created_at: '2026-04-08T09:00:00Z',
        },
      ];

      const result = formatDiagnosisCards(mockCards);

      expect(result).toHaveLength(2);
      expect(result[0].diagnosisCardId).toBe('DIAG_001');
      expect(result[1].diagnosisCardId).toBe('DIAG_002');
    });

    it('输入为空数组时返回空数组', () => {
      const result = formatDiagnosisCards([]);
      expect(result).toEqual([]);
    });

    it('输入为 null 时返回空数组', () => {
      const result = formatDiagnosisCards(null);
      expect(result).toEqual([]);
    });

    it('输入为 undefined 时返回空数组', () => {
      const result = formatDiagnosisCards(undefined);
      expect(result).toEqual([]);
    });
  });
});
