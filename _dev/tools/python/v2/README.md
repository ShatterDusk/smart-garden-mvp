# 虚拟设备模拟器 V2

## 项目结构

```
v2/
├── src/
│   ├── main.py              # FastAPI 应用入口
│   ├── core/                # 核心模块
│   │   ├── config.py         # 配置管理
│   │   ├── errors.py         # 错误定义
│   │   └── logger.py         # 日志系统
│   ├── models/              # 数据模型
│   │   └── device.py         # 设备模型
│   ├── services/            # 服务层
│   │   └── device_manager.py # 设备管理器
│   └── routes/              # API 路由
│       └── api.py            # REST API
├── tests/                   # 测试
│   ├── conftest.py
│   └── unit/
│       └── test_device_manager.py
├── config/                  # 配置文件
├── pyproject.toml           # 项目配置
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
cd v2
pip install -e ".[dev]"
```

### 2. 运行服务

```bash
uvicorn src.main:app --reload --port 8080
```

### 3. 访问 API 文档

打开浏览器访问: http://localhost:8080/docs

### 4. 运行测试

```bash
pytest tests/ -v
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 根路径 |
| GET | /health | 健康检查 |
| GET | /api/v1/devices | 设备列表 |
| POST | /api/v1/devices | 创建设备 |
| GET | /api/v1/devices/{id} | 设备详情 |
| POST | /api/v1/devices/{id}/start | 启动设备 |
| POST | /api/v1/devices/{id}/stop | 停止设备 |
| DELETE | /api/v1/devices/{id} | 删除设备 |
| GET | /api/v1/system/status | 系统状态 |

## 开发状态

- [x] Phase 1: 基础设施 (config, errors, logger)
- [x] Phase 2: 数据模型 (Device, SensorData)
- [x] Phase 3: 服务层 (DeviceManager)
- [x] Phase 4: REST API
- [ ] Phase 5: WebSocket
- [ ] Phase 6: Web 界面
- [ ] Phase 7: 数据生成引擎
- [ ] Phase 8: 场景系统
- [ ] Phase 9: 事件时间线
