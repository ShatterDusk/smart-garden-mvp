#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Web API路由 - 虚拟设备监控面板
"""

import json
import time
from datetime import datetime
from flask import Flask, jsonify, request, Response, render_template
from flask_cors import CORS
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from virtual_device import VirtualDevice

app = Flask(__name__, 
            template_folder='templates',
            static_folder='static')
CORS(app)

_device: 'VirtualDevice' = None
_udp_logs = []  # UDP通信日志
_backend_logs = []  # 后端通信日志
_web_logs = []  # Web操作日志
MAX_LOG_HISTORY = 100


def set_device(device: 'VirtualDevice'):
    """设置设备实例"""
    global _device
    _device = device


def add_udp_log(message: str, level: str = 'INFO'):
    """添加UDP通信日志"""
    global _udp_logs
    log_entry = {
        'timestamp': datetime.now().strftime('%H:%M:%S'),
        'level': level,
        'message': message,
        'source': 'UDP'
    }
    _udp_logs.append(log_entry)
    if len(_udp_logs) > MAX_LOG_HISTORY:
        _udp_logs = _udp_logs[-MAX_LOG_HISTORY:]


def add_backend_log(message: str, level: str = 'INFO'):
    """添加后端通信日志"""
    global _backend_logs
    log_entry = {
        'timestamp': datetime.now().strftime('%H:%M:%S'),
        'level': level,
        'message': message,
        'source': 'HTTP'
    }
    _backend_logs.append(log_entry)
    if len(_backend_logs) > MAX_LOG_HISTORY:
        _backend_logs = _backend_logs[-MAX_LOG_HISTORY:]


def add_web_log(message: str, level: str = 'INFO'):
    """添加Web操作日志"""
    global _web_logs
    log_entry = {
        'timestamp': datetime.now().strftime('%H:%M:%S'),
        'level': level,
        'message': message,
        'source': 'WEB'
    }
    _web_logs.append(log_entry)
    if len(_web_logs) > MAX_LOG_HISTORY:
        _web_logs = _web_logs[-MAX_LOG_HISTORY:]


@app.route('/')
def index():
    """主页面"""
    return render_template('index.html')


@app.route('/api/status')
def get_status():
    """获取设备状态"""
    if not _device:
        return jsonify({'error': '设备未初始化'}), 500
    
    status = _device.get_status()
    status_dict = status.to_dict()
    
    # 添加WiFi状态和绑定状态
    status_dict['wifi_status'] = getattr(_device, 'wifi_status', 'waiting')
    status_dict['device_name'] = getattr(_device, 'device_name', '')
    
    return jsonify(status_dict)


@app.route('/api/config')
def get_config():
    """获取当前配置"""
    if not _device:
        return jsonify({'error': '设备未初始化'}), 500
    
    return jsonify({
        'server_url': _device.config.server_url,
        'interval': _device.config.interval,
        'sample_interval': getattr(_device.config, 'sample_interval', 5),
        'scenario': _device.scenario_controller.get_current_scenario(),
        'udp_port': _device.config.udp_port,
        'device_id': _device.device_id,
        'mac_address': getattr(_device, 'mac_address', ''),
        'device_name': getattr(_device, 'device_name', ''),
        'plant_id': _device.plant_id,
    })


@app.route('/api/config/interval', methods=['POST'])
def set_interval():
    """设置上报间隔"""
    if not _device:
        return jsonify({'error': '设备未初始化'}), 500
    
    data = request.json
    interval = data.get('interval')
    
    if not interval or interval < 5:
        return jsonify({'error': '上报间隔不能小于5秒'}), 400
    
    _device.config.interval = interval
    add_web_log(f'上报间隔已更新: {interval}秒', 'INFO')
    return jsonify({'success': True, 'interval': interval})


@app.route('/api/config/sample', methods=['POST'])
def set_sample_interval():
    """设置采集间隔"""
    if not _device:
        return jsonify({'error': '设备未初始化'}), 500
    
    data = request.json
    interval = data.get('interval')
    
    if not interval or interval < 1:
        return jsonify({'error': '采集间隔不能小于1秒'}), 400
    
    _device.config.sample_interval = interval
    add_web_log(f'采集间隔已更新: {interval}秒', 'INFO')
    return jsonify({'success': True, 'sample_interval': interval})


@app.route('/api/scenario', methods=['POST'])
def set_scenario():
    """切换场景"""
    if not _device:
        return jsonify({'error': '设备未初始化'}), 500
    
    data = request.json
    scenario = data.get('scenario')
    
    if not scenario:
        return jsonify({'error': '缺少scenario参数'}), 400
    
    success = _device.set_scenario(scenario)
    add_web_log(f'场景切换: {scenario}', 'INFO' if success else 'ERROR')
    return jsonify({'success': success})


@app.route('/api/logs')
def get_logs():
    """获取日志
    
    查询参数:
        type: udp | backend | web
        limit: 返回条数
    """
    log_type = request.args.get('type', 'web')
    limit = request.args.get('limit', 50, type=int)
    
    if log_type == 'udp':
        return jsonify({'logs': _udp_logs[-limit:]})
    elif log_type == 'backend':
        return jsonify({'logs': _backend_logs[-limit:]})
    else:
        return jsonify({'logs': _web_logs[-limit:]})


@app.route('/api/stream')
def stream():
    """SSE实时数据流"""
    def event_stream():
        while _device and _device.running:
            status = _device.get_status()
            data = {
                'metrics': status.current_metrics,
                'status': status.status,
                'report_count': status.report_count,
                'uptime': status.uptime_seconds,
                'scenario': status.scenario,
                'wifi_status': getattr(_device, 'wifi_status', 'waiting'),
                'plant_id': _device.plant_id,
            }
            yield f"data: {json.dumps(data)}\n\n"
            time.sleep(1)
    return Response(event_stream(), mimetype="text/event-stream")


@app.route('/api/scenarios')
def get_scenarios():
    """获取所有场景"""
    from constants import SCENARIO_NAMES
    return jsonify({'scenarios': SCENARIO_NAMES})


@app.route('/api/metrics')
def get_metrics():
    """获取指标定义"""
    from constants import SENSOR_METRICS
    return jsonify({'metrics': SENSOR_METRICS})


# 以下API为兼容旧版本保留，但监控面板不再使用
@app.route('/api/start', methods=['POST'])
def start_device():
    """启动设备（监控面板自动启动）"""
    return jsonify({'success': True, 'message': '设备已在运行中'})


@app.route('/api/stop', methods=['POST'])
def stop_device():
    """停止设备（监控面板不允许停止）"""
    return jsonify({'success': False, 'message': '监控模式下不能停止设备'})


@app.route('/api/report', methods=['POST'])
def manual_report():
    """手动触发上报"""
    if not _device:
        return jsonify({'error': '设备未初始化'}), 500
    
    result = _device.report()
    add_web_log(f'手动上报: {"成功" if result.success else "失败"}', 'INFO' if result.success else 'ERROR')
    return jsonify({
        'success': result.success,
        'reading_id': result.reading_id,
        'error': result.error
    })
