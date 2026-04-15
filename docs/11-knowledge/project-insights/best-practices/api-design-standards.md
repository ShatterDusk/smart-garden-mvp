---
id: "KNOW-2026-04-18-004"
type: "best-practice"
category: "project-insights/best-practices"
tags: ["api", "rest", "error-handling", "http", "standards", "design"]
created: "2026-04-18"
updated: "2026-04-18"
author: "AI"
status: "active"
---

# API 设计与错误处理规范

> 本文档定义项目的 API 设计标准、错误码体系和处理规范。

---

## 一、API 路由结构

### 1.1 路由注册方式

**文件**: `/backend/server/src/app.js`

路由统一在 `app.js` 中注册：

```javascript
// API 路由
app.use('/api/users', require('./routes/users'));
app.use('/api/plants', require('./routes/plants'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/care-records', require('./routes/careRecords'));
app.use('/api/devices', require('./routes/devices'));
app.use('/api/diagnosis', require('./routes/diagnosis'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/environment', require('./routes/environment'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/storage', require('./routes/storage'));
app.use('/api/cos', require('./routes/cos'));
app.use('/api/logs', require('./routes/logs'));
```

### 1.2 路由模块列表

| 路由 | 文件 | 功能 |
|:---|:---|:---|
| `/api/users` | `routes/users.js` | 用户管理 |
| `/api/plants` | `routes/plants.js` | 植物档案 |
| `/api/sessions` | `routes/sessions.js` | 会话管理 |
| `/api/care-records` | `routes/careRecords.js` | 养护记录 |
| `/api/devices` | `routes/devices.js` | 设备管理 |
| `/api/diagnosis` | `routes/diagnosis.js` | 诊断功能 |
| `/api/ai` | `routes/ai.js` | AI 服务 |
| `/api/environment` | `routes/environment.js` | 环境数据 |
| `/api/weather` | `routes/weather.js` | 天气服务 |
| `/api/upload` | `routes/upload.js` | 文件上传 |
| `/api/storage` | `routes/storage.js` | 存储管理 |
| `/api/cos` | `routes/cos.js` | COS 服务 |
| `/api/logs` | `routes/logs.js` | 日志查询 |

### 1.3 路由定义规范

**文件示例**: `/backend/server/src/routes/users.js`

```javascript
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

// 公开接口
router.post('/login', userController.login);

// 需要认证的接口
router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, userController.updateProfile);

module.exports = router;
```

**共识**:
- 路由文件只负责路由映射，业务逻辑在 controller
- 中间件（如认证）在路由层应用
- 路由路径使用 kebab-case

---

## 二、API 响应规范

### 2.1 统一响应格式

**成功响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": { }
}
```

**错误响应**:
```json
{
  "code": 500,
  "message": "错误描述",
  "data": null
}
```

**分页响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "list": [ ]
  }
}
```

### 2.2 HTTP 状态码使用

| 状态码 | 使用场景 |
|:---|:---|
| **200** | GET 请求成功 |
| **201** | POST 创建成功 |
| **204** | DELETE 删除成功（无返回内容） |
| **400** | 请求参数错误 |
| **401** | 未认证/Token 无效 |
| **403** | 无权限访问 |
| **404** | 资源不存在 |
| **500** | 服务器内部错误 |

### 2.3 响应辅助函数

**文件**: `/backend/server/src/utils/response.js`

```javascript
const { success, error, paginated } = require('../utils/response');

// 成功响应
return success(res, data);
return success(res, data, '操作成功');
return success(res, data, '操作成功', 201);

// 错误响应
return error(res, '用户不存在', 404);
return error(res, '服务器错误', 500, 500);

// 分页响应
return paginated(res, list, total, page, pageSize);
```

---

## 三、错误码体系

### 3.1 错误码定义

**文件**: `/backend/server/src/middleware/errorHandler.js`

```javascript
const ERROR_CODES = {
  // HTTP 标准错误码
  BAD_REQUEST: { code: 400, message: '请求参数错误' },
  UNAUTHORIZED: { code: 401, message: '未授权' },
  FORBIDDEN: { code: 403, message: '禁止访问' },
  NOT_FOUND: { code: 404, message: '资源不存在' },
  INTERNAL_ERROR: { code: 500, message: '服务器内部错误' },

  // 业务错误码 (1000+)
  WECHAT_LOGIN_FAILED: { code: 1001, message: '微信登录失败' },
  TOKEN_EXPIRED: { code: 1002, message: 'Token过期' },
  PLANT_NOT_FOUND: { code: 1003, message: '植物不存在' },
  SESSION_NOT_FOUND: { code: 1004, message: '会话不存在' },
  DEVICE_NOT_FOUND: { code: 1005, message: '设备不存在' },
  DIAGNOSIS_NOT_FOUND: { code: 1006, message: '诊断记录不存在' },
  UPLOAD_FAILED: { code: 1007, message: '图片上传失败' },
  AI_SERVICE_UNAVAILABLE: { code: 1008, message: 'AI服务不可用' },
};
```

### 3.2 错误码分类

| 范围 | 类别 |
|:---|:---|
| **0** | 成功 |
| **400-499** | 客户端错误（HTTP 标准） |
| **500-599** | 服务器错误（HTTP 标准） |
| **1000-1999** | 业务错误（认证、资源等） |
| **2000-2999** | 预留（支付相关） |
| **3000-3999** | 预留（第三方服务） |

### 3.3 特殊错误处理

**Sequelize 错误**:
```javascript
if (err.name === 'SequelizeValidationError') {
  statusCode = 400;
  message = err.errors.map(e => e.message).join(', ');
}

if (err.name === 'SequelizeUniqueConstraintError') {
  statusCode = 400;
  message = '数据已存在';
}
```

**JWT 错误**:
```javascript
if (err.name === 'JsonWebTokenError') {
  statusCode = 401;
  message = '无效的Token';
}

if (err.name === 'TokenExpiredError') {
  statusCode = 401;
  code = 1002;
  message = 'Token已过期';
}
```

**Joi 验证错误**:
```javascript
if (err.name === 'ValidationError' && err.isJoi) {
  statusCode = 400;
  message = err.details.map(d => d.message).join(', ');
}
```

---

## 四、错误处理中间件

### 4.1 全局错误处理

**文件**: `/backend/server/src/middleware/errorHandler.js`

```javascript
function errorHandler(err, req, res, next) {
  // 记录错误日志
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  // 返回统一错误格式
  res.status(statusCode).json({
    code: errorCode,
    message,
    data: null,
  });
}
```

### 4.2 404 处理

```javascript
function notFoundHandler(req, res, next) {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    data: null,
  });
}
```

### 4.3 异步错误包装

```javascript
function asyncHandler(fn) {
  return function(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

**使用示例**:
```javascript
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/profile', asyncHandler(async (req, res) => {
  const user = await UserService.findById(req.user.userId);
  return success(res, user);
}));
```

**共识**: 所有异步路由处理函数都应该使用 `asyncHandler` 包装。

---

## 五、请求验证规范

### 5.1 参数验证

使用 Joi 进行参数验证：

```javascript
const Joi = require('joi');

const schema = Joi.object({
  nickname: Joi.string().max(100).required(),
  avatarUrl: Joi.string().uri().optional(),
});

const { error, value } = schema.validate(req.body);
if (error) {
  return error(res, error.details[0].message, 400);
}
```

### 5.2 认证中间件

```javascript
const { authenticate } = require('../middleware/auth');

// 需要登录的接口
router.get('/profile', authenticate, controller.getProfile);
```

### 5.3 敏感信息过滤

```javascript
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'authorization', 'code', 'openid'];

function sanitizeBody(body) {
  const sanitized = { ...body };
  for (const field of SENSITIVE_FIELDS) {
    if (sanitized[field]) {
      sanitized[field] = '***';
    }
  }
  return sanitized;
}
```

---

## 六、健康检查端点

### 6.1 健康检查

**端点**: `GET /health`

**响应**:
```json
{
  "status": "ok",
  "timestamp": "2026-04-18T12:00:00.000Z"
}
```

**用途**:
- Docker 健康检查
- 负载均衡健康检查
- 监控探活

---

## 七、API 设计最佳实践

### 7.1 RESTful 设计

| 操作 | HTTP 方法 | URL 示例 |
|:---|:---|:---|
| 查询列表 | GET | `/api/plants` |
| 查询详情 | GET | `/api/plants/:id` |
| 创建 | POST | `/api/plants` |
| 更新 | PUT | `/api/plants/:id` |
| 删除 | DELETE | `/api/plants/:id` |

### 7.2 查询参数

```
GET /api/plants?page=1&pageSize=20&category=succulent
```

| 参数 | 说明 | 默认值 |
|:---|:---|:---|
| `page` | 页码 | 1 |
| `pageSize` | 每页数量 | 20 |
| `sort` | 排序字段 | created_at |
| `order` | 排序方向 (asc/desc) | desc |

### 7.3 请求体格式

**创建/更新请求**:
```json
{
  "nickname": "我的多肉",
  "plantCategory": "succulent",
  "coverImageUrl": "https://..."
}
```

**批量操作**:
```json
{
  "ids": ["id1", "id2", "id3"]
}
```

---

## 八、相关链接

- [项目规范速查手册](./project-conventions-reference.md)
- [新人入职指南](./newcomer-onboarding-guide.md)
- [项目技术全景](../domain-knowledge/technical/project-technical-landscape.md)

---

## 变更记录

| 日期 | 变更内容 | 作者 |
|:---|:---|:---|
| 2026-04-18 | 初始创建，汇总 API 设计和错误处理规范 | AI |

---

*本文档作为 API 开发的参考标准，所有新接口应遵循这些规范。*
