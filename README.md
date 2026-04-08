# smart-garden-mvp

智能植物养护系统 - 微信小程序 + IoT 后端

## 项目简介

本项目是一个面向植物爱好者的智能养护平台，结合物联网设备监测、AI 诊断和微信小程序，帮助用户更好地管理家中植物。

## 功能特性

- **植物档案管理**：记录植物信息、生长状态
- **环境数据监测**：温度、湿度、光照、土壤等多维度监测
- **AI 智能诊断**：基于 DeepSeek AI 的植物健康分析
- **虚拟设备模拟**：无需真实硬件即可开发和测试
- **微信小程序**：便捷的移动端体验

## 技术栈

### 前端
- 微信小程序原生框架
- JavaScript / WXSS / WXML

### 后端
- Node.js 18+
- Express.js
- Sequelize ORM
- MySQL 8.0
- JWT 认证
- 腾讯云 COS 文件存储

### 开发工具
- Python 虚拟设备模拟器（UDP / WiFi 配网）
- Jest 测试框架
- ESLint + Prettier 代码规范

## 快速开始

### 环境要求
- Node.js >= 18.0.0
- MySQL >= 8.0
- Python 3.8+（用于虚拟设备）

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/ShatterDusk/smart-garden-mvp.git
   cd smart-garden-mvp
   ```

2. **后端配置**
   ```bash
   cd backend/server
   npm install
   cp .env.example .env.local
   # 编辑 .env.local 配置数据库连接
   npm run dev
   ```

3. **前端配置**
   - 使用微信开发者工具打开 `frontend` 目录
   - 修改 `utils/config.js` 中的 API 地址

4. **虚拟设备（可选）**
   ```bash
   cd _dev/tools/python
   pip install -r requirements.txt
   python virtual_device.py
   ```

## 项目结构

```
smart-garden-mvp/
├── frontend/              # 微信小程序前端
├── backend/server/        # Node.js 后端
├── _dev/tools/python/     # 虚拟设备模拟器
├── docs/                  # 项目文档
└── LICENSE                # MIT 许可证
```

## 代码来源声明

本项目包含以下内容：

| 来源 | 说明 |
|:---|:---|
| **人工编写** | 架构设计、业务逻辑、数据库设计、测试、Bug 修复 |
| **AI 辅助** | 部分代码由 AI 工具辅助生成，经人工审查和修改 |
| **开源依赖** | 使用 MIT/Apache 2.0/BSD 许可的开源库（详见 package.json）|

本项目由 **ShatterDusk** 独立开发和维护。

## 项目历史

本项目源于一个竞赛项目的初步构想，后经过完全重构和重新设计，形成当前版本。原竞赛项目因管理原因未能完成，本版本为作者独立完成的全新实现。

## 免责声明

本软件按"原样"提供，不附带任何明示或暗示的保证。

作者不对以下情况承担责任：
- AI 生成代码的准确性或安全性
- 使用本软件造成的任何直接或间接损失
- 第三方依赖库的问题
- 硬件设备适配问题

使用者应自行评估风险。

## 许可证

[MIT License](LICENSE)

Copyright (c) 2026 ShatterDusk

## 致谢

- 项目构想源于团队竞赛的初步讨论
- 硬件原型由团队成员提供早期验证
- 感谢开源社区提供的优秀工具和库

## 联系方式

- GitHub: [@ShatterDusk](https://github.com/ShatterDusk)
- 如有问题，欢迎提交 Issue

---

**注意**：本项目为学习和实践用途，不保证生产环境稳定性。
