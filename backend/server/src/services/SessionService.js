const BaseService = require('./BaseService');
const { Session, Message, Plant, DiagnosisCard, CareRecord, EnvironmentReading, EnvironmentReadingValue, EnvironmentMetric, UserConfig } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

class SessionService extends BaseService {
  constructor() {
    super(Session, 'Session');
  }

  generateSessionId() {
    return `SESSION_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  }

  generateMessageId() {
    return `MSG_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  }

  generateDiagnosisId() {
    return `DIAG_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  }

  async createSession(userId, sessionData) {
    try {
      const sessionId = this.generateSessionId();
      const session = await this.create({
        session_id: sessionId,
        user_id: userId,
        type: sessionData.type || 'consultation',
        plant_id: sessionData.plantId || null,
        title: sessionData.title || (sessionData.type === 'plant' ? '植物会话' : '咨询会话'),
        context_config: {
          environmentData: false,
          careRecords: false,
          historyDiagnosis: false,
        },
        status: 'active',
      });
      logger.info(`Session created: ${sessionId}`);
      return session;
    } catch (err) {
      logger.error('SessionService.createSession error:', err);
      throw err;
    }
  }

  async getSessionList(userId, query = {}) {
    try {
      const { type, plantId, page = 1, pageSize = 20 } = query;
      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      const where = { user_id: userId };
      if (type) where.type = type;
      if (plantId) where.plant_id = plantId;

      const { count, rows: sessions } = await Session.findAndCountAll({
        where,
        order: [['updated_at', 'DESC']],
        offset,
        limit,
      });

      return { count, sessions };
    } catch (err) {
      logger.error('SessionService.getSessionList error:', err);
      throw err;
    }
  }

  async getSessionById(sessionId, userId) {
    try {
      return await this.findOne({ session_id: sessionId, user_id: userId });
    } catch (err) {
      logger.error('SessionService.getSessionById error:', err);
      throw err;
    }
  }

  async updateSession(sessionId, userId, updateData) {
    try {
      const session = await this.getSessionById(sessionId, userId);
      if (!session) return null;

      const allowedFields = ['title', 'context_config', 'type', 'plant_id'];
      const filteredData = {};

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      });

      if (Object.keys(filteredData).length === 0) {
        return session;
      }

      await session.update(filteredData);
      return session;
    } catch (err) {
      logger.error('SessionService.updateSession error:', err);
      throw err;
    }
  }

  async deleteSession(sessionId, userId) {
    try {
      const session = await this.getSessionById(sessionId, userId);
      if (!session) return false;

      await session.destroy();
      logger.info(`Session deleted: ${sessionId}`);
      return true;
    } catch (err) {
      logger.error('SessionService.deleteSession error:', err);
      throw err;
    }
  }

  async getMessages(sessionId, query = {}) {
    try {
      const { before, limit = 20 } = query;

      const where = { session_id: sessionId };
      if (before) {
        where.created_at = { [Op.lt]: new Date(parseInt(before)) };
      }

      const messages = await Message.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
      });

      return messages;
    } catch (err) {
      logger.error('SessionService.getMessages error:', err);
      throw err;
    }
  }

  async getMessageCount(sessionId) {
    try {
      return await Message.count({ where: { session_id: sessionId } });
    } catch (err) {
      logger.error('SessionService.getMessageCount error:', err);
      return 0;
    }
  }

  async createMessage(sessionId, messageData) {
    try {
      const message = await Message.create({
        message_id: this.generateMessageId(),
        session_id: sessionId,
        role: messageData.role,
        content_type: messageData.contentType || 'text',
        content: messageData.content,
        image_urls: messageData.imageUrls || null,
        status: messageData.status || 'normal',
      });

      await this.model.update(
        { updated_at: new Date() },
        { where: { session_id: sessionId } }
      );

      logger.info(`Message created: ${message.messageId}`);
      return message;
    } catch (err) {
      logger.error('SessionService.createMessage error:', err);
      throw err;
    }
  }

  async createDiagnosisCard(diagnosisData) {
    try {
      const diagnosisCard = await DiagnosisCard.create({
        diagnosis_card_id: this.generateDiagnosisId(),
        message_id: diagnosisData.messageId,
        plant_id: diagnosisData.plantId,
        species: diagnosisData.species,
        analysis_type: diagnosisData.analysisType,
        health_score: diagnosisData.healthScore,
        status: diagnosisData.status,
        issues: diagnosisData.issues,
        suggestions: diagnosisData.suggestions,
        confidence: diagnosisData.confidence,
        context_used: diagnosisData.contextUsed,
      });

      logger.info(`DiagnosisCard created: ${diagnosisCard.diagnosisCardId}`);
      return diagnosisCard;
    } catch (err) {
      logger.error('SessionService.createDiagnosisCard error:', err);
      throw err;
    }
  }

  async getPlantsForSessions(plantIds) {
    try {
      if (!plantIds || plantIds.length === 0) return [];
      return await Plant.findAll({
        where: { plant_id: plantIds },
        attributes: ['plant_id', 'nickname', 'species', 'cover_image_url'],
      });
    } catch (err) {
      logger.error('SessionService.getPlantsForSessions error:', err);
      return [];
    }
  }

  async getLatestMessages(sessionIds) {
    try {
      if (!sessionIds || sessionIds.length === 0) return new Map();

      const messages = await Message.findAll({
        where: { session_id: sessionIds },
        attributes: ['message_id', 'session_id', 'content', 'role', 'created_at'],
        order: [['created_at', 'DESC']],
      });

      const messageMap = new Map();
      messages.forEach(m => {
        if (!messageMap.has(m.sessionId)) {
          messageMap.set(m.sessionId, m);
        }
      });

      return messageMap;
    } catch (err) {
      logger.error('SessionService.getLatestMessages error:', err);
      return new Map();
    }
  }

  async getDiagnosisCardsForMessages(messageIds) {
    try {
      if (!messageIds || messageIds.length === 0) return new Map();

      const cards = await DiagnosisCard.findAll({
        where: { message_id: messageIds },
        attributes: ['diagnosis_card_id', 'message_id', 'health_score', 'status', 'issues', 'suggestions'],
      });

      return new Map(cards.map(c => [c.messageId, c]));
    } catch (err) {
      logger.error('SessionService.getDiagnosisCardsForMessages error:', err);
      return new Map();
    }
  }

  async getReadPositions(userId) {
    try {
      const config = await UserConfig.findOne({
        where: { user_id: userId, config_key: 'read_positions' },
      });
      return config?.configValue || {};
    } catch (err) {
      logger.error('SessionService.getReadPositions error:', err);
      return {};
    }
  }

  async updateReadPosition(userId, sessionId, messageId) {
    try {
      const [config] = await UserConfig.findOrCreate({
        where: { user_id: userId, config_key: 'read_positions' },
        defaults: {
          config_id: `CFG_${Date.now()}`,
          user_id: userId,
          config_key: 'read_positions',
          config_value: {},
          config_type: 'preference',
        },
      });

      const readPositions = { ...(config.configValue || {}) };
      readPositions[sessionId] = messageId;

      await config.update({ config_value: readPositions });
      return true;
    } catch (err) {
      logger.error('SessionService.updateReadPosition error:', err);
      throw err;
    }
  }

  async getLastMessage(sessionId) {
    try {
      return await Message.findOne({
        where: { session_id: sessionId },
        order: [['created_at', 'DESC']],
        attributes: ['message_id'],
      });
    } catch (err) {
      logger.error('SessionService.getLastMessage error:', err);
      return null;
    }
  }

  async prepareContext(session, contextConfig) {
    const context = {};

    if (!session.plantId) {
      return context;
    }

    const plant = await Plant.findOne({
      where: { plant_id: session.plantId },
    });

    if (plant) {
      context.plantInfo = {
        plantId: plant.plantId,
        nickname: plant.nickname,
        species: plant.species,
        plantCategory: plant.plantCategory,
        locationName: plant.locationName,
        locationCode: plant.locationCode,
      };
    }

    if (contextConfig.environmentData) {
      const latestReading = await EnvironmentReading.findOne({
        where: { plant_id: session.plantId },
        order: [['recorded_at', 'DESC']],
      });

      if (latestReading) {
        const readingValues = await EnvironmentReadingValue.findAll({
          where: { reading_id: latestReading.readingId },
        });

        const metricCodes = readingValues.map(v => v.metricCode);
        const metrics = metricCodes.length > 0
          ? await EnvironmentMetric.findAll({
              where: { metric_code: metricCodes },
              attributes: ['metric_code', 'name', 'unit'],
            })
          : [];
        const metricMap = new Map(metrics.map(m => [m.metricCode, m]));

        context.environmentData = readingValues.map((v) => {
          const metric = metricMap.get(v.metricCode);
          return {
            metricCode: metric?.metricCode || '',
            metricName: metric?.name || '',
            value: v.value,
            unit: metric?.unit || '',
          };
        });
      }
    }

    if (contextConfig.careRecords) {
      const careRecords = await CareRecord.findAll({
        where: { plant_id: session.plantId },
        order: [['performed_at', 'DESC']],
        limit: 5,
      });

      context.careRecords = careRecords.map((record) => ({
        actionType: record.actionType,
        description: record.description,
        performedAt: record.performedAt,
      }));
    }

    if (contextConfig.historyDiagnosis) {
      const historyDiagnosis = await DiagnosisCard.findAll({
        where: { plant_id: session.plantId },
        order: [['created_at', 'DESC']],
        limit: 3,
      });

      context.historyDiagnosis = historyDiagnosis.map((diag) => ({
        healthScore: diag.healthScore,
        status: diag.status,
        issues: diag.issues,
        createdAt: diag.createdAt,
      }));
    }

    return context;
  }

  async getConversationHistory(sessionId, limit = 6) {
    try {
      const messages = await Message.findAll({
        where: { session_id: sessionId },
        order: [['created_at', 'DESC']],
        limit,
      });

      return messages.reverse().map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
    } catch (err) {
      logger.error('SessionService.getConversationHistory error:', err);
      return [];
    }
  }

  async upgradeSession(sessionId, userId, plantId) {
    try {
      const session = await this.getSessionById(sessionId, userId);
      if (!session) return { error: '会话不存在', code: 404 };

      if (session.type === 'plant') {
        return { error: '已经是植物会话，无需升级', code: 400 };
      }

      const plant = await Plant.findOne({
        where: { plant_id: plantId, user_id: userId },
      });

      if (!plant) {
        return { error: '植物不存在', code: 404 };
      }

      await session.update({
        type: 'plant',
        plant_id: plantId,
        title: `${plant.nickname} - 植物会话`,
      });

      const messages = await Message.findAll({
        where: { session_id: sessionId },
        attributes: ['message_id'],
      });

      const messageIds = messages.map(m => m.messageId);

      if (messageIds.length > 0) {
        await DiagnosisCard.update(
          { plant_id: plantId },
          { where: { message_id: { [Op.in]: messageIds } } }
        );
      }

      return { session, plant };
    } catch (err) {
      logger.error('SessionService.upgradeSession error:', err);
      throw err;
    }
  }
}

module.exports = SessionService;
