# 前端 Mock 数据脱耦规划

## Why
前端 11 个页面仍依赖 mock-data.js，尚未与后端 API 脱耦。需要将所有页面迁移到使用 utils/api.js 调用真实后端。

## What Changes
- 将 11 个页面的 mock-data 引用替换为 api.js
- 移除对 mock-data.js 的依赖
- 緻加错误处理和加载状态

## Impact
- Affected specs: 前端所有页面
- Affected code:
  - `pages/index/index.js`
  - `pages/plants/plants.js`
  - `pages/plant-detail/plant-detail.js`
  - `pages/plant-sessions/plant-sessions.js`
  - `pages/sessions/sessions.js`
  - `pages/session-detail/session-detail.js` (如存在)
  - `pages/quick-analyze/quick-analyze.js`
  - `pages/qna/qna.js`
  - `pages/metric-detail/metric-detail.js`
  - `pages/device-manage/device-manage.js`
  - `pages/device-detail/device-detail.js`
  - `pages/add-plant/add-plant.js`

## ADDED Requirements

### Requirement: 前端 API 脱耦
前端页面 SHALL 使用 api.js 调用后端 API，不再依赖 mock-data。

#### Scenario: 页面数据加载
- **WHEN** 页面 onLoad 或 onShow
- **THEN** 调用 api.js 获取数据
- **AND** 显示加载状态
- **AND** 处理错误情况

#### Scenario: 数据操作
- **WHEN** 用户执行创建/更新/删除操作
- **THEN** 调用 api.js 对应方法
- **AND** 刷新页面数据
