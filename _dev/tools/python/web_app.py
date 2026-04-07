#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Web入口
"""

import threading
from flask import Flask

from models import DeviceConfig
from virtual_device import VirtualDevice
from web.api import app, set_device, add_log
from constants import DEFAULT_WEB_PORT, DEFAULT_WEB_HOST, ENV_CONFIG


def run_web_mode(device: VirtualDevice, config: DeviceConfig):
    """运行Web模式"""
    set_device(device)
    
    if not device.running:
        add_log('正在启动设备...', 'INFO')
        if device.start():
            add_log('设备启动成功', 'INFO')
        else:
            add_log('设备启动失败', 'ERROR')
            return
    
    print(f"\n{'='*50}")
    print(f"  🌱 虚拟设备监控中心")
    print(f"{'='*50}")
    print(f"  设备ID: {device.device_id}")
    print(f"  植物ID: {device.plant_id}")
    print(f"  场景:   {device.scenario_controller.get_current_scenario()}")
    print(f"{'='*50}")
    print(f"  Web界面: http://localhost:{config.web_port}")
    print(f"  UDP端口: {config.udp_port}")
    print(f"  服务器:  {config.server_url}")
    print(f"{'='*50}")
    print(f"\n按 Ctrl+C 停止...\n")
    
    app.run(
        host=DEFAULT_WEB_HOST,
        port=config.web_port,
        debug=False,
        threaded=True
    )


if __name__ == '__main__':
    import argparse
    from config import create_config, print_env_info
    from constants import SCENARIO_NAMES
    
    parser = argparse.ArgumentParser(description='虚拟设备模拟器 - Web模式')
    
    server_group = parser.add_argument_group('服务器配置')
    server_group.add_argument('--env', default='local', choices=list(ENV_CONFIG.keys()),
                              help='选择服务器环境 (默认: local)')
    server_group.add_argument('--server-url', default=None,
                              help='后端服务器URL (默认: 根据环境自动选择)')
    
    parser.add_argument('--udp-port', type=int, default=8266, help='UDP监听端口')
    parser.add_argument('--web-port', type=int, default=DEFAULT_WEB_PORT, help='Web服务端口')
    parser.add_argument('--interval', type=int, default=60, help='数据上报间隔(秒)')
    parser.add_argument('--scenario', default='normal', choices=list(SCENARIO_NAMES.keys()), help='场景模式')
    parser.add_argument('--no-auto-pair', action='store_true', help='禁用自动配对')
    parser.add_argument('-v', '--verbose', action='store_true', help='详细日志模式')
    
    args = parser.parse_args()
    
    print_env_info()
    
    config = create_config(
        env=args.env,
        server_url=args.server_url,
        udp_port=args.udp_port,
        web_port=args.web_port,
        interval=args.interval,
        scenario=args.scenario,
        auto_pair=not args.no_auto_pair,
        verbose=args.verbose,
    )
    
    device = VirtualDevice(config)
    
    try:
        run_web_mode(device, config)
    except KeyboardInterrupt:
        pass
    finally:
        device.stop()
