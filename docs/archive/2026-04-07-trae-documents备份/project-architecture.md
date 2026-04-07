# proj-alpha 文件索引

> 让 AI 快速了解每个文件的用途。
> 
> **最后更新**: 2026-04-05

---

## 一、根目录配置文件

| 文件 | 用途 |
|:---|:---|
| `app.js` | 小程序入口，全局生命周期 |
| `app.json` | 小程序配置，页面路由、tabBar、窗口样式 |
| `app.wxss` | 全局样式 |
| `project.config.json` | 微信开发者工具配置 |
| `sitemap.json` | 小程序索引配置 |

---

## 二、前端页面 `pages/`

| 页面目录 | 功能 |
|:---|:---|
| `login/` | 登录页（微信登录、游客登录） |
| `index/` | 首页仪表盘（植物概览、快捷入口） |
| `plants/` | 植物列表 |
| `plant-detail/` | 植物详情（信息、环境数据、诊断历史） |
| `add-plant/` | 添加植物 |
| `sessions/` | 会话列表（咨询会话、植物会话） |
| `qna/` | AI 问答页（聊天界面） |
| `plant-sessions/` | 植物关联会话列表 |
| `quick-analyze/` | 快速分析（拍照诊断） |
| `metric-detail/` | 指标详情（环境数据图表） |
| `device-manage/` | 设备管理列表 |
| `device-detail/` | 设备详情 |

---

## 三、前端组件 `components/`

| 组件 | 用途 |
|:---|:---|
| `plant-card/` | 植物卡片（列表项） |
| `diagnosis-card/` | 诊断结果卡片 |
| `metric-item/` | 环境指标项 |
| `empty-state/` | 空状态占位 |
| `loading-state/` | 加载状态 |
| `markdown-render/` | Markdown 渲染（AI 回复） |
| `user-message-render/` | 用户消息渲染（图片+文字） |

---

## 四、前端工具 `utils/`

| 文件 | 用途 |
|:---|:---|
| `api.js` | **核心**：API 请求封装，所有后端接口调用 |
| `config.js` | 前端配置（API 地址、常量） |
| `cos-upload.js` | 腾讯云 COS 图片上传 |
| `logger.js` | 前端日志工具 |
| `logCollector.js` | 日志收集器 |
| `text-utils.js` | 文本处理工具 |

---

## 五、后端路由 `backend/server/src/routes/`

| 路由文件 | API 前缀 | 功能 |
|:---|:---|:---|
| `users.js` | `/api/users` | 用户登录、配置 |
| `plants.js` | `/api/plants` | 植物 CRUD |
| `sessions.js` | `/api/sessions` | 会话、消息管理 |
| `devices.js` | `/api/devices` | 设备绑定、状态 |
| `environment.js` | `/api/environment`, `/api/metrics` | 环境数据 |
| `diagnosis.js` | `/api/diagnosis` | 诊断历史 |
| `careRecords.js` | `/api/care-records` | 养护记录 |
| `ai.js` | `/api/ai` | AI 分析 |
| `cos.js` | `/api/cos` | COS 临时 URL |
| `storage.js` | `/api/storage` | 存储管理 |
| `upload.js` | `/api/upload` | 文件上传 |
| `logs.js` | `/api/logs` | 日志查询 |

---

## 六、后端控制器 `backend/server/src/controllers/`

| 控制器 | 功能 |
|:---|:---|
| `userController.js` | 用户登录、信息、配置管理 |
| `plantController.js` | 植物 CRUD、关联设备 |
| `sessionController.js` | 会话创建、消息发送 |
| `deviceController.js` | 设备绑定、数据上报 |
| `environmentController.js` | 环境数据查询、写入 |
| `diagnosisController.js` | 诊断历史查询 |
| `careRecordController.js` | 养护记录管理 |
| `aiController.js` | AI 分析入口 |
| `cosController.js` | COS 临时 URL 生成 |
| `storageController.js` | 存储管理 |
| `logController.js` | 日志查询 |

---

## 七、后端模型 `backend/server/src/models/`

| 模型 | 表名 | 用途 |
|:---|:---|:---|
| `User.js` | users | 用户信息 |
| `Plant.js` | plants | 植物信息 |
| `Session.js` | sessions | 会话 |
| `Message.js` | messages | 消息 |
| `Device.js` | devices | 设备 |
| `DiagnosisCard.js` | diagnosis_cards | 诊断卡 |
| `EnvironmentMetric.js` | environment_metrics | 环境指标定义 |
| `EnvironmentReading.js` | environment_readings | 环境读数 |
| `EnvironmentReadingValue.js` | environment_reading_values | 读数值 |
| `CareRecord.js` | care_records | 养护记录 |
| `UserConfig.js` | user_config | 用户配置 |
| `ReadingTask.js` | reading_tasks | 读数任务 |
| `index.js` | - | **关联定义**（所有模型关系） |

---

## 八、后端中间件 `backend/server/src/middleware/`

| 中间件 | 用途 |
|:---|:---|
| `auth.js` | JWT 认证 |
| `deviceAuth.js` | 设备认证 |
| `response.js` | 统一响应格式 `{code, message, data}` |
| `errorHandler.js` | 全局错误处理 |
| `camelCase.js` | 命名转换工具（未启用） |

---

## 九、后端服务 `backend/server/src/services/`

| 服务 | 用途 |
|:---|:---|
| `aiService.js` | AI 调用（DeepSeek）、上下文构建 |
| `weatherService.js` | 天气数据获取 |
| `compensationService.js` | 环境数据补偿 |

---

## 十、后端配置 `backend/server/src/config/`

| 文件 | 用途 |
|:---|:---|
| `database.js` | 数据库连接配置 |
| `environment.js` | 环境变量 |
| `ai.js` | AI 服务配置 |
| `sequelize-cli.js` | Sequelize CLI 配置 |

---

## 十一、后端工具 `backend/server/src/utils/`

| 文件 | 用途 |
|:---|:---|
| `logger.js` | 后端日志 |
| `response.js` | 响应工具函数 |
| `validators.js` | 参数校验 |
| `initDatabase.js` | 数据库初始化 |
| `syncDatabase.js` | 数据库同步 |
| `cosTempUrl.js` | COS 临时 URL（旧） |
| `cosPresignedUrl.js` | COS 预签名 URL |
| `cosSdkTempUrl.js` | COS SDK 临时 URL |

---

## 十二、后端定时任务 `backend/server/src/jobs/`

| 文件 | 用途 |
|:---|:---|
| `environmentSyncJob.js` | 环境数据同步定时任务 |

---

## 十三、开发工具 `_dev/tools/`

| 目录 | 用途 |
|:---|:---|
| `node/` | Node.js 脚本（测试 API、生成数据、检查数据库） |
| `python/` | Python 虚拟设备模拟器 |
| `scripts/` | COS 测试脚本 |
| `log-server/` | 日志收集服务器 |
| `fix-scripts/` | 数据修复脚本 |

---

## 十四、设计文档 `设计文档/`

| 文件 | 内容 |
|:---|:---|
| `00-需求规格说明书.md` | 产品需求 |
| `01-系统架构设计.md` | 系统架构 |
| `02-数据库设计.md` | 表结构设计 |
| `03-API接口设计.md` | API 接口定义 |
| `05-前端页面设计.md` | 页面设计 |
| `08-测试方案.md` | 测试方案 |
| `04-业务流程/` | 业务流程文档 |

---

## 十五、关键文件速查

| 需求 | 文件 |
|:---|:---|
| 新增 API | `routes/*.js` → `controllers/*.js` → `utils/api.js` |
| 修改数据模型 | `models/*.js` → `models/index.js`（关联） |
| 新增页面 | `pages/*/` → `app.json` |
| 新增组件 | `components/*/` |
| 认证逻辑 | `middleware/auth.js` |
| AI 交互 | `services/aiService.js`、`controllers/aiController.js` |
| 环境数据 | `controllers/environmentController.js`、`services/compensationService.js` |
