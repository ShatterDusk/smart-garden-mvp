# Tasks - 前端命名规范化修复计划

## 第一阶段：核心功能修复（高优先级）

### Task 1: 修复 pages/qna/qna.js
**预计工作量**: 30+ 处修改  
**影响范围**: 智能问答核心功能

- [ ] 修复消息数据对象（message_id → messageId, session_id → sessionId 等）
- [ ] 修复诊断卡数据对象（diagnosis_card_id → diagnosisCardId 等）
- [ ] 修复 Mock 数据访问（msg.diagnosis_card → msg.diagnosisCard 等）
- [ ] 修复时间字段（created_at → createdAt, updated_at → updatedAt 等）
- [ ] 检查 wxml 模板绑定
- [ ] 验证消息发送和接收正常

---

### Task 2: 修复 pages/sessions/sessions.js
**预计工作量**: 30+ 处修改  
**影响范围**: 会话列表核心功能

- [ ] 修复会话数据对象（session_id → sessionId, plant_id → plantId 等）
- [ ] 修复消息预览字段（last_message → lastMessage, last_time → lastTime 等）
- [ ] 修复 Mock 数据访问（s.session_id → s.sessionId 等）
- [ ] 修复时间字段（created_at → createdAt 等）
- [ ] 检查 wxml 模板绑定（wx:key, data-id 等）
- [ ] 验证会话列表加载和跳转正常

---

### Task 3: 修复 pages/quick-analyze/quick-analyze.js
**预计工作量**: 30+ 处修改  
**影响范围**: 快速分析核心功能

- [ ] 修复植物数据访问（plant.plant_id → plant.plantId 等）
- [ ] 修复诊断结果对象（diagnosis_card_id → diagnosisCardId 等）
- [ ] 修复会话数据对象（session_id → sessionId 等）
- [ ] 修复消息数据对象（message_id → messageId 等）
- [ ] 检查 wxml 模板绑定
- [ ] 验证拍照分析和诊断流程正常

---

## 第二阶段：次要功能修复（中优先级）

### Task 4: 修复 pages/plants/plants.js
**预计工作量**: 7 处修改  
**影响范围**: 植物列表功能

- [ ] 修复植物数据访问（plant.plant_id → plant.plantId）
- [ ] 修复分类字段（plant.plant_category → plant.plantCategory）
- [ ] 修复图片字段（plant.cover_image_url → plant.coverImageUrl）
- [ ] 修复诊断字段（plant.latest_diagnosis.health_score → plant.latestDiagnosis.healthScore）
- [ ] 检查 wxml 模板绑定
- [ ] 验证植物列表加载和筛选正常

---

### Task 5: 修复 pages/plant-sessions/plant-sessions.js
**预计工作量**: 10 处修改  
**影响范围**: 植物会话功能

- [ ] 修复植物数据访问（plant.plant_id → plant.plantId）
- [ ] 修复会话数据访问（s.session_id → s.sessionId, s.plant_id → s.plantId）
- [ ] 修复图片字段（plant.cover_image_url → plant.coverImageUrl）
- [ ] 修复分类字段（plant.plant_category → plant.plantCategory）
- [ ] 检查 wxml 模板绑定
- [ ] 验证植物会话列表正常

---

## 第三阶段：其他页面检查（低优先级）

### Task 6: 检查并修复 pages/index/index.js
- [ ] 搜索 snake_case 命名
- [ ] 如有发现，修复为 camelCase
- [ ] 验证首页功能正常

---

### Task 7: 检查并修复 pages/plant-detail/plant-detail.js
- [ ] 搜索 snake_case 命名
- [ ] 如有发现，修复为 camelCase
- [ ] 验证植物详情页功能正常

---

### Task 8: 检查并修复 pages/add-plant/add-plant.js
- [ ] 搜索 snake_case 命名
- [ ] 如有发现，修复为 camelCase
- [ ] 验证添加植物功能正常

---

### Task 9: 检查并修复 pages/metric-detail/metric-detail.js
- [ ] 搜索 snake_case 命名
- [ ] 如有发现，修复为 camelCase
- [ ] 验证指标详情功能正常

---

### Task 10: 检查并修复 pages/device-manage/device-manage.js
- [ ] 搜索 snake_case 命名
- [ ] 如有发现，修复为 camelCase
- [ ] 验证设备管理功能正常

---

### Task 11: 检查并修复 pages/device-detail/device-detail.js
- [ ] 搜索 snake_case 命名
- [ ] 如有发现，修复为 camelCase
- [ ] 验证设备详情功能正常

---

### Task 12: 检查 components 目录
- [ ] 检查 `components/diagnosis-card/diagnosis-card.js`
- [ ] 检查 `components/plant-card/plant-card.js`
- [ ] 检查 `components/metric-item/metric-item.js`
- [ ] 检查 `components/empty-state/empty-state.js`
- [ ] 检查 `components/loading-state/loading-state.js`
- [ ] 检查所有组件的 wxml 模板

---

## 第四阶段：Mock 数据层适配

### Task 13: 更新 Mock 数据接收函数
**目标**: Mock 接收 camelCase，内部转换为 snake_case

- [ ] 更新 `saveSession()` 函数，接收 camelCase，内部转 snake_case
- [ ] 更新 `saveMessages()` 函数，接收 camelCase，内部转 snake_case
- [ ] 更新 `saveDiagnosisCard()` 函数，接收 camelCase，内部转 snake_case
- [ ] 添加 `keysToSnake()` 调用在保存前
- [ ] 验证数据保存和读取正常

---

## 第五阶段：全面验证

### Task 14: 功能回归测试
- [ ] 测试智能问答全流程
- [ ] 测试会话列表和创建
- [ ] 测试快速分析功能
- [ ] 测试植物列表和详情
- [ ] 测试设备管理和绑定
- [ ] 测试所有页面跳转

---

## Task Dependencies

```
第一阶段 (Task 1-3)  →  第二阶段 (Task 4-5)  →  第三阶段 (Task 6-12)  →  第四阶段 (Task 13)  →  第五阶段 (Task 14)
     高优先级              中优先级               低优先级              Mock适配              全面验证
```

**并行执行建议**:
- Task 1-3 可以并行（不同页面，无依赖）
- Task 4-5 可以并行
- Task 6-12 可以并行

**关键路径**: Task 1-3 → Task 13 → Task 14
