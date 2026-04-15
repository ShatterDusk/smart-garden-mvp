# 第 1 天：Node.js 环境与基础

> 日期：2026-04-14
> 阶段：1. 环境与基础

---

## 🎯 今日目标

1. 了解 Node.js 是什么
2. 检查/安装 Node.js 环境
3. 理解模块系统（require/module.exports）
4. 查看项目 package.json 结构
5. 成功运行 PlantGPT 项目

---

## 1. Node.js 是什么？

### 一句话解释

> **Node.js 是一个让 JavaScript 可以在服务器端运行的环境。**

### 传统 vs Node.js

```
传统 JavaScript：
浏览器 → 运行 JS → 操作网页

Node.js：
服务器 → 运行 JS → 操作文件/网络/数据库
```

### 为什么要学 Node.js？

| 优势 | 说明 |
|:---|:---|
| **统一语言** | 前后端都用 JavaScript |
| **高性能** | 异步非阻塞，适合高并发 |
| **生态丰富** | npm 有上百万个包可用 |
| **全栈开发** | 一个人能写完整项目 |

---

## 2. 检查 Node.js 环境

### 验证安装

打开终端，运行以下命令：

```bash
# 查看 Node.js 版本
node --version

# 查看 npm 版本
npm --version
```

**预期输出：**
```
v18.x.x  或更高版本
9.x.x    或更高版本
```

### 如果未安装

1. 访问 https://nodejs.org/
2. 下载 LTS（长期支持）版本
3. 按提示安装
4. 重启终端，再次验证

---

## 3. 第一个 Node.js 程序

### 创建练习文件

在工作区创建练习目录：

```
.trae/documents/Node.js学习笔记/
└── 练习代码/
    └── day01/
        └── hello.js
```

### 代码：hello.js

```javascript
// 第 1 个 Node.js 程序
console.log('Hello, Node.js!');
console.log('当前时间：', new Date().toLocaleString());
```

### 运行

```bash
cd .trae/documents/Node.js学习笔记/练习代码/day01
node hello.js
```

**输出：**
```
Hello, Node.js!
当前时间： 2026/4/14 10:30:00
```

---

## 4. 模块系统（核心概念）

### 什么是模块？

> 把代码拆分成多个文件，每个文件就是一个模块。

### 两种角色

| 角色 | 语法 | 作用 |
|:---|:---|:---|
| **导入** | `require('模块')` | 使用别人的代码 |
| **导出** | `module.exports = xxx` | 让别人用你的代码 |

### 练习：创建数学模块

#### 文件 1：math.js（定义模块）

```javascript
// 数学工具模块

// 加法
function add(a, b) {
  return a + b;
}

// 减法
function subtract(a, b) {
  return a - b;
}

// 乘法
function multiply(a, b) {
  return a * b;
}

// 导出（让别人可以使用）
module.exports = {
  add,
  subtract,
  multiply
};
```

#### 文件 2：main.js（使用模块）

```javascript
// 使用数学模块
const math = require('./math');

console.log('10 + 5 =', math.add(10, 5));
console.log('10 - 5 =', math.subtract(10, 5));
console.log('10 * 5 =', math.multiply(10, 5));
```

#### 运行

```bash
node main.js
```

**输出：**
```
10 + 5 = 15
10 - 5 = 5
10 * 5 = 50
```

### 模块类型

```javascript
// 1. 内置模块（Node.js 自带）
const fs = require('fs');      // 文件系统
const path = require('path');  // 路径处理
const http = require('http');  // HTTP 服务

// 2. 第三方模块（npm 安装）
const express = require('express');  // 需要 npm install express

// 3. 自定义模块（自己写的）
const math = require('./math');      // 相对路径
const utils = require('../utils');   // 上级目录
```

---

## 5. 项目实战：查看 PlantGPT 的 package.json

### package.json 是什么？

> 项目的"身份证"，记录项目信息和依赖。

### 查看项目配置

文件位置：`backend/server/package.json`

**关键字段：**

```json
{
  "name": "plant-mvp-backend",      // 项目名
  "version": "1.0.0",               // 版本号
  "main": "server.js",              // 入口文件
  
  "scripts": {                       // 命令脚本
    "start": "node server.js",       // 生产启动
    "dev": "nodemon server.js",      // 开发启动（自动重启）
    "test": "jest"                   // 运行测试
  },
  
  "dependencies": {                  // 生产依赖
    "express": "^4.18.2",            // Web 框架
    "sequelize": "^6.35.0",          // ORM
    "mysql2": "^3.6.0",              // MySQL 驱动
    "jsonwebtoken": "^9.0.0"         // JWT 认证
  },
  
  "devDependencies": {               // 开发依赖
    "jest": "^29.7.0",               // 测试框架
    "nodemon": "^3.0.0"              // 自动重启工具
  }
}
```

### 常用 npm 命令

```bash
# 安装所有依赖（根据 package.json）
npm install

# 安装单个包
npm install express

# 安装开发依赖
npm install --save-dev nodemon

# 运行脚本
npm run dev      # 等同于：nodemon server.js
npm test         # 等同于：jest
npm start        # 等同于：node server.js
```

---

## 6. 运行 PlantGPT 项目

### 步骤

```bash
# 1. 进入后端目录
cd backend/server

# 2. 安装依赖（如果没有安装过）
npm install

# 3. 配置环境变量（复制示例文件）
copy .env.example .env

# 4. 启动开发服务器
npm run dev
```

### 预期输出

```
🚀 服务器运行在 http://0.0.0.0:3000
服务器启动成功
```

### 验证运行

打开浏览器访问：
- http://localhost:3000/health

应该看到：
```json
{
  "status": "ok",
  "timestamp": "2026-04-14T02:30:00.000Z"
}
```

---

## 7. 项目结构概览

```
backend/server/
├── server.js              ← 服务器启动入口
├── package.json           ← 项目配置
├── src/
│   ├── app.js             ← Express 应用配置
│   ├── routes/            ← 路由定义
│   │   ├── users.js       ← 用户相关接口
│   │   ├── plants.js      ← 植物相关接口
│   │   └── ...
│   ├── controllers/       ← 控制器（处理请求）
│   ├── services/          ← 服务层（业务逻辑）
│   ├── models/            ← 数据模型
│   └── middleware/        ← 中间件
└── tests/                 ← 测试代码
```

---

## ✅ 今日任务清单

- [ ] 验证 Node.js 已安装（`node --version`）
- [ ] 运行第一个程序 `hello.js`
- [ ] 创建 `math.js` 模块并导出
- [ ] 创建 `main.js` 导入并使用 math 模块
- [ ] 查看 `package.json` 理解项目配置
- [ ] 成功运行 PlantGPT 项目（`npm run dev`）
- [ ] 访问 `http://localhost:3000/health` 验证

---

## 📝 学习笔记

### 重点概念

1. **Node.js**：让 JS 运行在服务器端的运行时环境
2. **模块系统**：`require()` 导入，`module.exports` 导出
3. **package.json**：项目配置文件，记录依赖和脚本
4. **npm**：Node 包管理器，安装和管理依赖

### 易错点

- ❌ `require('math')` → 找内置或 npm 模块
- ✅ `require('./math')` → 找当前目录的 math.js

### 明日预告

明天学习 **JavaScript 核心概念**：
- const/let vs var
- 箭头函数
- 解构赋值
- 类与构造函数

---

## 💡 练习建议

1. 自己动手创建 `math.js` 和 `main.js`
2. 尝试添加除法功能（注意除数为 0 的情况）
3. 修改 `hello.js` 输出你的名字和当前时间
4. 探索 PlantGPT 项目的其他文件

---

*完成今天的学习后，在进度跟踪表中打勾！* ✓
