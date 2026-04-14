# 智能园艺助手 - API接口设计

**角色**: 后端开发 / 前端开发
**版本**: V3.2  
**日期**: 2026-04-05  
**状态**: 文档去重与章节重组完成

***

## 一、接口规范

### 1.1 基础信息

| 项目    | 说明                                   |
| :---- | :----------------------------------- |
| 协议    | HTTPS                                |
| 数据格式  | JSON                                 |
| 字符编码  | UTF-8                                |
| 基础URL | `https://api.gardenassistant.com/v1` |

### 1.2 URL 设计规范

| 规则 | 示例 |
|:---|:---|
| 使用 kebab-case | `/api/care-records` ✅ `/api/careRecords` ❌ |
| 资源用名词 | `/api/plants` ✅ `/api/get-plants` ❌ |
| 嵌套不超过2层 | `/api/plants/:id/environment` ✅ |
| 版本号在路径中 | `/api/v1/plants`（未来） |

### 1.3 认证方式

系统支持双认证机制：

#### 1.3.1 用户认证（JWT Token）

小程序用户请求使用 JWT Token 认证，在请求头中携带：

```
Authorization: Bearer <token>
```

Token 通过登录接口获取，有效期 7 天。

#### 1.3.2 设备认证（Device ID）

硬件设备数据上报使用设备认证，在请求体中携带：

```json
{
  "deviceId": "DEVICE_001",
  "plantId": "PLANT_001",
  "metrics": [...]
}
```

**认证流程**：

```
[设备上报数据]
    │
    ▼
[验证 deviceId 是否存在于 devices 表]
    │
    ├── 存在 → 验证设备状态
    │    │
    │    ├── status = online → 认证通过
    │    └── status = offline/unbound → 认证失败
    │
    └── 不存在 → 认证失败（404）
```

**认证中间件**：`server/src/middleware/deviceAuth.js`

| 认证方式 | 适用接口 | 认证参数 |
|:---|:---|:---|
| 用户认证 | 所有 `/api/*` 接口 | Header: `Authorization: Bearer <token>` |
| 设备认证 | `POST /api/environment/readings` | Body: `deviceId` |

**安全增强（可选）**：

设备密钥认证（`deviceKeyAuthMiddleware`）：
- 设备出厂时预置密钥
- 或用户绑定时生成密钥
- 请求时携带 `deviceKey` 参数

### 1.4 通用返回格式

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

### 1.5 错误码定义

|  错误码 | 说明      | 处理建议                  |
| :--: | :------ | :-------------------- |
|  200 | 成功      | -                     |
|  400 | 请求参数错误  | 检查请求参数                |
|  401 | 未授权     | 重新登录获取Token           |
|  403 | 禁止访问    | 检查权限                  |
|  404 | 资源不存在   | 检查资源ID                |
|  409 | 资源冲突    | 检查重复操作                |
|  500 | 服务器内部错误 | 联系管理员                 |
| 1001 | 微信登录失败  | 检查微信code              |
| 1002 | Token过期 | 刷新Token或重新登录          |
| 1003 | 植物不存在   | 检查plant\_id           |
| 1004 | 会话不存在   | 检查session\_id         |
| 1005 | 设备不存在   | 检查device\_id          |
| 1006 | 诊断记录不存在 | 检查diagnosis\_card\_id |
| 1007 | 图片上传失败  | 检查图片格式和大小             |
| 1008 | AI服务不可用 | 稍后重试                  |
| 1009 | 环境数据已存在 | 检查recorded\_at是否重复    |
| 1010 | 设备未绑定植物 | 先绑定设备                 |

***

## 二、系统接口

### 2.1 健康检查

**接口**: `GET /health`

**说明**: 服务健康检查，用于负载均衡和监控

**认证**: 无需认证

**返回示例**:

```json
{
  "status": "ok",
  "timestamp": "2026-04-07T10:00:00.000Z"
}
```

**使用场景**:
- 负载均衡健康检查
- 监控系统探活
- 部署验证

---

## 三、用户相关接口

### 3.1 用户登录

**接口**: `POST /api/users/login`

**说明**: 微信小程序登录，通过 wx.login 获取 code

**请求参数**:

```json
{
  "code": "string",          // 必填，微信登录code
  "nickname": "string",      // 可选，微信昵称
  "avatarUrl": "string",     // 可选，头像URL
  "gender": 0                // 可选，性别 0-未知 1-男 2-女
}
```

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 604800,
    "user": {
      "userId": "USER_001",
      "nickname": "植物爱好者",
      "avatarUrl": "https://example.com/avatar.jpg",
      "role": "user",
      "status": "active",
      "createdAt": "2026-03-01T10:00:00Z"
    }
  }
}
```

### 3.2 获取用户信息

**接口**: `GET /api/users/profile`

**说明**: 获取当前登录用户信息，支持扩展仪表盘数据

**请求参数**:

| 参数      | 类型     |  必填 | 说明                   |
| :------ | :----- | :-: | :------------------- |
| include | string |  否  | 包含额外数据，如 `dashboard` |

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "userId": "USER_001",
    "nickname": "植物爱好者",
    "avatarUrl": "https://example.com/avatar.jpg",
    "role": "user",
    "status": "active",
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

### 3.3 更新用户信息

**接口**: `PUT /api/users/profile`

**说明**: 更新用户信息

**请求参数**:

```json
{
  "nickname": "string",      // 可选
  "avatarUrl": "string"      // 可选
}
```

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "userId": "USER_001",
    "nickname": "新昵称",
    "avatarUrl": "https://example.com/new-avatar.jpg",
    "updatedAt": "2026-03-22T10:00:00Z"
  }
}
```

***

### 3.4 获取用户设置

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

### 3.5 更新用户设置

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

***

## 四、植物相关接口

### 4.1 获取植物列表

**接口**: `GET /api/plants`

**说明**: 获取当前用户的所有植物列表

**请求参数**:

| 参数       | 类型  |  必填 | 说明        |
| :------- | :-- | :-: | :-------- |
| page     | int |  否  | 页码，默认1    |
| pageSize | int |  否  | 每页数量，默认20 |

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 4,
    "page": 1,
    "pageSize": 20,
    "list": [
      {
        "plantId": "PLANT_001",
        "nickname": "大黄",
        "species": "虎皮兰",
        "plantCategory": "succulent",
        "coverImageUrl": "https://example.com/plant1.jpg",
        "currentHealthScore": 88,
        "status": "healthy",
        "locationName": "客厅",
        "hasDevice": true,
        "createdAt": "2026-03-01T10:00:00Z"
      }
    ]
  }
}
```

### 3.2 创建植物

**接口**: `POST /api/plants`

**说明**: 创建新的植物档案

**请求参数**:

```json
{
  "nickname": "string",           // 必填，植物昵称
  "species": "string",            // 必填，品种
  "plantCategory": "string",      // 必填，分类
  "coverImageUrl": "string",      // 可选，封面图
  "locationName": "string",       // 可选，位置
  "firstDiagnosis": {             // 可选，首诊信息
    "diagnosisCardId": "string",
    "healthScore": 85,
    "status": "healthy"
  }
}
```

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "plantId": "PLANT_005",
    "nickname": "新植物",
    "species": "多肉",
    "plantCategory": "succulent",
    "coverImageUrl": "https://example.com/new-plant.jpg",
    "currentHealthScore": null,
    "status": "healthy",
    "createdAt": "2026-03-22T10:00:00Z"
  }
}
```

### 3.3 获取植物详情

**接口**: `GET /api/plants/{plantId}`

**说明**: 获取指定植物的详细信息

**路径参数**:

| 参数      | 类型     | 说明   |
| :------ | :----- | :--- |
| plantId | string | 植物ID |

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "plantId": "PLANT_001",
    "nickname": "大黄",
    "species": "虎皮兰",
    "plantCategory": "succulent",
    "coverImageUrl": "https://example.com/plant1.jpg",
    "currentHealthScore": 88,
    "currentGrowthStage": "maturity",
    "status": "healthy",
    "locationName": "客厅",
    "currentDeviceId": "DEVICE_001",
    "firstDiagnosis": {
      "diagnosisCardId": "DIAG_001",
      "species": "虎皮兰",
      "healthScore": 85,
      "status": "healthy",
      "diagnosedAt": "2026-03-01T11:00:00Z"
    },
    "createdAt": "2026-03-01T10:00:00Z",
    "updatedAt": "2026-03-21T10:00:00Z"
  }
}
```

### 3.4 更新植物

**接口**: `PUT /api/plants/{plantId}`

**说明**: 更新植物档案信息

**路径参数**:

| 参数      | 类型     | 说明   |
| :------ | :----- | :--- |
| plantId | string | 植物ID |

**请求参数**:

```json
{
  "nickname": "string",
  "species": "string",
  "coverImageUrl": "string",
  "locationName": "string"
}
```

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "plantId": "PLANT_001",
    "nickname": "更新后的名字",
    "updatedAt": "2026-03-22T10:00:00Z"
  }
}
```

### 3.5 删除植物

**接口**: `DELETE /api/plants/{plantId}`

**说明**: 删除植物档案

**路径参数**:

| 参数      | 类型     | 说明   |
| :------ | :----- | :--- |
| plantId | string | 植物ID |

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

***

## 四、会话相关接口

### 4.1 获取会话列表

**接口**: `GET /api/sessions`

**说明**: 获取当前用户的所有会话列表

**请求参数**:

| 参数       | 类型     |  必填 | 说明                      |
| :------- | :----- | :-: | :---------------------- |
| type     | string |  否  | 会话类型：consultation/plant |
| plantId  | string |  否  | 植物ID（查询植物会话时）           |
| page     | int    |  否  | 页码，默认1                  |
| pageSize | int    |  否  | 每页数量，默认20               |

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 5,
    "page": 1,
    "pageSize": 20,
    "list": [
      {
        "sessionId": "SESSION_001",
        "type": "consultation",
        "plantId": null,
        "title": "咨询会话",
        "status": "active",
        "lastMessage": "帮我看看这多肉叶子发黄怎么办",
        "lastTime": "2026-03-22T10:30:00Z",
        "unread": 0,
        "messageCount": 12,
        "createdAt": "2026-03-22T10:00:00Z"
      }
    ]
  }
}
```

### 4.2 创建会话

**接口**: `POST /api/sessions`

**说明**: 创建新会话

**请求参数**:

```json
{
  "type": "string",           // 必填，consultation/plant
  "plantId": "string",        // 可选，植物ID（植物会话时必填）
  "title": "string"           // 可选，会话标题
}
```

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "sessionId": "SESSION_006",
    "type": "consultation",
    "plantId": null,
    "title": "咨询会话",
    "status": "active",
    "contextConfig": {
      "environmentData": false,
      "careRecords": false,
      "historyDiagnosis": false
    },
    "createdAt": "2026-03-22T10:00:00Z"
  }
}
```

### 4.3 获取会话详情

**接口**: `GET /api/sessions/{sessionId}`

**说明**: 获取指定会话的详细信息

**路径参数**:

| 参数        | 类型     | 说明   |
| :-------- | :----- | :--- |
| sessionId | string | 会话ID |

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "sessionId": "SESSION_001",
    "type": "consultation",
    "plantId": null,
    "title": "咨询会话",
    "status": "active",
    "contextConfig": {
      "environmentData": false,
      "careRecords": false,
      "historyDiagnosis": false
    },
    "lastMessage": "帮我看看这多肉叶子发黄怎么办",
    "lastTime": "2026-03-22T10:30:00Z",
    "unread": 0,
    "messageCount": 12,
    "createdAt": "2026-03-22T10:00:00Z"
  }
}
```

### 4.4 获取会话消息

**接口**: `GET /api/sessions/{sessionId}/messages`

**说明**: 获取指定会话的消息列表

**路径参数**:

| 参数        | 类型     | 说明   |
| :-------- | :----- | :--- |
| sessionId | string | 会话ID |

**查询参数**:

| 参数     | 类型     |  必填 | 说明           |
| :----- | :----- | :-: | :----------- |
| before | string |  否  | 获取此消息ID之前的消息 |
| limit  | int    |  否  | 数量限制，默认20    |

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "messageId": "MSG_001",
        "sessionId": "SESSION_001",
        "role": "assistant",
        "contentType": "text",
        "content": "你好！我是小园，你的植物养护助手。请发送植物照片或描述你的问题，我来帮你分析。",
        "imageUrls": [],
        "status": "sent",
        "createdAt": "2026-03-22T10:00:00Z"
      },
      {
        "messageId": "MSG_002",
        "sessionId": "SESSION_001",
        "role": "user",
        "contentType": "image",
        "content": "",
        "imageUrls": ["https://example.com/plant.jpg"],
        "status": "sent",
        "createdAt": "2026-03-22T10:05:00Z"
      },
      {
        "messageId": "MSG_003",
        "sessionId": "SESSION_001",
        "role": "assistant",
        "contentType": "diagnosis",
        "content": "从图片来看，您的多肉植物叶片发黄...",
        "imageUrls": [],
        "diagnosisCard": {
          "diagnosisCardId": "DIAG_001",
          "healthScore": 85,
          "status": "healthy",
          "issues": [],
          "suggestions": []
        },
        "status": "sent",
        "createdAt": "2026-03-22T10:06:00Z"
      }
    ],
    "hasMore": false
  }
}
```

### 4.5 发送消息

**接口**: `POST /api/sessions/{sessionId}/messages`

**说明**: 向指定会话发送消息

**路径参数**:

| 参数        | 类型     | 说明   |
| :-------- | :----- | :--- |
| sessionId | string | 会话ID |

**请求参数**:

```json
{
  "contentType": "string",      // 必填，text/image
  "content": "string",          // 可选，文字内容
  "imageUrls": ["string"],      // 可选，图片URL列表
  "contextConfig": {            // 可选，上下文开关（植物会话）
    "environmentData": true,
    "careRecords": false,
    "historyDiagnosis": true
  }
}
```

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "userMessage": {
      "messageId": "MSG_004",
      "sessionId": "SESSION_001",
      "role": "user",
      "contentType": "text",
      "content": "那应该怎么浇水？",
      "status": "sent",
      "createdAt": "2026-03-22T10:10:00Z"
    },
    "aiResponse": {
      "messageId": "MSG_005",
      "sessionId": "SESSION_001",
      "role": "assistant",
      "contentType": "text",
      "content": "建议每周浇水1次，等土壤完全干透后再浇...",
      "status": "sent",
      "createdAt": "2026-03-22T10:10:05Z"
    }
  }
}
```

***

### 4.6 升级会话

**接口**: `POST /api/sessions/{sessionId}/upgrade`

**说明**: 将咨询会话升级为植物会话（修改类型并绑定植物档案），保留历史消息

**升级触发条件**:

1. 快速分析后点击"保存到档案"
2. 咨询会话中产生诊断卡后点击"保存到植物档案"

**升级流程**:

1. 用户点击"保存到档案"按钮
2. 跳转至创建植物档案页面（自动填充诊断信息）
3. 用户确认/修改植物信息，点击"创建并关联"
4. 后端调用升级API（POST /api/sessions/{id}/upgrade）
5. 原咨询会话升级为植物会话（修改type和plant\_id）
6. 保留所有消息历史
7. 跳转至升级后的植物会话页面

**路径参数**:

| 参数        | 类型     | 说明   |
| :-------- | :----- | :--- |
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

**升级后变化**:

- 会话类型：`consultation` → `plant`
- 上下文开关：从不可用变为可用
- AI分析类型：`normal` → `deep`
- 历史消息：标记"升级前"标签

**错误码**:

- 1004: 会话不存在
- 1003: 植物不存在
- 400: 已经是植物会话，无需升级

***

### 4.7 标记会话已读

**接口**: `POST /api/sessions/{sessionId}/read`

**说明**: 标记会话中所有消息为已读

**路径参数**:

| 参数        | 类型     | 说明   |
| :-------- | :----- | :--- |
| sessionId | string | 会话ID |

**请求参数**: 无

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "message": "已标记为已读"
  }
}
```

**错误码**:

- 1004: 会话不存在

***

### 4.8 删除会话

**接口**: `DELETE /api/sessions/{sessionId}`

**说明**: 删除指定会话，级联删除该会话的所有消息

**路径参数**:

| 参数        | 类型     | 说明   |
| :-------- | :----- | :--- |
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

***

## 五、诊断相关接口

### 5.1 获取诊断历史

**接口**: `GET /api/diagnosis`

**说明**: 获取诊断历史列表

**请求参数**:

| 参数       | 类型     |  必填 | 说明              |
| :------- | :----- | :-: | :-------------- |
| plantId  | string |  否  | 植物ID（查询特定植物的诊断） |
| page     | int    |  否  | 页码，默认1          |
| pageSize | int    |  否  | 每页数量，默认20       |

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 10,
    "page": 1,
    "pageSize": 20,
    "list": [
      {
        "diagnosisCardId": "DIAG_001",
        "plantId": "PLANT_001",
        "sessionId": "SESSION_001",
        "analysisType": "normal",
        "healthScore": 85,
        "status": "healthy",
        "species": "虎皮兰",
        "issues": [],
        "suggestions": [
          {"type": "watering", "action": "适量浇水", "details": "每周1次"}
        ],
        "confidence": 0.92,
        "createdAt": "2026-03-22T10:00:00Z"
      }
    ]
  }
}
```

### 5.2 获取诊断详情

**接口**: `GET /api/diagnosis/{diagnosisCardId}`

**说明**: 获取指定诊断卡的详细信息

**路径参数**:

| 参数              | 类型     | 说明    |
| :-------------- | :----- | :---- |
| diagnosisCardId | string | 诊断卡ID |

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "diagnosisCardId": "DIAG_001",
    "messageId": "MSG_003",
    "plantId": "PLANT_001",
    "sessionId": "SESSION_001",
    "analysisType": "normal",
    "healthScore": 85,
    "status": "healthy",
    "species": "虎皮兰",
    "issues": [],
    "suggestions": [
      {"type": "watering", "action": "适量浇水", "details": "每周1次"}
    ],
    "confidence": 0.92,
    "contextUsed": {
      "environmentData": false,
      "careRecords": false,
      "historyDiagnosis": false
    },
    "aiResponse": "从图片来看，您的虎皮兰状态良好...",
    "createdAt": "2026-03-22T10:00:00Z"
  }
}
```

***

## 六、AI分析接口

### 6.1 触发AI分析

**接口**: `POST /api/ai/analyze`

**说明**: 触发AI分析，返回诊断结果

**请求参数**:

```json
{
  "sessionId": "string",        // 必填，会话ID
  "messageId": "string",        // 必填，消息ID
  "analysisType": "string",     // 必填，normal/deep
  "userMessage": "string",      // 必填，用户消息
  "imageUrls": ["string"],      // 可选，图片URL列表
  "contextConfig": {            // 可选，上下文开关
    "environmentData": true,
    "careRecords": false,
    "historyDiagnosis": true
  }
}
```

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "responseType": "analysisResult",
    "messageId": "MSG_003",
    "diagnosisCardId": "DIAG_001",
    "analysisType": "normal",
    "analysisTime": "2026-03-22T10:00:00Z",
    "aiResponse": "从图片来看，您的多肉植物叶片发黄...",
    "diagnosis": {
      "species": "冬美人",
      "healthScore": 85,
      "status": "healthy",
      "issues": [],
      "suggestions": [
        {"type": "watering", "action": "减少浇水", "details": "建议每周浇水1次"}
      ],
      "confidence": 0.92
    },
    "contextUsed": {
      "environmentData": false,
      "careRecords": false,
      "historyDiagnosis": false
    }
  }
}
```

***

## 七、环境数据接口

### 7.1 环境数据上报（统一入口）

**接口**: `POST /api/environment/readings`

**说明**: 环境数据上报统一入口，支持设备上报和用户补传

**认证方式**:
- 设备认证：硬件设备上报
- 用户认证：用户手动补传

**请求参数**:

```json
{
  "plantId": "string",           // 必填，植物ID
  "recordedAt": "string",        // 必填，记录时间 ISO8601
  "deviceId": "string",          // 必填，设备ID
  "isSupplement": false,         // 可选，是否为补传数据
  "metrics": [                   // 必填，指标数组
    {
      "metricCode": "temperature",
      "value": 22.5
    },
    {
      "metricCode": "humidity",
      "value": 60
    },
    {
      "metricCode": "soil_moisture",
      "value": 45
    }
  ]
}
```

**返回示例（正常上报）**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "readingId": "READ_001",
    "recordedAt": "2026-04-04T10:00:00Z",
    "isSupplement": false,
    "isStale": false
  }
}
```

**返回示例（补传覆盖补偿数据）**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "readingId": "READ_002",
    "recordedAt": "2026-04-04T08:00:00Z",
    "isSupplement": true,
    "isStale": false,
    "coveredCompensatedReading": true
  }
}
```

**错误码**:

| 错误码 | 说明 |
|:---:|:---|
| 400 | 缺少必要参数 |
| 404 | 植物或设备不存在 |
| 409 | 该时刻已有真实传感器数据，拒绝补传 |

### 7.2 获取实时环境数据

**接口**: `GET /api/environment/current`

**说明**: 获取植物的实时环境数据（传感器 + 天气）

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| plantId | string | 是 | 植物ID |
| recordedAt | string | 否 | 指定时间点，默认当前 |

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "plantId": "PLANT_001",
    "recordedAt": "2026-04-04T10:00:00Z",
    "deviceMetrics": [
      {
        "metricCode": "temperature",
        "name": "温度",
        "value": 22.5,
        "unit": "°C",
        "icon": "thermometer",
        "status": "normal",
        "minValue": 15,
        "maxValue": 30,
        "isStale": false
      },
      {
        "metricCode": "soil_moisture",
        "name": "土壤湿度",
        "value": 45,
        "unit": "%",
        "icon": "droplet",
        "status": "warning",
        "minValue": 30,
        "maxValue": 70,
        "isStale": false
      }
    ],
    "weatherMetrics": [
      {
        "metricCode": "temperature",
        "name": "室外温度",
        "value": 18.5,
        "unit": "°C",
        "icon": "sun",
        "status": "normal"
      }
    ],
    "taskStatus": {
      "sensor": "received",
      "weather": "received"
    }
  }
}
```

### 7.3 获取历史环境数据

**接口**: `GET /api/environment/history`

**说明**: 获取植物的历史环境数据

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| plantId | string | 是 | 植物ID |
| metricCode | string | 是 | 指标代码 |
| timeRange | string | 否 | 时间范围：24h/7d/30d，默认7d |
| dataSource | string | 否 | 数据来源：sensor/weather_api |

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {"time": "2026-04-01T10:00:00Z", "value": 21.5, "isStale": false},
      {"time": "2026-04-02T10:00:00Z", "value": 22.0, "isStale": false},
      {"time": "2026-04-03T10:00:00Z", "value": 22.0, "isStale": true},
      {"time": "2026-04-04T10:00:00Z", "value": 22.5, "isStale": false}
    ],
    "metricCode": "temperature",
    "metricName": "温度",
    "unit": "°C",
    "timeRange": "7d"
  }
}
```

**isStale 字段说明**:
- `true`: 该数据点为补偿数据（传感器未上报时从历史数据复制）
- `false`: 该数据点为真实传感器数据

***

## 八、设备相关接口

### 8.1 获取设备列表

**接口**: `GET /api/devices`

**说明**: 获取当前用户的所有设备列表

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 2,
    "list": [
      {
        "deviceId": "DEVICE_001",
        "deviceName": "环境监测器-客厅",
        "macAddress": "A1:B2:C3:D4:E5:F6",
        "status": "online",
        "boundPlantId": "PLANT_001",
        "boundPlant": {
          "plantId": "PLANT_001",
          "nickname": "大黄",
          "coverImageUrl": "https://example.com/plant1.jpg"
        },
        "batteryLevel": 85,
        "lastHeartbeat": "2026-04-04T10:00:00Z",
        "createdAt": "2026-03-01T10:00:00Z"
      }
    ]
  }
}
```

### 8.2 绑定设备

**接口**: `POST /api/devices/bind`

**说明**: 将设备绑定到植物

**请求参数**:

```json
{
  "macAddress": "string",      // 必填，设备MAC地址
  "deviceName": "string",      // 可选，设备名称
  "plantId": "string"          // 必填，植物ID
}
```

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "deviceId": "DEVICE_001",
    "macAddress": "A1:B2:C3:D4:E5:F6",
    "deviceName": "环境监测器-客厅",
    "status": "online",
    "boundPlantId": "PLANT_001",
    "message": "设备绑定成功"
  }
}
```

### 8.3 解绑设备

**接口**: `POST /api/devices/unbind`

**说明**: 解除设备与植物的绑定

**请求参数**:

```json
{
  "deviceId": "string"          // 必填，设备ID
}
```

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": null,
  "message": "设备解绑成功"
}
```

### 8.4 获取设备详情

**接口**: `GET /api/devices/{deviceId}`

**说明**: 获取设备详细信息

**路径参数**:

| 参数 | 类型 | 说明 |
|:---|:---|:---|
| deviceId | string | 设备ID |

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "deviceId": "DEVICE_001",
    "deviceName": "环境监测器-客厅",
    "macAddress": "A1:B2:C3:D4:E5:F6",
    "status": "online",
    "boundPlantId": "PLANT_001",
    "boundPlant": {
      "plantId": "PLANT_001",
      "nickname": "大黄",
      "species": "虎皮兰",
      "coverImageUrl": "https://example.com/plant1.jpg"
    },
    "batteryLevel": 85,
    "lastHeartbeat": "2026-04-04T10:00:00Z",
    "createdAt": "2026-03-01T10:00:00Z"
  }
}
```

***

## 九、文件相关接口

### 9.1 统一文件上传（规划中）

**接口**: `POST /api/files`

**说明**: 统一文件上传接口，支持单文件和多文件（规划中，尚未实现）

**状态**: 🔄 规划中

---

### 9.2 本地文件上传（当前在用）

**接口**: `POST /api/upload`

**说明**: 本地服务器文件上传，当前正在使用

**状态**: ✅ 已实现（待迁移到统一接口）

**请求方式**: multipart/form-data

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| file | File | 是 | 单文件上传 |

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "url": "https://example.com/uploads/2026-04-04/abc123.jpg",
    "filename": "abc123.jpg",
    "originalName": "plant.jpg",
    "size": 102400,
    "mimeType": "image/jpeg"
  }
}
```

### 9.3 多文件上传（当前在用）

**接口**: `POST /api/upload/multiple`

**说明**: 批量上传多个文件

**状态**: ✅ 已实现

**请求方式**: multipart/form-data

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| files | File[] | 是 | 多文件上传（最多5个）|

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "files": [
      {
        "url": "https://example.com/uploads/2026-04-04/abc123.jpg",
        "filename": "abc123.jpg",
        "originalName": "plant1.jpg",
        "size": 102400,
        "mimeType": "image/jpeg"
      }
    ]
  }
}
```

---

### 9.4 COS直传 - 获取上传签名（当前在用）

**接口**: `POST /api/cos/upload-sign`

**说明**: 获取腾讯云COS直传签名，用于小程序直传文件到COS

**状态**: ✅ 已实现

**请求参数**:

```json
{
  "filename": "string",     // 必填，文件名
  "fileType": "string"      // 必填，文件类型，如 "image/jpeg"
}
```

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "authorization": "...",
    "fileKey": "uploads/2026-04-04/abc123.jpg",
    "uploadUrl": "https://cos.ap-guangzhou.myqcloud.com/..."
  }
}
```

### 9.5 COS直传 - 获取临时访问链接（当前在用）

**接口**: `POST /api/cos/temp-url`

**说明**: 获取COS文件的临时访问链接

**状态**: ✅ 已实现

**请求参数**:

```json
{
  "fileKey": "string"       // 必填，文件在COS中的key
}
```

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "url": "https://cos.ap-guangzhou.myqcloud.com/...",
    "expiresIn": 3600
  }
}
```

### 9.6 COS直传 - 删除文件（当前在用）

**接口**: `DELETE /api/cos/delete`

**说明**: 删除COS上的文件

**状态**: ✅ 已实现

**请求参数**:

```json
{
  "fileKey": "string"       // 必填，文件在COS中的key
}
```

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

---

### 9.7 接口迁移计划

| 当前接口 | 状态 | 迁移目标 | 计划时间 |
|:---|:---:|:---|:---:|
| `POST /api/upload` | ✅ 在用 | `POST /api/files` | 待定 |
| `POST /api/upload/multiple` | ✅ 在用 | `POST /api/files` | 待定 |
| `POST /api/cos/upload-sign` | ✅ 在用 | `POST /api/files/upload-url` | 待定 |
| `POST /api/cos/temp-url` | ✅ 在用 | `GET /api/files/:id/url` | 待定 |
| `DELETE /api/cos/delete` | ✅ 在用 | `DELETE /api/files/:id` | 待定 |

***

## 十、养护记录接口

### 10.1 获取养护记录

**接口**: `GET /api/care-records`

**说明**: 获取植物的养护记录

**请求参数**:

| 参数       | 类型     |  必填 | 说明        |
| :------- | :----- | :-: | :-------- |
| plantId  | string |  是  | 植物ID      |
| page     | int    |  否  | 页码，默认1    |
| pageSize | int    |  否  | 每页数量，默认20 |

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 15,
    "page": 1,
    "pageSize": 20,
    "list": [
      {
        "recordId": "RECORD_001",
        "plantId": "PLANT_001",
        "actionType": "water",
        "description": "手动浇水约200ml",
        "performedAt": "2026-03-22T08:30:00Z",
        "createdAt": "2026-03-22T08:30:00Z"
      }
    ]
  }
}
```

### 10.2 创建养护记录

**接口**: `POST /api/care-records`

**说明**: 创建新的养护记录

**请求参数**:

```json
{
  "plantId": "string",          // 必填，植物ID
  "actionType": "string",       // 必填，操作类型
  "description": "string",      // 可选，描述
  "performedAt": "string"       // 可选，执行时间
}
```

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "recordId": "RECORD_016",
    "plantId": "PLANT_001",
    "actionType": "water",
    "description": "手动浇水约200ml",
    "performedAt": "2026-03-22T10:00:00Z",
    "createdAt": "2026-03-22T10:00:00Z"
  }
}
```

### 10.3 更新养护记录

**接口**: `PUT /api/care-records/{recordId}`

**说明**: 更新指定养护记录的信息

**请求方式**: PUT

**Content-Type**: application/json

**请求参数**:

**路径参数**:

| 参数名      |   类型   |  必填 | 说明                 |
| :------- | :----: | :-: | :----------------- |
| recordId | String |  是  | 养护记录ID，如"REC\_001" |

**请求体参数**:

| 参数名         |   类型   |  必填 | 说明   | 示例                     |
| :---------- | :----: | :-: | :--- | :--------------------- |
| actionType  | String |  否  | 操作类型 | "water"                |
| description | String |  否  | 操作描述 | "浇透水"                  |
| performedAt | String |  否  | 操作时间 | "2026-03-26T14:30:00Z" |

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "recordId": "REC_001",
    "plantId": "PLANT_001",
    "userId": "USER_001",
    "actionType": "water",
    "description": "浇透水",
    "performedAt": "2026-03-26T14:30:00Z",
    "createdAt": "2026-03-26T10:00:00Z",
    "updatedAt": "2026-03-26T15:00:00Z"
  }
}
```

**错误响应**:

| 状态码 | 说明    | 场景         |
| :-: | :---- | :--------- |
| 400 | 参数错误  | 请求参数格式不正确  |
| 401 | 未授权   | Token无效或过期 |
| 403 | 禁止访问  | 无权修改该记录    |
| 404 | 记录不存在 | recordId无效 |
| 500 | 服务器错误 | 系统内部错误     |

**前端调用示例**:

```javascript
wx.request({
  url: `${BASE_URL}/api/care-records/${recordId}`,
  method: 'PUT',
  header: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  data: {
    actionType: 'water',
    description: '浇透水',
    performedAt: '2026-03-26T14:30:00Z'
  },
  success: (res) => {
    if (res.data.code === 200) {
      // 更新成功，刷新列表
      this.loadCareRecords();
    }
  }
});
```

### 10.4 删除养护记录

**接口**: `DELETE /api/care-records/{recordId}`

**说明**: 删除指定养护记录

**请求方式**: DELETE

**请求参数**:

**路径参数**:

| 参数名      |   类型   |  必填 | 说明     |
| :------- | :----: | :-: | :----- |
| recordId | String |  是  | 养护记录ID |

**返回示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "success": true
  }
}
```

**错误响应**:

| 状态码 | 说明    | 场景         |
| :-: | :---- | :--------- |
| 401 | 未授权   | Token无效或过期 |
| 403 | 禁止访问  | 无权删除该记录    |
| 404 | 记录不存在 | recordId无效 |
| 500 | 服务器错误 | 系统内部错误     |

**前端调用示例**:

```javascript
wx.request({
  url: `${BASE_URL}/api/care-records/${recordId}`,
  method: 'DELETE',
  header: {
    'Authorization': `Bearer ${token}`
  },
  success: (res) => {
    if (res.data.code === 200) {
      // 删除成功，刷新列表
      this.loadCareRecords();
      wx.showToast({ title: '删除成功' });
    }
  }
});
```

***

## 十一、接口汇总表

### 按领域组织

#### 用户域

| 接口 | 方法 | 路径 | 说明 |
|:---|:---:|:---|:---|
| 用户登录 | POST | /api/users/login | 微信小程序登录 |
| 游客登录 | POST | /api/users/guest-login | 游客登录 |
| 获取用户信息 | GET | /api/users/profile | 获取当前用户信息 |
| 更新用户信息 | PUT | /api/users/profile | 更新用户信息 |
| 获取用户设置 | GET | /api/users/settings | 获取用户通知设置 |
| 更新用户设置 | PUT | /api/users/settings | 更新用户通知设置 |

#### 植物域

| 接口 | 方法 | 路径 | 说明 |
|:---|:---:|:---|:---|
| 获取植物列表 | GET | /api/plants | 获取用户植物列表 |
| 创建植物 | POST | /api/plants | 创建植物档案 |
| 获取植物详情 | GET | /api/plants/{plantId} | 获取植物详情 |
| 更新植物 | PUT | /api/plants/{plantId} | 更新植物信息 |
| 删除植物 | DELETE | /api/plants/{plantId} | 删除植物档案 |
| 获取养护记录 | GET | /api/care-records | 获取养护记录 |
| 创建养护记录 | POST | /api/care-records | 创建养护记录 |
| 更新养护记录 | PUT | /api/care-records/{recordId} | 更新养护记录 |
| 删除养护记录 | DELETE | /api/care-records/{recordId} | 删除养护记录 |
| 获取诊断历史 | GET | /api/diagnosis | 获取诊断历史 |
| 获取诊断详情 | GET | /api/diagnosis/{diagnosisCardId} | 获取诊断详情 |

#### 设备域

| 接口 | 方法 | 路径 | 说明 |
|:---|:---:|:---|:---|
| 获取设备列表 | GET | /api/devices | 获取设备列表 |
| 绑定设备 | POST | /api/devices/bind | 绑定设备到植物 |
| 解绑设备 | POST | /api/devices/unbind | 解绑设备 |
| 获取设备详情 | GET | /api/devices/{deviceId} | 获取设备详情 |
| ~~设备数据上报~~ | ~~POST~~ | ~~`/api/devices/data`~~ | ~~已废弃，使用环境数据上报~~ |
| **环境数据上报** | **POST** | **/api/environment/readings** | **统一入口（新增）** |
| 获取实时环境数据 | GET | /api/environment/current | 获取实时环境数据 |
| 获取历史环境数据 | GET | /api/environment/history | 获取历史环境数据 |

#### AI域

| 接口 | 方法 | 路径 | 说明 |
|:---|:---:|:---|:---|
| 获取会话列表 | GET | /api/sessions | 获取会话列表 |
| 创建会话 | POST | /api/sessions | 创建新会话 |
| 获取会话详情 | GET | /api/sessions/{sessionId} | 获取会话详情 |
| 更新会话 | PUT | /api/sessions/{sessionId} | 更新会话 |
| 删除会话 | DELETE | /api/sessions/{sessionId} | 删除会话及消息 |
| 获取会话消息 | GET | /api/sessions/{sessionId}/messages | 获取消息列表 |
| 发送消息 | POST | /api/sessions/{sessionId}/messages | 发送消息 |
| 标记已读 | POST | /api/sessions/{sessionId}/read | 标记已读 |
| 升级会话 | POST | /api/sessions/{sessionId}/upgrade | 咨询会话升级为植物会话 |
| 触发AI分析 | POST | /api/ai/analyze | 触发AI分析 |

#### 基础设施域

| 接口 | 方法 | 路径 | 说明 | 状态 |
|:---|:---:|:---|:---|:---:|
| 文件上传 | POST | /api/files | 统一文件上传 | 🔄 规划中 |
| 获取上传链接 | POST | /api/files/upload-url | 获取云存储上传链接 | 🔄 规划中 |
| 获取访问链接 | GET | /api/files/{fileId}/url | 获取文件访问链接 | 🔄 规划中 |
| 删除文件 | DELETE | /api/files/{fileId} | 删除文件 | 🔄 规划中 |
| ~~本地上传~~ | ~~POST~~ | ~~`/api/upload`~~ | ~~待迁移~~ | ⚠️ 废弃 |
| ~~云存储上传~~ | ~~POST~~ | ~~`/api/storage/upload`~~ | ~~待迁移~~ | ⚠️ 废弃 |
| ~~COS上传签名~~ | ~~POST~~ | ~~`/api/cos/upload-sign`~~ | ~~待迁移~~ | ⚠️ 废弃 |
| 获取日志列表 | GET | /api/logs/files | 获取日志文件列表 | ✅ |
| 获取日志内容 | GET | /api/logs/content | 获取日志内容 | ✅ |
| 搜索日志 | GET | /api/logs/search | 搜索日志 | ✅ |
| 清除日志 | DELETE | /api/logs/clear | 清除日志 | ✅ |

## 十二、API实现状态追踪

### 12.1 按模块统计

| 模块 | 总接口数 | 已实现 | 规划中 | 废弃 | 实现率 |
|:---|:---:|:---:|:---:|:---:|:---:|
| 用户域 | 9 | 9 | 0 | 0 | 100% |
| 植物域 | 10 | 10 | 0 | 0 | 100% |
| 设备域 | 7 | 5 | 2 | 0 | 71% |
| AI域 | 10 | 10 | 0 | 0 | 100% |
| 基础设施域 | 13 | 9 | 4 | 0 | 69% |
| **总计** | **49** | **43** | **6** | **0** | **88%** |

### 12.2 详细接口状态

#### 用户域 - 全部实现 ✅

| 接口 | 方法 | 路径 | 状态 | 备注 |
|:---|:---:|:---|:---:|:---|
| 微信登录 | POST | /api/users/login | ✅ | 已实现 |
| 游客登录 | POST | /api/users/guest-login | ✅ | 已实现 |
| 获取用户信息 | GET | /api/users/profile | ✅ | 已实现 |
| 更新用户信息 | PUT | /api/users/profile | ✅ | 已实现 |
| 获取用户设置 | GET | /api/users/settings | ✅ | 已实现 |
| 更新用户设置 | PUT | /api/users/settings | ✅ | 已实现 |
| 获取用户配置项 | GET | /api/users/config/:configKey | ✅ | 已实现 |
| 设置用户配置项 | POST | /api/users/config | ✅ | 已实现 |

#### 植物域 - 全部实现 ✅

| 接口 | 方法 | 路径 | 状态 | 备注 |
|:---|:---:|:---|:---:|:---|
| 获取植物列表 | GET | /api/plants | ✅ | 已实现 |
| 创建植物 | POST | /api/plants | ✅ | 已实现 |
| 获取植物详情 | GET | /api/plants/{plantId} | ✅ | 已实现 |
| 更新植物 | PUT | /api/plants/{plantId} | ✅ | 已实现 |
| 删除植物 | DELETE | /api/plants/{plantId} | ✅ | 已实现 |
| 获取养护记录 | GET | /api/care-records | ✅ | 已实现 |
| 创建养护记录 | POST | /api/care-records | ✅ | 已实现 |
| 更新养护记录 | PUT | /api/care-records/{recordId} | ✅ | 已实现 |
| 删除养护记录 | DELETE | /api/care-records/{recordId} | ✅ | 已实现 |
| 获取诊断历史 | GET | /api/diagnosis | ✅ | 已实现 |
| 获取诊断详情 | GET | /api/diagnosis/{diagnosisCardId} | ✅ | 已实现 |

#### 设备域 - 部分实现 🔄

| 接口 | 方法 | 路径 | 状态 | 备注 |
|:---|:---:|:---|:---:|:---|
| 获取设备列表 | GET | /api/devices | ✅ | 已实现 |
| 绑定设备 | POST | /api/devices/bind | ✅ | 已实现 |
| 解绑设备 | POST | /api/devices/unbind | ✅ | 已实现 |
| 获取设备详情 | GET | /api/devices/{deviceId} | ✅ | 已实现 |
| 环境数据上报 | POST | /api/environment/readings | 🔄 | 模型已定义，补偿机制待实现 |
| 获取实时环境数据 | GET | /api/environment/current | 🔄 | 接口设计中 |
| 获取历史环境数据 | GET | /api/environment/history | 🔄 | 接口设计中 |

#### AI域 - 全部实现 ✅

| 接口 | 方法 | 路径 | 状态 | 备注 |
|:---|:---:|:---|:---:|:---|
| 获取会话列表 | GET | /api/sessions | ✅ | 已实现 |
| 创建会话 | POST | /api/sessions | ✅ | 已实现 |
| 获取会话详情 | GET | /api/sessions/{sessionId} | ✅ | 已实现 |
| 更新会话 | PUT | /api/sessions/{sessionId} | ✅ | 已实现 |
| 删除会话 | DELETE | /api/sessions/{sessionId} | ✅ | 已实现 |
| 获取会话消息 | GET | /api/sessions/{sessionId}/messages | ✅ | 已实现 |
| 发送消息 | POST | /api/sessions/{sessionId}/messages | ✅ | 已实现 |
| 标记已读 | POST | /api/sessions/{sessionId}/read | ✅ | 已实现 |
| 升级会话 | POST | /api/sessions/{sessionId}/upgrade | ✅ | 已实现 |
| 触发AI分析 | POST | /api/ai/analyze | ✅ | 已实现 |

#### 基础设施域 - 部分实现 🔄

| 接口 | 方法 | 路径 | 状态 | 备注 |
|:---|:---:|:---|:---:|:---|
| 统一文件上传 | POST | /api/files | 🔄 | 规划中 |
| 统一获取上传链接 | POST | /api/files/upload-url | 🔄 | 规划中 |
| 统一获取访问链接 | GET | /api/files/{fileId}/url | 🔄 | 规划中 |
| 统一删除文件 | DELETE | /api/files/{fileId} | 🔄 | 规划中 |
| 本地文件上传 | POST | /api/upload | ✅ | 已实现（待迁移） |
| 多文件上传 | POST | /api/upload/multiple | ✅ | 已实现（待迁移） |
| COS上传签名 | POST | /api/cos/upload-sign | ✅ | 已实现（待迁移） |
| COS临时URL | POST | /api/cos/temp-url | ✅ | 已实现（待迁移） |
| COS删除文件 | DELETE | /api/cos/delete | ✅ | 已实现（待迁移） |
| 获取日志列表 | GET | /api/logs/files | ✅ | 已实现 |
| 获取日志内容 | GET | /api/logs/content | ✅ | 已实现 |
| 搜索日志 | GET | /api/logs/search | ✅ | 已实现 |
| 清除日志 | DELETE | /api/logs/clear | ✅ | 已实现 |

**图例说明**:
- ✅ 已实现
- 🔄 规划中/进行中
- ⚠️ 废弃

***

**角色**: 后端开发 / 前端开发
**版本**: V3.2
**审核状态**: 已完成

**关联文档**:

- [01-系统架构设计.md](./01-系统架构设计.md)
- [02-数据库设计.md](./02-数据库设计.md)
- [04-业务流程/README.md](./04-业务流程/README.md)

***

## 十三、变更记录

| 日期 | 版本 | 变更内容 |
|:---|:---:|:---|
| 2026-03-22 | v1.0 | 初始版本，完成基础接口设计 |
| 2026-03-25 | v1.1 | 补充缺失接口：会话升级、删除会话、用户设置、扩展用户信息（仪表盘） |
| 2026-03-25 | v1.1 | 补充错误码：1005-1008 |
| 2026-03-26 | v1.2 | 同步前端养护记录CRUD实现，新增接口 |
| 2026-04-04 | **v3.0** | **重构接口设计，与架构设计 V3.0 同步** |
| 2026-04-04 | v3.0 | 新增环境数据上报统一入口 POST /api/environment/readings |
| 2026-04-04 | v3.0 | 废弃 POST /api/devices/data，统一到环境模块 |
| 2026-04-04 | v3.0 | 新增文件模块接口规划 /api/files |
| 2026-04-04 | v3.0 | 按领域重新组织接口汇总表 |
| 2026-04-04 | v3.0 | 新增错误码：1009-1010 |
| 2026-04-04 | v3.0 | 更新环境数据接口返回格式（deviceMetrics + weatherMetrics） |
| 2026-04-04 | v3.0 | 补充设备认证流程详细说明（1.3.2节） |
| 2026-04-05 | **v3.1** | **文档去重与章节重组** |
| 2026-04-05 | v3.1 | 删除重复的第五章设备接口（旧版），保留第八章（新版完整版） |
| 2026-04-05 | v3.1 | 重排章节编号：一~十二连续编号，消除重复 |
| 2026-04-05 | v3.1 | 统一设备接口定义：使用macAddress绑定参数，返回boundPlant嵌套对象 |
| 2026-04-05 | v3.2 | 修复文档格式问题（删除多余符号） |
| 2026-04-05 | v3.2 | 统一用户模块响应字段为 camelCase |
| 2026-04-05 | v3.2 | 修复会话消息响应结构（messages → list） |
| 2026-04-05 | v3.2 | 补充标记已读接口详细说明 |

