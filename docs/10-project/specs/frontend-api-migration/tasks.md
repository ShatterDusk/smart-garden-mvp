# Tasks

## Phase 1: 核心页面迁移

- [ ] Task 1: 首页 (index) 迁移
  - [ ] SubTask 1.1: 移除 mock-data 引用
  - [ ] SubTask 1.2: 使用 api.getPlantList() 获取植物列表
  - [ ] SubTask 1.3: 添加加载状态和错误处理

- [ ] Task 2: 植物列表页 (plants) 迁移
  - [ ] SubTask 2.1: 移除 mock-data 引用
  - [ ] SubTask 2.2: 使用 api.getPlantList() 获取数据
  - [ ] SubTask 2.3: 添加下拉刷新功能

- [ ] Task 3: 植物详情页 (plant-detail) 迁移
  - [ ] SubTask 3.1: 移除 mock-data 引用
  - [ ] SubTask 3.2: 使用 api.getPlantDetail() 获取数据
  - [ ] SubTask 3.3: 添加操作按钮功能

## Phase 2: 会话相关页面迁移

- [ ] Task 4: 会话列表页 (sessions) 迁移
  - [ ] SubTask 4.1: 移除 mock-data 引用
  - [ ] SubTask 4.2: 使用 api.getSessionList() 获取数据

- [ ] Task 5: 植物会话页 (plant-sessions) 迁移
  - [ ] SubTask 5.1: 移除 mock-data 引用
  - [ ] SubTask 5.2: 使用 api.getSessionList() 获取数据

- [ ] Task 6: 快速分析页 (quick-analyze) 迁移
  - [ ] SubTask 6.1: 移除 mock-data 引用
  - [ ] SubTask 6.2: 使用 api.analyze() 获取分析结果

- [ ] Task 7: Q&A 页 (qna) 迁移
  - [ ] SubTask 7.1: 移除 mock-data 引用
  - [ ] SubTask 7.2: 使用会话相关 API

## Phase 3: 设备和指标页面迁移

- [ ] Task 8: 设备管理页 (device-manage) 迁移
  - [ ] SubTask 8.1: 移除 mock-data 引用
  - [ ] SubTask 8.2: 使用 api.getDeviceList() 获取数据

- [ ] Task 9: 设备详情页 (device-detail) 迁移
  - [ ] SubTask 9.1: 移除 mock-data 引用
  - [ ] SubTask 9.2: 使用 api.getDeviceDetail() 获取数据

- [ ] Task 10: 指标详情页 (metric-detail) 迁移
  - [ ] SubTask 10.1: 移除 mock-data 引用
  - [ ] SubTask 10.2: 使用 api.getMetricHistory() 获取数据

## Phase 4: 添加植物页面迁移

- [ ] Task 11: 添加植物页 (add-plant) 迁移
  - [ ] SubTask 11.1: 移除 mock-data 引用
  - [ ] SubTask 11.2: 使用 api.addPlant() 创建植物

# Task Dependencies

- [Task 2] 依赖 [Task 1] (共享迁移模式)
- [Task 3] 依赖 [Task 2]
- [Task 4-11] 无依赖，可并行执行

# Parallelizable Tasks

以下任务可以并行执行：
- Task 1, Task 4, Task 8, Task 10, Task 11 (独立页面)
