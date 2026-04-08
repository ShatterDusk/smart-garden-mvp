# 虚拟设备 V2 开发启动指南

## 🚀 快速开始

### 第一步：创建 V2 项目结构

```bash
cd f:\PROJECTS\WeChatProjects\MVP\_dev\tools\python

# 创建 V2 项目目录
mkdir v2
cd v2

# 创建项目结构
mkdir -p src/{core,models,services,routes,utils}
mkdir -p tests/{unit,integration,e2e}
mkdir -p config
mkdir -p docs
```

### 第二步：创建核心文件

#### 1. `pyproject.toml` (项目配置)

```toml
[project]
name = "virtual-device-v2"
version = "2.0.0"
description = "虚拟设备模拟器 V2"
requires-python = ">=3.10"

dependencies = [
    "fastapi>=0.104.0",
    "uvicorn[standard]>=0.24.0",
    "pydantic>=2.5.0",
    "structlog>=23.2.0",
    "aiosqlite>=0.19.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-asyncio>=0.21.0",
    "pytest-cov>=4.1.0",
    "ruff>=0.1.6",
    "mypy>=1.7.0",
]
```

#### 2. `src/__init__.py`

```python
"""虚拟设备模拟器 V2"""
__version__ = "2.0.0"
```

#### 3. `src/core/config.py` (配置管理)

```python
from pydantic import BaseModel, Field
from typing import Optional
import yaml
import os

class ServerConfig(BaseModel):
    host: str = Field("0.0.0.0")
    port: int = Field(8080, ge=1024, le=65535)
    
class LoggingConfig(BaseModel):
    level: str = Field("INFO")
    format: str = Field("json")

class AppConfig(BaseModel):
    server: ServerConfig = Field(default_factory=ServerConfig)
    logging: LoggingConfig = Field(default_factory=LoggingConfig)
    
    @classmethod
    def load(cls, config_path: Optional[str] = None):
        if config_path and os.path.exists(config_path):
            with open(config_path, 'r') as f:
                data = yaml.safe_load(f) or {}
            return cls(**data)
        return cls()
```

#### 4. `src/core/errors.py` (错误处理)

```python
class VirtualDeviceError(Exception):
    code: int = 1000
    message: str = ""
    
    def __init__(self, message: str = "", **kwargs):
        self.message = message or self.message
        super().__init__(self.message)
        
    def to_dict(self) -> dict:
        return {"code": self.code, "message": self.message}

class DeviceNotFoundError(VirtualDeviceError):
    code = 2000
    
class DeviceAlreadyRunningError(VirtualDeviceError):
    code = 2001
```

#### 5. `src/models/device.py` (设备模型)

```python
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class DeviceStatus(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    STOPPED = "stopped"
    ERROR = "error"

class DeviceMode(str, Enum):
    MANUAL = "manual"
    SCENARIO = "scenario"
    SCRIPT = "script"

class Device(BaseModel):
    device_id: str
    name: str = Field("Virtual Device")
    status: DeviceStatus = DeviceStatus.IDLE
    mode: DeviceMode = DeviceMode.MANUAL
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        from_attributes = True
```

## 📋 开发顺序（按优先级）

### Phase 1: 基础设施 (第1周)

| 序号 | 任务 | 文件 | 状态 |
|------|------|------|------|
| 1 | 项目初始化 | pyproject.toml, requirements.txt | ⬜ |
| 2 | 配置管理 | src/core/config.py | ⬜ |
| 3 | 错误处理 | src/core/errors.py | ⬜ |
| 4 | 日志系统 | src/core/logger.py | ⬜ |
| 5 | 数据模型 | src/models/*.py | ⬜ |

### Phase 2: 核心模块 (第2-3周)

| 序号 | 任务 | 文件 | 状态 |
|------|------|------|------|
| 6 | 设备实例 | src/core/device_instance.py | ⬜ |
| 7 | 设备管理器 | src/services/device_manager.py | ⬜ |
| 8 | 自然模拟算法 | src/services/natural_simulation.py | ⬜ |
| 9 | 场景引擎 | src/services/scenario_engine.py | ⬜ |
| 10 | 数据生成器 | src/services/data_generator.py | ⬜ |

### Phase 3: 接口层 (第4周)

| 序号 | 任务 | 文件 | 状态 |
|------|------|------|------|
| 11 | REST API | src/routes/api.py | ⬜ |
| 12 | WebSocket | src/routes/websocket.py | ⬜ |
| 13 | 应用入口 | src/main.py | ⬜ |

### Phase 4: Web界面 (第5周)

| 序号 | 任务 | 文件 | 状态 |
|------|------|------|------|
| 14 | HTML模板 | templates/index.html | ⬜ |
| 15 | CSS样式 | static/css/style.css | ⬜ |
| 16 | JavaScript | static/js/app.js | ⬜ |

## 🔧 开发命令速查

### 安装依赖
```bash
pip install -e ".[dev]"
```

### 运行测试
```bash
pytest tests/ -v --cov=src
```

### 启动服务
```bash
uvicorn src.main:app --reload --port 8080
```

### 代码格式化
```bash
ruff check src/
ruff format src/
```

## 📁 推荐的文件组织

```
v2/
├── src/
│   ├── __init__.py
│   ├── main.py              # FastAPI应用入口
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py         # 配置管理
│   │   ├── errors.py         # 错误定义
│   │   └── logger.py         # 日志系统
│   ├── models/
│   │   ├── __init__.py
│   │   ├── device.py         # 设备模型
│   │   ├── sensor_data.py    # 传感器数据模型
│   │   └── event.py          # 事件模型
│   ├── services/
│   │   ├── __init__.py
│   │   ├── device_manager.py # 设备管理器
│   │   ├── data_generator.py # 数据生成器
│   │   ├── scenario_engine.py# 场景引擎
│   │   └── timeline.py       # 时间线
│   └── routes/
│       ├── __init__.py
│       ├── api.py            # REST API
│       └── websocket.py      # WebSocket
├── tests/
│   ├── conftest.py           # 测试配置
│   ├── unit/
│   └── integration/
├── config/
│   └── default.yaml          # 默认配置
├── pyproject.toml
└── README.md
```

## ✅ 开始第一个任务

**建议从最简单的开始：**

1. 创建项目结构
2. 实现 `config.py`
3. 实现 `errors.py`
4. 写一个简单的单元测试验证配置加载

**准备好了吗？告诉我你想从哪里开始，我可以帮你写代码！**
