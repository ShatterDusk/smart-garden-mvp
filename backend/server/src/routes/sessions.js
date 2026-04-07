/**
 * 会话模块路由
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
router.post('/:sessionId/read', authMiddleware, asyncHandler(sessionController.markSessionAsRead));
router.post('/:sessionId/upgrade', authMiddleware, validateBody(upgradeSessionSchema), asyncHandler(sessionController.upgradeSession));
router.delete('/:sessionId', authMiddleware, asyncHandler(sessionController.deleteSession));

module.exports = router;
