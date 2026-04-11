/**
 * 设备模块路由
 * @note 绑定/解绑接口使用 POST，建议后续改为 PUT/DELETE 更符合 RESTful 规范
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { deviceAuthMiddleware } = require('../middleware/deviceAuth');
const { asyncHandler } = require('../middleware/errorHandler');
const deviceController = require('../controllers/deviceController');

// 设备数据上报（设备端调用，需要设备认证）
// 如需开放访问，可移除 deviceAuthMiddleware
router.post('/data', deviceAuthMiddleware, asyncHandler(deviceController.reportData));

// 以下接口需要用户认证
router.get('/', authMiddleware, asyncHandler(deviceController.getDevices));

/**
 * @route POST /api/devices/bind
 * @desc 绑定设备
 * @note 当前使用 POST，建议后续改为 PUT /api/devices/:deviceId/bind
 */
router.post('/bind', authMiddleware, asyncHandler(deviceController.bindDevice));

/**
 * @route POST /api/devices/unbind
 * @desc 解绑设备
 * @note 当前使用 POST，建议后续改为 DELETE /api/devices/:deviceId/bind
 */
router.post('/unbind', authMiddleware, asyncHandler(deviceController.unbindDevice));

router.get('/:deviceId', authMiddleware, asyncHandler(deviceController.getDeviceDetail));

module.exports = router;
