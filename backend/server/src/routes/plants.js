/**
 * 植物模块路由
 * 定义植物相关的 API 端点
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate, validateBody, validateQuery } = require('../middleware/validator');
const plantController = require('../controllers/plantController');
const {
  createPlantSchema,
  updatePlantSchema,
  getPlantsQuerySchema,
} = require('../utils/validators');

// GET /api/plants - 获取植物列表
router.get('/', authMiddleware, validateQuery(getPlantsQuerySchema), asyncHandler(plantController.getPlants));

// POST /api/plants - 创建植物
router.post('/', authMiddleware, validateBody(createPlantSchema), asyncHandler(plantController.createPlant));

// GET /api/plants/:plantId - 获取植物详情
router.get('/:plantId', authMiddleware, asyncHandler(plantController.getPlantDetail));

// PUT /api/plants/:plantId - 更新植物
router.put('/:plantId', authMiddleware, validateBody(updatePlantSchema), asyncHandler(plantController.updatePlant));

// DELETE /api/plants/:plantId - 删除植物
router.delete('/:plantId', authMiddleware, asyncHandler(plantController.deletePlant));

module.exports = router;
