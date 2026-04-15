/**
 * 会话模块控制器
 * 处理会话相关的请求响应
 * SA-7-001: 已添加异步 AI 处理支持
 */

const sessionService = require('../services/SessionService');
const aiService = require('../services/aiService');
const asyncAiService = require('../services/asyncAiService');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 获取会话列表
 * GET /api/sessions
 */
const getSessions = async (req, res) => {
  try {
    const query = req.validatedQuery || req.query;
    const { type, plantId, page = 1, pageSize = 20 } = query;
    const userId = req.user.userId;

    const { count, sessions } = await sessionService.getSessionList(userId, {
      type,
      plantId,
      page,
      pageSize,
    });

    const plantIds = sessions.filter(s => s.plantId).map(s => s.plantId);
    const plants = await sessionService.getPlantsForSessions(plantIds);
    const plantMap = new Map(plants.map(p => [p.plantId, p]));

    const sessionIds = sessions.map(s => s.sessionId);
    const messageMap = await sessionService.getLatestMessages(sessionIds);

    const readPositions = await sessionService.getReadPositions(userId);

    const formattedSessions = sessions.map((session) => {
      const plant = session.plantId ? plantMap.get(session.plantId) : null;
      const lastMessage = messageMap.get(session.sessionId);

      const lastReadMessageId = readPositions[session.sessionId];
      const hasUnread = lastMessage && lastMessage.messageId !== lastReadMessageId;

      return {
        sessionId: session.sessionId,
        type: session.type,
        plantId: session.plantId,
        title: session.title,
        status: session.status,
        contextConfig: session.contextConfig,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        hasUnread: !!hasUnread,
        plant: plant
          ? {
              plantId: plant.plantId,
              nickname: plant.nickname,
              coverImageUrl: plant.coverImageUrl,
            }
          : null,
        lastMessage: lastMessage
          ? {
              messageId: lastMessage.messageId,
              content: lastMessage.content,
              role: lastMessage.role,
              createdAt: lastMessage.createdAt,
            }
          : null,
      };
    });

    return success(res, {
      list: formattedSessions,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total: count,
        totalPages: Math.ceil(count / parseInt(pageSize)),
      },
    });
  } catch (err) {
    console.error('获取会话列表失败:', err);
    return error(res, '获取会话列表失败', 500);
  }
};

/**
 * 创建会话
 * POST /api/sessions
 */
const createSession = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, plantId, title } = req.body;

    const session = await sessionService.createSession(userId, {
      type,
      plantId,
      title,
    });

    return success(res, {
      sessionId: session.sessionId,
      type: session.type,
      plantId: session.plantId,
      title: session.title,
      status: session.status,
      contextConfig: session.contextConfig,
      createdAt: session.createdAt,
    });
  } catch (err) {
    console.error('创建会话失败:', err);
    return error(res, '创建会话失败', 500);
  }
};

/**
 * 获取会话详情
 * GET /api/sessions/:sessionId
 */
const getSessionDetail = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    const session = await sessionService.getSessionById(sessionId, userId);

    if (!session) {
      return error(res, '会话不存在', 404, 404);
    }

    const messageCount = await sessionService.getMessageCount(sessionId);

    let plant = null;
    if (session.plantId) {
      const plants = await sessionService.getPlantsForSessions([session.plantId]);
      plant = plants[0] || null;
    }

    return success(res, {
      sessionId: session.sessionId,
      type: session.type,
      plantId: session.plantId,
      title: session.title,
      status: session.status,
      contextConfig: session.contextConfig,
      messageCount,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      plant: plant
        ? {
            plantId: plant.plantId,
            nickname: plant.nickname,
            species: plant.species,
            coverImageUrl: plant.coverImageUrl,
          }
        : null,
    });
  } catch (err) {
    console.error('获取会话详情失败:', err);
    return error(res, '获取会话详情失败', 500);
  }
};

/**
 * 更新会话
 * PUT /api/sessions/:sessionId
 */
const updateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;
    const { title, contextConfig } = req.body;

    const session = await sessionService.updateSession(sessionId, userId, {
      title,
      contextConfig,
    });

    if (!session) {
      return error(res, '会话不存在', 404, 404);
    }

    return success(res, {
      sessionId: session.sessionId,
      type: session.type,
      plantId: session.plantId,
      title: session.title,
      status: session.status,
      contextConfig: session.contextConfig,
      updatedAt: session.updatedAt,
    });
  } catch (err) {
    console.error('更新会话失败:', err);
    return error(res, '更新会话失败', 500);
  }
};

/**
 * 获取会话消息
 * GET /api/sessions/:sessionId/messages
 */
const getMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const query = req.validatedQuery || req.query;
    const { before, limit = 20 } = query;
    const userId = req.user.userId;

    const session = await sessionService.getSessionById(sessionId, userId);

    if (!session) {
      return error(res, '会话不存在', 404, 404);
    }

    const messages = await sessionService.getMessages(sessionId, { before, limit });

    const messageIds = messages.map(m => m.messageId);
    const diagnosisMap = await sessionService.getDiagnosisCardsForMessages(messageIds);

    const formattedMessages = messages.map((msg) => {
      const diagnosisCard = diagnosisMap.get(msg.messageId);
      return {
        messageId: msg.messageId,
        sessionId: msg.sessionId,
        role: msg.role,
        contentType: msg.contentType,
        content: msg.content,
        imageUrls: msg.imageUrls,
        replyToMessageId: msg.replyToMessageId,
        status: msg.status,
        createdAt: msg.createdAt,
        diagnosisCard: diagnosisCard
          ? {
              diagnosisCardId: diagnosisCard.diagnosisCardId,
              healthScore: diagnosisCard.healthScore,
              status: diagnosisCard.status,
              species: diagnosisCard.species,
              issues: diagnosisCard.issues,
              suggestions: diagnosisCard.suggestions,
            }
          : null,
      };
    });

    return success(res, {
      list: formattedMessages.reverse(),
      hasMore: messages.length === parseInt(limit),
    });
  } catch (err) {
    console.error('获取消息列表失败:', err);
    logger.error('获取消息列表失败', {
      sessionId: req.params.sessionId,
      userId: req.user.userId,
      error: err.message,
    });
    return error(res, '获取消息列表失败', 500);
  }
};

/**
 * 发送消息（异步模式）
 * POST /api/sessions/:sessionId/messages
 * SA-7-001: 改为异步处理，立即返回，AI分析在后台执行
 */
const sendMessage = async (req, res) => {
  const startTime = Date.now();
  const requestId = req.requestId || Date.now().toString(36);

  try {
    const { sessionId } = req.params;
    const { content, contentType = 'text', imageUrls, contextConfig } = req.body;
    const userId = req.user.userId;

    // 获取会话信息
    const session = await sessionService.getSessionById(sessionId, userId);
    if (!session) {
      return error(res, '会话不存在', 404, 404);
    }

    // 创建用户消息
    const userMessage = await sessionService.createMessage(sessionId, {
      role: 'user',
      content,
      contentType,
      imageUrls,
    });

    // 准备上下文数据
    const analysisType = session.type === 'plant' ? 'deep' : 'normal';
    const effectiveContextConfig = contextConfig || session.contextConfig || {};
    const context = await sessionService.prepareContext(session, effectiveContextConfig);
    const conversationHistory = await sessionService.getConversationHistory(sessionId, 6);
    context.conversationHistory = conversationHistory;

    const imageUrl = imageUrls && imageUrls.length > 0 ? imageUrls[0] : null;

    // 提交异步 AI 分析任务
    asyncAiService.submitAsyncAiTask({
      sessionId,
      userMessageId: userMessage.messageId,
      content,
      imageUrl,
      analysisType,
      context,
      userId,
    });

    // 创建"AI正在分析"的占位消息
    const placeholderMessage = await sessionService.createMessage(sessionId, {
      role: 'assistant',
      contentType: 'text',
      content: 'AI 正在分析中，请稍候...',
      replyToMessageId: userMessage.messageId,
    });

    const totalTime = Date.now() - startTime;
    logger.info('【异步模式】sendMessage 已提交 AI 任务', {
      requestId,
      sessionId,
      totalTimeMs: totalTime,
      userMessageId: userMessage.messageId,
      placeholderMessageId: placeholderMessage.messageId,
      hasImage: !!imageUrl,
    });

    // 立即返回响应（不等待 AI 完成）
    return success(res, {
      userMessage: {
        messageId: userMessage.messageId,
        sessionId: userMessage.sessionId,
        role: userMessage.role,
        contentType: userMessage.contentType,
        content: userMessage.content,
        imageUrls: userMessage.imageUrls,
        status: userMessage.status,
        createdAt: userMessage.createdAt,
      },
      aiResponse: {
        messageId: placeholderMessage.messageId,
        sessionId: placeholderMessage.sessionId,
        role: placeholderMessage.role,
        contentType: placeholderMessage.contentType,
        content: placeholderMessage.content,
        diagnosisCard: null,
        status: 'analyzing', // 标记为分析中状态
        createdAt: placeholderMessage.createdAt,
        isPlaceholder: true, // 标记为占位消息
      },
      isAsync: true, // 标记为异步模式
      message: 'AI 分析已提交，请稍后刷新查看结果',
    });
  } catch (err) {
    const totalTime = Date.now() - startTime;
    logger.error('【异步模式】sendMessage 失败', {
      requestId,
      sessionId: req.params.sessionId,
      totalTimeMs: totalTime,
      error: err.message,
    });
    return error(res, '发送消息失败: ' + err.message, 500);
  }
};

/**
 * 升级会话
 * POST /api/sessions/:sessionId/upgrade
 */
const upgradeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { plantId } = req.body;
    const userId = req.user.userId;

    const result = await sessionService.upgradeSession(sessionId, userId, plantId);

    if (result.error) {
      return error(res, result.error, result.code, result.code);
    }

    return success(res, {
      sessionId: result.session.sessionId,
      type: result.session.type,
      plantId: result.session.plantId,
      title: result.session.title,
      status: result.session.status,
      contextConfig: result.session.contextConfig,
      upgradedAt: result.session.updatedAt,
    });
  } catch (err) {
    console.error('升级会话失败:', err);
    return error(res, '升级会话失败', 500);
  }
};

/**
 * 标记会话已读
 * POST /api/sessions/:sessionId/read
 */
const markSessionAsRead = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    const session = await sessionService.getSessionById(sessionId, userId);

    if (!session) {
      return error(res, '会话不存在', 404, 404);
    }

    const lastMessage = await sessionService.getLastMessage(sessionId);

    if (!lastMessage) {
      return success(res, { message: '无消息可标记' });
    }

    await sessionService.updateReadPosition(userId, sessionId, lastMessage.messageId);

    return success(res, { message: '已标记为已读' });
  } catch (err) {
    logger.error('标记会话已读失败', { error: err.message });
    return error(res, '标记会话已读失败: ' + err.message, 500);
  }
};

/**
 * 删除会话
 * DELETE /api/sessions/:sessionId
 */
const deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    const deleted = await sessionService.deleteSession(sessionId, userId);

    if (!deleted) {
      return error(res, '会话不存在', 404, 404);
    }

    return success(res, null, '删除成功');
  } catch (err) {
    console.error('删除会话失败:', err);
    return error(res, '删除会话失败', 500);
  }
};

module.exports = {
  getSessions,
  createSession,
  getSessionDetail,
  updateSession,
  getMessages,
  sendMessage,
  upgradeSession,
  deleteSession,
  markSessionAsRead,
};
