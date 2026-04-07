# 调试工具目录

本目录包含开发和调试过程中使用的工具脚本。

## 目录结构

```
tools/
├── node/                    # Node.js 工具
│   ├── check-db.js         # 数据库连接检查
│   ├── check-plant-env.js  # 检查植物环境数据
│   ├── generate-token.js   # 生成测试 JWT Token
│   ├── generate-test-data.js # 生成测试数据
│   ├── scan-issues.js      # 问题检测脚本
│   ├── test-all-api.js     # 综合API测试
│   ├── test-api.js         # API接口测试
│   ├── seed-demo-data.js   # 填充演示数据
│   └── package.json        # Node.js 依赖配置
│
└── python/                  # Python 工具
    ├── virtual_device.py   # 虚拟设备模拟器
    └── requirements.txt    # Python 依赖配置
```

## Node.js 工具

### 安装依赖

```bash
cd tools/node
npm install
```

### 使用方法

```bash
# 检查数据库
npm run check-db

# 检查植物环境数据
npm run check-plant-env

# 生成测试 Token
npm run generate-token -- [userId]

# 填充演示数据
npm run seed-demo

# 测试 API 接口（基础）
npm run test-api

# 综合API测试（测试所有端点）
npm run test-all

# 生成测试数据
npm run generate-test-data

# 扫描代码问题
npm run scan-issues
```

## Python 工具

### 安装依赖

```bash
cd tools/python
pip install -r requirements.txt
```

### 使用方法

```bash
# 运行虚拟设备模拟器（自动配对模式）
python virtual_device.py

# 指定设备ID和植物ID
python virtual_device.py --device-id DEVICE_abc123 --plant-id PLANT_xyz

# 禁用自动配对（手动指定设备ID和植物ID）
python virtual_device.py --device-id DEVICE_abc123 --plant-id PLANT_xyz --no-auto-pair

```

## 虚拟设备模拟器参数

| 参数 | 说明 | 默认值 |
|:---|:---|:---|
| `--device-id` | 设备ID（可选，自动配对时自动生成） | - |
| `--server-url` | 服务器URL | http://localhost:3000 |
| `--plant-id` | 植物ID（可选，不指定则自动创建） | - |
| `--interval` | 上报间隔（秒） | 60 |
| `--no-auto-pair` | 禁用自动配对 | False |

## 测试工具说明

### 综合API测试 (test-all-api.js)

一键测试所有API端点，包括：
- 健康检查
- 用户登录/注册
- 植物CRUD
- 会话管理
- 养护记录
- 环境数据

### 问题检测脚本 (scan-issues.js)

自动扫描代码中的常见问题：
- 硬编码数据
- console.log 使用
- TODO/FIXME 标记
- SQL 注入风险
- 命名规范问题
- 空错误处理

### 测试数据生成器 (generate-test-data.js)

自动生成测试数据：
- 用户
- 植物
- 会话
- 消息
- 养护记录
- 环境读数

```bash
# 自定义数量
npm run generate-test-data -- plantCount=5 sessionCount=3
```
