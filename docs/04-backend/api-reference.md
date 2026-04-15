# API 接口列表

**版本**: V4.0  
**日期**: 2026-04-14  
**状态**: ✅ 与代码实现同步  

> **注意**: 本文档为快捷参考版本，详细文档请查看 [API接口设计.md](../02-architecture/API接口设计.md)

---

## 目录

1. [接口规范](#一接口规范)
2. [认证机制](#二认证机制)
3. [接口列表](#三接口列表)
4. [错误码](#四错误码)
5. [前端调用](#五前端调用)

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

### 1.2 响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

- `code`: 0 表示成功，非0表示错误
- `message`: 提示信息
- `data`: 响应数据

---

## 二、认证机制

### 2.1 用户认证（JWT Token）

```
Authorization: Bearer <token>
```

**适用接口**: 所有 `/api/*` 接口（除登录相关）

### 2.2 设备认证

设备数据上报时在请求体中携带 `deviceId`

**适用接口**: `POST /api/devices/data`

### 2.3 日志访问认证

```
X-Log-Access-Key: <log_access_key>
```

**适用接口**: `/api/logs/*`

---

## 三、接口列表

### 3.1 用户域 (/api/users)

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

**登录请求**:
```json
{
  "code": "wx_login_code_xxx",
  "nickname": "用户昵称",
  "avatarUrl": "https://example.com/avatar.jpg",
  "gender": 0
}
```

**登录响应**:
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
      "status": "active"
    }
  }
}
```

---

### 3.2 植物域 (/api/plants)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | /?page=1&pageSize=20 | 获取植物列表 | ✅ |
| POST | / | 创建植物 | ✅ |
| GET | /:plantId | 获取植物详情 | ✅ |
| PUT | /:plantId | 更新植物 | ✅ |
| DELETE | /:plantId | 删除植物 | ✅ |

**创建植物请求**:
```json
{
  "nickname": "新植物",
  "species": "多肉",
  "plantCategory": "succulent",
  "coverImageUrl": "https://example.com/plant.jpg",
  "locationName": "阳台"
}
```

**plantCategory 枚举值**:
- `succulent` - 多肉植物
- `flower` - 花卉
- `foliage` - 观叶植物
- `vegetable` - 蔬菜
- `herb` - 香草
- `other` - 其他

---

### 3.3 养护记录域 (/api/care-records)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | /?plantId=xxx&page=1 | 获取养护记录列表 | ✅ |
| POST | / | 创建养护记录 | ✅ |
| PUT | /:recordId | 更新养护记录 | ✅ |
| DELETE | /:recordId | 删除养护记录 | ✅ |

**创建养护记录请求**:
```json
{
  "plantId": "PLANT_001",
  "actionType": "water",
  "description": "浇透水",
  "performedAt": "2026-04-14T10:00:00Z"
}
```

**actionType 枚举值**:
- `water` - 浇水
- `fertilize` - 施肥
- `prune` - 修剪
- `repot` - 换盆
- `pest_control` - 病虫害防治
- `observe` - 观察记录
- `purchase` - 购买
- `relocate` - 移位
- `other` - 其他

---

### 3.4 诊断域 (/api/diagnosis)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | /?plantId=xxx&page=1 | 获取诊断历史 | ✅ |
| GET | /:diagnosisCardId | 获取诊断详情 | ✅ |

---

### 3.5 设备域 (/api/devices)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | / | 获取设备列表 | ✅ |
| POST | /bind | 绑定设备 | ✅ |
| POST | /unbind | 解绑设备 | ✅ |
| GET | /:deviceId | 获取设备详情 | ✅ |
| POST | /data | 设备数据上报 | 🔧 设备 |

**绑定设备请求**:
```json
{
  "macAddress": "A1:B2:C3:D4:E5:F6",
  "deviceName": "环境监测器-客厅",
  "plantId": "PLANT_001"
}
```

**解绑设备请求**:
```json
{
  "deviceId": "DEVICE_001"
}
```

---

### 3.6 AI 域 (/api/sessions, /api/ai)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | /api/sessions?type=&plantId=&page=1 | 获取会话列表 | ✅ |
| POST | /api/sessions | 创建会话 | ✅ |
| GET | /api/sessions/:sessionId | 获取会话详情 | ✅ |
| PUT | /api/sessions/:sessionId | 更新会话 | ✅ |
| DELETE | /api/sessions/:sessionId | 删除会话 | ✅ |
| GET | /api/sessions/:sessionId/messages?before=&limit=20 | 获取消息列表 | ✅ |
| POST | /api/sessions/:sessionId/messages | 发送消息 | ✅ |
| POST | /api/sessions/:sessionId/read | 标记已读 | ✅ |
| POST | /api/sessions/:sessionId/upgrade | 升级会话 | ✅ |
| POST | /api/ai/analyze | AI 分析 | ✅ |

**创建会话请求**:
```json
{
  "type": "consultation",
  "plantId": null,
  "title": "咨询会话"
}
```

**type 枚举值**:
- `consultation` - 咨询会话
- `plant` - 植物会话（必须提供 plantId）

**发送消息请求**:
```json
{
  "contentType": "text",
  "content": "那应该怎么浇水？",
  "imageUrls": [],
  "contextConfig": {
    "environmentData": true,
    "careRecords": false,
    "historyDiagnosis": true
  }
}
```

**contentType 枚举值**:
- `text` - 文字
- `image` - 图片
- `diagnosis` - 诊断

**升级会话请求**:
```json
{
  "plantId": "PLANT_001"
}
```

---

### 3.7 环境数据域 (/api/environment)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | /current?plantId=xxx | 获取实时环境数据 | ✅ |
| GET | /history?plantId=xxx&metricCode=temperature&timeRange=7d | 获取历史环境数据 | ✅ |

**查询参数说明**:
- `timeRange`: 24h(24小时), 7d(7天), 30d(30天)
- `metricCode`: temperature, humidity, soil_moisture, light
- `dataSource`: sensor, weather_api, compensation

---

### 3.8 文件上传域 (/api/cos, /api/upload, /api/storage)

| 方法 | 路径 | 说明 | 认证 | 状态 |
|:---:|:---|:---|:---:|:---:|
| POST | /api/cos/upload-sign | 获取 COS 上传签名 | ✅ | ✅ 在用 |
| POST | /api/cos/temp-url | 获取 COS 临时链接 | ✅ | ✅ 在用 |
| DELETE | /api/cos/delete | 删除 COS 文件 | ✅ | ✅ 在用 |
| POST | /api/upload | 本地上传单文件 | ✅ | ⚠️ 废弃 |
| POST | /api/upload/multiple | 本地上传多文件 | ✅ | ⚠️ 废弃 |
| POST | /api/storage/upload | 获取云存储上传链接 | ✅ | ⚠️ 废弃 |

**获取上传签名请求**:
```json
{
  "filename": "plant.jpg",
  "fileType": "image/jpeg"
}
```

**获取临时链接请求**:
```json
{
  "fileKey": "uploads/2026-04-04/abc123.jpg"
}
```

**删除文件请求**:
```json
{
  "fileKey": "uploads/2026-04-04/abc123.jpg"
}
```

---

### 3.9 日志域 (/api/logs)

| 方法 | 路径 | 说明 | 认证 | 状态 |
|:---:|:---|:---|:---:|:---:|
| POST | /client | 接收客户端日志 | ❌ | ✅ 在用 |
| GET | /?level=&source=&page=1 | 获取日志列表 | 🔑 | ✅ 在用 |
| GET | /stats | 获取日志统计 | 🔑 | ✅ 在用 |
| GET | /search?keyword=xxx | 搜索日志 | 🔑 | ✅ 在用 |
| DELETE | /?ids= | 删除日志 | 🔑 | ✅ 在用 |
| GET | /export?format=json | 导出日志 | 🔑 | ✅ 在用 |
| GET | /files | 获取日志文件列表 | 🔑 | ⚠️ 废弃 |
| GET | /content | 获取日志文件内容 | 🔑 | ⚠️ 废弃 |

---

### 3.10 天气域 (/api/weather)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | /now?location=xxx | 获取实时天气 | ✅ |
| GET | /astronomy?location=xxx&date=2026-04-14 | 获取天文数据 | ✅ |

---

### 3.11 系统接口

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | /health | 健康检查 | ❌ |

---

## 四、错误码

### 4.1 HTTP 状态码

| 状态码 | 说明 | 处理建议 |
|:---:|:---|:---|
| 200 | 成功 | - |
| 400 | 请求参数错误 | 检查请求参数 |
| 401 | 未授权 | 重新登录获取 Token |
| 403 | 禁止访问 | 检查权限 |
| 404 | 资源不存在 | 检查资源 ID |
| 409 | 资源冲突 | 检查重复操作 |
| 500 | 服务器内部错误 | 联系管理员 |

### 4.2 业务错误码

| 错误码 | 说明 | 处理建议 |
|:---:|:---|:---|
| 0 | 成功 | - |
| 1001 | 微信登录失败 | 检查微信 code |
| 1002 | Token 过期 | 刷新 Token 或重新登录 |
| 1003 | 植物不存在 | 检查 plantId |
| 1004 | 会话不存在 | 检查 sessionId |
| 1005 | 设备不存在 | 检查 deviceId |
| 1006 | 诊断记录不存在 | 检查 diagnosisCardId |
| 1007 | 图片上传失败 | 检查图片格式和大小 |
| 1008 | AI 服务不可用 | 稍后重试 |
| 1009 | 环境数据已存在 | 检查 recordedAt |
| 1010 | 设备未绑定植物 | 先绑定设备 |
| 1011 | MAC 地址格式无效 | 检查 MAC 格式 |
| 1012 | 无效的植物分类 | 检查 plantCategory |
| 1013 | 无效的会话类型 | 检查 type |
| 1014 | 无效的操作类型 | 检查 actionType |
| 1015 | 无效的内容类型 | 检查 contentType |

---

## 五、前端调用

### 5.1 使用 api.js

```javascript
const api = require('../../utils/api.js');

// 登录
api.login({ code: 'xxx', nickname: '用户' })
  .then(res => console.log('登录成功', res))
  .catch(err => console.error('登录失败', err));

// 获取植物列表
api.getPlantList(1, 20).then(list => {
  console.log('植物列表', list);
});

// 发送消息
api.sendMessage('SESSION_001', {
  contentType: 'text',
  content: '你好'
});
```

### 5.2 直接使用 wx.request

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
      console.error('错误', res.data.message);
    }
  }
});
```

---

## 六、变更记录

| 日期 | 版本 | 变更内容 |
|:---|:---:|:---|
| 2026-03-18 | v1.0 | 初始版本 |
| 2026-04-04 | v3.0 | 重构 API 列表，与架构设计同步 |
| 2026-04-11 | v3.1 | 同步代码更新，新增天气模块、完善日志模块 |
| 2026-04-14 | **v4.0** | **与主文档同步，更新为快捷参考版本** |

---

**关联文档**:
- [API接口设计.md](../02-architecture/API接口设计.md) - 详细接口文档
- [系统架构设计.md](../02-architecture/系统架构设计.md)
- [数据库设计.md](../02-architecture/数据库设计.md)
