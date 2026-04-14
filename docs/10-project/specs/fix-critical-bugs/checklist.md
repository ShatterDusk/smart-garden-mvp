# 关键 Bug 修复检查清单

## 数据库修复

- [x] environment_metrics 表已插入 13 条指标定义数据
- [x] 验证 SQL: `SELECT COUNT(*) FROM environment_metrics;` 返回 13
- [x] 指标数据包含 temperature, humidity, light_intensity 等常用指标

## 后端代码修复

- [x] sessionController.js 已导入 `const { Op } = require('sequelize');`
- [x] upgradeSession 函数使用 `[Op.in]` 语法替代错误的 `in` 语法
- [x] 诊断卡关联逻辑先查询消息 ID 列表再执行更新
- [x] 修复后的代码无 SQL 注入风险

## 功能验证

- [ ] 后端服务启动成功，无语法错误
- [ ] 环境数据 API 可正常查询指标定义
- [ ] 会话升级 API 可正常调用
- [ ] 升级后会话类型变更为 plant
- [ ] 升级后诊断卡正确关联到植物（plant_id 已更新）

## 相关 Spec 更新

- [x] implement-environment-data checklist 已更新
- [x] supplement-api checklist 已更新
