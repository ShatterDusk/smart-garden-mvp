const BaseService = require('./BaseService');
const { User, UserConfig } = require('../models');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class UserService extends BaseService {
  constructor() {
    super(User, 'User');
  }

  generateUserId(prefix = 'USER') {
    return `${prefix}_${uuidv4().split('-')[0].toUpperCase()}`;
  }

  generateConfigId() {
    return `CFG_${uuidv4().split('-')[0].toUpperCase()}`;
  }

  async createUser(openId, userInfo = {}) {
    try {
      let user = await this.findOne({ wx_openid: openId });
      if (user) {
        if (user.status === 'active') {
          await user.update({ last_login_at: new Date() });
        }
        return { isNew: false, user };
      }

      const userId = this.generateUserId();
      user = await this.create({
        user_id: userId,
        wx_openid: openId,
        nickname: userInfo.nickname || '植物爱好者',
        avatar_url: userInfo.avatarUrl || '',
        role: 'user',
        status: 'active',
        last_login_at: new Date(),
      });

      logger.info(`User created: ${userId}`);
      return { isNew: true, user };
    } catch (err) {
      logger.error('UserService.createUser error:', err);
      throw err;
    }
  }

  async createGuestUser() {
    try {
      const userId = this.generateUserId('GUEST');
      const user = await this.create({
        user_id: userId,
        wx_openid: null,
        nickname: '游客用户',
        avatar_url: '',
        role: 'user',
        status: 'active',
        last_login_at: new Date(),
      });

      logger.info(`Guest user created: ${userId}`);
      return user;
    } catch (err) {
      logger.error('UserService.createGuestUser error:', err);
      throw err;
    }
  }

  async getUserById(userId) {
    try {
      const user = await this.findById(userId);
      if (!user) {
        return null;
      }
      return {
        userId: user.userId,
        openId: user.wxOpenid,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        role: user.role,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      };
    } catch (err) {
      logger.error('UserService.getUserById error:', err);
      throw err;
    }
  }

  async getUserEntity(userId) {
    return await this.findById(userId);
  }

  async updateUser(userId, updateData) {
    try {
      const user = await this.findById(userId);
      if (!user) {
        return null;
      }

      // camelCase -> snake_case 字段映射
      const fieldMapping = {
        nickname: 'nickname',
        avatarUrl: 'avatar_url',
      };

      const filteredData = {};
      Object.keys(fieldMapping).forEach(camelField => {
        if (updateData[camelField] !== undefined) {
          filteredData[fieldMapping[camelField]] = updateData[camelField];
        }
      });

      if (Object.keys(filteredData).length === 0) {
        return this.getUserById(userId);
      }

      await user.update(filteredData);
      logger.info(`User updated: ${userId}`);
      return this.getUserById(userId);
    } catch (err) {
      logger.error('UserService.updateUser error:', err);
      throw err;
    }
  }

  async updateUserLoginTime(userId) {
    try {
      const user = await this.findById(userId);
      if (user) {
        await user.update({ last_login_at: new Date() });
      }
    } catch (err) {
      logger.error('UserService.updateUserLoginTime error:', err);
    }
  }

  async getUserByOpenId(openId) {
    try {
      return await this.findOne({ wx_openid: openId });
    } catch (err) {
      logger.error('UserService.getUserByOpenId error:', err);
      throw err;
    }
  }

  async createDefaultConfig(userId) {
    try {
      await UserConfig.create({
        config_id: this.generateConfigId(),
        user_id: userId,
        config_key: 'notification_settings',
        config_value: {
          diagnosis_reminder: true,
          care_reminder: true,
          environment_alert: true,
          reminder_time: '09:00',
        },
        config_type: 'setting',
      });
      logger.info(`Default config created for user: ${userId}`);
    } catch (err) {
      logger.error('UserService.createDefaultConfig error:', err);
      throw err;
    }
  }

  async getConfig(userId, configKey) {
    try {
      const config = await UserConfig.findOne({
        where: { user_id: userId, config_key: configKey },
      });
      if (!config) {
        return null;
      }
      return {
        configKey: config.configKey,
        configValue: config.configValue,
        configType: config.configType,
      };
    } catch (err) {
      logger.error('UserService.getConfig error:', err);
      throw err;
    }
  }

  async setConfig(userId, configKey, configValue, configType = 'preference') {
    try {
      const [config, created] = await UserConfig.findOrCreate({
        where: { user_id: userId, config_key: configKey },
        defaults: {
          config_id: this.generateConfigId(),
          user_id: userId,
          config_key: configKey,
          config_value: configValue,
          config_type: configType,
        },
      });

      if (!created) {
        await config.update({
          config_value: configValue,
          config_type: configType,
        });
      }

      return {
        configKey: config.configKey,
        configValue: config.configValue,
        configType: config.configType,
      };
    } catch (err) {
      logger.error('UserService.setConfig error:', err);
      throw err;
    }
  }

  async getSettings(userId) {
    try {
      const notificationConfig = await UserConfig.findOne({
        where: { user_id: userId, config_key: 'notification_settings' },
      });

      const preferenceConfig = await UserConfig.findOne({
        where: { user_id: userId, config_key: 'preference_settings' },
      });

      return {
        notification: notificationConfig?.configValue || {
          diagnosisReminder: true,
          careReminder: true,
          environmentAlert: true,
          reminderTime: '09:00',
        },
        preferences: preferenceConfig?.configValue || {
          language: 'zh-CN',
        },
      };
    } catch (err) {
      logger.error('UserService.getSettings error:', err);
      throw err;
    }
  }

  async updateSettings(userId, settings) {
    try {
      const result = {
        notification: null,
        preferences: null,
        updatedAt: new Date().toISOString(),
      };

      if (settings.notification) {
        const [notificationConfig] = await UserConfig.findOrCreate({
          where: { user_id: userId, config_key: 'notification_settings' },
          defaults: {
            config_id: this.generateConfigId(),
            user_id: userId,
            config_key: 'notification_settings',
            config_type: 'setting',
            config_value: settings.notification,
          },
        });

        if (!notificationConfig._options.isNewRecord) {
          await notificationConfig.update({
            config_value: settings.notification,
          });
        }

        result.notification = notificationConfig.configValue;
      }

      if (settings.preferences) {
        const [preferenceConfig] = await UserConfig.findOrCreate({
          where: { user_id: userId, config_key: 'preference_settings' },
          defaults: {
            config_id: this.generateConfigId(),
            user_id: userId,
            config_key: 'preference_settings',
            config_type: 'preference',
            config_value: settings.preferences,
          },
        });

        if (!preferenceConfig._options.isNewRecord) {
          await preferenceConfig.update({
            config_value: settings.preferences,
          });
        }

        result.preferences = preferenceConfig.configValue;
      }

      return result;
    } catch (err) {
      logger.error('UserService.updateSettings error:', err);
      throw err;
    }
  }
}

module.exports = UserService;
