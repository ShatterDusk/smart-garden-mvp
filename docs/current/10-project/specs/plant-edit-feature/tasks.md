# 植物编辑功能 - 任务清单

## Task 1: mock-data.js 添加 updatePlant 方法
**状态**: pending
**优先级**: P0

- [ ] 在 deletePlant 方法后添加 updatePlant 方法
- [ ] 方法接收 plantId 和 updateData 参数
- [ ] 查找并更新植物数据
- [ ] 更新 updated_at 字段
- [ ] 保存到本地存储
- [ ] 返回布尔值表示成功/失败

## Task 2: add-plant 页面支持编辑模式
**状态**: pending
**优先级**: P0

### 2.1 修改 add-plant.js
- [ ] data 中添加 mode、plantId、pageTitle 字段
- [ ] onLoad 方法解析 mode 和 id 参数
- [ ] 添加 loadPlantData 方法加载植物数据
- [ ] 修改 submitForm 方法区分创建和编辑
- [ ] 添加 updatePlant 方法调用 mock.updatePlant
- [ ] 编辑成功后返回上一页

### 2.2 修改 add-plant.wxml
- [ ] 动态显示页面标题（编辑植物/添加植物）
- [ ] 编辑模式下显示植物ID（可选）

## Task 3: plants 列表页编辑入口
**状态**: pending
**优先级**: P0

- [ ] 修改 onPlantLongPress 方法
- [ ] "编辑"选项不再显示"开发中"提示
- [ ] 实现跳转到 add-plant?mode=edit&id=xxx

## Task 4: plant-detail 详情页编辑入口
**状态**: pending
**优先级**: P0

### 4.1 修改 plant-detail.wxml
- [ ] 在右上角添加编辑按钮（✏️图标）

### 4.2 修改 plant-detail.js
- [ ] 添加 editPlant 方法
- [ ] 方法跳转到 add-plant?mode=edit&id=xxx

## Task 5: 验证测试
**状态**: pending
**优先级**: P1

- [ ] 测试列表页长按编辑入口
- [ ] 测试详情页编辑按钮入口
- [ ] 测试编辑页面数据加载
- [ ] 测试编辑保存功能
- [ ] 测试返回上一页逻辑
