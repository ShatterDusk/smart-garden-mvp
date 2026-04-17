# 智能园艺助手 - API 接口文档

**版本**: V4.0  
**日期**: 2026-04-14  
**状态**: ✅ 与代码实现同步  

---

## 目录

1. [接口规范](#一接口规范)
2. [认证机制](#二认证机制)
3. [用户域接口](#三用户域接口)
4. [植物域接口](#四植物域接口)
5. [设备域接口](#五设备域接口)
6. [AI域接口](#六ai域接口)
7. [环境数据接口](#七环境数据接口)
8. [文件上传接口](#八文件上传接口)
9. [日志接口](#九日志接口)
10. [天气接口](#十天气接口)
11. [错误码定义](#十一错误码定义)
12. [接口汇总表](#十二接口汇总表)

---

## 一、接口规范

### 1.1 基础信息

| 项目 | 说明 |
|:---|:---|
| 协议 | HTTPS |
| 数据格式 | JSON |
| 字符编码 | UTF-8 |
| 基础URL | `https://api.gardenassistant.com` |
| API前缀 | `/api` |

### 1.2 URL 设计规范

| 规则 | 正确示例 | 错误示例 |
|:---|:---|:---|
| 使用 kebab-case | `/api/care-records` | `/api/careRecords` |
| 资源用名词 | `/api/plants` | `/api/get-plants` |
| 嵌套不超过2层 | `/api/plants/:id/environment` | `/api/plants/:id/sessions/:sid/messages` |
| 路径参数用资源ID | `/api/plants/:plantId` | `/api/plants?id=xxx` |

### 1.3 HTTP 方法语义

| 方法 | 语义 | 幂等性 | 示例 |
|:---|:---|:---:|:---|
| GET | 查询资源 | ✅ | `GET /api/plants` |
| POST | 创建资源 / 执行操作 | ❌ | `POST /api/plants` |
| PUT | 全量更新资源 | ✅ | `PUT /api/plants/:id` |
| DELETE | 删除资源 | ✅ | `DELETE /api/plants/:id` |

### 1.4 通用响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

**字段说明**:
- `code`: 0 表示成功，非0表示错误（见 [错误码定义](#十一错误码定义)）
- `message`: 提示信息
- `data`: 响应数据，类型根据接口不同而变化

---

## 二、认证机制

### 2.1 用户认证（JWT Token）

小程序用户请求使用 JWT Token 认证，在请求头中携带：

```
Authorization: Bearer <token>
```

Token 通过登录接口获取，有效期 7 天。

**适用接口**: 所有 `/api/*` 接口（除登录相关）

### 2.2 设备认证（Device ID）

硬件设备数据上报使用设备认证，在请求体中携带 `deviceId`。

**适用接口**: 
- `POST /api/devices/data` (设备数据上报)

### 2.3 日志访问认证

日志管理接口需要特殊认证，在请求头中携带：

```
X-Log-Access-Key: <log_access_key>
```

**适用接口**: 
- `GET /api/logs/*`
- `DELETE /api/logs`

---

## 三、用户域接口

### 3.1 用户登录

**接口**: `POST /api/users/login`

**说明**: 微信小程序登录，通过 wx.login 获取 code

**认证**: 无需认证

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| code | string | 是 | 微信登录 code |
| nickname | string | 否 | 微信昵称 |
| avatarUrl | string | 否 | 头像 URL |
| gender | number | 否 | 性别: 0-未知, 1-男, 2-女 |

**请求示例**:
```json
{
  "code": "wx_login_code_xxx",
  "nickname": "植物爱好者",
  "avatarUrl": "https://example.com/avatar.jpg",
  "gender": 0
}
```

**响应示例**:
```json
{
  "code": 0,
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

---

### 3.2 游客登录

**接口**: `POST /api/users/guest-login`

**说明**: 游客模式登录，无需微信授权

**认证**: 无需认证

**请求参数**: 无

**响应示例**: 同用户登录

---

### 3.3 获取用户信息

**接口**: `GET /api/users/profile`

**说明**: 获取当前登录用户信息

**认证**: 需要用户认证

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| include | string | 否 | 包含额外数据，如 `dashboard` |

**响应示例**:
```json
{
  "code": 0,
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

---

### 3.4 更新用户信息

**接口**: `PUT /api/users/profile`

**说明**: 更新当前用户信息

**认证**: 需要用户认证

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| nickname | string | 否 | 昵称，1-50字符 |
| avatarUrl | string | 否 | 头像 URL，最大500字符 |

**请求示例**:
```json
{
  "nickname": "新昵称",
  "avatarUrl": "https://example.com/new-avatar.jpg"
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "userId": "USER_001",
    "nickname": "新昵称",
    "avatarUrl": "https://example.com/new-avatar.jpg",
    "updatedAt": "2026-03-22T10:00:00Z"
  }
}
```

---

### 3.5 获取用户设置

**接口**: `GET /api/users/settings`

**说明**: 获取当前用户的通知设置和偏好设置

**认证**: 需要用户认证

**响应示例**:
```json
{
  "code": 0,
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

---

### 3.6 更新用户设置

**接口**: `PUT /api/users/settings`

**说明**: 更新用户的通知设置和偏好设置

**认证**: 需要用户认证

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| notification | object | 否 | 通知设置 |
| notification.diagnosisReminder | boolean | 否 | 诊断提醒 |
| notification.careReminder | boolean | 否 | 养护提醒 |
| notification.environmentAlert | boolean | 否 | 环境告警 |
| notification.reminderTime | string | 否 | 提醒时间，格式 HH:mm |
| preferences | object | 否 | 偏好设置 |
| preferences.language | string | 否 | 语言: zh-CN, en-US |

**请求示例**:
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

---

### 3.7 获取用户配置项

**接口**: `GET /api/users/config/:configKey`

**说明**: 获取指定用户配置项

**认证**: 需要用户认证

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| configKey | string | 是 | 配置键名 |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "configKey": "theme",
    "configValue": "light",
    "configType": "preference"
  }
}
```

---

### 3.8 设置用户配置项

**接口**: `POST /api/users/config`

**说明**: 设置用户配置项

**认证**: 需要用户认证

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| configKey | string | 是 | 配置键名 |
| configValue | any | 是 | 配置值 |
| configType | string | 否 | 配置类型，默认 preference |

**请求示例**:
```json
{
  "configKey": "theme",
  "configValue": "dark",
  "configType": "preference"
}
```

---

## 四、植物域接口

### 4.1 获取植物列表

**接口**: `GET /api/plants`

**说明**: 获取当前用户的所有植物列表

**认证**: 需要用户认证

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 20，最大 100 |

**响应示例**:
```json
{
  "code": 0,
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

---

### 4.2 创建植物

**接口**: `POST /api/plants`

**说明**: 创建新的植物档案

**认证**: 需要用户认证

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| nickname | string | 是 | 植物昵称，1-50字符 |
| species | string | 否 | 品种名称，最大100字符 |
| plantCategory | string | 是 | 植物分类: succulent(多肉), flower(花卉), foliage(观叶), vegetable(蔬菜), herb(香草), other(其他) |
| coverImageUrl | string | 否 | 封面图片 URL |
| locationName | string | 否 | 位置名称，最大100字符 |
| locationCode | string | 否 | 位置代码 |
| locationLat | number | 否 | 位置纬度 |
| locationLng | number | 否 | 位置经度 |
| currentDeviceId | string | 否 | 当前绑定设备ID |
| remark | string | 否 | 备注 |
| firstDiagnosis | object | 否 | 首诊信息 |
| firstDiagnosis.diagnosisCardId | string | 否 | 诊断卡ID |
| firstDiagnosis.healthScore | number | 否 | 健康分数，0-100 |
| firstDiagnosis.status | string | 否 | 状态: healthy, warning, critical |

**请求示例**:
```json
{
  "nickname": "新植物",
  "species": "多肉",
  "plantCategory": "succulent",
  "coverImageUrl": "https://example.com/new-plant.jpg",
  "locationName": "阳台",
  "firstDiagnosis": {
    "healthScore": 85,
    "status": "healthy"
  }
}
```

**响应示例**:
```json
{
  "code": 0,
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

---

### 4.3 获取植物详情

**接口**: `GET /api/plants/:plantId`

**说明**: 获取指定植物的详细信息

**认证**: 需要用户认证

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| plantId | string | 是 | 植物ID |

**响应示例**:
```json
{
  "code": 0,
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

---

### 4.4 更新植物

**接口**: `PUT /api/plants/:plantId`

**说明**: 更新植物档案信息

**认证**: 需要用户认证

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| plantId | string | 是 | 植物ID |

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| nickname | string | 否 | 植物昵称 |
| species | string | 否 | 品种名称 |
| plantCategory | string | 否 | 植物分类 |
| coverImageUrl | string | 否 | 封面图片 URL |
| locationName | string | 否 | 位置名称 |
| locationCode | string | 否 | 位置代码 |
| locationLat | number | 否 | 位置纬度 |
| locationLng | number | 否 | 位置经度 |
| currentDeviceId | string | 否 | 当前绑定设备ID |
| remark | string | 否 | 备注 |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "plantId": "PLANT_001",
    "nickname": "更新后的名字",
    "updatedAt": "2026-03-22T10:00:00Z"
  }
}
```

---

### 4.5 删除植物

**接口**: `DELETE /api/plants/:plantId`

**说明**: 删除植物档案

**认证**: 需要用户认证

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| plantId | string | 是 | 植物ID |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

---

## 五、设备域接口

### 5.1 获取设备列表

**接口**: `GET /api/devices`

**说明**: 获取当前用户的所有设备列表

**认证**: 需要用户认证

**响应示例**:
```json
{
  "code": 0,
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

---

### 5.2 绑定设备

**接口**: `POST /api/devices/bind`

**说明**: 将设备绑定到植物

**认证**: 需要用户认证

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| macAddress | string | 是 | 设备 MAC 地址，格式: AA:BB:CC:DD:EE:FF |
| deviceName | string | 否 | 设备名称，最大50字符 |
| plantId | string | 否 | 要绑定的植物ID |

**请求示例**:
```json
{
  "macAddress": "A1:B2:C3:D4:E5:F6",
  "deviceName": "环境监测器-客厅",
  "plantId": "PLANT_001"
}
```

**响应示例**:
```json
{
  "code": 0,
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

---

### 5.3 解绑设备

**接口**: `POST /api/devices/unbind`

**说明**: 解除设备与植物的绑定

**认证**: 需要用户认证

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| deviceId | string | 是 | 设备ID |

**请求示例**:
```json
{
  "deviceId": "DEVICE_001"
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

---

### 5.4 获取设备详情

**接口**: `GET /api/devices/:deviceId`

**说明**: 获取设备详细信息

**认证**: 需要用户认证

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| deviceId | string | 是 | 设备ID |

**响应示例**:
```json
{
  "code": 0,
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

---

### 5.5 设备数据上报

**接口**: `POST /api/devices/data`

**说明**: 设备数据上报（设备端调用），用于硬件设备上报环境监测数据

**认证**: 需要设备认证（`deviceAuthMiddleware`）

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| deviceId | string | 是 | 设备ID |
| plantId | string | 否 | 植物ID（可选，设备已绑定时可不传） |
| metrics | array | 是 | 指标数据数组 |
| metrics[].metricCode | string | 是 | 指标代码：temperature/humidity/soil_moisture/light/soil_temperature |
| metrics[].value | number | 是 | 指标值 |
| timestamp | string | 否 | 记录时间戳，ISO8601格式，默认当前时间 |
| isSupplement | boolean | 否 | 是否为补传数据，默认false |

**请求示例**:
```json
{
  "deviceId": "DEVICE_001",
  "plantId": "PLANT_001",
  "timestamp": "2026-04-04T10:00:00Z",
  "isSupplement": false,
  "metrics": [
    { "metricCode": "temperature", "value": 22.5 },
    { "metricCode": "humidity", "value": 60 },
    { "metricCode": "soil_moisture", "value": 45 }
  ]
}
```

---

## 六、AI域接口

### 6.1 获取会话列表

**接口**: `GET /api/sessions`

**说明**: 获取当前用户的所有会话列表

**认证**: 需要用户认证

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| type | string | 否 | 会话类型: consultation(咨询), plant(植物) |
| plantId | string | 否 | 植物ID（查询植物会话时） |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 20 |

**响应示例**:
```json
{
  "code": 0,
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

---

### 6.2 创建会话

**接口**: `POST /api/sessions`

**说明**: 创建新会话

**认证**: 需要用户认证

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| type | string | 是 | 会话类型: consultation(咨询), plant(植物) |
| plantId | string | 否 | 植物ID（植物会话时必填） |
| title | string | 否 | 会话标题，最大100字符 |

**请求示例**:
```json
{
  "type": "consultation",
  "title": "咨询会话"
}
```

**响应示例**:
```json
{
  "code": 0,
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

---

### 6.3 获取会话详情

**接口**: `GET /api/sessions/:sessionId`

**说明**: 获取指定会话的详细信息

**认证**: 需要用户认证

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| sessionId | string | 是 | 会话ID |

**响应示例**:
```json
{
  "code": 0,
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

---

### 6.4 更新会话

**接口**: `PUT /api/sessions/:sessionId`

**说明**: 更新会话信息

**认证**: 需要用户认证

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| sessionId | string | 是 | 会话ID |

**请求参数**: 根据业务需求动态确定

---

### 6.5 删除会话

**接口**: `DELETE /api/sessions/:sessionId`

**说明**: 删除指定会话，级联删除该会话的所有消息

**认证**: 需要用户认证

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| sessionId | string | 是 | 会话ID |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "sessionId": "SESSION_001",
    "deletedAt": "2026-03-22T10:00:00Z"
  }
}
```

---

### 6.6 获取会话消息

**接口**: `GET /api/sessions/:sessionId/messages`

**说明**: 获取指定会话的消息列表

**认证**: 需要用户认证

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| sessionId | string | 是 | 会话ID |

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| before | string | 否 | 获取此消息ID之前的消息（分页用） |
| limit | number | 否 | 数量限制，默认 20，最大 100 |

**响应示例**:
```json
{
  "code": 0,
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

---

### 6.7 发送消息

**接口**: `POST /api/sessions/:sessionId/messages`

**说明**: 向指定会话发送消息，AI 会自动回复

**认证**: 需要用户认证

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| sessionId | string | 是 | 会话ID |

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| contentType | string | 是 | 内容类型: text(文字), image(图片), diagnosis(诊断) |
| content | string | 否 | 文字内容 |
| imageUrls | array | 否 | 图片 URL 列表 |
| contextConfig | object | 否 | 上下文开关（植物会话有效） |
| contextConfig.environmentData | boolean | 否 | 是否包含环境数据 |
| contextConfig.careRecords | boolean | 否 | 是否包含养护记录 |
| contextConfig.historyDiagnosis | boolean | 否 | 是否包含历史诊断 |

**请求示例**:
```json
{
  "contentType": "text",
  "content": "那应该怎么浇水？",
  "contextConfig": {
    "environmentData": true,
    "careRecords": false,
    "historyDiagnosis": true
  }
}
```

**响应示例**:
```json
{
  "code": 0,
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

**注意**: AI 消息响应可能需要较长时间（最多 35 秒），前端需要设置超时时间。

---

### 6.8 标记会话已读

**接口**: `POST /api/sessions/:sessionId/read`

**说明**: 标记会话中所有消息为已读

**认证**: 需要用户认证

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| sessionId | string | 是 | 会话ID |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "已标记为已读"
  }
}
```

---

### 6.9 升级会话

**接口**: `POST /api/sessions/:sessionId/upgrade`

**说明**: 将咨询会话升级为植物会话（修改类型并绑定植物档案），保留历史消息

**认证**: 需要用户认证

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| sessionId | string | 是 | 会话ID |

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| plantId | string | 是 | 要关联的植物ID |

**请求示例**:
```json
{
  "plantId": "PLANT_001"
}
```

**响应示例**:
```json
{
  "code": 0,
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
- 会话类型: `consultation` → `plant`
- 上下文开关: 从不可用变为可用
- AI分析类型: `normal` → `deep`

---

### 6.10 触发 AI 分析

**接口**: `POST /api/ai/analyze`

**说明**: 手动触发 AI 分析（通常由发送消息接口自动调用）

**认证**: 需要用户认证

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| sessionId | string | 是 | 会话ID |
| messageId | string | 是 | 消息ID |
| analysisType | string | 是 | 分析类型: normal(普通), deep(深度) |
| userMessage | string | 是 | 用户消息内容 |
| imageUrls | array | 否 | 图片 URL 列表 |
| contextConfig | object | 否 | 上下文开关 |

**响应示例**:
```json
{
  "code": 0,
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

---

## 七、环境数据接口

### 7.1 获取实时环境数据

**接口**: `GET /api/environment/current`

**说明**: 获取植物的实时环境数据（传感器 + 天气）

**认证**: 需要用户认证

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| plantId | string | 是 | 植物ID |
| recordedAt | string | 否 | 指定时间点，默认当前，ISO8601格式 |

**响应示例**:
```json
{
  "code": 0,
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

**字段说明**:
- `isStale`: `true` 表示补偿数据（传感器未上报时从历史数据复制），`false` 表示真实传感器数据
- `status`: 指标状态 `normal`(正常), `warning`(警告), `critical`(危险)

---

### 7.2 获取历史环境数据

**接口**: `GET /api/environment/history`

**说明**: 获取植物的历史环境数据

**认证**: 需要用户认证

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| plantId | string | 是 | 植物ID |
| metricCode | string | 是 | 指标代码: temperature, humidity, soil_moisture, light 等 |
| timeRange | string | 否 | 时间范围: 24h(24小时), 7d(7天), 30d(30天)，默认 7d |
| dataSource | string | 否 | 数据来源: sensor(传感器), weather_api(天气API), compensation(补偿数据) |

**响应示例**:
```json
{
  "code": 0,
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

---

## 八、文件上传接口

### 8.1 COS 直传 - 获取上传签名

**接口**: `POST /api/cos/upload-sign`

**说明**: 获取腾讯云 COS 直传签名，用于小程序直传文件到 COS

**认证**: 需要用户认证

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| filename | string | 是 | 文件名 |
| fileType | string | 是 | 文件类型，如 `image/jpeg` |

**请求示例**:
```json
{
  "filename": "plant.jpg",
  "fileType": "image/jpeg"
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "authorization": "...",
    "fileKey": "uploads/2026-04-04/abc123.jpg",
    "uploadUrl": "https://cos.ap-guangzhou.myqcloud.com/..."
  }
}
```

---

### 8.2 COS 直传 - 获取临时访问链接

**接口**: `POST /api/cos/temp-url`

**说明**: 获取 COS 文件的临时访问链接

**认证**: 需要用户认证

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| fileKey | string | 是 | 文件在 COS 中的 key |

**请求示例**:
```json
{
  "fileKey": "uploads/2026-04-04/abc123.jpg"
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "url": "https://cos.ap-guangzhou.myqcloud.com/...",
    "expiresIn": 3600
  }
}
```

---

### 8.3 COS 直传 - 删除文件

**接口**: `DELETE /api/cos/delete`

**说明**: 删除 COS 上的文件

**认证**: 需要用户认证

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| fileKey | string | 是 | 文件在 COS 中的 key |

**请求示例**:
```json
{
  "fileKey": "uploads/2026-04-04/abc123.jpg"
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

---

### 8.4 本地上传 - 单文件 ⚠️ 已废弃

**接口**: `POST /api/upload`

**说明**: 本地服务器文件上传

**状态**: ⚠️ **已废弃**，建议使用 COS 直传

**认证**: 需要用户认证

**Content-Type**: `multipart/form-data`

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| file | File | 是 | 单文件上传 |

**响应示例**:
```json
{
  "code": 0,
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

---

### 8.5 本地上传 - 多文件 ⚠️ 已废弃

**接口**: `POST /api/upload/multiple`

**说明**: 批量上传多个文件

**状态**: ⚠️ **已废弃**，建议使用 COS 直传

**认证**: 需要用户认证

**Content-Type**: `multipart/form-data`

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| files | File[] | 是 | 多文件上传（最多5个） |

**响应示例**:
```json
{
  "code": 0,
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

## 九、日志接口

### 9.1 接收客户端日志

**接口**: `POST /api/logs/client`

**说明**: 接收前端（小程序）推送的日志

**认证**: 无需认证（有限流保护）

**请求参数**: 日志数据对象

---

### 9.2 获取日志列表

**接口**: `GET /api/logs`

**说明**: 获取日志列表（支持分页和过滤）

**认证**: 需要日志访问密钥

**请求头**:
```
X-Log-Access-Key: <log_access_key>
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| level | string | 否 | 日志级别: debug, info, warn, error, fatal |
| source | string | 否 | 日志来源 |
| startTime | string | 否 | 开始时间，ISO8601格式 |
| endTime | string | 否 | 结束时间，ISO8601格式 |
| userId | string | 否 | 用户ID |
| requestId | string | 否 | 请求ID |
| keyword | string | 否 | 关键词搜索 |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 20 |

---

### 9.3 获取日志统计

**接口**: `GET /api/logs/stats`

**说明**: 获取日志统计信息

**认证**: 需要日志访问密钥

**请求头**:
```
X-Log-Access-Key: <log_access_key>
```

**查询参数**: 同获取日志列表

---

### 9.4 搜索日志

**接口**: `GET /api/logs/search`

**说明**: 搜索日志

**认证**: 需要日志访问密钥

**请求头**:
```
X-Log-Access-Key: <log_access_key>
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| keyword | string | 是 | 搜索关键词 |
| level | string | 否 | 日志级别 |
| source | string | 否 | 日志来源 |
| startTime | string | 否 | 开始时间 |
| endTime | string | 否 | 结束时间 |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页数量 |

---

### 9.5 删除日志

**接口**: `DELETE /api/logs`

**说明**: 删除日志（支持按条件批量删除）

**认证**: 需要日志访问密钥 + admin 角色

**请求头**:
```
X-Log-Access-Key: <log_access_key>
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| ids | string | 否 | 日志ID列表，逗号分隔 |
| level | string | 否 | 日志级别 |
| before | string | 否 | 删除此时间之前的日志 |

---

### 9.6 导出日志

**接口**: `GET /api/logs/export`

**说明**: 导出日志

**认证**: 需要日志访问密钥

**请求头**:
```
X-Log-Access-Key: <log_access_key>
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| format | string | 否 | 导出格式: json, csv，默认 json |
| level | string | 否 | 日志级别 |
| source | string | 否 | 日志来源 |
| startTime | string | 否 | 开始时间 |
| endTime | string | 否 | 结束时间 |

---

## 十、天气接口

### 10.1 获取实时天气

**接口**: `GET /api/weather/now`

**说明**: 获取指定位置的实时天气

**认证**: 需要用户认证

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| location | string | 是 | 位置代码或经纬度 |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "temperature": 22,
    "humidity": 65,
    "weather": "多云",
    "windSpeed": 3,
    "pressure": 1013
  }
}
```

---

### 10.2 获取天文数据

**接口**: `GET /api/weather/astronomy`

**说明**: 获取日出日落等天文数据

**认证**: 需要用户认证

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| location | string | 是 | 位置代码或经纬度 |
| date | string | 否 | 日期，格式 YYYY-MM-DD，默认今天 |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "sunrise": "06:15",
    "sunset": "18:45",
    "moonrise": "20:30",
    "moonset": "05:00"
  }
}
```

---

## 十一、错误码定义

### 11.1 HTTP 状态码

| 状态码 | 说明 | 处理建议 |
|:---:|:---|:---|
| 200 | 成功 | - |
| 400 | 请求参数错误 | 检查请求参数格式和必填项 |
| 401 | 未授权 | Token 无效或过期，重新登录 |
| 403 | 禁止访问 | 检查权限或日志访问密钥 |
| 404 | 资源不存在 | 检查资源 ID 是否正确 |
| 409 | 资源冲突 | 检查重复操作 |
| 500 | 服务器内部错误 | 联系管理员 |

### 11.2 业务错误码

| 错误码 | 说明 | 处理建议 |
|:---:|:---|:---|
| 0 | 成功 | - |
| 1001 | 微信登录失败 | 检查微信 code 是否有效 |
| 1002 | Token 过期 | 刷新 Token 或重新登录 |
| 1003 | 植物不存在 | 检查 plantId 是否正确 |
| 1004 | 会话不存在 | 检查 sessionId 是否正确 |
| 1005 | 设备不存在 | 检查 deviceId 是否正确 |
| 1006 | 诊断记录不存在 | 检查 diagnosisCardId 是否正确 |
| 1007 | 图片上传失败 | 检查图片格式和大小 |
| 1008 | AI 服务不可用 | 稍后重试 |
| 1009 | 环境数据已存在 | 检查 recordedAt 是否重复 |
| 1010 | 设备未绑定植物 | 先绑定设备到植物 |
| 1011 | MAC 地址格式无效 | 检查 MAC 地址格式 |
| 1012 | 无效的植物分类 | 检查 plantCategory 值 |
| 1013 | 无效的会话类型 | 检查 type 值 |
| 1014 | 无效的操作类型 | 检查 actionType 值 |
| 1015 | 无效的内容类型 | 检查 contentType 值 |

---

## 十二、接口汇总表

### 12.1 按领域统计

| 领域 | 接口数 | 说明 |
|:---|:---:|:---|
| 用户域 | 8 | 登录、用户信息、设置、配置 |
| 植物域 | 5 | 植物 CRUD |
| 养护记录域 | 4 | 养护记录 CRUD |
| 诊断域 | 2 | 诊断历史查询 |
| 设备域 | 5 | 设备管理、数据上报 |
| AI 域 | 10 | 会话管理、消息、AI 分析 |
| 环境数据域 | 2 | 实时数据、历史数据 |
| 文件上传域 | 5 | COS 直传、本地上传 |
| 日志域 | 6 | 日志接收、查询、管理 |
| 天气域 | 2 | 实时天气、天文数据 |
| **合计** | **49** | - |

### 12.2 完整接口列表

#### 用户域 (/api/users)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| POST | /login | 微信登录 | ❌ |
| POST | /guest-login | 游客登录 | ❌ |
| GET | /profile | 获取用户信息 | ✅ |
| PUT | /profile | 更新用户信息 | ✅ |
| GET | /settings | 获取用户设置 | ✅ |
| PUT | /settings | 更新用户设置 | ✅ |
| GET | /config/:configKey | 获取配置项 | ✅ |
| POST | /config | 设置配置项 | ✅ |

#### 植物域 (/api/plants)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | / | 获取植物列表 | ✅ |
| POST | / | 创建植物 | ✅ |
| GET | /:plantId | 获取植物详情 | ✅ |
| PUT | /:plantId | 更新植物 | ✅ |
| DELETE | /:plantId | 删除植物 | ✅ |

#### 养护记录域 (/api/care-records)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | / | 获取养护记录列表 | ✅ |
| POST | / | 创建养护记录 | ✅ |
| PUT | /:recordId | 更新养护记录 | ✅ |
| DELETE | /:recordId | 删除养护记录 | ✅ |

#### 诊断域 (/api/diagnosis)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | / | 获取诊断历史 | ✅ |
| GET | /:diagnosisCardId | 获取诊断详情 | ✅ |

#### 设备域 (/api/devices)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | / | 获取设备列表 | ✅ |
| POST | /bind | 绑定设备 | ✅ |
| POST | /unbind | 解绑设备 | ✅ |
| GET | /:deviceId | 获取设备详情 | ✅ |
| POST | /data | 设备数据上报 | 🔧 设备认证 |

#### AI 域 (/api/sessions, /api/ai)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | /api/sessions | 获取会话列表 | ✅ |
| POST | /api/sessions | 创建会话 | ✅ |
| GET | /api/sessions/:sessionId | 获取会话详情 | ✅ |
| PUT | /api/sessions/:sessionId | 更新会话 | ✅ |
| DELETE | /api/sessions/:sessionId | 删除会话 | ✅ |
| GET | /api/sessions/:sessionId/messages | 获取消息列表 | ✅ |
| POST | /api/sessions/:sessionId/messages | 发送消息 | ✅ |
| POST | /api/sessions/:sessionId/read | 标记已读 | ✅ |
| POST | /api/sessions/:sessionId/upgrade | 升级会话 | ✅ |
| POST | /api/ai/analyze | AI 分析 | ✅ |

#### 环境数据域 (/api/environment)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | /current | 获取实时环境数据 | ✅ |
| GET | /history | 获取历史环境数据 | ✅ |

#### 文件上传域 (/api/cos, /api/upload)

| 方法 | 路径 | 说明 | 认证 | 状态 |
|:---:|:---|:---|:---:|:---:|
| POST | /api/cos/upload-sign | 获取 COS 上传签名 | ✅ | ✅ 在用 |
| POST | /api/cos/temp-url | 获取 COS 临时链接 | ✅ | ✅ 在用 |
| DELETE | /api/cos/delete | 删除 COS 文件 | ✅ | ✅ 在用 |
| POST | /api/upload | 本地上传单文件 | ✅ | ⚠️ 废弃 |
| POST | /api/upload/multiple | 本地上传多文件 | ✅ | ⚠️ 废弃 |
| POST | /api/storage/upload | 获取云存储上传链接 | ✅ | ⚠️ 废弃 |

#### 日志域 (/api/logs)

| 方法 | 路径 | 说明 | 认证 | 状态 |
|:---:|:---|:---|:---:|:---:|
| POST | /client | 接收客户端日志 | ❌ | ✅ 在用 |
| GET | / | 获取日志列表 | 🔑 | ✅ 在用 |
| GET | /stats | 获取日志统计 | 🔑 | ✅ 在用 |
| GET | /search | 搜索日志 | 🔑 | ✅ 在用 |
| DELETE | / | 删除日志 | 🔑 | ✅ 在用 |
| GET | /export | 导出日志 | 🔑 | ✅ 在用 |
| GET | /files | 获取日志文件列表 | 🔑 | ⚠️ 废弃 |
| GET | /content | 获取日志文件内容 | 🔑 | ⚠️ 废弃 |

#### 天气域 (/api/weather)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | /now | 获取实时天气 | ✅ |
| GET | /astronomy | 获取天文数据 | ✅ |

#### 系统接口

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | /health | 健康检查 | ❌ |

---

## 十三、前端调用示例

### 13.1 使用前端 api.js

```javascript
// 引入 api 模块
const api = require('../../utils/api.js');

// 登录
api.login({
  code: 'wx_login_code_xxx',
  nickname: '用户昵称'
}).then(res => {
  console.log('登录成功', res);
}).catch(err => {
  console.error('登录失败', err);
});

// 获取植物列表
api.getPlantList(1, 20).then(list => {
  console.log('植物列表', list);
});

// 发送消息（带取消功能）
const promise = api.sendMessage('SESSION_001', {
  contentType: 'text',
  content: '你好'
});

// 如需取消请求
// promise.requestTask.abort();
```

### 13.2 直接使用 wx.request

```javascript
const BASE_URL = 'https://api.gardenassistant.com';
const token = wx.getStorageSync('auth_token');

wx.request({
  url: `${BASE_URL}/api/plants`,
  method: 'GET',
  header: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  success: (res) => {
    if (res.data.code === 0) {
      console.log('成功', res.data.data);
    } else {
      console.error('业务错误', res.data.message);
    }
  },
  fail: (err) => {
    console.error('请求失败', err);
  }
});
```

---

## 十四、变更记录

| 日期 | 版本 | 变更内容 |
|:---|:---:|:---|
| 2026-03-22 | v1.0 | 初始版本，完成基础接口设计 |
| 2026-03-25 | v1.1 | 补充会话升级、删除会话、用户设置接口 |
| 2026-03-26 | v1.2 | 补充养护记录 CRUD 接口 |
| 2026-04-04 | v3.0 | 重构接口设计，按领域重新组织 |
| 2026-04-04 | v3.0 | 新增环境数据接口、文件上传接口规划 |
| 2026-04-05 | v3.1 | 文档去重与章节重组 |
| 2026-04-05 | v3.2 | 修复格式问题，统一 camelCase |
| 2026-04-11 | v3.3 | 同步代码更新，新增天气模块、完善日志模块 |
| 2026-04-14 | **v4.0** | **合并 api-reference.md，与代码完全同步** |
| 2026-04-14 | v4.0 | 更新设备绑定参数为 macAddress |
| 2026-04-14 | v4.0 | 标记废弃接口，更新环境数据接口说明 |
| 2026-04-14 | v4.0 | 补充完整的请求/响应示例和错误码 |

---

**关联文档**:
- [系统架构设计.md](./系统架构设计.md)
- [数据库设计.md](./数据库设计.md)
- [前端 api.js](../../frontend/utils/api.js)
