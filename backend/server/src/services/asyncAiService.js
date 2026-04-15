/**
 * 异步 AI 服务
 * 处理会话消息的异步 AI 分析
 * SA-7-001 性能优化方案
 */

const aiService = require('./aiService');
const sessionService = require('./SessionService');
const { Message } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// 用于测试的异步任务跟踪
let pendingTasksCount = 0;
let isTestMode = false;

/**
 * 设置测试模式
 * 在测试模式下，submitAsyncAiTask 会返回 Promise 以便测试等待
 * @param {boolean} enabled - 是否启用测试模式
 */
function setTestMode(enabled) {
  isTestMode = enabled;
}

/**
 * 获取当前挂起的任务数量
 * @returns {number} 挂起的任务数量
 */
function getPendingTasksCount() {
  return pendingTasksCount;
}

/**
 * 等待所有挂起的任务完成（仅用于测试）
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<void>}
 */
async function waitForAllTasks(timeout = 5000) {
  const startTime = Date.now();
  while (pendingTasksCount > 0) {
    if (Date.now() - startTime > timeout) {
      logger.warn('[AsyncAI] 等待任务完成超时', { pendingTasksCount });
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * 删除占位消息
 * @param {string} sessionId - 会话ID
 * @param {string} userMessageId - 用户消息ID（回复的目标消息）
 */
async function deletePlaceholderMessage(sessionId, userMessageId) {
  try {
    // 查找并删除占位消息
    const result = await Message.destroy({
      where: {
        session_id: sessionId,
        reply_to_message_id: userMessageId,
        content: 'AI 正在分析中，请稍候...',
      },
    });

    if (result > 0) {
      logger.info('【异步AI】已删除占位消息', {
        sessionId,
        userMessageId,
        deletedCount: result,
      });
    }
  } catch (error) {
    logger.error('【异步AI】删除占位消息失败', {
      sessionId,
      userMessageId,
      error: error.message,
    });
  }
}

/**
 * 异步处理 AI 分析任务
 * @param {Object} params - 任务参数
 * @param {string} params.sessionId - 会话ID
 * @param {string} params.userMessageId - 用户消息ID
 * @param {string} params.content - 消息内容
 * @param {string} params.imageUrl - 图片URL
 * @param {string} params.analysisType - 分析类型
 * @param {Object} params.context - 上下文信息
 * @param {string} params.userId - 用户ID
 */
async function processAiAnalysisAsync(params) {
  pendingTasksCount++;
  
  const {
    sessionId,
    userMessageId,
    content,
    imageUrl,
    analysisType,
    context,
    userId,
  } = params;

  const startTime = Date.now();
  const requestId = `async_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info('【异步AI】开始处理', {
    requestId,
    sessionId,
    userMessageId,
    analysisType,
    hasImage: !!imageUrl,
  });

  try {
    // 调用 AI 服务
    const aiResult = await aiService.analyze({
      content,
      imageUrl,
      analysisType,
      context,
    });

    // 检查数据库连接是否仍然可用（测试环境可能在测试结束后关闭连接）
    const { sequelize } = require('../models');
    if (!sequelize || sequelize.connectionManager.pool._draining) {
      logger.warn('【异步AI】数据库连接已关闭，跳过保存结果', { requestId, sessionId });
      return { success: false, error: '数据库连接已关闭' };
    }

    // 删除占位消息
    await deletePlaceholderMessage(sessionId, userMessageId);

    // 创建 AI 回复消息
    const aiMessage = await sessionService.createMessage(sessionId, {
      role: 'assistant',
      contentType: 'text',
      content: aiResult.content,
      replyToMessageId: userMessageId,
    });

    // 创建诊断卡（如有）
    let diagnosisCardData = null;
    if (aiResult.diagnosisCard) {
      await sessionService.createDiagnosisCard({
        messageId: aiMessage.messageId,
        plantId: context.plantInfo?.plantId,
        species: aiResult.diagnosisCard.species || '未知植物',
        analysisType,
        healthScore: aiResult.diagnosisCard.healthScore,
        status: aiResult.diagnosisCard.status,
        issues: aiResult.diagnosisCard.issues,
        suggestions: aiResult.diagnosisCard.suggestions,
        confidence: aiResult.diagnosisCard.confidence,
        contextUsed: context,
      });

      diagnosisCardData = {
        healthScore: aiResult.diagnosisCard.healthScore,
        status: aiResult.diagnosisCard.status,
        species: aiResult.diagnosisCard.species || '未知植物',
        issues: aiResult.diagnosisCard.issues,
        suggestions: aiResult.diagnosisCard.suggestions,
        confidence: aiResult.diagnosisCard.confidence,
      };
    }

    const totalTime = Date.now() - startTime;
    logger.info('【异步AI】处理完成', {
      requestId,
      sessionId,
      totalTimeMs: totalTime,
      aiMessageId: aiMessage.messageId,
      hasDiagnosisCard: !!diagnosisCardData,
    });

    // 可以在这里添加 WebSocket 推送或消息通知
    // 通知前端有新的 AI 回复

    return {
      success: true,
      aiMessageId: aiMessage.messageId,
      diagnosisCard: diagnosisCardData,
    };
  } catch (error) {
    const totalTime = Date.now() - startTime;
    logger.error('【异步AI】处理失败', {
      requestId,
      sessionId,
      totalTimeMs: totalTime,
      error: error.message,
    });

    // 删除占位消息
    await deletePlaceholderMessage(sessionId, userMessageId);

    // 创建错误提示消息
    try {
      await sessionService.createMessage(sessionId, {
        role: 'assistant',
        contentType: 'text',
        content: '抱歉，AI 分析出现错误，请稍后重试。',
        replyToMessageId: userMessageId,
      });
    } catch (msgError) {
      logger.error('【异步AI】创建错误消息失败', {
        requestId,
        error: msgError.message,
      });
    }

    return {
      success: false,
      error: error.message,
    };
  } finally {
    pendingTasksCount--;
  }
}

/**
 * 提交异步 AI 分析任务
 * 使用 setImmediate 确保在当前请求响应后立即执行
 * @param {Object} params - 任务参数
 */
function submitAsyncAiTask(params) {
  // 使用 setImmediate 将任务放入事件循环的下一轮
  // 确保当前 HTTP 请求能够立即返回
  setImmediate(() => {
    processAiAnalysisAsync(params).catch((error) => {
      logger.error('【异步AI】任务执行异常', {
        error: error.message,
        stack: error.stack,
      });
    });
  });

  logger.info('【异步AI】任务已提交', {
    sessionId: params.sessionId,
    userMessageId: params.userMessageId,
  });
}

module.exports = {
  submitAsyncAiTask,
  processAiAnalysisAsync,
  setTestMode,
  getPendingTasksCount,
  waitForAllTasks,
};
