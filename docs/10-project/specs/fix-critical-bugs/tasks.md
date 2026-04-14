# 关键 Bug 修复任务列表

## Task 1: 初始化环境指标定义数据（P1） ✅

**说明**: environment_metrics 表为空，需要插入 13 条指标定义数据

**执行步骤**:
1. 连接到远程数据库（Navicat 或命令行）
2. 执行 SQL 插入语句
3. 验证数据插入成功

**SQL 语句**:
```sql
-- 设备和天气通用指标
INSERT INTO `environment_metrics` VALUES 
('temperature', 'device', '温度', '°C', '🌡️', '空气温度', '["sensor", "weather_api"]', 1, 1, 15.000, 30.000, NOW()),
('humidity', 'device', '湿度', '%', '💧', '空气湿度', '["sensor", "weather_api"]', 1, 2, 40.000, 70.000, NOW());

-- 仅设备指标
INSERT INTO `environment_metrics` VALUES 
('light_intensity', 'device', '光照强度', 'lux', '☀️', '光照强度', '["sensor"]', 1, 3, 1000.000, 50000.000, NOW()),
('soil_moisture', 'soil', '土壤湿度', '%', '🌱', '土壤湿度', '["sensor"]', 1, 4, 30.000, 70.000, NOW()),
('soil_temperature', 'soil', '土壤温度', '°C', '🌡️', '土壤温度', '["sensor"]', 0, 5, 15.000, 28.000, NOW()),
('soil_ph', 'soil', '土壤酸碱度', 'pH', '🔬', '土壤pH值', '["sensor"]', 0, 6, 5.500, 7.500, NOW()),
('battery_level', 'device', '设备电量', '%', '🔋', '设备剩余电量', '["sensor"]', 1, 7, 20.000, 100.000, NOW());

-- 仅天气指标
INSERT INTO `environment_metrics` VALUES 
('weather_condition', 'weather', '天气状况', '', '☀️', '天气状况描述', '["weather_api"]', 1, 10, NULL, NULL, NOW()),
('sun_hours', 'weather', '日照时长', 'h', '🌅', '每日日照时长', '["weather_api"]', 1, 11, 6.000, 14.000, NOW()),
('uv_index', 'weather', '紫外线指数', '', '☀️', '紫外线强度指数', '["weather_api"]', 0, 11, NULL, NULL, NOW()),
('wind_speed', 'weather', '风速', 'm/s', '💨', '风速', '["weather_api"]', 0, 12, NULL, NULL, NOW()),
('rainfall', 'weather', '降雨量', 'mm', '🌧️', '降雨量', '["weather_api"]', 0, 13, NULL, NULL, NOW()),
('air_pressure', 'weather', '大气压', 'hPa', '🌐', '大气压力', '["weather_api"]', 0, 14, NULL, NULL, NOW());
```

**验证方法**:
```sql
SELECT COUNT(*) FROM environment_metrics;
-- 预期返回: 13
```

---

## Task 2: 修复会话升级 SQL 语法错误（P1） ✅

**说明**: sessionController.js 中 upgradeSession 函数使用了错误的 Sequelize 语法

**问题代码位置**: `server/src/controllers/sessionController.js` 第 664-667 行

**问题描述**:
- 使用 `{ in: ... }` 而不是 `{ [Op.in]: ... }`
- 直接拼接 SQL 字符串存在注入风险

**修复步骤**:

### Step 2.1: 添加 Op 导入
在文件顶部添加:
```javascript
const { Op } = require('sequelize');
```

### Step 2.2: 修复 upgradeSession 函数
替换原有的诊断卡关联代码:

```javascript
// 原问题代码:
// await DiagnosisCard.update(
//   { plant_id: plantId },
//   { where: { message_id: { in: sequelize.literal(`(SELECT message_id FROM messages WHERE session_id = '${sessionId}')`) } } }
// );

// 修复后代码:
// 先查询会话中的所有消息ID
const messages = await Message.findAll({
  where: { session_id: sessionId },
  attributes: ['message_id'],
});

const messageIds = messages.map(m => m.message_id);

// 关联诊断卡到植物
if (messageIds.length > 0) {
  await DiagnosisCard.update(
    { plant_id: plantId },
    { where: { message_id: { [Op.in]: messageIds } } }
  );
}
```

### Step 2.3: 验证修复
1. 启动后端服务
2. 创建一个咨询会话
3. 发送图片生成诊断卡
4. 调用升级 API: POST /api/sessions/:sessionId/upgrade
5. 验证诊断卡的 plant_id 已更新

**验证 SQL**:
```sql
SELECT dc.diagnosis_card_id, dc.plant_id, dc.message_id
FROM diagnosis_cards dc
JOIN messages m ON dc.message_id = m.message_id
WHERE m.session_id = 'SESSION_xxx';
```

---

## Task 3: 更新相关 Spec 状态

**说明**: 更新相关 spec 文件的任务状态

### Step 3.1: 更新 implement-environment-data
- 确认 Task 4 已完成
- 更新 checklist.md 中的数据初始化状态

### Step 3.2: 更新 supplement-api
- 确认会话升级接口已实现
- 更新 checklist.md 中的实现状态

---

## 任务依赖关系

```
Task 1 (数据库初始化) 和 Task 2 (SQL修复) 可以并行执行
    ↓
Task 3 (更新 Spec 状态)
```

## 优先级

- **Task 1**: P1 - 阻塞环境数据功能
- **Task 2**: P1 - 阻塞会话升级功能
- **Task 3**: P2 - 文档更新
