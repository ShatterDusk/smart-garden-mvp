const BaseService = require('./BaseService');
const { Plant, Device, DiagnosisCard, CareRecord, Message } = require('../models');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const EnvironmentService = require('./EnvironmentService');

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

      const latestDiagnosis = await DiagnosisCard.findOne({
        where: { plant_id: plantId },
        attributes: ['diagnosis_card_id', 'message_id', 'species', 'health_score', 'status', 'issues', 'suggestions', 'created_at'],
        order: [['created_at', 'DESC']],
      });

      const diagnosisHistory = await DiagnosisCard.findAll({
        where: { plant_id: plantId },
        attributes: ['diagnosis_card_id', 'message_id', 'species', 'health_score', 'status', 'issues', 'suggestions', 'created_at'],
        order: [['created_at', 'DESC']],
        limit: 10,
      });

      // 获取诊断卡片关联的 session_id
      const messageIds = [];
      if (latestDiagnosis && latestDiagnosis.messageId) {
        messageIds.push(latestDiagnosis.messageId);
      }
      diagnosisHistory.forEach(d => {
        if (d.messageId) messageIds.push(d.messageId);
      });

      const sessionIdMap = new Map();
      if (messageIds.length > 0) {
        const messages = await Message.findAll({
          where: { message_id: messageIds },
          attributes: ['message_id', 'session_id'],
        });
        messages.forEach(m => {
          sessionIdMap.set(m.messageId, m.sessionId);
        });
      }

      const careRecords = await CareRecord.findAll({
        where: { plant_id: plantId },
        attributes: ['record_id', 'action_type', 'description', 'performed_at', 'created_at'],
        order: [['performed_at', 'DESC']],
        limit: 10,
      });

      const environmentService = new EnvironmentService();
      const environmentData = await environmentService.getCurrentData(plantId);

      // 为诊断卡片添加 sessionId
      const addSessionId = (diagnosis) => {
        if (!diagnosis) return null;
        return {
          ...diagnosis.toJSON(),
          sessionId: sessionIdMap.get(diagnosis.messageId) || null
        };
      };

      return {
        plant,
        device,
        latestDiagnosis: addSessionId(latestDiagnosis),
        diagnosisHistory: diagnosisHistory.map(addSessionId),
        careRecords,
        environmentData,
      };
    } catch (err) {
      logger.error('PlantService.getPlantDetail error:', err);
      throw err;
    }
  }

  async updatePlant(plantId, userId, updateData) {
    try {
      const plant = await this.getPlantById(plantId, userId);
      if (!plant) return null;

      const allowedFields = [
        'nickname',
        'species',
        'plant_category',
        'cover_image_url',
        'current_device_id',
        'location_name',
        'location_code',
        'location_lat',
        'location_lng',
      ];

      const filteredData = {};
      allowedFields.forEach(field => {
        const camelField = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        if (updateData[camelField] !== undefined) {
          filteredData[field] = updateData[camelField];
        }
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      });

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

      await plant.destroy();
      logger.info(`Plant deleted: ${plantId}`);
      return true;
    } catch (err) {
      logger.error('PlantService.deletePlant error:', err);
      throw err;
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
