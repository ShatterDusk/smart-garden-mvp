# smart-garden-mvp

智能植物养护系统 - 微信小程序 + Node.js 后端

## 项目简介

本项目是一个面向植物爱好者的智能养护平台，结合物联网设备监测、AI 辅助诊断和微信小程序，帮助用户更好地管理家中植物。

## 功能特性

- **植物档案管理**：记录植物信息、生长状态、养护计划
- **环境数据监测**：温度、湿度、光照、土壤等多维度实时监测
- **AI 智能诊断**：基于 AI API 的植物健康状态分析
- **会话咨询**：用户与 AI 助手进行植物养护问答
- **设备管理**：支持 IoT 设备绑定与数据上报

## 技术栈

### 前端

- 微信小程序原生框架
- JavaScript / WXSS / WXML

### 后端

- Node.js 18+
- Express.js 5.x
- Sequelize ORM 6.x
- MySQL 8.0
- JWT 认证
- 腾讯云 COS 文件存储
- sharp 图片处理

### 开发工具

- Jest 测试框架
- ESLint + Prettier 代码规范
- Node.js 调试工具

## 项目结构

```
smart-garden-mvp/
├── frontend/                  # 微信小程序前端
│   ├── pages/                # 页面目录
│   │   ├── index/            # 首页
│   │   ├── login/            # 登录页
│   │   ├── plants/           # 植物列表
│   │   ├── add-plant/        # 添加植物
│   │   ├── plant-detail/     # 植物详情
│   │   ├── plant-sessions/   # 植物会话
│   │   ├── sessions/         # 会话列表
│   │   ├── qna/              # 问答页面
│   │   ├── quick-analyze/    # 快速分析
│   │   ├── device-manage/    # 设备管理
│   │   ├── device-detail/    # 设备详情
│   │   ├── metric-detail/    # 指标详情
│   │   └── weather/          # 天气页面
│   ├── components/           # 公共组件
│   └── utils/                # 工具函数
├── backend/server/            # Node.js 后端服务
│   ├── src/
│   │   ├── config/           # 配置文件
│   │   ├── controllers/      # 控制器
│   │   ├── services/         # 业务逻辑层
│   │   ├── models/           # 数据模型
│   │   ├── routes/           # 路由定义
│   │   ├── middleware/        # 中间件
│   │   ├── jobs/             # 定时任务
│   │   └── utils/            # 工具函数
│   └── tests/                # 测试文件
├── _dev/tools/               # 开发工具
│   └── node/                 # Node.js 调试工具
└── docs/                     # 项目文档
```

## API 接口概览

| 模块 | 说明 |
|:---|:---|
| `/api/users` | 用户管理（注册、登录、认证） |
| `/api/plants` | 植物档案 CRUD |
| `/api/sessions` | 会话管理 |
| `/api/care-records` | 养护记录 |
| `/api/devices` | 设备绑定与管理 |
| `/api/diagnosis` | AI 诊断卡片 |
| `/api/ai` | AI 对话与分析 |
| `/api/environment` | 环境数据查询 |
| `/api/weather` | 天气信息 |
| `/api/upload` | 文件上传 |
| `/api/storage` | 存储管理 |
| `/api/cos` | 腾讯云 COS |
| `/api/logs` | 日志查询 |

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- MySQL >= 8.0
- 微信开发者工具

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/ShatterDusk/smart-garden-mvp.git
   cd smart-garden-mvp
   ```

2. **后端配置与启动**
   ```bash
   cd backend/server
   npm install
   cp .env.example .env.local
   # 编辑 .env.local 配置数据库连接、JWT 密钥、AI API 等
   npm run dev
   ```

3. **前端配置**
   - 使用微信开发者工具打开 `frontend` 目录
   - 修改 `utils/config.js` 中的 API 地址（默认指向本地 `http://localhost:3000`）

### 运行测试

```bash
cd backend/server
npm test           # 运行所有测试
npm run test:unit   # 单元测试
npm test:integration # 集成测试
```

## 代码质量

- **代码规范**：遵循 ESLint + Prettier 规范
- **测试覆盖**：Jest 单元测试、集成测试、端到端测试
- **类型检查**：通过 ESLint 进行静态检查

## 主要依赖

| 依赖 | 用途 |
|:---|:---|
| express | Web 框架 |
| sequelize | ORM 数据库访问 |
| jsonwebtoken | JWT 认证 |
| cos-nodejs-sdk-v5 | 腾讯云 COS |
| sharp | 图片处理 |
| joi | 参数校验 |
| helmet | 安全中间件 |
| winston | 日志记录 |

## 项目维护

- **作者**：ShatterDusk
- **许可证**：MIT License
- **联系方式**：GitHub [@ShatterDusk](https://github.com/ShatterDusk)

## 贡献指南

欢迎提交 Issue 和 Pull Request。在提交代码前，请确保：

1. 运行 `npm run lint` 通过代码规范检查
2. 运行 `npm test` 通过所有测试
3. 新功能附带相应的测试用例

## 致谢

- 微信小程序官方文档
- Sequelize ORM 社区
- Express.js 框架
- 其他开源贡献者

---

Copyright (c) 2026 ShatterDusk. All rights reserved.
