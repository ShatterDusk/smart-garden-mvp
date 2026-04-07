/**
 * 诊断卡模块控制器
 * 处理诊断相关的业务逻辑
 */

const { DiagnosisCard, Message, Plant } = require('../models');
const { success, error } = require('../utils/response');

/**
 * 获取诊断历史
 * GET /api/diagnosis
 */
const getDiagnosisHistory = async (req, res) => {
  try {
    const { plantId, page = 1, pageSize = 20 } = req.query;
    const userId = req.user.userId;

    const where = {};
    
    // 如果指定了植物ID，筛选该植物的诊断
    if (plantId) {
      where.plant_id = plantId;
    } else {
      // 否则查询用户所有植物的诊断
      const userPlants = await Plant.findAll({
        where: { user_id: userId },
        attributes: ['plant_id'],
      });
      where.plant_id = userPlants.map((p) => p.plant_id);
    }

    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const { count, rows: diagnoses } = await DiagnosisCard.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      offset,
      limit,
    });

    // 获取关联的植物和消息信息
    const plantIds = diagnoses.filter(d => d.plant_id).map(d => d.plant_id);
    const messageIds = diagnoses.filter(d => d.message_id).map(d => d.message_id);
    
    const [plants, messages] = await Promise.all([
      plantIds.length > 0
        ? Plant.findAll({
            where: { plant_id: plantIds },
            attributes: ['plant_id', 'nickname', 'cover_image_url'],
          })
        : [],
      messageIds.length > 0
        ? Message.findAll({
            where: { message_id: messageIds },
            attributes: ['message_id', 'content', 'created_at'],
          })
        : [],
    ]);
    
    const plantMap = new Map(plants.map(p => [p.plant_id, p]));
    const messageMap = new Map(messages.map(m => [m.message_id, m]));

    const formattedDiagnoses = diagnoses.map((diagnosis) => {
      const plain = diagnosis.get({ plain: true });
      const plant = plain.plant_id ? plantMap.get(plain.plant_id) : null;
      const message = plain.message_id ? messageMap.get(plain.message_id) : null;
      return {
        diagnosisCardId: plain.diagnosis_card_id,
        messageId: plain.message_id,
        plantId: plain.plant_id,
        analysisType: plain.analysis_type,
        healthScore: plain.health_score,
        status: plain.status,
        species: plain.species,
        issues: plain.issues,
        suggestions: plain.suggestions,
        confidence: plain.confidence,
        contextUsed: plain.context_used,
        createdAt: plain.created_at,
        plant: plant
          ? {
              plantId: plant.plant_id,
              nickname: plant.nickname,
              species: plant.species,
              coverImageUrl: plant.cover_image_url,
            }
          : null,
        message: message
          ? {
              messageId: message.message_id,
              content: message.content,
              createdAt: message.created_at,
            }
          : null,
      };
    });

    return success(res, {
      list: formattedDiagnoses,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total: count,
        totalPages: Math.ceil(count / parseInt(pageSize)),
      },
    });
  } catch (err) {
    console.error('获取诊断历史失败:', err);
    return error(res, '获取诊断历史失败', 500);
  }
};

/**
 * 获取诊断详情
 * GET /api/diagnosis/:diagnosisCardId
 */
const getDiagnosisDetail = async (req, res) => {
  try {
    const { diagnosisCardId } = req.params;
    const userId = req.user.userId;

    const diagnosis = await DiagnosisCard.findOne({
      where: { diagnosis_card_id: diagnosisCardId },
    });

    if (!diagnosis) {
      return error(res, '诊断卡不存在', 404, 404);
    }

    // 验证诊断卡所属植物是否属于当前用户
    const plant = await Plant.findOne({
      where: { plant_id: diagnosis.plant_id, user_id: userId },
    });

    if (!plant) {
      return error(res, '无权限查看此诊断卡', 403);
    }

    // 获取关联的消息信息
    let message = null;
    if (diagnosis.message_id) {
      message = await Message.findOne({
        where: { message_id: diagnosis.message_id },
        attributes: ['message_id', 'content', 'image_urls', 'created_at'],
      });
    }

    const plain = diagnosis.get({ plain: true });
    return success(res, {
      diagnosisCardId: plain.diagnosis_card_id,
      messageId: plain.message_id,
      plantId: plain.plant_id,
      analysisType: plain.analysis_type,
      healthScore: plain.health_score,
      status: plain.status,
      species: plain.species,
      issues: plain.issues,
      suggestions: plain.suggestions,
      confidence: plain.confidence,
      contextUsed: plain.context_used,
      createdAt: plain.created_at,
      plant: {
        plantId: plant.plant_id,
        nickname: plant.nickname,
        species: plant.species,
        coverImageUrl: plant.cover_image_url,
      },
      message: message
        ? {
            messageId: message.message_id,
            content: message.content,
            imageUrls: message.image_urls,
            createdAt: message.created_at,
          }
        : null,
    });
  } catch (err) {
    console.error('获取诊断详情失败:', err);
    return error(res, '获取诊断详情失败', 500);
  }
};

module.exports = {
  getDiagnosisHistory,
  getDiagnosisDetail,
};
