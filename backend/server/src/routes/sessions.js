/**
 * 会话模块路由
 * @note read/upgrade 动作型接口建议后续改为 PATCH /:sessionId 统一更新
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateBody, validateQuery } = require('../middleware/validator');
const sessionController = require('../controllers/sessionController');
const {
  createSessionSchema,
  getSessionsQuerySchema,
  sendMessageSchema,
  upgradeSessionSchema,
  getMessagesQuerySchema,
} = require('../utils/validators');

router.get('/', authMiddleware, validateQuery(getSessionsQuerySchema), asyncHandler(sessionController.getSessions));
router.post('/', authMiddleware, validateBody(createSessionSchema), asyncHandler(sessionController.createSession));
router.get('/:sessionId', authMiddleware, asyncHandler(sessionController.getSessionDetail));
router.put('/:sessionId', authMiddleware, asyncHandler(sessionController.updateSession));
router.get('/:sessionId/messages', authMiddleware, validateQuery(getMessagesQuerySchema), asyncHandler(sessionController.getMessages));
router.post('/:sessionId/messages', authMiddleware, validateBody(sendMessageSchema), asyncHandler(sessionController.sendMessage));

/**
 * @route POST /api/sessions/:sessionId/read
 * @desc 标记会话已读
 * @note 当前使用 POST，建议后续改为 PATCH /api/sessions/:sessionId (body: { isRead: true })
 */
router.post('/:sessionId/read', authMiddleware, asyncHandler(sessionController.markSessionAsRead));

/**
 * @route POST /api/sessions/:sessionId/upgrade
 * @desc 升级会话
 * @note 当前使用 POST，建议后续改为 PUT /api/sessions/:sessionId/upgrade
 */
router.post('/:sessionId/upgrade', authMiddleware, validateBody(upgradeSessionSchema), asyncHandler(sessionController.upgradeSession));

router.delete('/:sessionId', authMiddleware, asyncHandler(sessionController.deleteSession));

module.exports = router;
