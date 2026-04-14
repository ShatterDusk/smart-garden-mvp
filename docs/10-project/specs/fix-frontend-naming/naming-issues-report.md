# 前端命名问题汇总报告

## 发现的问题

经过全面检查，发现前端代码中存在大量 snake_case 命名，需要统一改为 camelCase。

## 问题统计

| 文件 | snake_case 数量 | 严重程度 |
|:---|:---:|:---:|
| `pages/quick-analyze/quick-analyze.js` | 30+ | 高 |
| `pages/qna/qna.js` | 30+ | 高 |
| `pages/sessions/sessions.js` | 30+ | 高 |
| `pages/plants/plants.js` | 7 | 中 |
| `pages/plant-sessions/plant-sessions.js` | 10 | 中 |
| `components/*` | 0 | - |

## 主要问题类型

### 1. Mock 数据访问（来自 mock-data.js 的 snake_case）

```javascript
// 问题代码
plantId: plant.plant_id,
category: plant.plant_category,
coverImageUrl: plant.cover_image_url,
healthScore: plant.latest_diagnosis.health_score,
```

**解决方案**：Mock 数据已改为返回 camelCase，前端直接使用即可。

### 2. 保存到 Mock 的数据（使用 snake_case）

```javascript
// 问题代码
var session = {
  session_id: sessionId,  // 应该为 sessionId
  plant_id: '',           // 应该为 plantId
  last_message: '...',    // 应该为 lastMessage
  last_time: timeStr,     // 应该为 lastTime
  created_at: now.toISOString()  // 应该为 createdAt
};
```

**解决方案**：改为 camelCase，Mock 接收后自动转换。

### 3. 消息数据（使用 snake_case）

```javascript
// 问题代码
var message = {
  message_id: 'MSG_' + Date.now(),
  session_id: sessionId,
  content_type: 'text',
  image_urls: [],
  reply_to_message_id: null,
  created_at: now.toISOString(),
  updated_at: now.toISOString()
};
```

**解决方案**：改为 camelCase。

### 4. 诊断卡数据（使用 snake_case）

```javascript
// 问题代码
var diagnosisCard = {
  diagnosis_card_id: 'DIAG_' + Date.now(),
  health_score: aiResult.diagnosisCard.healthScore,
  plant_name: aiResult.diagnosisCard.species,
  analysis_type: sessionType === 'plant' ? 'deep' : 'normal',
  context_used: aiResult.contextUsed
};
```

**解决方案**：改为 camelCase。

## 需要修复的文件清单

### 高优先级（大量 snake_case）

1. [ ] `pages/quick-analyze/quick-analyze.js`
2. [ ] `pages/qna/qna.js`
3. [ ] `pages/sessions/sessions.js`

### 中优先级（少量 snake_case）

4. [ ] `pages/plants/plants.js`
5. [ ] `pages/plant-sessions/plant-sessions.js`

### 低优先级（检查确认）

6. [ ] `pages/index/index.js`
7. [ ] `pages/plant-detail/plant-detail.js`
8. [ ] `pages/add-plant/add-plant.js`
9. [ ] `pages/metric-detail/metric-detail.js`
10. [ ] `pages/device-manage/device-manage.js`
11. [ ] `pages/device-detail/device-detail.js`

## 修复策略

### 策略 1：Mock 数据返回 camelCase（已完成）

Mock 数据现在返回 camelCase，前端可以直接使用：

```javascript
// 现在可以这样写
var detail = mock.plantDetail('PLANT_001');
console.log(detail.plantInfo.plantId);  // ✓ camelCase
```

### 策略 2：前端保存数据使用 camelCase

前端保存到 Mock 的数据改为 camelCase：

```javascript
// 修改前
var session = {
  session_id: sessionId,
  plant_id: plantId
};

// 修改后
var session = {
  sessionId: sessionId,
  plantId: plantId
};
```

### 策略 3：Mock 接收 camelCase 并转换

Mock 数据接收 camelCase，内部转换为 snake_case 存储。

## 实施建议

由于涉及文件较多，建议分批修复：

1. **第一批**：修复 `qna.js` 和 `sessions.js`（核心功能）
2. **第二批**：修复 `quick-analyze.js` 和 `plants.js`
3. **第三批**：修复其他文件并全面测试

是否开始实施修复？
