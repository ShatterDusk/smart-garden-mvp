/**
 * 用户模块路由
 * 定义用户相关的 API 端点
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateBody } = require('../middleware/validator');
const userController = require('../controllers/userController');
const {
  userLoginSchema,
  updateProfileSchema,
  updateSettingsSchema,
} = require('../utils/validators');

// POST /api/users/login - 用户登录
router.post('/login', validateBody(userLoginSchema), asyncHandler(userController.login));

// POST /api/users/guest-login - 游客登录
router.post('/guest-login', asyncHandler(userController.guestLogin));

// GET /api/users/auth-mode - 获取登录模式
router.get('/auth-mode', asyncHandler(userController.getAuthMode));

// POST /api/users/login-by-openid - 通过 OpenID 直接登录（开发者模式）
router.post('/login-by-openid', asyncHandler(userController.loginByOpenid));

// GET /api/users/profile - 获取用户信息
router.get('/profile', authMiddleware, asyncHandler(userController.getProfile));

// PUT /api/users/profile - 更新用户信息
router.put('/profile', authMiddleware, validateBody(updateProfileSchema), asyncHandler(userController.updateProfile));

// GET /api/users/settings - 获取用户设置
router.get('/settings', authMiddleware, asyncHandler(userController.getSettings));

// PUT /api/users/settings - 更新用户设置
router.put('/settings', authMiddleware, validateBody(updateSettingsSchema), asyncHandler(userController.updateSettings));

// GET /api/users/config/:configKey - 获取用户配置项
router.get('/config/:configKey', authMiddleware, asyncHandler(userController.getConfig));

// POST /api/users/config - 设置用户配置项
router.post('/config', authMiddleware, asyncHandler(userController.setConfig));

module.exports = router;
