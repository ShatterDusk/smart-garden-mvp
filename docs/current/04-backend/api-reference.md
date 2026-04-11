# API 接口列表

**版本**: V3.1  
**日期**: 2026-04-11  
**状态**: 与代码实现同步更新

---

## 一、API 设计理念

### 1.1 核心原则

| 原则 | 说明 | 示例 |
|:---|:---|:---|
| **领域驱动** | 按业务领域组织 API，而非技术层面 | 用户域、植物域、设备域、AI域 |
| **资源导向** | URL 表示资源，HTTP 方法表示操作 | `GET /api/plants` 获取植物列表 |
| **统一入口** | 同类操作使用同一接口，避免分散 | 环境数据统一 `/api/environment/readings` |
| **职责分离** | 每个模块职责单一，边界清晰 | 设备模块管设备，环境模块管数据 |
| **渐进废弃** | 标注废弃接口，提供迁移路径 | `/api/devices/data` → `/api/environment/readings` |

### 1.2 URL 设计规范

| 规则 | 正确示例 | 错误示例 |
|:---|:---|:---|
| 使用 kebab-case | `/api/care-records` | `/api/careRecords` |
| 资源用名词 | `/api/plants` | `/api/get-plants` |
| 嵌套不超过2层 | `/api/plants/:id/environment` | `/api/plants/:id/sessions/:sid/messages` |
| 路径参数用资源ID | `/api/plants/:plantId` | `/api/plants?id=xxx` |

### 1.3 HTTP 方法语义

| 方法 | 语义 | 幂等性 | 示例 |
|:---|:---:|:---:|:---|
| GET | 查询资源 | ✅ | `GET /api/plants` |
| POST | 创建资源 / 执行操作 | ❌ | `POST /api/plants` |
| PUT | 全量更新资源 | ✅ | `PUT /api/plants/:id` |
| PATCH | 部分更新资源 | ✅ | `PATCH /api/plants/:id` |
| DELETE | 删除资源 | ✅ | `DELETE /api/plants/:id` |

### 1.4 认证机制

| 认证方式 | 适用场景 | 认证参数 | 适用接口 |
|:---|:---|:---|:---|
| **用户认证** | 小程序用户请求 | Header: `Authorization: Bearer <token>` | 所有 `/api/*` 接口 |
| **设备认证** | 硬件设备数据上报 | Body: `deviceId` | `POST /api/environment/readings` |

### 1.5 响应格式

```json
{
  "code": 200,
  "message": "操作成功",
  "data": { ... }
}
```

### 1.6 错误码定义

| 错误码 | 说明 | 处理建议 |
|:---:|:---|:---|
| 200 | 成功 | - |
| 400 | 请求参数错误 | 检查请求参数 |
| 401 | 未授权 | 重新登录获取Token |
| 403 | 禁止访问 | 检查权限 |
| 404 | 资源不存在 | 检查资源ID |
| 409 | 资源冲突 | 检查重复操作 |
| 500 | 服务器内部错误 | 联系管理员 |
| 1001 | 微信登录失败 | 检查微信code |
| 1002 | Token过期 | 刷新Token或重新登录 |
| 1003 | 植物不存在 | 检查plant_id |
| 1004 | 会话不存在 | 检查session_id |
| 1005 | 设备不存在 | 检查device_id |
| 1006 | 诊断记录不存在 | 检查diagnosis_card_id |
| 1007 | 图片上传失败 | 检查图片格式和大小 |
| 1008 | AI服务不可用 | 稍后重试 |
| 1009 | 环境数据已存在 | 检查recorded_at是否重复 |
| 1010 | 设备未绑定植物 | 先绑定设备 |

---

## 二、API 列表（按领域组织）

### 2.1 用户域

#### 认证模块 `/api/users`

| 完整路径 | 方法 | 说明 | 认证 |
|:---|:---:|:---|:---:|
| `/api/users/login` | POST | 微信登录 | ❌ |
| `/api/users/guest-login` | POST | 游客登录 | ❌ |

#### 用户模块 `/api/users`

| 完整路径 | 方法 | 说明 | 认证 |
|:---|:---:|:---|:---:|
| `/api/users/profile` | GET | 获取用户资料 | ✅ |
| `/api/users/profile` | PUT | 更新用户资料 | ✅ |
| `/api/users/settings` | GET | 获取用户设置 | ✅ |
| `/api/users/settings` | PUT | 更新用户设置 | ✅ |
| `/api/users/config/:configKey` | GET | 获取配置项 | ✅ |
| `/api/users/config` | POST | 设置配置项 | ✅ |

---

### 2.2 植物域

#### 植物模块 `/api/plants`

| 完整路径 | 方法 | 说明 | 认证 |
|:---|:---:|:---|:---:|
| `/api/plants` | GET | 获取植物列表 | ✅ |
| `/api/plants` | POST | 创建植物 | ✅ |
| `/api/plants/:plantId` | GET | 获取植物详情 | ✅ |
| `/api/plants/:plantId` | PUT | 更新植物 | ✅ |
| `/api/plants/:plantId` | DELETE | 删除植物 | ✅ |

#### 养护模块 `/api/care-records`

| 完整路径 | 方法 | 说明 | 认证 |
|:---|:---:|:---|:---:|
| `/api/care-records` | GET | 获取养护记录列表 | ✅ |
| `/api/care-records` | POST | 创建养护记录 | ✅ |
| `/api/care-records/:recordId` | PUT | 更新养护记录 | ✅ |
| `/api/care-records/:recordId` | DELETE | 删除养护记录 | ✅ |

#### 诊断模块 `/api/diagnosis`

| 完整路径 | 方法 | 说明 | 认证 |
|:---|:---:|:---|:---:|
| `/api/diagnosis` | GET | 获取诊断历史 | ✅ |
| `/api/diagnosis/:diagnosisCardId` | GET | 获取诊断详情 | ✅ |

---

### 2.3 设备域

#### 设备模块 `/api/devices`

> **职责边界**：设备模块仅负责设备生命周期管理（绑定、解绑、状态查询），不处理环境数据上报。

| 完整路径 | 方法 | 说明 | 认证 |
|:---|:---:|:---|:---:|
| `/api/devices` | GET | 获取设备列表 | ✅ 用户 |
| `/api/devices/bind` | POST | 绑定设备 | ✅ 用户 |
| `/api/devices/unbind` | POST | 解绑设备 | ✅ 用户 |
| `/api/devices/:deviceId` | GET | 获取设备详情 | ✅ 用户 |
| ~~`/api/devices/data`~~ | ~~POST~~ | ~~设备数据上报~~ | ⚠️ **已废弃** |

#### 环境模块 `/api/environment`

> **职责边界**：环境模块负责环境数据的采集、存储、查询，支持传感器上报和天气API数据。

| 完整路径 | 方法 | 说明 | 认证 |
|:---|:---:|:---|:---:|
| `/api/environment/readings` | POST | 环境数据上报（统一入口） | ✅ 设备/用户 |
| `/api/environment/current` | GET | 获取实时环境数据 | ✅ 用户 |
| `/api/environment/history` | GET | 获取历史数据 | ✅ 用户 |

**环境数据上报场景**：

| 场景 | 认证方式 | 请求参数 | 说明 |
|:---|:---|:---|:---|
| 设备实时上报 | 设备认证 | `deviceId`, `plantId`, `metrics` | 自动创建 ReadingTask |
| 设备补传 | 设备认证 | `deviceId`, `plantId`, `metrics`, `isSupplement=true` | 覆盖补偿数据 |
| 用户手动录入 | 用户认证 | `plantId`, `metrics` | 手动补录 |

---

### 2.4 AI域

#### 会话模块 `/api/sessions`

| 完整路径 | 方法 | 说明 | 认证 |
|:---|:---:|:---|:---:|
| `/api/sessions` | GET | 获取会话列表 | ✅ |
| `/api/sessions` | POST | 创建会话 | ✅ |
| `/api/sessions/:sessionId` | GET | 获取会话详情 | ✅ |
| `/api/sessions/:sessionId` | PUT | 更新会话 | ✅ |
| `/api/sessions/:sessionId` | DELETE | 删除会话 | ✅ |
| `/api/sessions/:sessionId/messages` | GET | 获取消息列表 | ✅ |
| `/api/sessions/:sessionId/messages` | POST | 发送消息 | ✅ |
| `/api/sessions/:sessionId/read` | POST | 标记已读 | ✅ |
| `/api/sessions/:sessionId/upgrade` | POST | 升级会话 | ✅ |

#### AI模块 `/api/ai`

| 完整路径 | 方法 | 说明 | 认证 |
|:---|:---:|:---|:---:|
| `/api/ai/analyze` | POST | AI分析 | ✅ |

---

### 2.5 基础设施域

#### 文件上传模块 `/api/upload`

| 完整路径 | 方法 | 说明 | 认证 |
|:---|:---:|:---|:---:|
| `/api/upload` | POST | 本地单文件上传 | ✅ |
| `/api/upload/multiple` | POST | 本地多文件上传（最多5个） | ✅ |

#### 云存储模块 `/api/storage`

| 完整路径 | 方法 | 说明 | 认证 |
|:---|:---:|:---|:---:|
| `/api/storage/upload` | POST | 获取云存储上传链接 | ✅ |

#### COS直传模块 `/api/cos`

| 完整路径 | 方法 | 说明 | 认证 |
|:---|:---:|:---|:---:|
| `/api/cos/upload-sign` | POST | 获取COS上传签名 | ✅ |
| `/api/cos/temp-url` | POST | 获取COS临时访问链接 | ✅ |
| `/api/cos/delete` | DELETE | 删除COS文件 | ✅ |

#### 日志模块 `/api/logs`

| 完整路径 | 方法 | 说明 | 认证 | 备注 |
|:---|:---:|:---|:---:|:---|
| `/api/logs/frontend` | POST | 接收前端日志 | ❌ | 无需认证，方便前端推送 |
| `/api/logs/files` | GET | 获取日志文件列表 | 🔑 | 需日志访问密钥 |
| `/api/logs/content` | GET | 获取日志内容 | 🔑 | 需日志访问密钥 |
| `/api/logs/search` | GET | 搜索日志 | 🔑 | 需日志访问密钥 |
| `/api/logs/clear` | DELETE | 清空日志文件 | 🔑 | 需日志访问密钥 |

**日志访问认证**：需要在请求头中携带 `X-Log-Access-Key`

---

## 三、健康检查

| 完整路径 | 方法 | 说明 | 认证 |
|:---|:---:|:---|:---:|
| `/health` | GET | 服务健康状态 | ❌ |

---

## 四、API 统计

### 4.1 按领域统计

| 领域 | 模块数 | 接口数 | 说明 |
|:---|:---:|:---:|:---|
| 用户域 | 2 | 8 | 认证 + 用户管理 |
| 植物域 | 3 | 11 | 植物 + 养护 + 诊断 |
| 设备域 | 2 | 6 | 设备 + 环境 |
| AI域 | 2 | 9 | 会话 + AI分析 |
| 天气域 | 1 | 2 | 天气数据 |
| 基础设施域 | 4 | 11 | 文件上传 + 云存储 + COS + 日志 |
| **合计** | **14** | **47** | - |

### 4.2 按状态统计

| 状态 | 数量 | 说明 |
|:---|:---:|:---|
| ✅ 已实现 | 47 | 正常使用 |
| ⚠️ 废弃 | 1 | `/api/devices/data` 已废弃，使用环境数据上报接口 |

---

## 五、重构计划

### 5.1 P0 - 阻塞问题（必须修复）

| 问题 | 现状 | 目标 | 状态 |
|:---|:---|:---|:---:|
| 环境数据上报入口不统一 | `/api/devices/data` + `/api/environment/readings` | 统一为 `/api/environment/readings` | ⏳ 待执行 |

### 5.2 P1 - 规范问题（建议修复）

| 问题 | 现状 | 目标 | 状态 |
|:---|:---|:---|:---:|
| DELETE 方法带 body | `DELETE /api/cos/delete` 使用 body 传参 | 改为路径参数 `DELETE /api/cos/:fileId` | ⏳ 待执行 |

### 5.3 P2 - 优化问题（可选）

| 问题 | 现状 | 目标 | 状态 |
|:---|:---|:---|:---:|
| 文件上传接口整合 | upload/storage/cos 三个模块功能有重叠 | 评估是否需要合并简化 | ⏳ 待评估 |

---

## 六、变更记录

| 日期 | 版本 | 变更内容 |
|:---|:---:|:---|
| 2026-03-18 | v1.0 | 初始版本 |
| 2026-04-04 | **v3.0** | **重构 API 列表**，与架构设计同步 |
| 2026-04-04 | v3.0 | 按领域重新组织 API |
| 2026-04-04 | v3.0 | 新增设计理念章节 |
| 2026-04-04 | v3.0 | 标注废弃接口和迁移计划 |
| 2026-04-04 | v3.0 | 新增认证机制说明 |
| 2026-04-04 | v3.0 | 新增错误码定义 |
| 2026-04-04 | v3.0 | 新增 API 统计章节 |
| 2026-04-11 | **v3.1** | **同步代码更新**：新增天气模块、完善日志模块、更新文件上传模块说明 |
| 2026-04-11 | v3.1 | 更新 API 统计：14个模块，47个接口 |
| 2026-04-11 | v3.1 | 更新重构计划，移除已完成的文件模块统一规划 |

---

**关联文档**:
- [01-系统架构设计.md](../设计文档/01-系统架构设计.md)
- [02-数据库设计.md](../设计文档/02-数据库设计.md)
- [03-API接口设计.md](../设计文档/03-API接口设计.md)
