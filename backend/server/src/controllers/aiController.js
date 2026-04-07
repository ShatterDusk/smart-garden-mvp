/**
 * AI 模块控制器
 * 处理 AI 分析相关的业务逻辑
 */

const { v4: uuidv4 } = require('uuid');
const { Session, Message, DiagnosisCard, Plant, CareRecord, EnvironmentReading, EnvironmentReadingValue, EnvironmentMetric } = require('../models');
const aiService = require('../services/aiService');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 触发 AI 分析
 * POST /api/ai/analyze
 */
const analyze = async (req, res) => {
  try {
    const { sessionId, userMessage, imageUrls } = req.body;
    const userId = req.user.userId;

    // 兼容处理：支持 imageUrl 和 imageUrls 两种参数名
    const imageUrl = imageUrls && imageUrls.length > 0 ? imageUrls[0] : req.body.imageUrl;
    const content = userMessage || req.body.content || '';

    // 验证会话
    const session = await Session.findOne({
      where: { session_id: sessionId, user_id: userId },
    });

    if (!session) {
      return error(res, '会话不存在', 404, 404);
    }

    // 确定分析类型
    const analysisType = session.type === 'plant' ? 'deep' : 'normal';

    // 准备上下文数据
    const context = await prepareContext(session, session.context_config);

    // 调用 AI 服务
    const aiResult = await aiService.analyze({
      content,
      imageUrl,
      analysisType,
      context,
    });

    // 保存用户消息
    const userMessageId = `MSG_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
    await Message.create({
      message_id: userMessageId,
      session_id: sessionId,
      role: 'user',
      content_type: imageUrl ? 'mixed' : 'text',
      content,
      image_urls: imageUrl ? [imageUrl] : null,
      status: 'normal',
    });

    // 保存 AI 回复消息
    const aiMessageId = `MSG_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
    const aiMessage = await Message.create({
      message_id: aiMessageId,
      session_id: sessionId,
      role: 'assistant',
      content_type: 'text',
      content: aiResult.content,
      status: 'normal',
    });

    // 创建诊断卡（如果有）
    let diagnosisCardData = null;
    if (aiResult.diagnosisCard) {
      const diagnosisCardId = `DIAG_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
      await DiagnosisCard.create({
        diagnosis_card_id: diagnosisCardId,
        message_id: aiMessageId,
        plant_id: session.plant_id,
        species: aiResult.diagnosisCard.species,
        analysis_type: analysisType,
        health_score: aiResult.diagnosisCard.healthScore,
        status: aiResult.diagnosisCard.status,
        issues: aiResult.diagnosisCard.issues,
        suggestions: aiResult.diagnosisCard.suggestions,
        confidence: aiResult.diagnosisCard.confidence,
        context_used: context,
      });

      diagnosisCardData = {
        diagnosisCardId,
        species: aiResult.diagnosisCard.species,
        healthScore: aiResult.diagnosisCard.healthScore,
        status: aiResult.diagnosisCard.status,
        issues: aiResult.diagnosisCard.issues,
        suggestions: aiResult.diagnosisCard.suggestions,
        confidence: aiResult.diagnosisCard.confidence,
      };

      logger.info('AI 分析完成', {
        sessionId,
        analysisType,
        healthScore: aiResult.diagnosisCard.healthScore,
        status: aiResult.diagnosisCard.status,
      });
    } else {
      logger.info('AI 分析完成（纯对话）', { sessionId });
    }

    return success(res, {
      messageId: aiMessageId,
      role: 'assistant',
      content: aiResult.content,
      diagnosisCard: diagnosisCardData,
      createdAt: aiMessage.created_at,
    });
  } catch (err) {
    logger.error('AI 分析失败', { error: err.message });
    return error(res, 'AI 分析失败: ' + err.message, 500);
  }
};

/**
 * 准备上下文数据
 * @param {Object} session - 会话对象
 * @param {Object} contextConfig - 上下文配置
 * @returns {Promise<Object>} 上下文数据
 */
async function prepareContext(session, contextConfig) {
  const context = {};

  if (!session.plant_id) {
    return context;
  }

  // 植物档案（必填）
  const plant = await Plant.findOne({
    where: { plant_id: session.plant_id },
  });

  if (plant) {
    context.plantInfo = {
      plantId: plant.plant_id,
      nickname: plant.nickname,
      species: plant.species,
      plantCategory: plant.plant_category,
      locationName: plant.location_name,
      locationCode: plant.location_code,
    };
  }

  // 环境数据
    if (contextConfig.environmentData) {
      const latestReading = await EnvironmentReading.findOne({
        where: { plant_id: session.plant_id },
        order: [['recorded_at', 'DESC']],
      });

      if (latestReading) {
        // 获取环境读数值
        const readingValues = await EnvironmentReadingValue.findAll({
          where: { reading_id: latestReading.reading_id },
        });

        // 获取指标定义（通过 metric_code 关联）
        const metricCodes = readingValues.map(v => v.metric_code);
        const metrics = metricCodes.length > 0
          ? await EnvironmentMetric.findAll({
              where: { metric_code: metricCodes },
              attributes: ['metric_code', 'name', 'unit'],
            })
          : [];
        const metricMap = new Map(metrics.map(m => [m.metric_code, m]));

        context.environmentData = readingValues.map((v) => {
          const metric = metricMap.get(v.metric_code);
          return {
            metricCode: metric?.metric_code || '',
            metricName: metric?.name || '',
            value: v.value,
            unit: metric?.unit || '',
          };
        });
      }
    }

  // 养护记录
  if (contextConfig.careRecords) {
    const careRecords = await CareRecord.findAll({
      where: { plant_id: session.plant_id },
      order: [['performed_at', 'DESC']],
      limit: 5,
    });

    context.careRecords = careRecords.map((record) => ({
      actionType: record.action_type,
      description: record.description,
      performedAt: record.performed_at,
    }));
  }

  // 历史诊断
  if (contextConfig.historyDiagnosis) {
    const historyDiagnosis = await DiagnosisCard.findAll({
      where: { plant_id: session.plant_id },
      order: [['created_at', 'DESC']],
      limit: 3,
    });

    context.historyDiagnosis = historyDiagnosis.map((diag) => ({
      healthScore: diag.health_score,
      status: diag.status,
      issues: diag.issues,
      createdAt: diag.created_at,
    }));
  }

  return context;
}

module.exports = {
  analyze,
};
