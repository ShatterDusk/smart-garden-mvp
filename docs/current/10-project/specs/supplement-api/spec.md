# API接口补充计划

## 背景

根据 [03-API接口设计.md](../../设计文档/03-API接口设计.md) 的审核结果，发现以下关键接口缺失，需要补充以完全满足需求规格说明书的功能要求。

## 补充范围

### P1 - 必须补充（影响核心功能）

1. **会话升级接口** - 满足 CS-001 需求
2. **删除会话接口** - 满足 CS-002 需求
3. **扩展用户信息接口** - 满足 UR-004 首页仪表盘需求

### P2 - 建议补充（完善功能）

4. **用户设置接口** - 满足 UR-003 设置页面需求

## 接口详细设计

### 1. 会话升级接口

**接口**: `POST /api/sessions/{sessionId}/upgrade`

**需求来源**: CS-001 咨询会话 - 会话升级流程

**功能说明**:
- 将咨询会话升级为植物会话
- 修改会话类型从 `consultation` 改为 `plant`
- 绑定到指定植物档案
- 保留所有消息历史（同一会话，只是类型变化）

**请求参数**:
```json
{
  "plantId": "string"  // 必填，要关联的植物ID
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "sessionId": "SESSION_001",
    "type": "plant",
    "plantId": "PLANT_001",
    "title": "大黄 - 植物会话",
    "upgradedAt": "2026-03-22T10:00:00Z",
    "contextConfig": {
      "environmentData": false,
      "careRecords": false,
      "historyDiagnosis": false
    }
  }
}
```

**错误码**:
- 1004: 会话不存在
- 1003: 植物不存在
- 400: 已经是植物会话，无需升级

---

### 2. 删除会话接口

**接口**: `DELETE /api/sessions/{sessionId}`

**需求来源**: CS-002 会话列表管理

**功能说明**:
- 删除指定会话
- 级联删除该会话的所有消息
- 保留关联的诊断记录（诊断历史独立存在）
- 后端校验用户权限（只能删除自己的会话）

**请求参数**: 无（路径参数）

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "sessionId": "SESSION_001",
    "deletedAt": "2026-03-22T10:00:00Z"
  }
}
```

**错误码**:
- 1004: 会话不存在
- 403: 无权删除此会话

---

### 3. 扩展用户信息接口（首页仪表盘）

**接口**: `GET /api/users/profile`

**需求来源**: UR-004 首页仪表盘

**功能说明**:
- 扩展现有接口，增加仪表盘统计数据
- 返回用户统计、植物统计、设备统计

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| include | string | 否 | 包含额外数据，如 `dashboard` |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "userId": "USER_001",
    "nickname": "植物爱好者",
    "avatarUrl": "https://example.com/avatar.jpg",
    "createdAt": "2026-03-01T10:00:00Z",
    // 新增仪表盘数据（当 include=dashboard 时返回）
    "dashboard": {
      "plantStats": {
        "total": 4,
        "healthy": 3,
        "warning": 1,
        "critical": 0,
        "pendingTasks": 1
      },
      "deviceStats": {
        "online": 2,
        "offline": 0,
        "unbound": 1
      },
      "recentPlants": [
        {
          "plantId": "PLANT_001",
          "nickname": "大黄",
          "coverImageUrl": "...",
          "currentHealthScore": 88,
          "status": "healthy"
        }
      ],
      "dailyTip": "春季是多肉植物生长旺季，注意适当增加浇水频率。"
    }
  }
}
```

---

### 4. 用户设置接口

**接口**: 
- `GET /api/users/settings` - 获取用户设置
- `PUT /api/users/settings` - 更新用户设置

**需求来源**: UR-003 设置页面

**功能说明**:
- 获取/更新用户的通知设置、偏好设置

**GET 响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "notification": {
      "diagnosisReminder": true,
      "careReminder": true,
      "environmentAlert": true,
      "reminderTime": "09:00"
    },
    "preferences": {
      "language": "zh-CN"
    }
  }
}
```

**PUT 请求参数**:
```json
{
  "notification": {
    "diagnosisReminder": true,
    "careReminder": true,
    "environmentAlert": true,
    "reminderTime": "09:00"
  }
}
```

**PUT 响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "notification": {
      "diagnosisReminder": true,
      "careReminder": true,
      "environmentAlert": true,
      "reminderTime": "09:00"
    },
    "updatedAt": "2026-03-22T10:00:00Z"
  }
}
```

---

## 数据库影响

### 1. 用户设置存储

建议方案：在 `users` 表中新增 JSON 字段存储设置

```sql
ALTER TABLE users ADD COLUMN settings JSON DEFAULT NULL;
```

或创建单独表：

```sql
CREATE TABLE user_settings (
  user_id VARCHAR(64) PRIMARY KEY,
  diagnosis_reminder BOOLEAN DEFAULT TRUE,
  care_reminder BOOLEAN DEFAULT TRUE,
  environment_alert BOOLEAN DEFAULT TRUE,
  reminder_time TIME DEFAULT '09:00',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

### 2. 会话升级

已有字段支持，只需更新：
- `sessions.type`: consultation → plant
- `sessions.plant_id`: NULL → plantId

---

## 验收标准

- [ ] 会话升级接口可正常调用，类型正确变更
- [ ] 删除会话接口可正常调用，级联删除消息
- [ ] 扩展用户信息接口返回仪表盘数据
- [ ] 用户设置接口可正常读写设置
- [ ] 所有接口都有完整的请求/响应示例
- [ ] 所有接口都有错误码说明
- [ ] 接口汇总表已更新

---

## 关联文档

- [00-需求规格说明书.md](../../设计文档/00-需求规格说明书.md)
- [02-数据库设计.md](../../设计文档/02-数据库设计.md)
- [03-API接口设计.md](../../设计文档/03-API接口设计.md)
