/**
 * 微信认证服务
 * 支持开发者模式和生产模式
 */

const axios = require('axios');
const logger = require('../utils/logger');

class WechatAuthService {
  constructor() {
    this.appId = process.env.WECHAT_APPID || '';
    this.secret = process.env.WECHAT_SECRET || '';
    this.isDevMode = process.env.WECHAT_DEV_MODE === 'true' || !this.appId || !this.secret;
  }

  /**
   * 判断是否为开发者模式
   */
  isDeveloperMode() {
    return this.isDevMode;
  }

  /**
   * 获取登录模式说明
   */
  getModeInfo() {
    if (this.isDevMode) {
      return {
        mode: 'developer',
        message: '当前使用开发者模式登录（模拟微信登录）',
        note: '如需真实微信登录，请配置 WECHAT_APPID 和 WECHAT_SECRET 环境变量',
      };
    }
    return {
      mode: 'production',
      message: '当前使用生产模式登录（真实微信接口）',
    };
  }

  /**
   * 微信 code 换 session
   * @param {string} code - 微信登录凭证
   * @returns {Promise<{openid: string, sessionKey: string, unionid?: string}>}
   */
  async code2Session(code) {
    // 开发者模式：模拟微信登录
    if (this.isDevMode) {
      logger.info('[WechatAuthService] 使用开发者模式登录');
      return this._mockCode2Session(code);
    }

    // 生产模式：调用真实微信接口
    return this._realCode2Session(code);
  }

  /**
   * 开发者模式：模拟 code2session
   * 基于 code 生成稳定的 openid，确保同一用户每次登录得到相同的 openid
   */
  _mockCode2Session(code) {
    // 使用 code 生成稳定的 openid（同一 code 始终生成相同的 openid）
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(code).digest('hex');
    const openid = `dev_${hash.substring(0, 28)}`;
    const sessionKey = crypto.createHash('sha256').update(code + 'session').digest('hex').substring(0, 24);

    logger.info(`[WechatAuthService] 开发者模式生成用户: ${openid}`);

    return {
      openid,
      sessionKey,
      unionid: null,
      isMock: true,
    };
  }

  /**
   * 生产模式：调用微信真实接口
   */
  async _realCode2Session(code) {
    const url = 'https://api.weixin.qq.com/sns/jscode2session';
    const params = {
      appid: this.appId,
      secret: this.secret,
      js_code: code,
      grant_type: 'authorization_code',
    };

    try {
      logger.info('[WechatAuthService] 调用微信 code2session 接口');
      const response = await axios.get(url, { params, timeout: 10000 });
      const data = response.data;

      if (data.errcode) {
        logger.error(`[WechatAuthService] 微信接口错误: ${data.errcode} - ${data.errmsg}`);
        throw new Error(`微信登录失败: ${data.errmsg}`);
      }

      return {
        openid: data.openid,
        sessionKey: data.session_key,
        unionid: data.unionid || null,
        isMock: false,
      };
    } catch (error) {
      logger.error('[WechatAuthService] 调用微信接口失败:', error.message);
      throw new Error('微信登录服务暂时不可用，请稍后重试');
    }
  }

  /**
   * 解密微信加密数据（如手机号）
   * @param {string} sessionKey - 会话密钥
   * @param {string} encryptedData - 加密数据
   * @param {string} iv - 加密算法的初始向量
   */
  decryptData(sessionKey, encryptedData, iv) {
    const crypto = require('crypto');

    try {
      const sessionKeyBuffer = Buffer.from(sessionKey, 'base64');
      const encryptedBuffer = Buffer.from(encryptedData, 'base64');
      const ivBuffer = Buffer.from(iv, 'base64');

      const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKeyBuffer, ivBuffer);
      decipher.setAutoPadding(true);

      let decoded = decipher.update(encryptedBuffer, 'binary', 'utf8');
      decoded += decipher.final('utf8');

      const data = JSON.parse(decoded);
      return data;
    } catch (error) {
      logger.error('[WechatAuthService] 解密数据失败:', error.message);
      throw new Error('数据解密失败');
    }
  }

  /**
   * 获取微信 access_token（用于调用其他微信接口）
   */
  async getAccessToken() {
    if (this.isDevMode) {
      return { access_token: 'dev_mode_token', expires_in: 7200 };
    }

    const url = 'https://api.weixin.qq.com/cgi-bin/token';
    const params = {
      grant_type: 'client_credential',
      appid: this.appId,
      secret: this.secret,
    };

    const response = await axios.get(url, { params, timeout: 10000 });
    return response.data;
  }
}

module.exports = new WechatAuthService();
