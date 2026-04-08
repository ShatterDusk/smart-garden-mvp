const BaseService = require('./BaseService');
const { Plant, Device, DiagnosisCard, CareRecord, Message, Session } = require('../models');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const EnvironmentService = require('./EnvironmentService');
const weatherService = require('./weatherService');
const { formatDiagnosisCards } = require('../utils/formatters');

class PlantService extends BaseService {
  constructor() {
    super(Plant, 'Plant');
  }

  generatePlantId() {
    return `PLANT_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  }

  async createPlant(userId, plantData) {
    try {
      const plantId = this.generatePlantId();
      const plant = await this.create({
        plant_id: plantId,
        user_id: userId,
        nickname: plantData.nickname,
        species: plantData.species,
        plant_category: plantData.plantCategory || 'other',
        cover_image_url: plantData.coverImageUrl || '',
        current_device_id: plantData.currentDeviceId || null,
        location_name: plantData.locationName,
        location_code: plantData.locationCode,
        location_lat: plantData.locationLat,
        location_lng: plantData.locationLng,
      });

      if (plantData.firstDiagnosis && plantData.firstDiagnosis.diagnosisCardId) {
        await DiagnosisCard.update(
          { plant_id: plantId },
          { where: { diagnosis_card_id: plantData.firstDiagnosis.diagnosisCardId } }
        );
      }

      logger.info(`Plant created: ${plantId}`);
      return plant;
    } catch (err) {
      logger.error('PlantService.createPlant error:', err);
      throw err;
    }
  }

  async getPlantById(plantId, userId = null) {
    try {
      const where = { plant_id: plantId };
      if (userId) {
        where.user_id = userId;
      }
      return await this.findOne(where);
    } catch (err) {
      logger.error('PlantService.getPlantById error:', err);
      throw err;
    }
  }

  async getPlantList(userId, query = {}) {
    try {
      const { page = 1, pageSize = 20 } = query;
      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      const { count, rows: plants } = await Plant.findAndCountAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        offset,
        limit,
      });

      return { count, plants };
    } catch (err) {
      logger.error('PlantService.getPlantList error:', err);
      throw err;
    }
  }

  async getPlantWithDevice(plantId, userId) {
    try {
      const plant = await this.getPlantById(plantId, userId);
      if (!plant) return null;

      let device = null;
      if (plant.currentDeviceId) {
        device = await Device.findOne({
          where: { device_id: plant.currentDeviceId },
          attributes: ['device_id', 'device_name', 'mac_address', 'status', 'battery_level', 'last_heartbeat'],
        });
      }

      return { plant, device };
    } catch (err) {
      logger.error('PlantService.getPlantWithDevice error:', err);
      throw err;
    }
  }

  async getPlantDetail(plantId, userId) {
    try {
      const plant = await this.getPlantById(plantId, userId);
      if (!plant) return null;

      let device = null;
      if (plant.currentDeviceId) {
        device = await Device.findOne({
          where: { device_id: plant.currentDeviceId },
          attributes: ['device_id', 'device_name', 'mac_address', 'status', 'battery_level', 'last_heartbeat'],
        });
      }

      // 统一查询诊断卡列表（按时间倒序，最多10条）
      const diagnosisCardsRaw = await DiagnosisCard.findAll({
        where: { plant_id: plantId },
        order: [['created_at', 'DESC']],
        limit: 10,
      });

      // 获取所有诊断卡关联的 message_id
      const messageIds = diagnosisCardsRaw
        .map(d => d.messageId)
        .filter(Boolean);

      // 批量查询 session_id
      const sessionIdMap = new Map();
      if (messageIds.length > 0) {
        const messages = await Message.findAll({
          where: { message_id: messageIds },
          attributes: ['message_id', 'session_id'],
        });
        messages.forEach(m => {
          sessionIdMap.set(m.get('message_id'), m.get('session_id'));
        });
      }

      // 格式化诊断卡数据，添加 sessionId
      const diagnosisCards = formatDiagnosisCards(diagnosisCardsRaw).map(card => ({
        ...card,
        sessionId: sessionIdMap.get(card.messageId) || null,
      }));

      const careRecords = await CareRecord.findAll({
        where: { plant_id: plantId },
        attributes: ['record_id', 'action_type', 'description', 'performed_at', 'created_at'],
        order: [['performed_at', 'DESC']],
        limit: 10,
      });

      const environmentService = new EnvironmentService();
      const environmentData = await environmentService.getCurrentData(plantId);

      const result = {
        plant,
        device,
        diagnosisCards,  // 统一返回数组
        careRecords,
        environmentData,
      };

      logger.info('getPlantDetail 返回诊断数据', {
        plantId,
        diagnosisCardsCount: diagnosisCards.length,
        diagnosisCardsIds: diagnosisCards.map(d => d.diagnosisCardId).slice(0, 5),
      });

      return result;
    } catch (err) {
      logger.error('PlantService.getPlantDetail error:', err);
      throw err;
    }
  }

  async updatePlant(plantId, userId, updateData) {
    try {
      const plant = await this.getPlantById(plantId, userId);
      if (!plant) return null;

      // camelCase -> snake_case 字段映射
      const fieldMapping = {
        nickname: 'nickname',
        species: 'species',
        plantCategory: 'plant_category',
        coverImageUrl: 'cover_image_url',
        currentDeviceId: 'current_device_id',
        locationName: 'location_name',
        locationCode: 'location_code',
        locationLat: 'location_lat',
        locationLng: 'location_lng',
      };

      const filteredData = {};
      Object.keys(fieldMapping).forEach(camelField => {
        if (updateData[camelField] !== undefined) {
          filteredData[fieldMapping[camelField]] = updateData[camelField];
        }
      });

      // 如果更新了经纬度但没有提供 locationCode，自动获取
      if (filteredData.location_lat !== undefined &&
          filteredData.location_lng !== undefined &&
          filteredData.location_code === undefined) {
        try {
          const cityCode = await weatherService.geocoding(
            filteredData.location_lat,
            filteredData.location_lng
          );
          if (cityCode) {
            filteredData.location_code = cityCode;
            logger.debug('自动获取城市代码成功', {
              plantId,
              lat: filteredData.location_lat,
              lng: filteredData.location_lng,
              cityCode
            });
          }
        } catch (err) {
          logger.warn('自动获取城市代码失败', { plantId, error: err.message });
        }
      }

      if (Object.keys(filteredData).length === 0) {
        return plant;
      }

      await plant.update(filteredData);
      logger.info(`Plant updated: ${plantId}`);
      return plant;
    } catch (err) {
      logger.error('PlantService.updatePlant error:', err);
      throw err;
    }
  }

  async deletePlant(plantId, userId) {
    try {
      const plant = await this.getPlantById(plantId, userId);
      if (!plant) return false;

      // 退化关联的植物咨询会话为普通咨询会话
      const degradedCount = await this.degradePlantSessions(plantId, plant.nickname);
      if (degradedCount > 0) {
        logger.info(`Degraded ${degradedCount} plant sessions to consultation for plant: ${plantId}`);
      }

      await plant.destroy();
      logger.info(`Plant deleted: ${plantId}`);
      return true;
    } catch (err) {
      logger.error('PlantService.deletePlant error:', err);
      throw err;
    }
  }

  /**
   * 退化植物关联的会话
   * 将 type='plant' 的会话降级为 type='consultation'，并更新标题
   */
  async degradePlantSessions(plantId, plantNickname) {
    try {
      const sessions = await Session.findAll({
        where: {
          plant_id: plantId,
          type: 'plant',
        },
      });

      if (sessions.length === 0) return 0;

      const newTitle = plantNickname 
        ? `历史咨询（${plantNickname} 已删除）`
        : '历史咨询（植物已删除）';

      await Session.update(
        {
          type: 'consultation',
          plant_id: null,
          title: newTitle,
        },
        {
          where: {
            plant_id: plantId,
            type: 'plant',
          },
        }
      );

      return sessions.length;
    } catch (err) {
      logger.error('PlantService.degradePlantSessions error:', err);
      return 0;
    }
  }

  async getPlantDevices(deviceIds) {
    try {
      if (!deviceIds || deviceIds.length === 0) return [];
      return await Device.findAll({
        where: { device_id: deviceIds },
        attributes: ['device_id', 'device_name', 'status'],
      });
    } catch (err) {
      logger.error('PlantService.getPlantDevices error:', err);
      return [];
    }
  }

  async getLatestDiagnoses(plantIds) {
    try {
      if (!plantIds || plantIds.length === 0) return new Map();

      const diagnosisCards = await DiagnosisCard.findAll({
        where: { plant_id: plantIds },
        attributes: ['diagnosis_card_id', 'plant_id', 'health_score', 'status', 'created_at'],
        order: [['created_at', 'DESC']],
      });

      const diagnosisMap = new Map();
      diagnosisCards.forEach(d => {
        if (!diagnosisMap.has(d.plantId)) {
          diagnosisMap.set(d.plantId, d);
        }
      });

      return diagnosisMap;
    } catch (err) {
      logger.error('PlantService.getLatestDiagnoses error:', err);
      return new Map();
    }
  }
}

module.exports = PlantService;
