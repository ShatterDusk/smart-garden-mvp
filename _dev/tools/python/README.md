# proj-alpha 虚拟设备模拟器

proj-alpha 虚拟设备模拟器是一个用于模拟植物监测 IoT 设备的 Python 应用程序。它支持 UDP 设备发现、WiFi 配网、传感器数据生成和上报等功能，可用于开发和测试 proj-alpha 微信小程序的设备相关功能。

## 功能特性

- **UDP 设备发现**：模拟真实设备的 UDP 广播发现机制
- **WiFi 配网**：支持 AP 模式配网流程
- **传感器数据模拟**：支持 8 种环境传感器数据生成
- **场景模式**：8 种预设场景模拟不同环境条件
- **数据上报**：支持实时和批量数据上报到后端
- **状态持久化**：设备绑定状态自动保存，重启后无需重新配网
- **Web 管理界面**：提供可视化的 Web 控制面板
- **CLI 模式**：支持命令行操作

## 支持的传感器

| 传感器 | 单位 | 范围 |
|--------|------|------|
| 空气温度 | °C | -40 ~ 85 |
| 空气湿度 | % | 0 ~ 100 |
| 大气压强 | hPa | 800 ~ 1100 |
| 光照强度 | lux | 0 ~ 200000 |
| 土壤湿度 | % | 0 ~ 100 |
| 土壤温度 | °C | -20 ~ 60 |
| 土壤酸碱度 | pH | 3.0 ~ 9.0 |
| 电池电量 | % | 0 ~ 100 |

## 场景模式

- **normal**：正常环境
- **drought**：干旱环境（土壤湿度低）
- **high_temp**：高温环境
- **low_temp**：低温环境
- **high_hum**：高湿环境
- **low_light**：弱光环境
- **watering**：浇水状态
- **night**：夜间模式

## 安装

### 环境要求

- Python 3.8+
- pip

### 安装依赖

```bash
pip install -r requirements.txt
```

## 使用方法

### CLI 模式

启动虚拟设备（CLI 模式）：

```bash
python virtual_device.py
```

带参数启动：

```bash
python virtual_device.py --mac AA:BB:CC:DD:EE:01 --interval 60 --scenario drought
```

可用参数：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--mac` | 设备 MAC 地址 | 随机生成 |
| `--name` | 设备名称 | proj-alpha-虚拟设备 |
| `--interval` | 数据上报间隔（秒） | 300 |
| `--scenario` | 场景模式 | normal |
| `--state-file` | 状态文件路径 | device_state.json |
| `--verbose` | 详细日志输出 | False |

### Web 模式

启动 Web 管理界面：

```bash
python web_app.py
```

访问 http://localhost:5000 打开管理界面

Web 模式参数：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--mac` | 设备 MAC 地址 | 随机生成 |
| `--name` | 设备名称 | proj-alpha-虚拟设备 |
| `--interval` | 数据上报间隔（秒） | 300 |
| `--scenario` | 场景模式 | normal |
| `--port` | Web 服务端口 | 5000 |
| `--state-file` | 状态文件路径 | device_state.json |
| `--verbose` | 详细日志输出 | False |

## Web 界面功能

Web 界面提供以下功能：

1. **实时数据监控**：显示当前所有传感器数据
2. **场景切换**：点击按钮切换不同场景模式
3. **设备控制**：
   - 启动/停止设备
   - 强制立即上报数据
   - 清除绑定状态
4. **运行日志**：实时显示设备运行日志
5. **配置信息**：显示设备配置参数

## 与微信小程序交互

### 设备发现

1. 启动虚拟设备
2. 在微信小程序中进入"添加设备"页面
3. 小程序会扫描并显示虚拟设备
4. 点击设备进行绑定

### WiFi 配网

1. 选择虚拟设备后，小程序发送配网信息
2. 虚拟设备模拟配网过程
3. 配网成功后，设备自动连接到模拟网络

### 数据上报

- 设备按设定间隔自动上报传感器数据
- 支持通过 Web 界面手动触发上报
- 数据格式与真实设备完全一致

## 项目结构

```
python/
├── virtual_device.py          # CLI 模式入口
├── web_app.py                 # Web 模式入口
├── constants.py               # 常量和配置
├── models.py                  # 数据模型
├── config.py                  # 配置管理
├── requirements.txt           # Python 依赖
├── device_state.json          # 状态文件（自动生成）
├── services/                  # 服务模块
│   ├── logger.py             # 日志服务
│   ├── state_manager.py      # 状态管理
│   ├── udp_service.py        # UDP 服务
│   ├── data_generator.py     # 数据生成
│   └── scenario.py           # 场景管理
└── web/                       # Web 界面
    ├── api.py                # Flask API
    ├── static/
    │   ├── css/style.css     # 样式文件
    │   └── js/app.js         # 前端脚本
    └── templates/
        └── index.html        # 主页面
```

## API 接口

Web 模式提供以下 REST API：

### 获取设备状态
```
GET /api/status
```

### 获取传感器数据
```
GET /api/sensors
```

### 切换场景
```
POST /api/scenario
{
    "scenario": "drought"
}
```

### 控制设备
```
POST /api/control
{
    "action": "start" | "stop" | "report_now" | "clear_binding"
}
```

### 获取日志（SSE）
```
GET /api/logs/stream
```

## 配置说明

### 多环境切换

虚拟设备支持多环境配置，可通过 `--env` 参数快速切换：

```bash
# 使用本地开发环境
python virtual_device.py --env local

# 使用云托管生产环境
python virtual_device.py --env production
```

可用环境：

| 环境 | 说明 | 后端地址 |
|------|------|----------|
| `local` | 本地开发环境 | http://localhost:3000 |
| `production` | 云托管生产环境 | https://plant-backend-240450-4-1401681523.sh.run.tcloudbase.com |

### 命令行参数

CLI 模式参数：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--env` | 服务器环境 (local/production) | local |
| `--server-url` | 后端服务器 URL | 自动根据环境选择 |
| `--mac` | 设备 MAC 地址 | 随机生成 |
| `--name` | 设备名称 | proj-alpha-虚拟设备 |
| `--interval` | 数据上报间隔（秒） | 60 |
| `--scenario` | 场景模式 | normal |
| `--udp-port` | UDP 监听端口 | 8266 |
| `--reset` | 重置状态文件 | False |
| `--verbose` | 详细日志输出 | False |
| `--web` | 启动 Web 界面 | False |

Web 模式额外参数：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--web-port` | Web 服务端口 | 8080 |

### 配置文件（可选）

也可以使用 YAML 配置文件：

```yaml
# config.yaml
server:
  env: local
  url: ""

device:
  udp_port: 8266
  web_port: 8080
  default_interval: 60
  default_scenario: normal
  auto_pair: true
```

启动时指定配置文件：

```bash
python virtual_device.py --config config.yaml
```

### 环境变量

| 变量 | 说明 |
|------|------|
| `SERVER_URL` | 后端服务器地址（优先级最高） |

## 注意事项

1. **MAC 地址**：建议使用唯一的 MAC 地址，避免与真实设备冲突
2. **状态文件**：状态文件会保存设备绑定信息，删除后需要重新配网
3. **网络要求**：确保虚拟设备和微信小程序在同一网络环境
4. **后端服务**：确保后端服务已启动，否则数据上报会失败

## 开发调试

### 查看详细日志

```bash
python virtual_device.py --verbose
```

### 测试特定场景

```bash
python virtual_device.py --scenario high_temp --interval 30
```

### 清除绑定状态

删除 `device_state.json` 文件或调用 API：

```bash
curl -X POST http://localhost:5000/api/control \
  -H "Content-Type: application/json" \
  -d '{"action": "clear_binding"}'
```

## 故障排查

### 设备无法被发现

- 检查防火墙设置，确保 UDP 端口未被阻止
- 确认设备和手机在同一网络
- 使用 `--verbose` 查看详细日志

### 数据上报失败

- 检查后端服务是否正常运行
- 确认 `BACKEND_API['base_url']` 配置正确
- 查看设备是否已完成绑定

### Web 界面无法访问

- 检查端口是否被占用
- 使用 `--port` 参数更换端口
- 确认所有依赖已正确安装

## 技术栈

- Python 3.8+
- Flask (Web 框架)
- Requests (HTTP 客户端)
- Flask-SSE (服务端推送)

## 许可证

本项目为 proj-alpha 项目开发工具，仅供内部使用。

## 更新日志

### v2.0.0 (2025-04-07)

- 全新架构重写
- 支持 UDP 设备发现
- 支持 WiFi 配网流程
- 新增 Web 管理界面
- 支持状态持久化
- 支持 8 种传感器和 8 种场景模式
