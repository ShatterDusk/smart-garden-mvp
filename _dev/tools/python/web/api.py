#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Web API路由
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
_log_history = []
MAX_LOG_HISTORY = 100


def set_device(device: 'VirtualDevice'):
    """设置设备实例"""
    global _device
    _device = device


def add_log(message: str, level: str = 'INFO'):
    """添加日志"""
    global _log_history
    log_entry = {
        'timestamp': datetime.now().strftime('%H:%M:%S'),
        'level': level,
        'message': message
    }
    _log_history.append(log_entry)
    if len(_log_history) > MAX_LOG_HISTORY:
        _log_history = _log_history[-MAX_LOG_HISTORY:]


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
    return jsonify(status.to_dict())


@app.route('/api/history')
def get_history():
    """获取历史数据"""
    limit = request.args.get('limit', 100, type=int)
    return jsonify({'history': [], 'limit': limit})


@app.route('/api/start', methods=['POST'])
def start_device():
    """启动设备"""
    if not _device:
        return jsonify({'error': '设备未初始化'}), 500
    
    if _device.running:
        return jsonify({'success': True, 'message': '设备已在运行中'})
    
    success = _device.start()
    add_log('设备启动', 'INFO' if success else 'ERROR')
    return jsonify({'success': success})


@app.route('/api/stop', methods=['POST'])
def stop_device():
    """停止设备"""
    if not _device:
        return jsonify({'error': '设备未初始化'}), 500
    
    _device.stop()
    add_log('设备停止', 'INFO')
    return jsonify({'success': True})


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
    add_log(f'场景切换: {scenario}', 'INFO' if success else 'ERROR')
    return jsonify({'success': success})


@app.route('/api/interval', methods=['POST'])
def set_interval():
    """修改上报间隔"""
    if not _device:
        return jsonify({'error': '设备未初始化'}), 500
    
    data = request.json
    interval = data.get('interval')
    
    if not interval:
        return jsonify({'error': '缺少interval参数'}), 400
    
    success = _device.set_interval(int(interval))
    add_log(f'上报间隔修改: {interval}秒', 'INFO' if success else 'ERROR')
    return jsonify({'success': success})


@app.route('/api/report', methods=['POST'])
def manual_report():
    """手动触发上报"""
    if not _device:
        return jsonify({'error': '设备未初始化'}), 500
    
    result = _device.report()
    add_log(f'手动上报: {"成功" if result.success else "失败"}', 'INFO' if result.success else 'ERROR')
    return jsonify({
        'success': result.success,
        'reading_id': result.reading_id,
        'error': result.error
    })


@app.route('/api/config')
def get_config():
    """获取当前配置"""
    if not _device:
        return jsonify({'error': '设备未初始化'}), 500
    
    return jsonify({
        'server_url': _device.config.server_url,
        'interval': _device.config.interval,
        'scenario': _device.scenario_controller.get_current_scenario(),
        'udp_port': _device.config.udp_port,
        'device_id': _device.device_id,
        'plant_id': _device.plant_id,
    })


@app.route('/api/logs')
def get_logs():
    """获取最近日志"""
    limit = request.args.get('limit', 50, type=int)
    return jsonify({'logs': _log_history[-limit:]})


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
