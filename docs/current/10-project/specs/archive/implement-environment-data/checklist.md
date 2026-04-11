# Checklist

## 后端实现
- [x] `server/src/controllers/environmentController.js` 文件已创建
- [x] `getMetricHistory` 方法正确返回历史数据点列表
- [x] `getCurrentEnvironment` 方法正确返回实时环境数据
- [x] `server/src/routes/environment.js` 文件已创建
- [x] 路由 `GET /api/metrics/history` 已注册
- [x] 路由 `GET /api/environment/current` 已注册
- [x] 路由已在 `app.js` 中注册

## 数据初始化
- [x] `environment_metrics` 表已填充指标数据
- [x] 包含 temperature, humidity, light_intensity, soil_moisture, soil_temperature 等指标

## 文档更新
- [x] API 设计文档已更新环境数据接口定义
- [x] 项目架构文档已记录新增模块

## 功能验证
- [x] 控制器方法已导出 (`getMetricHistory`, `getCurrentEnvironment`)
- [x] 后端服务器启动成功
- [ ] `GET /api/metrics/history` 接口返回正确格式数据（需在微信开发者工具测试）
- [ ] `GET /api/environment/current` 接口返回正确格式数据（需在微信开发者工具测试）
- [ ] 前端 metric-detail 页面能正常获取数据（需在微信开发者工具测试）
