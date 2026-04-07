# 虚拟设备模拟器实现计划

## 一、项目概述

根据 `虚拟设备模拟器重写设计文档.md` 实现一个完整的虚拟设备模拟器，支持：
- UDP设备发现（响应小程序扫描）
- UDP WiFi配网（模拟接收配置）
- HTTP数据上报（定时上报传感器数据）
- 多场景模式切换
- 状态持久化
- **Web可视化界面**（实时监控、场景切换、日志查看）

## 二、目录结构

```
_dev/tools/python/
├── virtual_device.py      # 主入口（CLI模式）
├── web_app.py             # Web入口（Web模式）
├── config.py              # 配置定义
├── constants.py           # 常量（指标、场景范围）
├── models.py              # 数据类定义
├── services/
│   ├── __init__.py
│   ├── logger.py          # 日志服务
│   ├── state_manager.py   # 状态持久化
│   ├── udp_service.py     # UDP通信服务
│   ├── data_generator.py  # 数据生成器
│   └── scenario.py        # 场景控制器
├── web/                   # Web界面
│   ├── __init__.py
│   ├── api.py             # Flask API路由
│   ├── templates/
│   │   └── index.html     # 主页面
│   └── static/
│       ├── css/
│       │   └── style.css
│       └── js/
│           └── app.js
├── requirements.txt       # 依赖
└── tests/
    └── test_virtual_device.py
```

## 三、实现步骤

### 阶段1：基础结构（预计文件数：5）

| 序号 | 任务 | 文件 | 说明 |
|:---|:---|:---|:---|
| 1.1 | 创建项目结构 | 目录 | 创建 services/、web/、tests/ 目录 |
| 1.2 | 定义常量 | `constants.py` | 传感器指标定义、场景数据范围 |
| 1.3 | 定义数据类 | `models.py` | DeviceConfig, ReportResult, DeviceStatus |
| 1.4 | 定义配置 | `config.py` | 配置加载和验证 |
| 1.5 | 创建依赖文件 | `requirements.txt` | requests, pyyaml, flask |

### 阶段2：服务层（预计文件数：5）

| 序号 | 任务 | 文件 | 说明 |
|:---|:---|:---|:---|
| 2.1 | 日志服务 | `services/logger.py` | 彩色日志、文件轮转 |
| 2.2 | 状态管理 | `services/state_manager.py` | 持久化存储、加载、验证 |
| 2.3 | UDP服务 | `services/udp_service.py` | UDP监听、消息处理 |
| 2.4 | 数据生成器 | `services/data_generator.py` | 传感器数据生成、平滑变化 |
| 2.5 | 场景控制器 | `services/scenario.py` | 场景切换、过渡动画 |

### 阶段3：核心类（预计文件数：1）

| 序号 | 任务 | 文件 | 说明 |
|:---|:---|:---|:---|
| 3.1 | 虚拟设备主类 | `virtual_device.py` | 整合所有服务、主循环、CLI入口 |

### 阶段4：Web界面（预计文件数：5）

| 序号 | 任务 | 文件 | 说明 |
|:---|:---|:---|:---|
| 4.1 | Flask API | `web/api.py` | RESTful API端点 |
| 4.2 | Web入口 | `web_app.py` | Flask应用启动 |
| 4.3 | 主页面 | `web/templates/index.html` | 监控页面HTML |
| 4.4 | 样式 | `web/static/css/style.css` | 页面样式 |
| 4.5 | 交互逻辑 | `web/static/js/app.js` | 前端交互、WebSocket |

### 阶段5：测试验证（预计文件数：1）

| 序号 | 任务 | 文件 | 说明 |
|:---|:---|:---|:---|
| 5.1 | 单元测试 | `tests/test_virtual_device.py` | 测试各模块功能 |
| 5.2 | 集成测试 | 手动测试 | 与后端API联调 |

## 四、Web界面设计

### 4.1 API端点

| 端点 | 方法 | 说明 | 请求体 |
|:---|:---|:---|:---|
| `/api/status` | GET | 获取设备运行状态 | - |
| `/api/history` | GET | 获取历史数据（最近N条） | `?limit=100` |
| `/api/start` | POST | 启动设备 | - |
| `/api/stop` | POST | 停止设备 | - |
| `/api/scenario` | POST | 切换场景 | `{"scenario": "drought"}` |
| `/api/interval` | POST | 修改上报间隔 | `{"interval": 30}` |
| `/api/report` | POST | 手动触发上报 | - |
| `/api/config` | GET | 获取当前配置 | - |
| `/api/logs` | GET | 获取最近日志 | `?limit=50` |

### 4.2 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│                    🌱 虚拟设备监控中心                        │
├─────────────────┬─────────────────┬─────────────────────────┤
│   ⚙️ 设备控制    │   📊 实时数据    │    🎭 场景选择           │
│   ───────────   │   ───────────   │    ─────────────        │
│   服务器地址     │   🌡️ 温度: 32.5°C  │    ○ 正常             │
│   设备ID        │   💧 湿度: 18.5%   │    ● 干旱             │
│   植物ID        │   🌐 气压: 1013hPa │    ○ 高温             │
│   上报间隔      │   ☀️ 光照: 12500   │    ○ 低温             │
│   [启动] [停止]  │   🌱 土壤湿度: 12.3%│    ○ 高湿             │
│                 │   🌡️ 土壤温度: 22°C│    ○ 光照不足         │
│                 │   🔬 土壤pH: 6.5   │    ○ 浇水             │
│                 │   🔋 电池: 95%     │    ○ 夜间             │
├─────────────────┴─────────────────┴─────────────────────────┤
│   📱 设备信息                              📝 运行日志        │
│   ─────────────────────                 ──────────────────── │
│   运行状态: 🟢 运行中                   [12:00:01] 上报成功  │
│   上报次数: 42                          [12:00:00] 场景切换  │
│   运行时长: 42分钟                      [11:59:00] 启动成功  │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 实时更新

使用 **WebSocket** 或 **Server-Sent Events (SSE)** 实现数据实时推送：

```python
# web/api.py
from flask import Flask, Response
import json

@app.route('/api/stream')
def stream():
    """SSE实时数据流"""
    def event_stream():
        while device.running:
            data = {
                'metrics': device.current_metrics,
                'status': device.get_status()
            }
            yield f"data: {json.dumps(data)}\n\n"
            time.sleep(1)
    return Response(event_stream(), mimetype="text/event-stream")
```

## 五、详细实现计划

### 5.1 constants.py - 常量定义

```python
# 传感器指标定义（与数据库一致）
SENSOR_METRICS = {
    'temperature': {'name': '空气温度', 'unit': '°C', 'min': -40, 'max': 85},
    'humidity': {'name': '空气湿度', 'unit': '%', 'min': 0, 'max': 100},
    'pressure': {'name': '大气压强', 'unit': 'hPa', 'min': 800, 'max': 1100},
    'light_intensity': {'name': '光照强度', 'unit': 'lux', 'min': 0, 'max': 200000},
    'soil_moisture': {'name': '土壤湿度', 'unit': '%', 'min': 0, 'max': 100},
    'soil_temperature': {'name': '土壤温度', 'unit': '°C', 'min': -20, 'max': 60},
    'soil_ph': {'name': '土壤酸碱度', 'unit': 'pH', 'min': 3.0, 'max': 9.0},
    'battery_level': {'name': '电池电量', 'unit': '%', 'min': 0, 'max': 100},
}

# 场景数据范围
SCENARIO_RANGES = {
    'normal': {...},
    'drought': {...},
    # ... 8个场景
}

# UDP端口
DEFAULT_UDP_PORT = 8266

# Web服务端口
DEFAULT_WEB_PORT = 8080
```

### 5.2 web/api.py - Flask API

```python
from flask import Flask, jsonify, request, Response
import json

app = Flask(__name__)
device = None  # VirtualDevice实例

@app.route('/api/status')
def get_status():
    return jsonify(device.get_status())

@app.route('/api/start', methods=['POST'])
def start_device():
    device.start()
    return jsonify({'success': True})

@app.route('/api/stop', methods=['POST'])
def stop_device():
    device.stop()
    return jsonify({'success': True})

@app.route('/api/scenario', methods=['POST'])
def set_scenario():
    data = request.json
    device.set_scenario(data['scenario'])
    return jsonify({'success': True})

@app.route('/api/stream')
def stream():
    """SSE实时数据流"""
    def event_stream():
        while device.running:
            yield f"data: {json.dumps(device.get_status())}\n\n"
            time.sleep(1)
    return Response(event_stream(), mimetype="text/event-stream")
```

### 5.3 web_app.py - Web入口

```python
from flask import Flask, render_template
from virtual_device import VirtualDevice
from config import DeviceConfig
from web.api import app

def run_web_mode(config: DeviceConfig):
    """运行Web模式"""
    global device
    device = VirtualDevice(config)
    device.start()
    
    print(f"Web界面: http://localhost:{config.web_port}")
    app.run(host='0.0.0.0', port=config.web_port)

if __name__ == '__main__':
    config = DeviceConfig()
    run_web_mode(config)
```

## 六、测试计划

### 6.1 单元测试

| 测试项 | 测试内容 |
|:---|:---|
| 数据生成器 | 各场景数据范围正确性 |
| 场景切换 | 过渡动画平滑性 |
| 状态管理 | 持久化读写正确性 |
| UDP服务 | 消息解析和响应 |
| Web API | 各端点响应正确 |

### 6.2 集成测试

| 测试项 | 测试内容 |
|:---|:---|:---|
| 配对流程 | 登录→创建植物→绑定设备 |
| 数据上报 | 上报成功，返回readingId |
| 前端联调 | 小程序扫描发现设备 |
| Web界面 | 实时数据更新、场景切换 |

## 七、依赖

```txt
requests>=2.28.0
pyyaml>=6.0
flask>=2.3.0
flask-cors>=4.0.0
```

## 八、执行顺序

1. 创建目录结构
2. 实现 constants.py 和 models.py
3. 实现 services/ 下各服务
4. 实现 virtual_device.py 主入口
5. 实现 web/api.py 和 web_app.py
6. 实现 Web 前端页面
7. 编写测试用例
8. 与后端联调测试
9. 与前端小程序联调测试

## 九、预计产出

| 文件 | 行数估计 |
|:---|:---|
| constants.py | ~100 |
| models.py | ~50 |
| config.py | ~50 |
| services/logger.py | ~80 |
| services/state_manager.py | ~100 |
| services/udp_service.py | ~150 |
| services/data_generator.py | ~120 |
| services/scenario.py | ~100 |
| virtual_device.py | ~400 |
| web/api.py | ~150 |
| web_app.py | ~50 |
| web/templates/index.html | ~200 |
| web/static/css/style.css | ~150 |
| web/static/js/app.js | ~200 |
| requirements.txt | ~5 |
| **总计** | **~1905行** |

## 十、启动方式

```bash
# CLI模式
python virtual_device.py --server-url http://localhost:3000 --scenario normal

# Web模式
python web_app.py --server-url http://localhost:3000 --web-port 8080

# 同时启动CLI和Web
python virtual_device.py --web --web-port 8080
```
