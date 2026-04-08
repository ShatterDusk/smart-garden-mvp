const BaseService = require('./BaseService');
const { CareRecord, Plant } = require('../models');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class CareRecordService extends BaseService {
  constructor() {
    super(CareRecord, 'CareRecord');
  }

  generateRecordId() {
    return `CARE_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  }

  async createCareRecord(plantId, userId, recordData) {
    try {
      const plant = await Plant.findOne({
        where: { plant_id: plantId, user_id: userId },
      });

      if (!plant) {
        return null;
      }

      const recordId = this.generateRecordId();
      await this.create({
        record_id: recordId,
        plant_id: plantId,
        user_id: userId,
        action_type: recordData.actionType,
        description: recordData.description || '',
        images: recordData.images || null,
        performed_at: recordData.performedAt || new Date(),
      });

      // 重新获取并转换为 camelCase 返回
      const record = await this.getRecordById(recordId, userId);
      logger.info(`CareRecord created: ${recordId}`);
      return {
        recordId: record.recordId,
        plantId: record.plantId,
        userId: record.userId,
        actionType: record.actionType,
        description: record.description,
        images: record.images,
        performedAt: record.performedAt,
        createdAt: record.createdAt,
      };
    } catch (err) {
      logger.error('CareRecordService.createCareRecord error:', err);
      throw err;
    }
  }

  async getCareRecordList(userId, query = {}) {
    try {
      const { plantId, page = 1, pageSize = 20 } = query;
      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      const where = { user_id: userId };
      if (plantId) where.plant_id = plantId;

      const { count, rows: records } = await CareRecord.findAndCountAll({
        where,
        order: [['performed_at', 'DESC']],
        offset,
        limit,
      });

      // 转换为 camelCase 返回
      const formattedRecords = records.map(record => ({
        recordId: record.recordId,
        plantId: record.plantId,
        userId: record.userId,
        actionType: record.actionType,
        description: record.description,
        images: record.images,
        performedAt: record.performedAt,
        createdAt: record.createdAt,
      }));

      return { count, records: formattedRecords };
    } catch (err) {
      logger.error('CareRecordService.getCareRecordList error:', err);
      throw err;
    }
  }

  async getRecordById(recordId, userId) {
    try {
      return await this.findOne({ record_id: recordId, user_id: userId });
    } catch (err) {
      logger.error('CareRecordService.getRecordById error:', err);
      throw err;
    }
  }

  async updateCareRecord(recordId, userId, updateData) {
    try {
      const record = await this.getRecordById(recordId, userId);
      if (!record) return null;

      // camelCase -> snake_case 字段映射
      const fieldMapping = {
        actionType: 'action_type',
        description: 'description',
        images: 'images',
        performedAt: 'performed_at',
      };

      const filteredData = {};
      Object.keys(fieldMapping).forEach(camelField => {
        if (updateData[camelField] !== undefined) {
          filteredData[fieldMapping[camelField]] = updateData[camelField];
        }
      });

      if (Object.keys(filteredData).length === 0) {
        return record;
      }

      await record.update(filteredData);
      logger.info(`CareRecord updated: ${recordId}`);

      // 重新获取并转换为 camelCase 返回
      const updatedRecord = await this.getRecordById(recordId, userId);
      return {
        recordId: updatedRecord.recordId,
        plantId: updatedRecord.plantId,
        userId: updatedRecord.userId,
        actionType: updatedRecord.actionType,
        description: updatedRecord.description,
        images: updatedRecord.images,
        performedAt: updatedRecord.performedAt,
        createdAt: updatedRecord.createdAt,
      };
    } catch (err) {
      logger.error('CareRecordService.updateCareRecord error:', err);
      throw err;
    }
  }

  async deleteCareRecord(recordId, userId) {
    try {
      const record = await this.getRecordById(recordId, userId);
      if (!record) return false;

      await record.destroy();
      logger.info(`CareRecord deleted: ${recordId}`);
      return true;
    } catch (err) {
      logger.error('CareRecordService.deleteCareRecord error:', err);
      throw err;
    }
  }

  async getPlantsForRecords(plantIds) {
    try {
      if (!plantIds || plantIds.length === 0) return [];
      const plants = await Plant.findAll({
        where: { plant_id: plantIds },
        attributes: ['plant_id', 'nickname', 'cover_image_url'],
      });
      // 转换为 camelCase 返回
      return plants.map(plant => ({
        plantId: plant.plantId,
        nickname: plant.nickname,
        coverImageUrl: plant.coverImageUrl,
      }));
    } catch (err) {
      logger.error('CareRecordService.getPlantsForRecords error:', err);
      return [];
    }
  }
}

module.exports = CareRecordService;
