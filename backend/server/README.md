# 智能园艺助手 - 后端服务

基于 Node.js + Express + Sequelize + MySQL 的智能园艺助手后端 API 服务。

## 技术栈

- **运行时**: Node.js 18.x LTS
- **Web 框架**: Express.js 5.x
- **ORM**: Sequelize 6.x
- **数据库**: MySQL 8.0+
- **认证**: JWT
- **日志**: Winston
- **校验**: Joi

## 项目结构

```
server/
├── src/
│   ├── config/          # 配置文件
│   │   ├── database.js  # 数据库配置
│   │   └── ai.js        # AI 服务配置
│   ├── controllers/     # 控制器
│   │   ├── userController.js
│   │   ├── plantController.js
│   │   ├── sessionController.js
│   │   ├── careRecordController.js
│   │   ├── deviceController.js
│   │   ├── diagnosisController.js
│   │   └── aiController.js
│   ├── models/          # 数据模型
│   │   ├── index.js
│   │   ├── User.js
│   │   ├── Plant.js
│   │   ├── Session.js
│   │   ├── Message.js
│   │   ├── DiagnosisCard.js
│   │   ├── Device.js
│   │   ├── CareRecord.js
│   │   └── ...
│   ├── routes/          # 路由
│   │   ├── users.js
│   │   ├── plants.js
│   │   ├── sessions.js
│   │   ├── careRecords.js
│   │   ├── devices.js
│   │   ├── diagnosis.js
│   │   └── ai.js
│   ├── middleware/      # 中间件
│   │   ├── auth.js      # JWT 认证
│   │   ├── errorHandler.js
│   │   └── response.js
│   ├── services/        # 业务服务
│   │   └── aiService.js # AI 服务封装
│   ├── utils/           # 工具函数
│   │   ├── logger.js
│   │   └── response.js
│   └── app.js           # 应用入口
├── migrations/          # 数据库迁移
├── seeders/             # 种子数据
├── logs/                # 日志文件
├── .env                 # 环境变量
├── .env.example         # 环境变量示例
├── package.json
└── server.js            # 启动脚本
```

## 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填写数据库连接信息和 AI 服务密钥
```

### 3. 执行数据库迁移

```bash
npm run migrate
```

### 4. 导入种子数据

```bash
npx sequelize-cli db:seed:all
```

### 5. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务将运行在 http://localhost:3000

## API 文档

### 用户模块

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/users/login | 微信登录 |
| GET | /api/users/profile | 获取用户信息 |
| PUT | /api/users/profile | 更新用户信息 |
| GET | /api/users/settings | 获取用户设置 |
| PUT | /api/users/settings | 更新用户设置 |

### 植物模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/plants | 获取植物列表 |
| POST | /api/plants | 创建植物 |
| GET | /api/plants/:plantId | 获取植物详情 |
| PUT | /api/plants/:plantId | 更新植物 |
| DELETE | /api/plants/:plantId | 删除植物 |

### 会话模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/sessions | 获取会话列表 |
| POST | /api/sessions | 创建会话 |
| GET | /api/sessions/:sessionId | 获取会话详情 |
| GET | /api/sessions/:sessionId/messages | 获取消息列表 |
| POST | /api/sessions/:sessionId/messages | 发送消息 |
| POST | /api/sessions/:sessionId/upgrade | 升级会话 |
| DELETE | /api/sessions/:sessionId | 删除会话 |

### 养护记录模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/care-records | 获取养护记录列表 |
| POST | /api/care-records | 创建养护记录 |
| PUT | /api/care-records/:recordId | 更新养护记录 |
| DELETE | /api/care-records/:recordId | 删除养护记录 |

### 设备模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/devices | 获取设备列表 |
| POST | /api/devices/bind | 绑定设备 |
| POST | /api/devices/unbind | 解绑设备 |
| GET | /api/devices/:deviceId | 获取设备详情 |

### 诊断卡模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/diagnosis | 获取诊断历史 |
| GET | /api/diagnosis/:diagnosisCardId | 获取诊断详情 |

### AI 模块

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/ai/analyze | 触发 AI 分析 |

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| NODE_ENV | 运行环境 | development |
| PORT | 服务端口 | 3000 |
| DB_HOST | 数据库主机 | localhost |
| DB_PORT | 数据库端口 | 3306 |
| DB_NAME | 数据库名称 | smart_garden |
| DB_USER | 数据库用户名 | root |
| DB_PASSWORD | 数据库密码 | - |
| JWT_SECRET | JWT 密钥 | - |
| JWT_EXPIRES_IN | Token 有效期 | 7d |
| AI_PROVIDER | AI 提供商 | glm |
| GLM_API_KEY | 智谱 AI API 密钥 | - |
| GLM_MODEL | GLM 模型 | glm-4.6v |
| OPENAI_API_KEY | OpenAI API 密钥 | - |

## 开发命令

```bash
# 启动开发服务器（热重载）
npm run dev

# 启动生产服务器
npm start

# 执行数据库迁移
npm run migrate

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 设计文档参考

- [需求规格说明书](../设计文档/00-需求规格说明书.md)
- [系统架构设计](../设计文档/01-系统架构设计.md)
- [数据库设计](../设计文档/02-数据库设计.md)
- [API接口设计](../设计文档/03-API接口设计.md)
- [AI交互与数据流转](../设计文档/04-AI交互与数据流转-设计.md)

## 许可证

ISC
