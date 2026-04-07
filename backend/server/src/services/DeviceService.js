const BaseService = require('./BaseService');
const { Device, Plant } = require('../models');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const EnvironmentService = require('./EnvironmentService');

class DeviceService extends BaseService {
  constructor() {
    super(Device, 'Device');
  }

  generateDeviceId() {
    return `DEVICE_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  }

  async getBoundPlant(deviceId) {
    try {
      return await Plant.findOne({
        where: { current_device_id: deviceId },
        attributes: ['plant_id', 'nickname', 'cover_image_url', 'species'],
      });
    } catch (err) {
      logger.error('DeviceService.getBoundPlant error:', err);
      return null;
    }
  }

  async bindDevice(userId, bindData) {
    try {
      const { macAddress, deviceName, plantId } = bindData;

      let device = await this.findOne({ mac_address: macAddress });

      if (!device) {
        device = await this.create({
          device_id: this.generateDeviceId(),
          user_id: userId,
          mac_address: macAddress,
          device_name: deviceName || `设备_${macAddress.slice(-4)}`,
          status: 'online',
          battery_level: 100,
          last_heartbeat: new Date(),
        });
      } else {
        await device.update({
          user_id: userId,
          device_name: deviceName || device.deviceName,
          status: 'online',
        });
      }

      if (plantId) {
        const existingPlant = await Plant.findOne({
          where: { current_device_id: device.deviceId },
        });
        if (existingPlant && existingPlant.plantId !== plantId) {
          await existingPlant.update({ current_device_id: null });
        }

        await Plant.update(
          { current_device_id: device.deviceId },
          { where: { plant_id: plantId, user_id: userId } }
        );
      }

      logger.info(`Device bound: ${macAddress} -> plant: ${plantId}`);
      return device;
    } catch (err) {
      logger.error('DeviceService.bindDevice error:', err);
      throw err;
    }
  }

  async unbindDevice(deviceId, userId) {
    try {
      const device = await this.findOne({ device_id: deviceId, user_id: userId });
      if (!device) return null;

      const boundPlant = await this.getBoundPlant(deviceId);
      if (boundPlant) {
        await boundPlant.update({ current_device_id: null });
      }

      await device.update({
        status: 'unbound',
      });

      logger.info(`Device unbound: ${deviceId}`);
      return device;
    } catch (err) {
      logger.error('DeviceService.unbindDevice error:', err);
      throw err;
    }
  }

  async getDeviceList(userId) {
    try {
      return await this.findAll({ user_id: userId }, { order: [['created_at', 'DESC']] });
    } catch (err) {
      logger.error('DeviceService.getDeviceList error:', err);
      throw err;
    }
  }

  async getDeviceById(deviceId, userId = null) {
    try {
      const where = { device_id: deviceId };
      if (userId) {
        where.user_id = userId;
      }
      return await this.findOne(where);
    } catch (err) {
      logger.error('DeviceService.getDeviceById error:', err);
      throw err;
    }
  }

  async getDeviceByMac(macAddress) {
    try {
      return await this.findOne({ mac_address: macAddress });
    } catch (err) {
      logger.error('DeviceService.getDeviceByMac error:', err);
      throw err;
    }
  }

  async updateDeviceStatus(deviceId, status, batteryLevel = null) {
    try {
      const device = await this.findById(deviceId);
      if (!device) return null;

      const updateData = {
        status,
        last_heartbeat: new Date(),
      };

      if (batteryLevel !== null) {
        updateData.battery_level = batteryLevel;
      }

      await device.update(updateData);
      return device;
    } catch (err) {
      logger.error('DeviceService.updateDeviceStatus error:', err);
      throw err;
    }
  }

  async getPlantsForDevices(plantIds) {
    try {
      if (!plantIds || plantIds.length === 0) return [];
      return await Plant.findAll({
        where: { plant_id: plantIds },
        attributes: ['plant_id', 'nickname', 'cover_image_url', 'species'],
      });
    } catch (err) {
      logger.error('DeviceService.getPlantsForDevices error:', err);
      return [];
    }
  }

  async reportDeviceData(reportData) {
    try {
      const { deviceId, plantId, timestamp, metrics, isSupplement } = reportData;

      const device = await this.getDeviceById(deviceId);
      if (!device) {
        return { error: '设备不存在', code: 404 };
      }

      let targetPlantId = plantId;
      if (!targetPlantId) {
        const boundPlant = await this.getBoundPlant(deviceId);
        if (boundPlant) {
          targetPlantId = boundPlant.plantId;
        }
      }

      if (!targetPlantId) {
        return { error: '设备未绑定植物', code: 400 };
      }

      const plant = await Plant.findOne({ where: { plant_id: targetPlantId } });
      if (!plant) {
        return { error: '植物不存在', code: 404 };
      }

      const environmentService = new EnvironmentService();
      const formattedMetrics = Object.entries(metrics)
        .filter(([code]) => code !== 'battery_level')
        .map(([metricCode, value]) => ({ metricCode, value }));

      const uploadResult = await environmentService.processDeviceEnvironmentData(targetPlantId, {
        deviceId,
        recordedAt: timestamp || new Date().toISOString(),
        metrics: formattedMetrics,
        isSupplement: isSupplement || false,
      });

      if (uploadResult.error) {
        return uploadResult;
      }

      const updateData = {
        status: 'online',
        last_heartbeat: new Date(),
      };

      if (metrics.battery_level !== undefined) {
        updateData.battery_level = metrics.battery_level;
      }

      await device.update(updateData);

      logger.info('设备数据上报成功', {
        deviceId,
        plantId: targetPlantId,
        readingId: uploadResult.readingId,
        isSupplement: uploadResult.isSupplement,
      });

      return {
        readingId: uploadResult.readingId,
        plantId: targetPlantId,
        recordedAt: uploadResult.recordedAt || timestamp,
        isSupplement: uploadResult.isSupplement,
        isStale: uploadResult.isStale,
        message: uploadResult.message,
      };
    } catch (err) {
      logger.error('DeviceService.reportDeviceData error:', err);
      throw err;
    }
  }
}

module.exports = DeviceService;
