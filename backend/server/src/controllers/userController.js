/**
 * 用户模块控制器
 * 处理用户相关的请求响应
 */

const { UserService } = require('../services');
const { Plant, Device } = require('../models');
const { generateToken } = require('../middleware/auth');
const wechatAuthService = require('../services/WechatAuthService');
const logger = require('../utils/logger');

const userService = new UserService();

/**
 * 微信登录
 * POST /api/users/login
 */
async function login(req, res, next) {
  try {
    const { code, nickname, avatarUrl, gender } = req.body;

    if (!code) {
      return res.error('缺少登录凭证 code', 400, 400);
    }

    // 调用微信认证服务获取 openid
    const { openid, sessionKey, unionid, isMock } = await wechatAuthService.code2Session(code);

    if (!openid) {
      return res.error('获取用户身份失败', 500, 500);
    }

    // 创建或更新用户
    const { isNew, user } = await userService.createUser(openid, {
      nickname,
      avatarUrl,
    });

    if (isNew) {
      await userService.createDefaultConfig(user.user_id);
      logger.info(`新用户创建: ${user.user_id}, 模式: ${isMock ? '开发者模式' : '生产模式'}`);
    } else {
      if (nickname || avatarUrl) {
        await user.update({
          nickname: nickname || user.nickname,
          avatar_url: avatarUrl || user.avatar_url,
          last_login_at: new Date(),
        });
      } else {
        await user.update({ last_login_at: new Date() });
      }
    }

    const token = generateToken({
      user_id: user.user_id,
      openid: user.wx_openid,
    });

    res.success({
      token,
      expiresIn: 604800,
      user: {
        userId: user.user_id,
        nickname: user.nickname,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
      },
      mode: isMock ? 'developer' : 'production',
    }, isMock ? '登录成功（开发者模式）' : '登录成功');
  } catch (error) {
    next(error);
  }
}

/**
 * 游客登录
 * POST /api/users/guest-login
 */
async function guestLogin(req, res, next) {
  try {
    const user = await userService.createGuestUser();
    await userService.createDefaultConfig(user.user_id);

    logger.info(`游客用户创建: ${user.user_id}`);

    const token = generateToken({
      user_id: user.user_id,
      openid: null,
    });

    res.success({
      token,
      expiresIn: 604800,
      user: {
        userId: user.user_id,
        nickname: user.nickname,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
      },
    }, '游客登录成功');
  } catch (error) {
    next(error);
  }
}

/**
 * 获取用户信息
 * GET /api/users/profile
 */
async function getProfile(req, res, next) {
  try {
    const { userId } = req.user;
    const { include } = req.query;

    const user = await userService.getUserEntity(userId);
    if (!user) {
      return res.error('用户不存在', 404, 404);
    }

    const plantCount = await Plant.count({ where: { user_id: userId } });
    const deviceCount = await Device.count({ where: { user_id: userId } });

    const result = {
      userId: user.user_id,
      nickname: user.nickname,
      avatarUrl: user.avatar_url,
      plantCount: plantCount,
      deviceCount: deviceCount,
      createdAt: user.created_at,
    };

    if (include === 'dashboard') {
      const plants = await Plant.findAll({
        where: { user_id: userId },
        attributes: ['plant_id', 'nickname', 'cover_image_url', 'plant_category'],
        order: [['updated_at', 'DESC']],
        limit: 5,
      });

      const onlineCount = await Device.count({ where: { user_id: userId, status: 'online' } });
      const offlineCount = await Device.count({ where: { user_id: userId, status: 'offline' } });
      const unboundCount = await Device.count({ where: { user_id: userId, status: 'unbound' } });

      result.dashboard = {
        plantStats: {
          total: plantCount,
          healthy: plantCount,
          warning: 0,
          critical: 0,
          pendingTasks: 0,
        },
        deviceStats: {
          online: onlineCount,
          offline: offlineCount,
          unbound: unboundCount,
        },
        recentPlants: plants.map(p => ({
          plantId: p.plant_id,
          nickname: p.nickname,
          coverImageUrl: p.cover_image_url,
          plantCategory: p.plant_category,
        })),
        dailyTip: getDailyTip(),
      };
    }

    res.success(result);
  } catch (error) {
    next(error);
  }
}

/**
 * 更新用户信息
 * PUT /api/users/profile
 */
async function updateProfile(req, res, next) {
  try {
    const { userId } = req.user;
    const { nickname, avatarUrl } = req.body;

    const user = await userService.getUserEntity(userId);
    if (!user) {
      return res.error('用户不存在', 404, 404);
    }

    const updateData = {};
    if (nickname !== undefined) updateData.nickname = nickname;
    if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl;
    updateData.updated_at = new Date();

    await user.update(updateData);

    res.success({
      userId: user.user_id,
      nickname: user.nickname,
      avatarUrl: user.avatar_url,
      updatedAt: user.updated_at,
    }, '更新成功');
  } catch (error) {
    next(error);
  }
}

/**
 * 获取用户设置
 * GET /api/users/settings
 */
async function getSettings(req, res, next) {
  try {
    const { userId } = req.user;
    const settings = await userService.getSettings(userId);
    res.success(settings);
  } catch (error) {
    next(error);
  }
}

/**
 * 更新用户设置
 * PUT /api/users/settings
 */
async function updateSettings(req, res, next) {
  try {
    const { userId } = req.user;
    const { notification, preferences } = req.body;

    const result = await userService.updateSettings(userId, {
      notification,
      preferences,
    });

    res.success(result, '设置更新成功');
  } catch (error) {
    next(error);
  }
}

/**
 * 获取每日养护小贴士
 */
function getDailyTip() {
  const tips = [
    { season: 'spring', content: '春季是植物生长旺季，记得增加浇水频率，但避免积水。' },
    { season: 'spring', content: '春季适合给植物换盆，选择比原盆大一号的花盆。' },
    { season: 'summer', content: '夏季高温，避免正午浇水，选择清晨或傍晚。' },
    { season: 'summer', content: '夏季光照强烈，注意给喜阴植物遮阴。' },
    { season: 'autumn', content: '秋季气温下降，逐渐减少浇水频率。' },
    { season: 'autumn', content: '秋季是施肥的好时机，为植物过冬储备养分。' },
    { season: 'winter', content: '冬季植物休眠，减少浇水，保持土壤微干。' },
    { season: 'winter', content: '冬季注意防寒，避免植物受冻。' },
    { season: 'all', content: '定期检查植物叶片，发现病虫害及时处理。' },
    { season: 'all', content: '保持通风良好，可以预防很多植物疾病。' },
  ];

  const now = new Date();
  const month = now.getMonth() + 1;

  let season;
  if (month >= 3 && month <= 5) season = 'spring';
  else if (month >= 6 && month <= 8) season = 'summer';
  else if (month >= 9 && month <= 11) season = 'autumn';
  else season = 'winter';

  const seasonTips = tips.filter(tip => tip.season === season || tip.season === 'all');
  const randomIndex = Math.floor(Math.random() * seasonTips.length);
  return seasonTips[randomIndex].content;
}

/**
 * 获取用户配置项
 * GET /api/users/config/:configKey
 */
async function getConfig(req, res, next) {
  try {
    const { userId } = req.user;
    const { configKey } = req.params;

    const config = await userService.getConfig(userId, configKey);

    if (!config) {
      return res.success({
        configKey: configKey,
        configValue: null,
        configType: 'preference',
      });
    }

    res.success(config);
  } catch (error) {
    next(error);
  }
}

/**
 * 设置用户配置项
 * POST /api/users/config
 */
async function setConfig(req, res, next) {
  try {
    const { userId } = req.user;
    const { configKey, configValue, configType = 'preference' } = req.body;

    if (!configKey) {
      return res.error('configKey 不能为空', 400, 400);
    }

    const result = await userService.setConfig(userId, configKey, configValue, configType);
    res.success(result);
  } catch (error) {
    next(error);
  }
}

/**
 * 获取登录模式信息
 * GET /api/users/auth-mode
 */
async function getAuthMode(req, res, next) {
  try {
    const modeInfo = wechatAuthService.getModeInfo();
    res.success(modeInfo);
  } catch (error) {
    next(error);
  }
}

/**
 * 通过 OpenID 直接登录（开发者模式）
 * POST /api/users/login-by-openid
 */
async function loginByOpenid(req, res, next) {
  try {
    const { openid, nickname, avatarUrl } = req.body;

    if (!openid) {
      return res.error('缺少 openid 参数', 400, 400);
    }

    // 检查 openid 是否为开发者模式格式
    if (!openid.startsWith('dev_') && !openid.startsWith('wx_')) {
      return res.error('无效的 openid 格式', 400, 400);
    }

    // 查找或创建用户
    let user = await userService.getUserByOpenId(openid);

    if (user) {
      // 用户已存在，更新登录时间
      await user.update({ last_login_at: new Date() });
      logger.info(`OpenID 登录（已存在用户）: ${user.user_id}`);
    } else {
      // 新用户
      const result = await userService.createUser(openid, { nickname, avatarUrl });
      user = result.user;
      await userService.createDefaultConfig(user.user_id);
      logger.info(`OpenID 登录（新用户创建）: ${user.user_id}`);
    }

    const token = generateToken({
      user_id: user.user_id,
      openid: user.wx_openid,
    });

    res.success({
      token,
      expiresIn: 604800,
      user: {
        userId: user.user_id,
        nickname: user.nickname,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
      },
      mode: 'developer',
    }, '登录成功（OpenID 直连）');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  guestLogin,
  getProfile,
  updateProfile,
  getSettings,
  updateSettings,
  getConfig,
  setConfig,
  getAuthMode,
  loginByOpenid,
};
