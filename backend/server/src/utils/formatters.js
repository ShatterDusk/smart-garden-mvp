/**
 * 数据格式化工具函数
 */

/**
 * 格式化诊断卡数据为统一结构
 * @param {Object} card - DiagnosisCard 模型实例或原始数据
 * @returns {Object} 统一格式的诊断卡数据
 */
function formatDiagnosisCard(card) {
  if (!card) return null;

  // 支持 Sequelize 实例和普通对象
  const data = card.toJSON ? card.toJSON() : card;

  return {
    // 核心ID
    diagnosisCardId: data.diagnosisCardId || data.diagnosis_card_id || '',
    messageId: data.messageId || data.message_id || '',
    sessionId: data.sessionId || data.session_id || null,
    plantId: data.plantId || data.plant_id || null,

    // AI诊断数据
    species: data.species || '未知植物',
    healthScore: data.healthScore || data.health_score || 0,
    status: data.status || '',
    issues: data.issues || [],
    suggestions: data.suggestions || [],
    confidence: data.confidence || 0,

    // 元数据
    analysisType: data.analysisType || data.analysis_type || 'normal',
    createdAt: data.createdAt || data.created_at || null,
  };
}

/**
 * 批量格式化诊断卡数组
 * @param {Array} cards - DiagnosisCard 数组
 * @returns {Array} 统一格式的诊断卡数组
 */
function formatDiagnosisCards(cards) {
  if (!Array.isArray(cards)) return [];
  return cards.map(formatDiagnosisCard).filter(Boolean);
}

module.exports = {
  formatDiagnosisCard,
  formatDiagnosisCards,
};
