# Checklist - 前端命名规范化修复

## 第一阶段：核心功能修复

### Task 1: pages/qna/qna.js
- [ ] message_id → messageId
- [ ] session_id → sessionId
- [ ] content_type → contentType
- [ ] image_urls → imageUrls
- [ ] reply_to_message_id → replyToMessageId
- [ ] created_at → createdAt
- [ ] updated_at → updatedAt
- [ ] diagnosis_card_id → diagnosisCardId
- [ ] health_score → healthScore
- [ ] plant_id → plantId
- [ ] user_id → userId
- [ ] analysis_type → analysisType
- [ ] context_used → contextUsed
- [ ] diagnosis_card → diagnosisCard
- [ ] wxml 模板检查
- [ ] 功能验证

### Task 2: pages/sessions/sessions.js
- [ ] session_id → sessionId
- [ ] plant_id → plantId
- [ ] last_message → lastMessage
- [ ] last_time → lastTime
- [ ] created_at → createdAt
- [ ] message_id → messageId
- [ ] content_type → contentType
- [ ] image_urls → imageUrls
- [ ] reply_to_message_id → replyToMessageId
- [ ] plant_category → plantCategory
- [ ] wxml 模板检查
- [ ] 功能验证

### Task 3: pages/quick-analyze/quick-analyze.js
- [ ] plant_id → plantId
- [ ] plant_category → plantCategory
- [ ] cover_image_url → coverImageUrl
- [ ] diagnosis_card_id → diagnosisCardId
- [ ] health_score → healthScore
- [ ] plant_name → plantName
- [ ] session_id → sessionId
- [ ] message_id → messageId
- [ ] content_type → contentType
- [ ] image_urls → imageUrls
- [ ] reply_to_message_id → replyToMessageId
- [ ] created_at → createdAt
- [ ] updated_at → updatedAt
- [ ] wxml 模板检查
- [ ] 功能验证

## 第二阶段：次要功能修复

### Task 4: pages/plants/plants.js
- [ ] plant_id → plantId
- [ ] plant_category → plantCategory
- [ ] cover_image_url → coverImageUrl
- [ ] health_score → healthScore
- [ ] current_device_id → currentDeviceId
- [ ] wxml 模板检查
- [ ] 功能验证

### Task 5: pages/plant-sessions/plant-sessions.js
- [ ] plant_id → plantId
- [ ] session_id → sessionId
- [ ] cover_image_url → coverImageUrl
- [ ] plant_category → plantCategory
- [ ] last_message → lastMessage
- [ ] last_time → lastTime
- [ ] wxml 模板检查
- [ ] 功能验证

## 第三阶段：其他页面检查

### Task 6-12: 其他页面
- [ ] pages/index/index.js 检查
- [ ] pages/plant-detail/plant-detail.js 检查
- [ ] pages/add-plant/add-plant.js 检查
- [ ] pages/metric-detail/metric-detail.js 检查
- [ ] pages/device-manage/device-manage.js 检查
- [ ] pages/device-detail/device-detail.js 检查
- [ ] components/* 检查

## 第四阶段：Mock 数据层适配

### Task 13: Mock 接收函数更新
- [ ] saveSession() 接收 camelCase
- [ ] saveMessages() 接收 camelCase
- [ ] saveDiagnosisCard() 接收 camelCase
- [ ] 添加 keysToSnake() 转换
- [ ] 验证保存和读取

## 第五阶段：全面验证

### Task 14: 功能回归测试
- [ ] 智能问答全流程
- [ ] 会话列表和创建
- [ ] 快速分析功能
- [ ] 植物列表和详情
- [ ] 设备管理和绑定
- [ ] 所有页面跳转
