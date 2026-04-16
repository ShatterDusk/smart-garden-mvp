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
      expect(result.healthScore).toBe(85);
      expect(result.status).toBe('healthy');
    });

    it('species为空时返回默认值', () => {
      const mockCard = {
        diagnosis_card_id: 'DIAG_003',
        species: null,
        health_score: 70,
      };

      const result = formatDiagnosisCard(mockCard);

      expect(result.species).toBe('未知植物');
    });

    it('输入为null时返回null', () => {
      const result = formatDiagnosisCard(null);
      expect(result).toBeNull();
    });
  });

  describe('formatDiagnosisCards', () => {
    it('格式化诊断卡数组', () => {
      const mockCards = [
        { diagnosis_card_id: 'DIAG_001', species: '罗勒', health_score: 85, status: 'healthy', issues: [], suggestions: [], confidence: 0.75, analysis_type: 'normal', created_at: '2026-04-08T08:00:00Z' },
        { diagnosis_card_id: 'DIAG_002', species: '薄荷', health_score: 90, status: 'healthy', issues: [], suggestions: [], confidence: 0.8, analysis_type: 'normal', created_at: '2026-04-08T09:00:00Z' },
      ];

      const result = formatDiagnosisCards(mockCards);

      expect(result).toHaveLength(2);
      expect(result[0].diagnosisCardId).toBe('DIAG_001');
    });

    it('输入为空数组时返回空数组', () => {
      const result = formatDiagnosisCards([]);
      expect(result).toEqual([]);
    });
  });
});
