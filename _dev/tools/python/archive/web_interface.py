#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
虚拟设备 Web 可视化界面
提供实时数据监控和场景控制
"""

import asyncio
import json
import threading
import webbrowser
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import socket

# 导入虚拟设备类
from virtual_device_v2 import VirtualDeviceV2, DeviceScenario


class DeviceManager:
    """设备管理器 - 管理虚拟设备实例"""
    
    def __init__(self):
        self.device = None
        self.data_history = []  # 历史数据用于图表
        self.max_history = 100  # 最多保存100条记录
        self.lock = threading.Lock()
    
    def create_device(self, **kwargs):
        """创建设备"""
        self.device = VirtualDeviceV2(**kwargs)
        self.data_history = []
        return self.device
    
    def add_data_point(self, metrics):
        """添加数据点"""
        with self.lock:
            self.data_history.append({
                "timestamp": datetime.now().isoformat(),
                "metrics": metrics
            })
            # 限制历史数据长度
            if len(self.data_history) > self.max_history:
                self.data_history = self.data_history[-self.max_history:]
    
    def get_data_history(self):
        """获取历史数据"""
        with self.lock:
            return self.data_history.copy()
    
    def get_status(self):
        """获取设备状态"""
        if not self.device:
            return {"running": False}
        
        return {
            "running": self.device.running,
            "device_id": self.device.device_id,
            "plant_id": self.device.plant_id,
            "scenario": self.device.scenario.value,
            "interval": self.device.interval,
            "stats": self.device.stats,
            "current_values": self.device.current_values
        }


# 全局设备管理器
device_manager = DeviceManager()


class WebHandler(BaseHTTPRequestHandler):
    """HTTP请求处理器"""
    
    def do_GET(self):
        """处理GET请求"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path == '/':
            self.serve_html()
        elif path == '/api/status':
            self.serve_status()
        elif path == '/api/history':
            self.serve_history()
        elif path == '/api/scenarios':
            self.serve_scenarios()
        else:
            self.send_error(404)
    
    def do_POST(self):
        """处理POST请求"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # 读取请求体
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        
        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            data = parse_qs(body)
            data = {k: v[0] if len(v) == 1 else v for k, v in data.items()}
        
        if path == '/api/start':
            self.handle_start(data)
        elif path == '/api/stop':
            self.handle_stop()
        elif path == '/api/scenario':
            self.handle_scenario(data)
        elif path == '/api/interval':
            self.handle_interval(data)
        elif path == '/api/report':
            self.handle_report()
        else:
            self.send_error(404)
    
    def serve_html(self):
        """提供HTML页面"""
        html = self.get_html_content()
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(html.encode('utf-8'))
    
    def serve_status(self):
        """提供设备状态"""
        status = device_manager.get_status()
        self.send_json(status)
    
    def serve_history(self):
        """提供历史数据"""
        history = device_manager.get_data_history()
        self.send_json({"history": history})
    
    def serve_scenarios(self):
        """提供场景列表"""
        scenarios = [
            {"value": s.value, "label": self.get_scenario_label(s)}
            for s in DeviceScenario
        ]
        self.send_json({"scenarios": scenarios})
    
    def handle_start(self, data):
        """启动设备"""
        if device_manager.device and device_manager.device.running:
            self.send_json({"success": False, "error": "设备已在运行"})
            return
        
        try:
            device = device_manager.create_device(
                device_id=data.get('device_id', f"VIRTUAL_{datetime.now().strftime('%H%M%S')}"),
                server_url=data.get('server_url', 'http://localhost:3000'),
                plant_id=data.get('plant_id'),
                interval=int(data.get('interval', 60)),
                scenario=DeviceScenario(data.get('scenario', 'normal')),
                auto_pair=True
            )
            
            # 启动设备（在后台线程）
            def run_device():
                if device.auto_pair_device():
                    device.stats["start_time"] = datetime.now()
                    device.running = True
                    
                    # 修改上报逻辑，添加数据记录
                    original_report = device.report_data
                    def report_with_history():
                        result = original_report()
                        if result.get("success"):
                            device_manager.add_data_point(device.current_values.copy())
                        return result
                    device.report_data = report_with_history
                    
                    # 运行上报循环
                    while device.running:
                        result = device.report_data()
                        device.stats["total_reports"] += 1
                        if result.get("success"):
                            device.stats["success_reports"] += 1
                        else:
                            device.stats["failed_reports"] += 1
                        
                        # 等待下一次上报
                        for _ in range(device.interval):
                            if not device.running:
                                break
                            import time
                            time.sleep(1)
            
            thread = threading.Thread(target=run_device, daemon=True)
            thread.start()
            
            self.send_json({"success": True, "message": "设备启动中..."})
        
        except Exception as e:
            self.send_json({"success": False, "error": str(e)})
    
    def handle_stop(self):
        """停止设备"""
        if device_manager.device:
            device_manager.device.stop()
            self.send_json({"success": True, "message": "设备已停止"})
        else:
            self.send_json({"success": False, "error": "设备未运行"})
    
    def handle_scenario(self, data):
        """切换场景"""
        if not device_manager.device:
            self.send_json({"success": False, "error": "设备未运行"})
            return
        
        try:
            scenario = DeviceScenario(data.get('scenario', 'normal'))
            device_manager.device.set_scenario(scenario)
            self.send_json({"success": True, "scenario": scenario.value})
        except Exception as e:
            self.send_json({"success": False, "error": str(e)})
    
    def handle_interval(self, data):
        """修改上报间隔"""
        if not device_manager.device:
            self.send_json({"success": False, "error": "设备未运行"})
            return
        
        try:
            interval = int(data.get('interval', 60))
            if interval < 5:
                raise ValueError("间隔不能小于5秒")
            device_manager.device.interval = interval
            self.send_json({"success": True, "interval": interval})
        except Exception as e:
            self.send_json({"success": False, "error": str(e)})
    
    def handle_report(self):
        """手动触发上报"""
        if not device_manager.device:
            self.send_json({"success": False, "error": "设备未运行"})
            return
        
        try:
            result = device_manager.device.report_data()
            self.send_json({
                "success": result.get("success"),
                "data": result.get("data")
            })
        except Exception as e:
            self.send_json({"success": False, "error": str(e)})
    
    def send_json(self, data):
        """发送JSON响应"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def get_scenario_label(self, scenario):
        """获取场景标签"""
        labels = {
            DeviceScenario.NORMAL: "正常环境",
            DeviceScenario.DROUGHT: "干旱",
            DeviceScenario.HIGH_TEMP: "高温",
            DeviceScenario.LOW_TEMP: "低温",
            DeviceScenario.HIGH_HUMIDITY: "高湿",
            DeviceScenario.LOW_LIGHT: "光照不足",
            DeviceScenario.WATERING: "浇水",
            DeviceScenario.NIGHT: "夜间",
        }
        return labels.get(scenario, scenario.value)
    
    def get_html_content(self):
        """获取HTML页面内容"""
        return '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>虚拟设备监控中心</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        h1 {
            text-align: center;
            color: white;
            margin-bottom: 30px;
            font-size: 2.5em;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .card {
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            transition: transform 0.3s;
        }
        
        .card:hover {
            transform: translateY(-5px);
        }
        
        .card-title {
            font-size: 1.2em;
            font-weight: 600;
            color: #333;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
        }
        
        .metric-item {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            border-radius: 12px;
            padding: 16px;
            text-align: center;
        }
        
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
        
        .metric-label {
            font-size: 0.9em;
            color: #666;
            margin-top: 4px;
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
        }
        
        .status-running {
            background: #d4edda;
            color: #155724;
        }
        
        .status-stopped {
            background: #f8d7da;
            color: #721c24;
        }
        
        .control-group {
            margin-bottom: 16px;
        }
        
        .control-label {
            display: block;
            margin-bottom: 6px;
            font-weight: 500;
            color: #555;
        }
        
        input, select {
            width: 100%;
            padding: 10px 14px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 1em;
            transition: border-color 0.3s;
        }
        
        input:focus, select:focus {
            outline: none;
            border-color: #667eea;
        }
        
        button {
            width: 100%;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 1em;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
        }
        
        .btn-danger {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
        }
        
        .btn-secondary {
            background: #e0e0e0;
            color: #333;
        }
        
        .scenario-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
        }
        
        .scenario-btn {
            padding: 10px;
            border: 2px solid #e0e0e0;
            background: white;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 0.9em;
        }
        
        .scenario-btn:hover {
            border-color: #667eea;
            background: #f0f0ff;
        }
        
        .scenario-btn.active {
            border-color: #667eea;
            background: #667eea;
            color: white;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }
        
        .info-row:last-child {
            border-bottom: none;
        }
        
        .info-label {
            color: #666;
        }
        
        .info-value {
            font-weight: 600;
            color: #333;
        }
        
        .chart-container {
            height: 200px;
            background: #f8f9fa;
            border-radius: 8px;
            padding: 16px;
            overflow: hidden;
        }
        
        .log-container {
            height: 150px;
            background: #1e1e1e;
            border-radius: 8px;
            padding: 12px;
            overflow-y: auto;
            font-family: 'Consolas', monospace;
            font-size: 0.85em;
        }
        
        .log-entry {
            color: #d4d4d4;
            margin-bottom: 4px;
        }
        
        .log-success {
            color: #4ec9b0;
        }
        
        .log-error {
            color: #f44747;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .live-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            background: #4caf50;
            border-radius: 50%;
            margin-right: 8px;
            animation: pulse 2s infinite;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌱 虚拟设备监控中心</h1>
        
        <div class="grid">
            <!-- 设备控制面板 -->
            <div class="card">
                <div class="card-title">
                    ⚙️ 设备控制
                    <span id="status-badge" class="status-badge status-stopped">已停止</span>
                </div>
                
                <div id="config-panel">
                    <div class="control-group">
                        <label class="control-label">服务器地址</label>
                        <input type="text" id="server-url" value="http://localhost:3000" placeholder="http://localhost:3000">
                    </div>
                    
                    <div class="control-group">
                        <label class="control-label">设备ID（可选）</label>
                        <input type="text" id="device-id" placeholder="自动生成">
                    </div>
                    
                    <div class="control-group">
                        <label class="control-label">植物ID（可选）</label>
                        <input type="text" id="plant-id" placeholder="自动创建">
                    </div>
                    
                    <div class="control-group">
                        <label class="control-label">初始场景</label>
                        <select id="initial-scenario">
                            <option value="normal">正常环境</option>
                            <option value="drought">干旱</option>
                            <option value="high_temp">高温</option>
                            <option value="low_temp">低温</option>
                            <option value="high_hum">高湿</option>
                            <option value="low_light">光照不足</option>
                            <option value="watering">浇水</option>
                            <option value="night">夜间</option>
                        </select>
                    </div>
                    
                    <div class="control-group">
                        <label class="control-label">上报间隔（秒）</label>
                        <input type="number" id="interval" value="10" min="5" max="3600">
                    </div>
                    
                    <button class="btn-primary" onclick="startDevice()">🚀 启动设备</button>
                </div>
                
                <div id="control-panel" style="display: none;">
                    <button class="btn-secondary" onclick="triggerReport()">📤 立即上报</button>
                    <div style="height: 8px;"></div>
                    <button class="btn-danger" onclick="stopDevice()">🛑 停止设备</button>
                </div>
            </div>
            
            <!-- 实时数据面板 -->
            <div class="card">
                <div class="card-title">
                    <span class="live-indicator"></span>
                    📊 实时传感器数据
                </div>
                
                <div class="metric-grid">
                    <div class="metric-item">
                        <div class="metric-value" id="temp-value">--</div>
                        <div class="metric-label">温度 (°C)</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value" id="humidity-value">--</div>
                        <div class="metric-label">湿度 (%)</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value" id="light-value">--</div>
                        <div class="metric-label">光照 (lux)</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value" id="soil-value">--</div>
                        <div class="metric-label">土壤湿度 (%)</div>
                    </div>
                </div>
                
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee;">
                    <div class="info-row">
                        <span class="info-label">土壤温度</span>
                        <span class="info-value" id="soil-temp">-- °C</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">电池电量</span>
                        <span class="info-value" id="battery">-- %</span>
                    </div>
                </div>
            </div>
            
            <!-- 场景切换面板 -->
            <div class="card">
                <div class="card-title">🎭 场景模式</div>
                <div class="scenario-grid" id="scenario-buttons">
                    <button class="scenario-btn" data-scenario="normal">正常环境</button>
                    <button class="scenario-btn" data-scenario="drought">干旱</button>
                    <button class="scenario-btn" data-scenario="high_temp">高温</button>
                    <button class="scenario-btn" data-scenario="low_temp">低温</button>
                    <button class="scenario-btn" data-scenario="high_hum">高湿</button>
                    <button class="scenario-btn" data-scenario="low_light">光照不足</button>
                    <button class="scenario-btn" data-scenario="watering">浇水</button>
                    <button class="scenario-btn" data-scenario="night">夜间</button>
                </div>
                
                <div style="margin-top: 16px;">
                    <div class="control-group">
                        <label class="control-label">修改上报间隔</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="number" id="new-interval" value="10" min="5" style="flex: 1;">
                            <button class="btn-secondary" onclick="updateInterval()" style="width: auto; padding: 10px 20px;">修改</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 设备信息面板 -->
            <div class="card">
                <div class="card-title">📱 设备信息</div>
                
                <div class="info-row">
                    <span class="info-label">设备ID</span>
                    <span class="info-value" id="info-device-id">--</span>
                </div>
                <div class="info-row">
                    <span class="info-label">植物ID</span>
                    <span class="info-value" id="info-plant-id">--</span>
                </div>
                <div class="info-row">
                    <span class="info-label">当前场景</span>
                    <span class="info-value" id="info-scenario">--</span>
                </div>
                <div class="info-row">
                    <span class="info-label">上报间隔</span>
                    <span class="info-value" id="info-interval">-- 秒</span>
                </div>
                <div class="info-row">
                    <span class="info-label">总上报次数</span>
                    <span class="info-value" id="info-total">0</span>
                </div>
                <div class="info-row">
                    <span class="info-label">成功/失败</span>
                    <span class="info-value" id="info-stats">0 / 0</span>
                </div>
            </div>
        </div>
        
        <!-- 日志面板 -->
        <div class="card">
            <div class="card-title">📝 运行日志</div>
            <div class="log-container" id="log-container">
                <div class="log-entry">等待设备启动...</div>
            </div>
        </div>
    </div>
    
    <script>
        let refreshInterval;
        
        // 场景按钮点击事件
        document.querySelectorAll('.scenario-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const scenario = btn.dataset.scenario;
                switchScenario(scenario);
            });
        });
        
        function addLog(message, type = 'info') {
            const container = document.getElementById('log-container');
            const entry = document.createElement('div');
            entry.className = `log-entry ${type === 'success' ? 'log-success' : type === 'error' ? 'log-error' : ''}`;
            entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            container.appendChild(entry);
            container.scrollTop = container.scrollHeight;
        }
        
        async function startDevice() {
            const config = {
                server_url: document.getElementById('server-url').value,
                device_id: document.getElementById('device-id').value,
                plant_id: document.getElementById('plant-id').value,
                scenario: document.getElementById('initial-scenario').value,
                interval: parseInt(document.getElementById('interval').value)
            };
            
            try {
                const response = await fetch('/api/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    addLog('设备启动成功', 'success');
                    document.getElementById('config-panel').style.display = 'none';
                    document.getElementById('control-panel').style.display = 'block';
                    document.getElementById('status-badge').textContent = '运行中';
                    document.getElementById('status-badge').className = 'status-badge status-running';
                    
                    // 开始刷新状态
                    refreshInterval = setInterval(refreshStatus, 1000);
                } else {
                    addLog(`启动失败: ${result.error}`, 'error');
                }
            } catch (error) {
                addLog(`请求错误: ${error.message}`, 'error');
            }
        }
        
        async function stopDevice() {
            try {
                const response = await fetch('/api/stop', { method: 'POST' });
                const result = await response.json();
                
                if (result.success) {
                    addLog('设备已停止', 'success');
                    clearInterval(refreshInterval);
                    document.getElementById('config-panel').style.display = 'block';
                    document.getElementById('control-panel').style.display = 'none';
                    document.getElementById('status-badge').textContent = '已停止';
                    document.getElementById('status-badge').className = 'status-badge status-stopped';
                }
            } catch (error) {
                addLog(`停止失败: ${error.message}`, 'error');
            }
        }
        
        async function switchScenario(scenario) {
            try {
                const response = await fetch('/api/scenario', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scenario })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    addLog(`场景切换为: ${scenario}`, 'success');
                    
                    // 更新按钮状态
                    document.querySelectorAll('.scenario-btn').forEach(btn => {
                        btn.classList.toggle('active', btn.dataset.scenario === scenario);
                    });
                } else {
                    addLog(`切换失败: ${result.error}`, 'error');
                }
            } catch (error) {
                addLog(`请求错误: ${error.message}`, 'error');
            }
        }
        
        async function updateInterval() {
            const interval = parseInt(document.getElementById('new-interval').value);
            
            try {
                const response = await fetch('/api/interval', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ interval })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    addLog(`上报间隔修改为: ${interval}秒`, 'success');
                } else {
                    addLog(`修改失败: ${result.error}`, 'error');
                }
            } catch (error) {
                addLog(`请求错误: ${error.message}`, 'error');
            }
        }
        
        async function triggerReport() {
            try {
                const response = await fetch('/api/report', { method: 'POST' });
                const result = await response.json();
                
                if (result.success) {
                    addLog('手动上报成功', 'success');
                } else {
                    addLog(`上报失败: ${result.error}`, 'error');
                }
            } catch (error) {
                addLog(`请求错误: ${error.message}`, 'error');
            }
        }
        
        async function refreshStatus() {
            try {
                const response = await fetch('/api/status');
                const status = await response.json();
                
                if (status.running) {
                    // 更新传感器数据
                    const values = status.current_values || {};
                    document.getElementById('temp-value').textContent = values.temperature?.toFixed(1) || '--';
                    document.getElementById('humidity-value').textContent = values.humidity?.toFixed(1) || '--';
                    document.getElementById('light-value').textContent = values.light_intensity?.toFixed(0) || '--';
                    document.getElementById('soil-value').textContent = values.soil_moisture?.toFixed(1) || '--';
                    document.getElementById('soil-temp').textContent = (values.soil_temperature?.toFixed(1) || '--') + ' °C';
                    document.getElementById('battery').textContent = (values.battery_level?.toFixed(0) || '--') + ' %';
                    
                    // 更新设备信息
                    document.getElementById('info-device-id').textContent = status.device_id || '--';
                    document.getElementById('info-plant-id').textContent = status.plant_id || '--';
                    document.getElementById('info-scenario').textContent = status.scenario || '--';
                    document.getElementById('info-interval').textContent = (status.interval || '--') + ' 秒';
                    
                    // 更新统计
                    const stats = status.stats || {};
                    document.getElementById('info-total').textContent = stats.total_reports || 0;
                    document.getElementById('info-stats').textContent = 
                        `${stats.success_reports || 0} / ${stats.failed_reports || 0}`;
                    
                    // 更新场景按钮状态
                    document.querySelectorAll('.scenario-btn').forEach(btn => {
                        btn.classList.toggle('active', btn.dataset.scenario === status.scenario);
                    });
                }
            } catch (error) {
                console.error('刷新状态失败:', error);
            }
        }
    </script>
</body>
</html>
'''


def find_free_port(start_port=8080):
    """查找可用端口"""
    port = start_port
    while True:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return port
        except OSError:
            port += 1


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='虚拟设备 Web 可视化界面')
    parser.add_argument('--port', type=int, default=0, help='Web服务器端口（默认自动分配）')
    parser.add_argument('--no-browser', action='store_true', help='不自动打开浏览器')
    args = parser.parse_args()
    
    # 查找可用端口
    port = args.port if args.port > 0 else find_free_port()
    
    # 创建HTTP服务器
    server = HTTPServer(('0.0.0.0', port), WebHandler)
    
    print(f"\n{'='*60}")
    print("🌐 虚拟设备 Web 监控中心")
    print(f"{'='*60}")
    print(f"\n📍 访问地址: http://localhost:{port}")
    print(f"\n{'='*60}\n")
    
    # 自动打开浏览器
    if not args.no_browser:
        webbrowser.open(f'http://localhost:{port}')
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\n👋 服务已停止")
        server.shutdown()


if __name__ == '__main__':
    main()
