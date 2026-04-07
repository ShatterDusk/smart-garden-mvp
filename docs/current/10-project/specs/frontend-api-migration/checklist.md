# 前端 Mock 数据脱耦 Checklist

## Phase 1: 核心页面迁移

- [ ] 首页 (index) 已迁移
  - [ ] mock-data 引用已移除
  - [ ] 使用 api.getPlantList() 获取数据
  - [ ] 加载状态显示正常
  - [ ] 错误处理正确

- [ ] 植物列表页 (plants) 已迁移
  - [ ] mock-data 引用已移除
  - [ ] 使用 api.getPlantList() 获取数据
  - [ ] 下拉刷新功能正常
  - [ ] 空状态显示正确

- [ ] 植物详情页 (plant-detail) 已迁移
  - [ ] mock-data 引用已移除
  - [ ] 使用 api.getPlantDetail() 获取数据
  - [ ] 操作按钮功能正常

## Phase 2: 会话相关页面迁移

- [ ] 会话列表页 (sessions) 已迁移
  - [ ] mock-data 引用已移除
  - [ ] 使用 api.getSessionList() 获取数据

- [ ] 植物会话页 (plant-sessions) 已迁移
  - [ ] mock-data 引用已移除
  - [ ] 使用 api.getSessionList() 获取数据

- [ ] 快速分析页 (quick-analyze) 已迁移
  - [ ] mock-data 引用已移除
  - [ ] 使用 api.analyze() 获取分析结果

- [ ] Q&A 页 (qna) 已迁移
  - [ ] mock-data 引用已移除
  - [ ] 会话相关 API 调用正常

## Phase 3: 设备和指标页面迁移

- [ ] 设备管理页 (device-manage) 已迁移
  - [ ] mock-data 引用已移除
  - [ ] 使用 api.getDeviceList() 获取数据

- [ ] 设备详情页 (device-detail) 已迁移
  - [ ] mock-data 引用已移除
  - [ ] 使用 api.getDeviceDetail() 获取数据

- [ ] 指标详情页 (metric-detail) 已迁移
  - [ ] mock-data 引用已移除
  - [ ] 使用 api.getMetricHistory() 获取数据

## Phase 4: 添加植物页面迁移

- [ ] 添加植物页 (add-plant) 已迁移
  - [ ] mock-data 引用已移除
  - [ ] 使用 api.addPlant() 创建植物

## 验收标准

- [ ] 所有页面不再依赖 mock-data
- [ ] 所有页面使用 api.js 调用后端
- [ ] 加载状态正确显示
- [ ] 错误处理正确
- [ ] 页面功能正常
