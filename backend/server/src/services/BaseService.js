const logger = require('../utils/logger');

class BaseService {
  constructor(model, modelName) {
    this.model = model;
    this.modelName = modelName;
  }

  async findById(id) {
    try {
      return await this.model.findByPk(id);
    } catch (err) {
      logger.error(`${this.modelName}.findById error:`, err);
      throw err;
    }
  }

  async findOne(conditions) {
    try {
      return await this.model.findOne({ where: conditions });
    } catch (err) {
      logger.error(`${this.modelName}.findOne error:`, err);
      throw err;
    }
  }

  async findAll(conditions = {}, options = {}) {
    try {
      return await this.model.findAll({
        where: conditions,
        ...options,
      });
    } catch (err) {
      logger.error(`${this.modelName}.findAll error:`, err);
      throw err;
    }
  }

  async create(data) {
    try {
      return await this.model.create(data);
    } catch (err) {
      logger.error(`${this.modelName}.create error:`, err);
      throw err;
    }
  }

  async update(id, data) {
    try {
      const record = await this.findById(id);
      if (!record) return null;
      return await record.update(data);
    } catch (err) {
      logger.error(`${this.modelName}.update error:`, err);
      throw err;
    }
  }

  async delete(id) {
    try {
      const record = await this.findById(id);
      if (!record) return null;
      await record.destroy();
      return true;
    } catch (err) {
      logger.error(`${this.modelName}.delete error:`, err);
      throw err;
    }
  }

  async paginate(conditions = {}, page = 1, pageSize = 20, options = {}) {
    try {
      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);
      const { count, rows } = await this.model.findAndCountAll({
        where: conditions,
        offset,
        limit,
        ...options,
      });
      return {
        total: count,
        page: parseInt(page),
        pageSize: limit,
        list: rows,
      };
    } catch (err) {
      logger.error(`${this.modelName}.paginate error:`, err);
      throw err;
    }
  }
}

module.exports = BaseService;
