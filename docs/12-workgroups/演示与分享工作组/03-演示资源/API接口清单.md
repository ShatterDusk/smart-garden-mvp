# API 接口清单

> 演示时快速查阅接口设计

---

## 接口规范

| 项目 | 说明 |
|:---|:---|
| 协议 | HTTPS |
| 数据格式 | JSON |
| 基础URL | `/api` |
| 响应格式 | `{ code, message, data }` |

## 认证方式

| 认证类型 | 适用场景 | 请求头 |
|:---|:---|:---|
| JWT Token | 用户请求 | `Authorization: Bearer <token>` |
| Device ID | 设备数据上报 | 请求体携带 `deviceId` |
| Log Access Key | 日志管理 | `X-Log-Access-Key: <key>` |

---

## 接口汇总表

### 用户域 (3个)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| POST | `/api/users/login` | 微信登录 | ❌ |
| POST | `/api/users/guest-login` | 游客登录 | ❌ |
| GET | `/api/users/profile` | 获取用户信息 | ✅ |

### 植物域 (5个)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | `/api/plants` | 获取植物列表 | ✅ |
| POST | `/api/plants` | 创建植物 | ✅ |
| GET | `/api/plants/:id` | 获取植物详情 | ✅ |
| PUT | `/api/plants/:id` | 更新植物信息 | ✅ |
| DELETE | `/api/plants/:id` | 删除植物 | ✅ |

### 会话域 (6个)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | `/api/sessions` | 获取会话列表 | ✅ |
| POST | `/api/sessions` | 创建会话 | ✅ |
| GET | `/api/sessions/:id` | 获取会话详情 | ✅ |
| DELETE | `/api/sessions/:id` | 删除会话 | ✅ |
| GET | `/api/sessions/:id/messages` | 获取消息列表 | ✅ |
| POST | `/api/sessions/:id/messages` | 发送消息 | ✅ |

### 设备域 (5个)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | `/api/devices` | 获取设备列表 | ✅ |
| POST | `/api/devices` | 绑定设备 | ✅ |
| GET | `/api/devices/:id` | 获取设备详情 | ✅ |
| DELETE | `/api/devices/:id` | 解绑设备 | ✅ |
| POST | `/api/devices/data` | 设备数据上报 | 设备认证 |

### 环境数据域 (4个)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | `/api/environment/current` | 获取当前环境数据 | ✅ |
| GET | `/api/environment/history` | 获取历史环境数据 | ✅ |
| GET | `/api/environment/readings` | 获取读数列表 | ✅ |
| POST | `/api/environment/readings` | 手动录入环境数据 | ✅ |

### AI域 (2个)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| POST | `/api/ai/diagnose` | AI诊断 | ✅ |
| POST | `/api/ai/chat` | AI对话 | ✅ |

### 养护记录域 (4个)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | `/api/care-records` | 获取养护记录列表 | ✅ |
| POST | `/api/care-records` | 创建养护记录 | ✅ |
| GET | `/api/care-records/:id` | 获取养护记录详情 | ✅ |
| DELETE | `/api/care-records/:id` | 删除养护记录 | ✅ |

### 诊断卡域 (2个)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | `/api/diagnosis-cards` | 获取诊断卡列表 | ✅ |
| GET | `/api/diagnosis-cards/:id` | 获取诊断卡详情 | ✅ |

### 文件上传域 (3个)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| POST | `/api/cos/upload` | 上传文件到COS | ✅ |
| GET | `/api/cos/upload-credentials` | 获取上传凭证 | ✅ |
| GET | `/api/storage/upload-credentials` | 获取存储上传凭证 | ✅ |

### 日志域 (4个)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | `/api/logs/system` | 获取系统日志 | Log认证 |
| GET | `/api/logs/client` | 获取客户端日志 | Log认证 |
| POST | `/api/logs/client` | 上报客户端日志 | ✅ |
| DELETE | `/api/logs` | 清理日志 | Log认证 |

### 天气域 (1个)

| 方法 | 路径 | 说明 | 认证 |
|:---:|:---|:---|:---:|
| GET | `/api/weather` | 获取天气数据 | ✅ |

---

## 统计

| 域 | 接口数量 |
|:---|:---:|
| 用户域 | 3 |
| 植物域 | 5 |
| 会话域 | 6 |
| 设备域 | 5 |
| 环境数据域 | 4 |
| AI域 | 2 |
| 养护记录域 | 4 |
| 诊断卡域 | 2 |
| 文件上传域 | 3 |
| 日志域 | 4 |
| 天气域 | 1 |
| **总计** | **39** |

---

## 演示话术

> "我们设计了39个API接口，按领域划分。注意设备数据上报用单独的设备认证，不走JWT。所有接口统一返回 `{ code, message, data }` 格式。"
