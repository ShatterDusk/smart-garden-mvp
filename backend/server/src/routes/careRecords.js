/**
 * 养护记录模块路由
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateBody, validateQuery } = require('../middleware/validator');
const careRecordController = require('../controllers/careRecordController');
const {
  getCareRecordsQuerySchema,
  createCareRecordSchema,
  updateCareRecordSchema,
} = require('../utils/validators');

router.get('/', authMiddleware, validateQuery(getCareRecordsQuerySchema), asyncHandler(careRecordController.getCareRecords));
router.post('/', authMiddleware, validateBody(createCareRecordSchema), asyncHandler(careRecordController.createCareRecord));
router.put('/:recordId', authMiddleware, validateBody(updateCareRecordSchema), asyncHandler(careRecordController.updateCareRecord));
router.delete('/:recordId', authMiddleware, asyncHandler(careRecordController.deleteCareRecord));

module.exports = router;
