# API补充任务分解

## Task 1: 添加会话升级接口（P1）

**位置**: 第四章 会话相关接口后，4.5节发送消息之后

**添加内容**:
```markdown
### 4.6 升级会话

**接口**: `POST /api/sessions/{sessionId}/upgrade`

**说明**: 将咨询会话升级为植物会话，绑定到指定植物档案

**路径参数**:
| 参数 | 类型 | 说明 |
|:---|:---|:---|
| sessionId | string | 会话ID |

**请求参数**:
```json
{
  "plantId": "string"  // 必填，要关联的植物ID
}
```

**返回示例**:
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
```

---

## Task 2: 添加删除会话接口（P1）

**位置**: 4.6节之后

**添加内容**:
```markdown
### 4.7 删除会话

**接口**: `DELETE /api/sessions/{sessionId}`

**说明**: 删除指定会话，级联删除该会话的所有消息

**路径参数**:
| 参数 | 类型 | 说明 |
|:---|:---|:---|
| sessionId | string | 会话ID |

**请求参数**: 无

**返回示例**:
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
```

---

## Task 3: 扩展现有用户信息接口（P1）

**位置**: 2.2节 获取用户信息，修改响应示例

**修改内容**:
- 添加查询参数说明
- 扩展响应示例，增加 dashboard 字段

**修改后内容**:
```markdown
**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| include | string | 否 | 包含额外数据，如 `dashboard` |

**返回示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "userId": "USER_001",
    "nickname": "植物爱好者",
    "avatarUrl": "https://example.com/avatar.jpg",
    "plantCount": 4,
    "deviceCount": 2,
    "createdAt": "2026-03-01T10:00:00Z",
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
          "coverImageUrl": "https://example.com/plant1.jpg",
          "currentHealthScore": 88,
          "status": "healthy"
        }
      ],
      "dailyTip": "春季是多肉植物生长旺季，注意适当增加浇水频率。"
    }
  }
}
```
```

---

## Task 4: 添加用户设置接口（P2）

**位置**: 2.3节 更新用户信息之后

**添加内容**:
```markdown
### 2.4 获取用户设置

**接口**: `GET /api/users/settings`

**说明**: 获取当前用户的通知设置和偏好设置

**请求参数**: 无

**返回示例**:
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

### 2.5 更新用户设置

**接口**: `PUT /api/users/settings`

**说明**: 更新用户的通知设置和偏好设置

**请求参数**:
```json
{
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
```

**返回示例**:
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
    },
    "updatedAt": "2026-03-22T10:00:00Z"
  }
}
```
```

---

## Task 5: 更新错误码定义

**位置**: 1.4节 错误码定义表格

**添加内容**:
在现有错误码后添加：
```markdown
| 1005 | 设备不存在 | 检查device_id |
| 1006 | 诊断记录不存在 | 检查diagnosis_card_id |
| 1007 | 图片上传失败 | 检查图片格式和大小 |
| 1008 | AI服务不可用 | 稍后重试 |
```

---

## Task 6: 更新接口汇总表

**位置**: 第十章 接口汇总表

**添加内容**:
在现有表格中添加：
```markdown
| 升级会话 | POST | /api/sessions/{sessionId}/upgrade | 咨询会话升级为植物会话 |
| 删除会话 | DELETE | /api/sessions/{sessionId} | 删除会话及消息 |
| 获取用户设置 | GET | /api/users/settings | 获取用户通知设置 |
| 更新用户设置 | PUT | /api/users/settings | 更新用户通知设置 |
```

---

## Task 7: 添加变更记录

**位置**: 文档末尾，新增"十一、变更记录"章节

**添加内容**:
```markdown
## 十一、变更记录

| 日期 | 版本 | 变更内容 |
|:---|:---:|:---|
| 2026-03-22 | v1.0 | 初始版本，完成基础接口设计 |
| 2026-03-25 | v1.1 | 补充缺失接口：会话升级、删除会话、用户设置、扩展用户信息（仪表盘） |
| 2026-03-25 | v1.1 | 补充错误码：1005-1008 |
```

---

## 执行顺序

1. **Task 5** - 更新错误码（基础）
2. **Task 1** - 添加会话升级接口
3. **Task 2** - 添加删除会话接口
4. **Task 3** - 扩展用户信息接口
5. **Task 4** - 添加用户设置接口
6. **Task 6** - 更新接口汇总表
7. **Task 7** - 添加变更记录

---

## 修改检查清单

- [ ] Task 1 完成
- [ ] Task 2 完成
- [ ] Task 3 完成
- [ ] Task 4 完成
- [ ] Task 5 完成
- [ ] Task 6 完成
- [ ] Task 7 完成
- [ ] 所有新增接口都有完整示例
- [ ] 接口汇总表准确
- [ ] 章节编号连续
