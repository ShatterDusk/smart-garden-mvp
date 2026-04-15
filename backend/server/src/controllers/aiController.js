/**
 * AI 模块控制器
 * 处理 AI 分析相关的业务逻辑
 * SA-7-001: 改为异步模式，避免超时
 */

const { v4: uuidv4 } = require('uuid');
const { Session, Message } = require('../models');
const asyncAiService = require('../services/asyncAiService');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 触发 AI 分析（异步模式）
 * POST /api/ai/analyze
 * SA-7-001: 改为异步提交，立即返回，后台处理
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

    // SA-7-001: 提交异步 AI 任务，避免同步等待导致超时
    asyncAiService.submitAsyncAiTask({
      sessionId,
      userId,
      content,
      imageUrl,
      userMessageId,
      analysisType,
      contextConfig: session.context_config,
    });

    logger.info('【AI异步】分析任务已提交', {
      sessionId,
      userId,
      analysisType,
      hasImage: !!imageUrl,
    });

    // 立即返回，不等待 AI 完成
    return success(res, {
      messageId: userMessageId,
      isAsync: true,
      message: 'AI 分析已提交，请稍后查看结果',
    });
  } catch (err) {
    logger.error('【AI异步】分析提交失败', { error: err.message });
    return error(res, 'AI 分析提交失败: ' + err.message, 500);
  }
};

module.exports = {
  analyze,
};
