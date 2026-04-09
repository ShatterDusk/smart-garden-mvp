"""虚拟设备模拟器 V2 - FastAPI 应用入口"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import os

from .core.config import AppConfig
from .routes import api, websocket
from .services.device_manager import DeviceManager

config = AppConfig.load()

app = FastAPI(
    title="虚拟设备模拟器 V2",
    description="PlantGPT 虚拟设备模拟系统",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(api.router)
app.include_router(websocket.router)

# 静态文件和模板
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


# 注册 WebSocket 广播回调
@app.on_event("startup")
async def startup_event():
    """启动时注册数据广播回调"""
    device_manager = DeviceManager.get_instance()
    device_manager.on_data_generated(websocket.broadcast_device_data)


@app.get("/", response_class=HTMLResponse)
async def root():
    """根路径 - 返回监控面板"""
    html_content = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>虚拟设备监控面板 V2</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        .header h1 { font-size: 24px; margin-bottom: 5px; }
        .header p { opacity: 0.9; }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .section {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .section h2 {
            font-size: 18px;
            margin-bottom: 15px;
            color: #333;
        }
        .device-list {
            display: grid;
            gap: 10px;
        }
        .device-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #ddd;
        }
        .device-item.running { border-left-color: #4CAF50; }
        .device-item.stopped { border-left-color: #9E9E9E; }
        .device-info h3 { font-size: 16px; margin-bottom: 5px; }
        .device-info p { font-size: 14px; color: #666; }
        .device-actions {
            display: flex;
            gap: 10px;
        }
        button {
            padding: 8px 16px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
        }
        button:hover { opacity: 0.8; }
        .btn-primary { background: #4CAF50; color: white; }
        .btn-danger { background: #f44336; color: white; }
        .btn-secondary { background: #2196F3; color: white; }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .metric-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .metric-card h3 {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 10px;
        }
        .metric-value {
            font-size: 32px;
            font-weight: bold;
        }
        .metric-unit {
            font-size: 14px;
            opacity: 0.8;
        }
        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 5px;
        }
        .status-online { background: #4CAF50; }
        .status-offline { background: #f44336; }
        .create-form {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }
        .create-form input {
            flex: 1;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .log-container {
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            max-height: 200px;
            overflow-y: auto;
        }
        .log-entry { margin-bottom: 5px; }
        .log-time { color: #858585; }
        .log-info { color: #4CAF50; }
        .log-error { color: #f44336; }

        /* 场景卡片样式 */
        .scenario-section {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .scenario-section h2 {
            font-size: 18px;
            margin-bottom: 15px;
            color: #333;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .current-scenario {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .current-scenario-info h3 {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 5px;
        }
        .current-scenario-info .scenario-name {
            font-size: 20px;
            font-weight: bold;
        }
        .scenario-transition {
            width: 200px;
        }
        .scenario-transition label {
            font-size: 12px;
            opacity: 0.9;
            display: block;
            margin-bottom: 5px;
        }
        .transition-bar {
            height: 6px;
            background: rgba(255,255,255,0.3);
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 5px;
        }
        .transition-progress {
            height: 100%;
            background: white;
            border-radius: 3px;
            width: 0%;
            transition: width 0.3s;
        }
        .scenario-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
        }
        .scenario-card {
            background: #f8f9fa;
            border: 2px solid transparent;
            border-radius: 10px;
            padding: 15px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
        }
        .scenario-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .scenario-card.active {
            border-color: #667eea;
            background: linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.1) 100%);
        }
        .scenario-card .icon {
            font-size: 32px;
            margin-bottom: 8px;
        }
        .scenario-card .name {
            font-size: 14px;
            font-weight: 600;
            color: #333;
            margin-bottom: 4px;
        }
        .scenario-card .desc {
            font-size: 12px;
            color: #666;
        }
        .scenario-card.normal { border-top: 4px solid #4CAF50; }
        .scenario-card.high_temperature { border-top: 4px solid #f44336; }
        .scenario-card.low_temperature { border-top: 4px solid #2196F3; }
        .scenario-card.high_humidity { border-top: 4px solid #00BCD4; }
        .scenario-card.dry { border-top: 4px solid #FF9800; }
        .scenario-card.strong_light { border-top: 4px solid #FFEB3B; }
        .scenario-card.weak_light { border-top: 4px solid #9E9E9E; }

        /* 时间线样式 */
        .timeline-section {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .timeline-section h2 {
            font-size: 18px;
            margin-bottom: 15px;
            color: #333;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .time-control {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
        }
        .time-display {
            text-align: center;
        }
        .time-display h3 {
            font-size: 12px;
            opacity: 0.9;
            margin-bottom: 5px;
        }
        .time-display .time-value {
            font-size: 24px;
            font-weight: bold;
            font-family: 'Courier New', monospace;
        }
        .time-display .scale-badge {
            display: inline-block;
            background: rgba(255,255,255,0.2);
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 12px;
            margin-top: 5px;
        }
        .time-controls {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .time-controls button {
            padding: 8px 16px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            background: rgba(255,255,255,0.2);
            color: white;
            transition: all 0.3s;
        }
        .time-controls button:hover {
            background: rgba(255,255,255,0.3);
        }
        .time-controls select {
            padding: 8px 12px;
            border: none;
            border-radius: 5px;
            font-size: 14px;
            background: rgba(255,255,255,0.2);
            color: white;
            cursor: pointer;
        }
        .time-controls select option {
            background: #333;
            color: white;
        }
        .event-list {
            max-height: 300px;
            overflow-y: auto;
        }
        .event-item {
            display: flex;
            align-items: center;
            padding: 12px;
            border-bottom: 1px solid #eee;
            gap: 12px;
        }
        .event-item:last-child {
            border-bottom: none;
        }
        .event-icon {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            background: #f0f0f0;
        }
        .event-info {
            flex: 1;
        }
        .event-info h4 {
            font-size: 14px;
            margin-bottom: 4px;
            color: #333;
        }
        .event-info p {
            font-size: 12px;
            color: #666;
        }
        .event-time {
            font-size: 12px;
            color: #999;
            text-align: right;
        }
        .event-status {
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
        }
        .event-status.pending { background: #e3f2fd; color: #1976d2; }
        .event-status.completed { background: #e8f5e9; color: #388e3c; }
        .event-status.cancelled { background: #ffebee; color: #d32f2f; }
        .event-actions {
            display: flex;
            gap: 5px;
        }
        .event-actions button {
            padding: 4px 8px;
            font-size: 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .btn-cancel { background: #ffebee; color: #d32f2f; }
        .btn-cancel:hover { background: #ffcdd2; }
        .add-event-form {
            display: grid;
            grid-template-columns: 1fr 1fr auto;
            gap: 10px;
            margin-bottom: 15px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .add-event-form select,
        .add-event-form input {
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
        }
        .template-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 10px;
            margin-bottom: 15px;
        }
        .template-card {
            background: #f8f9fa;
            border: 2px solid transparent;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
        }
        .template-card:hover {
            border-color: #667eea;
            background: #f0f2ff;
        }
        .template-card .icon {
            font-size: 24px;
            margin-bottom: 5px;
        }
        .template-card .name {
            font-size: 12px;
            color: #333;
        }

        /* 历史图表样式 */
        .history-section {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .history-section h2 {
            font-size: 18px;
            margin-bottom: 15px;
            color: #333;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .chart-container {
            position: relative;
            height: 300px;
            margin-bottom: 20px;
        }
        .chart-tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
        }
        .chart-tab {
            padding: 8px 16px;
            border: none;
            background: #f0f0f0;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
        }
        .chart-tab:hover {
            background: #e0e0e0;
        }
        .chart-tab.active {
            background: #667eea;
            color: white;
        }
        .time-range-selector {
            display: flex;
            gap: 10px;
            align-items: center;
            margin-bottom: 15px;
        }
        .time-range-selector select {
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
        }
        .time-range-selector button {
            padding: 8px 16px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-card h4 {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
        }
        .stat-values {
            display: flex;
            justify-content: space-around;
            font-size: 12px;
        }
        .stat-value {
            text-align: center;
        }
        .stat-value .label {
            color: #999;
            font-size: 11px;
        }
        .stat-value .value {
            font-weight: bold;
            font-size: 16px;
        }
        .stat-value.min { color: #2196F3; }
        .stat-value.avg { color: #4CAF50; }
        .stat-value.max { color: #f44336; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌱 虚拟设备监控面板 V2</h1>
            <p>实时监控系统 - PlantGPT</p>
        </div>

        <div class="section">
            <h2>📊 系统状态</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <h3>设备总数</h3>
                    <div class="metric-value" id="total-devices">0</div>
                </div>
                <div class="metric-card">
                    <h3>运行中</h3>
                    <div class="metric-value" id="running-devices">0</div>
                </div>
                <div class="metric-card">
                    <h3>已停止</h3>
                    <div class="metric-value" id="stopped-devices">0</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>➕ 创建设备</h2>
            <div class="create-form">
                <input type="text" id="device-name" placeholder="设备名称" value="我的虚拟设备">
                <button class="btn-primary" onclick="createDevice()">创建</button>
            </div>
        </div>

        <div class="section">
            <h2>📱 设备列表</h2>
            <div class="device-list" id="device-list">
                <p style="color: #999; text-align: center;">暂无设备</p>
            </div>
        </div>

        <div class="scenario-section" id="scenario-section" style="display: none;">
            <h2>🎭 场景控制</h2>
            <div class="current-scenario">
                <div class="current-scenario-info">
                    <h3>当前场景</h3>
                    <div class="scenario-name" id="current-scenario-name">--</div>
                </div>
                <div class="scenario-transition">
                    <label>过渡进度</label>
                    <div class="transition-bar">
                        <div class="transition-progress" id="transition-progress"></div>
                    </div>
                    <span id="transition-text" style="font-size: 11px; opacity: 0.9;">就绪</span>
                </div>
            </div>
            <div class="scenario-grid" id="scenario-grid">
                <!-- 场景卡片将通过JS动态生成 -->
            </div>
        </div>

        <div class="timeline-section" id="timeline-section" style="display: none;">
            <h2>⏰ 时间线控制</h2>
            <div class="time-control">
                <div class="time-display">
                    <h3>虚拟时间</h3>
                    <div class="time-value" id="virtual-time">--:--:--</div>
                    <span class="scale-badge" id="time-scale-badge">1x</span>
                </div>
                <div class="time-controls">
                    <select id="time-scale-select" onchange="setTimeScale(this.value)">
                        <option value="0">暂停</option>
                        <option value="1" selected>1x (实时)</option>
                        <option value="10">10x</option>
                        <option value="60">60x (1分/秒)</option>
                        <option value="600">600x (10分/秒)</option>
                    </select>
                    <button onclick="pauseTime()">⏸️ 暂停</button>
                    <button onclick="resumeTime()">▶️ 继续</button>
                </div>
            </div>

            <h3 style="font-size: 16px; margin-bottom: 10px;">📋 事件模板</h3>
            <div class="template-grid" id="template-grid">
                <!-- 模板卡片将通过JS动态生成 -->
            </div>

            <h3 style="font-size: 16px; margin-bottom: 10px;">⏳ 待执行事件</h3>
            <div class="event-list" id="event-list">
                <p style="color: #999; text-align: center;">暂无待执行事件</p>
            </div>
        </div>

        <div class="section">
            <h2>📈 实时数据</h2>
            <div id="selected-device" style="margin-bottom: 15px; color: #666;">
                请选择设备查看实时数据
            </div>
            <div class="metrics-grid" id="metrics-display" style="display: none;">
                <div class="metric-card">
                    <h3>🌡️ 温度</h3>
                    <div class="metric-value"><span id="temp-value">--</span><span class="metric-unit">°C</span></div>
                </div>
                <div class="metric-card">
                    <h3>💧 湿度</h3>
                    <div class="metric-value"><span id="humidity-value">--</span><span class="metric-unit">%</span></div>
                </div>
                <div class="metric-card">
                    <h3>☀️ 光照</h3>
                    <div class="metric-value"><span id="light-value">--</span><span class="metric-unit">lux</span></div>
                </div>
                <div class="metric-card">
                    <h3>🌱 土壤湿度</h3>
                    <div class="metric-value"><span id="soil-value">--</span><span class="metric-unit">%</span></div>
                </div>
            </div>
        </div>

        <div class="history-section" id="history-section" style="display: none;">
            <h2>📈 历史数据</h2>

            <div class="time-range-selector">
                <label>时间范围：</label>
                <select id="time-range">
                    <option value="50">最近50条</option>
                    <option value="100">最近100条</option>
                    <option value="500">最近500条</option>
                </select>
                <button onclick="loadHistoryData()">刷新数据</button>
                <button onclick="exportHistoryData()">导出数据</button>
            </div>

            <div class="chart-tabs">
                <button class="chart-tab active" onclick="switchChart('all')">全部指标</button>
                <button class="chart-tab" onclick="switchChart('temperature')">🌡️ 温度</button>
                <button class="chart-tab" onclick="switchChart('humidity')">💧 湿度</button>
                <button class="chart-tab" onclick="switchChart('light')">☀️ 光照</button>
                <button class="chart-tab" onclick="switchChart('soil')">🌱 土壤</button>
            </div>

            <div class="chart-container">
                <canvas id="history-chart"></canvas>
            </div>

            <div class="stats-grid" id="stats-grid">
                <!-- 统计数据将通过JS动态生成 -->
            </div>
        </div>

        <div class="section">
            <h2>📝 系统日志</h2>
            <div class="log-container" id="log-container">
                <div class="log-entry"><span class="log-time">[系统]</span> 监控面板已加载</div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
        let devices = [];
        let selectedDeviceId = null;
        let ws = null;
        let scenarios = [];
        let currentScenario = null;
        let transitionProgress = 0;
        let eventTemplates = [];
        let pendingEvents = [];
        let virtualTimeInterval = null;

        // 场景配置
        const SCENARIO_CONFIG = {
            normal: { icon: '🌿', name: '正常环境', desc: '舒适宜居' },
            high_temperature: { icon: '🔥', name: '高温', desc: '炎热夏季' },
            low_temperature: { icon: '❄️', name: '低温', desc: '寒冷冬季' },
            high_humidity: { icon: '🌧️', name: '高湿', desc: '潮湿雨季' },
            dry: { icon: '🏜️', name: '干燥', desc: '干旱缺水' },
            strong_light: { icon: '☀️', name: '强光', desc: '阳光直射' },
            weak_light: { icon: '🌙', name: '弱光', desc: '阴天夜晚' }
        };

        // 事件模板配置
        const TEMPLATE_CONFIG = {
            scenario_normal: { icon: '🌿', name: '正常场景' },
            scenario_hot: { icon: '🔥', name: '高温场景' },
            scenario_cold: { icon: '❄️', name: '低温场景' },
            scenario_dry: { icon: '🏜️', name: '干燥场景' },
            temperature_spike: { icon: '🌡️', name: '温度突变' },
            sensor_disconnect: { icon: '⚠️', name: '传感器断开' },
            recovery: { icon: '✅', name: '恢复正常' }
        };

        function log(message, type = 'info') {
            const container = document.getElementById('log-container');
            const time = new Date().toLocaleTimeString();
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-${type}">${message}</span>`;
            container.appendChild(entry);
            container.scrollTop = container.scrollHeight;
        }

        async function fetchScenarios() {
            try {
                const response = await fetch('/api/v1/scenarios');
                const result = await response.json();
                if (result.code === 0) {
                    scenarios = result.data;
                    renderScenarioCards();
                }
            } catch (error) {
                log('获取场景列表失败: ' + error.message, 'error');
            }
        }

        function renderScenarioCards() {
            const grid = document.getElementById('scenario-grid');
            grid.innerHTML = Object.entries(SCENARIO_CONFIG).map(([id, config]) => `
                <div class="scenario-card ${id}" data-scenario="${id}" onclick="switchScenario('${id}')">
                    <div class="icon">${config.icon}</div>
                    <div class="name">${config.name}</div>
                    <div class="desc">${config.desc}</div>
                </div>
            `).join('');
        }

        function updateScenarioUI(scenarioId, isTransitioning = false, progress = 0) {
            // 更新当前场景显示
            const config = SCENARIO_CONFIG[scenarioId] || SCENARIO_CONFIG.normal;
            document.getElementById('current-scenario-name').textContent = config.name;

            // 更新卡片选中状态
            document.querySelectorAll('.scenario-card').forEach(card => {
                card.classList.toggle('active', card.dataset.scenario === scenarioId);
            });

            // 更新过渡进度
            const progressBar = document.getElementById('transition-progress');
            const progressText = document.getElementById('transition-text');
            if (isTransitioning) {
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `过渡中 ${Math.round(progress)}%`;
            } else {
                progressBar.style.width = '100%';
                progressText.textContent = '就绪';
            }
        }

        async function switchScenario(scenarioId) {
            if (!selectedDeviceId) {
                log('请先选择一个设备', 'error');
                return;
            }

            try {
                log(`正在切换到场景: ${SCENARIO_CONFIG[scenarioId]?.name || scenarioId}`);
                const response = await fetch(`/api/v1/devices/${selectedDeviceId}/scenario`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scenario_id: scenarioId, transition_time_ms: 5000 })
                });
                const result = await response.json();

                if (result.code === 0) {
                    log(`场景切换请求成功: ${SCENARIO_CONFIG[scenarioId]?.name || scenarioId}`);
                    // 启动过渡动画
                    animateTransition();
                } else {
                    log('切换场景失败: ' + result.message, 'error');
                }
            } catch (error) {
                log('切换场景失败: ' + error.message, 'error');
            }
        }

        function animateTransition() {
            transitionProgress = 0;
            const duration = 5000;
            const interval = 50;
            const increment = 100 / (duration / interval);

            const timer = setInterval(() => {
                transitionProgress += increment;
                if (transitionProgress >= 100) {
                    transitionProgress = 100;
                    clearInterval(timer);
                    document.getElementById('transition-progress').style.width = '100%';
                    document.getElementById('transition-text').textContent = '就绪';
                } else {
                    document.getElementById('transition-progress').style.width = `${transitionProgress}%`;
                    document.getElementById('transition-text').textContent = `过渡中 ${Math.round(transitionProgress)}%`;
                }
            }, interval);
        }

        async function fetchDevices() {
            try {
                const response = await fetch('/api/v1/devices');
                const result = await response.json();
                devices = result;
                updateDeviceList();
                updateStats();
            } catch (error) {
                log('获取设备列表失败: ' + error.message, 'error');
            }
        }

        function updateStats() {
            const total = devices.length;
            const running = devices.filter(d => d.status === 'running').length;
            const stopped = total - running;
            
            document.getElementById('total-devices').textContent = total;
            document.getElementById('running-devices').textContent = running;
            document.getElementById('stopped-devices').textContent = stopped;
        }

        function updateDeviceList() {
            const list = document.getElementById('device-list');
            
            if (devices.length === 0) {
                list.innerHTML = '<p style="color: #999; text-align: center;">暂无设备</p>';
                return;
            }
            
            list.innerHTML = devices.map(device => `
                <div class="device-item ${device.status}">
                    <div class="device-info">
                        <h3>
                            <span class="status-indicator status-${device.status === 'running' ? 'online' : 'offline'}"></span>
                            ${device.name}
                        </h3>
                        <p>ID: ${device.device_id} | 状态: ${device.status} | 模式: ${device.mode}</p>
                    </div>
                    <div class="device-actions">
                        <button class="btn-secondary" onclick="selectDevice('${device.device_id}')">查看</button>
                        ${device.status === 'running' 
                            ? `<button class="btn-danger" onclick="stopDevice('${device.device_id}')">停止</button>`
                            : `<button class="btn-primary" onclick="startDevice('${device.device_id}')">启动</button>`
                        }
                        <button class="btn-danger" onclick="deleteDevice('${device.device_id}')">删除</button>
                    </div>
                </div>
            `).join('');
        }

        async function createDevice() {
            const name = document.getElementById('device-name').value;
            if (!name) {
                alert('请输入设备名称');
                return;
            }
            
            try {
                const response = await fetch('/api/v1/devices', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
                const result = await response.json();
                
                if (result.code === 0) {
                    log(`设备创建成功: ${result.data.name}`);
                    fetchDevices();
                    document.getElementById('device-name').value = '';
                } else {
                    log('创建设备失败: ' + result.message, 'error');
                }
            } catch (error) {
                log('创建设备失败: ' + error.message, 'error');
            }
        }

        async function startDevice(deviceId) {
            try {
                const response = await fetch(`/api/v1/devices/${deviceId}/start`, {
                    method: 'POST'
                });
                const result = await response.json();
                
                if (result.code === 0) {
                    log(`设备启动成功: ${deviceId}`);
                    fetchDevices();
                    if (selectedDeviceId === deviceId) {
                        connectWebSocket(deviceId);
                    }
                } else {
                    log('启动设备失败: ' + result.message, 'error');
                }
            } catch (error) {
                log('启动设备失败: ' + error.message, 'error');
            }
        }

        async function stopDevice(deviceId) {
            try {
                const response = await fetch(`/api/v1/devices/${deviceId}/stop`, {
                    method: 'POST'
                });
                const result = await response.json();
                
                if (result.code === 0) {
                    log(`设备停止成功: ${deviceId}`);
                    fetchDevices();
                    if (selectedDeviceId === deviceId && ws) {
                        ws.close();
                        ws = null;
                    }
                } else {
                    log('停止设备失败: ' + result.message, 'error');
                }
            } catch (error) {
                log('停止设备失败: ' + error.message, 'error');
            }
        }

        async function deleteDevice(deviceId) {
            if (!confirm('确定要删除这个设备吗？')) return;

            try {
                const response = await fetch(`/api/v1/devices/${deviceId}`, {
                    method: 'DELETE'
                });
                const result = await response.json();

                if (result.code === 0) {
                    log(`设备删除成功: ${deviceId}`);
                    if (selectedDeviceId === deviceId) {
                        selectedDeviceId = null;
                        document.getElementById('selected-device').textContent = '请选择设备查看实时数据';
                        document.getElementById('metrics-display').style.display = 'none';
                        document.getElementById('scenario-section').style.display = 'none';
                        document.getElementById('timeline-section').style.display = 'none';
                        document.getElementById('history-section').style.display = 'none';
                        if (virtualTimeInterval) {
                            clearInterval(virtualTimeInterval);
                            virtualTimeInterval = null;
                        }
                        if (historyChart) {
                            historyChart.destroy();
                            historyChart = null;
                        }
                        if (ws) {
                            ws.close();
                            ws = null;
                        }
                    }
                    fetchDevices();
                } else {
                    log('删除设备失败: ' + result.message, 'error');
                }
            } catch (error) {
                log('删除设备失败: ' + error.message, 'error');
            }
        }

        async function selectDevice(deviceId) {
            selectedDeviceId = deviceId;
            const device = devices.find(d => d.device_id === deviceId);
            document.getElementById('selected-device').textContent =
                `当前设备: ${device.name} (${deviceId})`;
            document.getElementById('metrics-display').style.display = 'grid';

            // 显示场景控制区域
            document.getElementById('scenario-section').style.display = 'block';

            // 显示时间线控制区域
            document.getElementById('timeline-section').style.display = 'block';

            // 显示历史图表区域
            document.getElementById('history-section').style.display = 'block';

            // 获取场景列表并渲染
            await fetchScenarios();

            // 获取当前设备场景
            await fetchCurrentScenario(deviceId);

            // 获取事件模板并渲染
            await fetchEventTemplates();

            // 获取待执行事件
            await fetchPendingEvents(deviceId);

            // 启动虚拟时间更新
            startVirtualTimeUpdate(deviceId);

            if (device.status === 'running') {
                connectWebSocket(deviceId);
            } else {
                log('设备未运行，启动后可查看实时数据');
            }
        }

        // ============ 时间线功能 ============

        async function fetchEventTemplates() {
            try {
                const response = await fetch('/api/v1/timeline/templates');
                const result = await response.json();
                if (result.code === 0) {
                    eventTemplates = result.data;
                    renderTemplateCards();
                }
            } catch (error) {
                log('获取事件模板失败: ' + error.message, 'error');
            }
        }

        function renderTemplateCards() {
            const grid = document.getElementById('template-grid');
            grid.innerHTML = eventTemplates.map(template => {
                const config = TEMPLATE_CONFIG[template.template_id] || { icon: '📌', name: template.name };
                return `
                    <div class="template-card" onclick="addEventFromTemplate('${template.template_id}')">
                        <div class="icon">${config.icon}</div>
                        <div class="name">${config.name}</div>
                    </div>
                `;
            }).join('');
        }

        async function addEventFromTemplate(templateId) {
            if (!selectedDeviceId) {
                log('请先选择一个设备', 'error');
                return;
            }

            try {
                const response = await fetch(`/api/v1/devices/${selectedDeviceId}/timeline/events/from-template`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ template_id: templateId, delay_seconds: 10 })
                });
                const result = await response.json();

                if (result.code === 0) {
                    log(`事件已添加: ${TEMPLATE_CONFIG[templateId]?.name || templateId}`);
                    await fetchPendingEvents(selectedDeviceId);
                } else {
                    log('添加事件失败: ' + result.message, 'error');
                }
            } catch (error) {
                log('添加事件失败: ' + error.message, 'error');
            }
        }

        async function fetchPendingEvents(deviceId) {
            try {
                const response = await fetch(`/api/v1/devices/${deviceId}/timeline/events?status=pending`);
                const result = await response.json();
                if (result.code === 0) {
                    pendingEvents = result.data;
                    renderEventList();
                }
            } catch (error) {
                log('获取事件列表失败: ' + error.message, 'error');
            }
        }

        function renderEventList() {
            const list = document.getElementById('event-list');

            if (pendingEvents.length === 0) {
                list.innerHTML = '<p style="color: #999; text-align: center;">暂无待执行事件</p>';
                return;
            }

            list.innerHTML = pendingEvents.map(event => {
                const scheduledTime = new Date(event.scheduled_time).toLocaleTimeString();
                const templateConfig = TEMPLATE_CONFIG[event.template_id] || { icon: '📌', name: event.event_type };

                return `
                    <div class="event-item">
                        <div class="event-icon">${templateConfig.icon}</div>
                        <div class="event-info">
                            <h4>${event.description || templateConfig.name}</h4>
                            <p>${event.event_type}</p>
                        </div>
                        <div class="event-time">
                            <div>${scheduledTime}</div>
                            <span class="event-status ${event.status}">${event.status}</span>
                        </div>
                        <div class="event-actions">
                            <button class="btn-cancel" onclick="cancelEvent('${event.event_id}')">取消</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        async function cancelEvent(eventId) {
            if (!selectedDeviceId) return;

            try {
                const response = await fetch(`/api/v1/devices/${selectedDeviceId}/timeline/events/${eventId}`, {
                    method: 'DELETE'
                });
                const result = await response.json();

                if (result.code === 0) {
                    log('事件已取消');
                    await fetchPendingEvents(selectedDeviceId);
                } else {
                    log('取消事件失败: ' + result.message, 'error');
                }
            } catch (error) {
                log('取消事件失败: ' + error.message, 'error');
            }
        }

        function startVirtualTimeUpdate(deviceId) {
            // 清除之前的定时器
            if (virtualTimeInterval) {
                clearInterval(virtualTimeInterval);
            }

            // 每秒更新一次虚拟时间显示
            virtualTimeInterval = setInterval(async () => {
                if (!selectedDeviceId || selectedDeviceId !== deviceId) {
                    clearInterval(virtualTimeInterval);
                    return;
                }

                try {
                    const response = await fetch(`/api/v1/devices/${deviceId}/timeline`);
                    const result = await response.json();

                    if (result.code === 0 && result.data) {
                        const vt = result.data.virtual_time;
                        document.getElementById('virtual-time').textContent =
                            new Date(vt.virtual_time).toLocaleTimeString();
                        document.getElementById('time-scale-badge').textContent =
                            vt.scale + 'x';

                        // 如果时间缩放选择器的值不匹配，更新它
                        const select = document.getElementById('time-scale-select');
                        if (select.value !== String(vt.scale)) {
                            select.value = vt.scale;
                        }
                    }
                } catch (error) {
                    // 静默失败，避免频繁报错
                }
            }, 1000);
        }

        async function setTimeScale(scale) {
            if (!selectedDeviceId) {
                log('请先选择一个设备', 'error');
                return;
            }

            const scaleValue = parseFloat(scale);

            try {
                if (scaleValue === 0) {
                    await pauseTime();
                } else {
                    const response = await fetch(`/api/v1/devices/${selectedDeviceId}/timeline/time/scale`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ scale: scaleValue })
                    });
                    const result = await response.json();

                    if (result.code === 0) {
                        log(`时间缩放已设置为 ${scaleValue}x`);
                    } else {
                        log('设置时间缩放失败: ' + result.message, 'error');
                    }
                }
            } catch (error) {
                log('设置时间缩放失败: ' + error.message, 'error');
            }
        }

        async function pauseTime() {
            if (!selectedDeviceId) {
                log('请先选择一个设备', 'error');
                return;
            }

            try {
                const response = await fetch(`/api/v1/devices/${selectedDeviceId}/timeline/time/pause`, {
                    method: 'POST'
                });
                const result = await response.json();

                if (result.code === 0) {
                    log('虚拟时间已暂停');
                    document.getElementById('time-scale-select').value = '0';
                } else {
                    log('暂停失败: ' + result.message, 'error');
                }
            } catch (error) {
                log('暂停失败: ' + error.message, 'error');
            }
        }

        async function resumeTime() {
            if (!selectedDeviceId) {
                log('请先选择一个设备', 'error');
                return;
            }

            try {
                const response = await fetch(`/api/v1/devices/${selectedDeviceId}/timeline/time/resume`, {
                    method: 'POST'
                });
                const result = await response.json();

                if (result.code === 0) {
                    log('虚拟时间已恢复');
                    document.getElementById('time-scale-select').value = '1';
                } else {
                    log('恢复失败: ' + result.message, 'error');
                }
            } catch (error) {
                log('恢复失败: ' + error.message, 'error');
            }
        }

        // ============ 历史图表功能 ============

        let historyChart = null;
        let currentChartMetric = 'all';
        let historyData = [];

        async function loadHistoryData() {
            if (!selectedDeviceId) {
                log('请先选择一个设备', 'error');
                return;
            }

            const count = document.getElementById('time-range').value;

            try {
                const response = await fetch(`/api/v1/devices/${selectedDeviceId}/history?count=${count}`);
                const result = await response.json();

                if (result.code === 0) {
                    historyData = result.data;
                    renderChart();
                    renderStats();
                    log(`历史数据已加载: ${historyData.length} 条记录`);
                } else {
                    log('加载历史数据失败: ' + result.message, 'error');
                }
            } catch (error) {
                log('加载历史数据失败: ' + error.message, 'error');
            }
        }

        async function loadHistoryStats() {
            if (!selectedDeviceId) return;

            try {
                const response = await fetch(`/api/v1/devices/${selectedDeviceId}/history/stats`);
                const result = await response.json();

                if (result.code === 0) {
                    renderStats(result.data);
                }
            } catch (error) {
                console.error('加载统计数据失败:', error);
            }
        }

        function renderStats(statsData) {
            const grid = document.getElementById('stats-grid');

            if (!statsData) {
                grid.innerHTML = '<p style="color: #999; text-align: center;">暂无统计数据</p>';
                return;
            }

            const metricNames = {
                temperature: '🌡️ 温度',
                humidity: '💧 湿度',
                light: '☀️ 光照',
                soil_moisture: '🌱 土壤湿度'
            };

            grid.innerHTML = Object.entries(statsData).map(([metric, stats]) => `
                <div class="stat-card">
                    <h4>${metricNames[metric] || metric}</h4>
                    <div class="stat-values">
                        <div class="stat-value min">
                            <div class="label">最小</div>
                            <div class="value">${stats.min.toFixed(1)}</div>
                        </div>
                        <div class="stat-value avg">
                            <div class="label">平均</div>
                            <div class="value">${stats.avg.toFixed(1)}</div>
                        </div>
                        <div class="stat-value max">
                            <div class="label">最大</div>
                            <div class="value">${stats.max.toFixed(1)}</div>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        function switchChart(metric) {
            currentChartMetric = metric;

            // 更新标签样式
            document.querySelectorAll('.chart-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            event.target.classList.add('active');

            renderChart();
        }

        function renderChart() {
            const ctx = document.getElementById('history-chart').getContext('2d');

            if (historyChart) {
                historyChart.destroy();
            }

            if (historyData.length === 0) {
                return;
            }

            const labels = historyData.map(d => new Date(d.timestamp).toLocaleTimeString());

            const datasets = [];

            if (currentChartMetric === 'all' || currentChartMetric === 'temperature') {
                datasets.push({
                    label: '🌡️ 温度 (°C)',
                    data: historyData.map(d => d.temperature),
                    borderColor: '#f44336',
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y'
                });
            }

            if (currentChartMetric === 'all' || currentChartMetric === 'humidity') {
                datasets.push({
                    label: '💧 湿度 (%)',
                    data: historyData.map(d => d.humidity),
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    tension: 0.4,
                    yAxisID: currentChartMetric === 'all' ? 'y1' : 'y'
                });
            }

            if (currentChartMetric === 'all' || currentChartMetric === 'light') {
                datasets.push({
                    label: '☀️ 光照 (lux)',
                    data: historyData.map(d => d.light),
                    borderColor: '#FFEB3B',
                    backgroundColor: 'rgba(255, 235, 59, 0.1)',
                    tension: 0.4,
                    yAxisID: currentChartMetric === 'all' ? 'y2' : 'y'
                });
            }

            if (currentChartMetric === 'all' || currentChartMetric === 'soil') {
                datasets.push({
                    label: '🌱 土壤湿度 (%)',
                    data: historyData.map(d => d.soil_moisture),
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.4,
                    yAxisID: currentChartMetric === 'all' ? 'y3' : 'y'
                });
            }

            const scales = currentChartMetric === 'all' ? {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: '温度 (°C)' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: '湿度 (%)' },
                    grid: { drawOnChartArea: false }
                },
                y2: {
                    type: 'linear',
                    display: false,
                    position: 'right',
                    grid: { drawOnChartArea: false }
                },
                y3: {
                    type: 'linear',
                    display: false,
                    position: 'right',
                    grid: { drawOnChartArea: false }
                }
            } : {
                y: {
                    display: true,
                    title: { display: true, text: getMetricUnit(currentChartMetric) }
                }
            };

            historyChart = new Chart(ctx, {
                type: 'line',
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                        }
                    },
                    scales: scales
                }
            });
        }

        function getMetricUnit(metric) {
            const units = {
                temperature: '温度 (°C)',
                humidity: '湿度 (%)',
                light: '光照 (lux)',
                soil: '土壤湿度 (%)'
            };
            return units[metric] || '';
        }

        async function exportHistoryData() {
            if (!selectedDeviceId) {
                log('请先选择一个设备', 'error');
                return;
            }

            try {
                const response = await fetch(`/api/v1/devices/${selectedDeviceId}/history/export`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filepath: `device_${selectedDeviceId}_history.json` })
                });
                const result = await response.json();

                if (result.code === 0) {
                    log('历史数据已导出到: ' + result.data.filepath);
                } else {
                    log('导出失败: ' + result.message, 'error');
                }
            } catch (error) {
                log('导出失败: ' + error.message, 'error');
            }
        }

        async function fetchCurrentScenario(deviceId) {
            try {
                const response = await fetch(`/api/v1/devices/${deviceId}/scenario`);
                const result = await response.json();
                if (result.code === 0 && result.data) {
                    currentScenario = result.data.current_scenario;
                    updateScenarioUI(currentScenario);
                }
            } catch (error) {
                log('获取当前场景失败: ' + error.message, 'error');
            }
        }

        function connectWebSocket(deviceId) {
            if (ws) {
                ws.close();
            }
            
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(`${protocol}//${window.location.host}/ws/devices/${deviceId}`);
            
            ws.onopen = () => {
                log(`WebSocket 连接成功: ${deviceId}`);
            };
            
            ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (message.type === 'data_update') {
                    updateMetrics(message.data);
                }
            };
            
            ws.onclose = () => {
                log(`WebSocket 连接关闭: ${deviceId}`);
            };
            
            ws.onerror = (error) => {
                log('WebSocket 错误', 'error');
            };
        }

        function updateMetrics(data) {
            if (data.metrics) {
                document.getElementById('temp-value').textContent = data.metrics.temperature.toFixed(1);
                document.getElementById('humidity-value').textContent = data.metrics.humidity.toFixed(1);
                document.getElementById('light-value').textContent = Math.round(data.metrics.light);
                document.getElementById('soil-value').textContent = data.metrics.soilMoisture.toFixed(1);
            }
        }

        // 初始化
        fetchDevices();
        setInterval(fetchDevices, 5000); // 每5秒刷新设备列表
    </script>
</body>
</html>
    """
    return html_content


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host=config.server.host,
        port=config.server.port,
        reload=config.server.debug,
    )
