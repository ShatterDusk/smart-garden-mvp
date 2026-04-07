#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
虚拟设备模拟器主入口
"""

import argparse
import time
import random
import threading
from datetime import datetime
from typing import Optional, Dict, Any

import requests

from config import create_config, print_env_info
from models import DeviceConfig, DeviceStatus, ReportResult, PersistedState
from constants import SCENARIO_NAMES, SENSOR_METRICS, DEFAULT_UDP_PORT, DEFAULT_WEB_PORT, ENV_CONFIG
from services.logger import Logger, setup_logging
from services.state_manager import StateManager
from services.udp_service import UDPService
from services.data_generator import DataGenerator
from services.scenario import ScenarioController


class VirtualDevice:
    """虚拟设备核心类"""
    
    def __init__(self, config: DeviceConfig):
        self.config = config
        self.logger = setup_logging('virtual_device', config.verbose)
        
        self.state_manager = StateManager(config.state_file)
        self.scenario_controller = ScenarioController(config.scenario)
        self.data_generator = DataGenerator(config.scenario)
        self.udp_service: Optional[UDPService] = None
        
        self.device_id: Optional[str] = None
        self.plant_id: Optional[str] = None
        self.token: Optional[str] = None
        self.mac_address: Optional[str] = None
        self.device_name: Optional[str] = None
        
        self.running = False
        self.report_count = 0
        self.last_report_at: Optional[str] = None
        self.start_time: Optional[float] = None
        
        self._report_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
    
    def start(self) -> bool:
        """启动虚拟设备"""
        if self.running:
            self.logger.warning("设备已在运行中")
            return True
        
        self.logger.info("正在启动虚拟设备...")
        
        if self.state_manager.load() and self.state_manager.is_valid():
            self.logger.info("发现有效的持久化状态，跳过配对")
            self._load_state()
        elif self.config.auto_pair:
            self.logger.info("执行自动配对流程...")
            if not self.pair():
                self.logger.error("自动配对失败")
                return False
        else:
            self.logger.error("未找到有效状态且禁用自动配对")
            return False
        
        self._start_udp_service()
        
        self.running = True
        self.start_time = time.time()
        self._stop_event.clear()
        
        self._report_thread = threading.Thread(target=self._report_loop, daemon=True)
        self._report_thread.start()
        
        self.logger.info(f"虚拟设备启动成功")
        self.logger.info(f"  设备ID: {self.device_id}")
        self.logger.info(f"  植物ID: {self.plant_id}")
        self.logger.info(f"  场景: {SCENARIO_NAMES.get(self.scenario_controller.get_current_scenario(), 'normal')}")
        self.logger.info(f"  上报间隔: {self.config.interval}秒")
        self.logger.info(f"  UDP端口: {self.config.udp_port}")
        
        return True
    
    def stop(self):
        """停止虚拟设备"""
        if not self.running:
            return
        
        self.logger.info("正在停止虚拟设备...")
        
        self.running = False
        self._stop_event.set()
        
        if self._report_thread:
            self._report_thread.join(timeout=5.0)
            self._report_thread = None
        
        if self.udp_service:
            self.udp_service.stop()
            self.udp_service = None
        
        self._save_state()
        
        self.logger.info("虚拟设备已停止")
    
    def pair(self) -> bool:
        """执行设备配对流程"""
        try:
            self.logger.info("1. 游客登录...")
            result = self._guest_login()
            if not result['success']:
                self.logger.error(f"   登录失败: {result.get('error')}")
                return False
            self.token = result['token']
            self.logger.info("   登录成功")
            
            self.logger.info("2. 创建植物...")
            result = self._create_plant()
            if not result['success']:
                self.logger.error(f"   创建植物失败: {result.get('error')}")
                return False
            self.plant_id = result['plant_id']
            self.logger.info(f"   植物ID: {self.plant_id}")
            
            self.logger.info("3. 绑定设备...")
            result = self._bind_device()
            if not result['success']:
                self.logger.error(f"   绑定失败: {result.get('error')}")
                return False
            self.device_id = result['device_id']
            self.mac_address = result['mac_address']
            self.device_name = result['device_name']
            self.logger.info(f"   设备ID: {self.device_id}")
            
            self._save_state()
            
            self.logger.info("配对完成")
            return True
            
        except Exception as e:
            self.logger.error(f"配对过程出错: {e}")
            return False
    
    def _guest_login(self) -> Dict[str, Any]:
        """游客登录"""
        try:
            response = requests.post(
                f"{self.config.server_url}/api/users/guest-login",
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                token = data.get('data', {}).get('token')
                user = data.get('data', {}).get('user', {})
                return {'success': True, 'token': token, 'user_id': user.get('userId')}
            return {'success': False, 'error': f"HTTP {response.status_code}"}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _create_plant(self) -> Dict[str, Any]:
        """创建植物"""
        try:
            response = requests.post(
                f"{self.config.server_url}/api/plants",
                json={
                    'nickname': '虚拟设备测试植物',
                    'species': '虎皮兰',
                    'plantCategory': 'foliage'
                },
                headers={'Authorization': f'Bearer {self.token}'},
                timeout=10
            )
            if response.status_code in [200, 201]:
                data = response.json()
                plant_id = data.get('data', {}).get('plantId')
                return {'success': True, 'plant_id': plant_id}
            return {'success': False, 'error': f"HTTP {response.status_code}"}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _bind_device(self) -> Dict[str, Any]:
        """绑定设备"""
        if not self.mac_address:
            self.mac_address = f"VIRTUAL_{random.randint(10000000, 99999999)}"
        
        if not self.device_name:
            self.device_name = f"proj-alpha-虚拟设备-{self.mac_address[-4:]}"
        
        try:
            response = requests.post(
                f"{self.config.server_url}/api/devices/bind",
                json={
                    'macAddress': self.mac_address,
                    'deviceName': self.device_name,
                    'plantId': self.plant_id
                },
                headers={'Authorization': f'Bearer {self.token}'},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                device_data = data.get('data', {})
                return {
                    'success': True,
                    'device_id': device_data.get('deviceId'),
                    'mac_address': device_data.get('macAddress', self.mac_address),
                    'device_name': device_data.get('deviceName', self.device_name),
                }
            return {'success': False, 'error': f"HTTP {response.status_code}"}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def report(self) -> ReportResult:
        """上报数据"""
        if not self.device_id:
            return ReportResult(success=False, error="设备未绑定")
        
        metrics = self.data_generator.generate(self.scenario_controller.get_current_scenario())
        
        payload = {
            'deviceId': self.device_id,
            'plantId': self.plant_id,
            'timestamp': datetime.now().isoformat(),
            'metrics': metrics,
        }
        
        try:
            response = requests.post(
                f"{self.config.server_url}/api/devices/data",
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                reading_data = data.get('data', {})
                self.report_count += 1
                self.last_report_at = payload['timestamp']
                
                return ReportResult(
                    success=True,
                    reading_id=reading_data.get('readingId'),
                    timestamp=reading_data.get('recordedAt'),
                    is_supplement=reading_data.get('isSupplement', False),
                    is_stale=reading_data.get('isStale', False),
                    message=reading_data.get('message', '数据上报成功'),
                )
            
            return ReportResult(
                success=False,
                error=f"HTTP {response.status_code}: {response.text[:100]}"
            )
            
        except Exception as e:
            return ReportResult(success=False, error=str(e))
    
    def _report_loop(self):
        """上报循环"""
        while self.running and not self._stop_event.is_set():
            result = self.report()
            
            timestamp = datetime.now().strftime('%H:%M:%S')
            if result.success:
                self.logger.info(f"[{timestamp}] 上报成功 #{self.report_count} - 读数ID: {(result.reading_id or 'N/A')[:16]}...")
            else:
                self.logger.error(f"[{timestamp}] 上报失败: {result.error}")
            
            self._stop_event.wait(self.config.interval)
    
    def set_scenario(self, scenario: str, smooth: bool = True) -> bool:
        """设置场景"""
        if not self.scenario_controller.is_valid_scenario(scenario):
            self.logger.error(f"无效的场景: {scenario}")
            return False
        
        old_scenario = self.scenario_controller.get_current_scenario()
        if self.scenario_controller.switch_scenario(scenario, smooth):
            self.data_generator.set_scenario(scenario)
            self.logger.info(f"场景切换: {SCENARIO_NAMES.get(old_scenario, old_scenario)} -> {SCENARIO_NAMES.get(scenario, scenario)}")
            return True
        return False
    
    def set_interval(self, interval: int) -> bool:
        """设置上报间隔"""
        if interval < 5:
            self.logger.error("上报间隔不能小于5秒")
            return False
        if interval > 3600:
            self.logger.error("上报间隔不能大于3600秒")
            return False
        
        old_interval = self.config.interval
        self.config.interval = interval
        self.logger.info(f"上报间隔已更新: {old_interval}秒 -> {interval}秒")
        return True
    
    def get_status(self) -> DeviceStatus:
        """获取设备状态"""
        uptime = int(time.time() - self.start_time) if self.start_time else 0
        
        return DeviceStatus(
            device_id=self.device_id,
            plant_id=self.plant_id,
            mac_address=self.mac_address,
            device_name=self.device_name,
            status='online' if self.running else 'offline',
            scenario=self.scenario_controller.get_current_scenario(),
            report_count=self.report_count,
            last_report_at=self.last_report_at,
            current_metrics=self.data_generator.get_current_values(),
            udp_port=self.config.udp_port,
            running=self.running,
            uptime_seconds=uptime,
        )
    
    def _start_udp_service(self):
        """启动UDP服务"""
        device_info = {
            'mac_address': self.mac_address,
            'device_name': self.device_name,
            'status': 'online' if self.running else 'offline',
        }
        
        self.udp_service = UDPService(
            port=self.config.udp_port,
            device_info=device_info,
            on_config_received=self._on_wifi_config,
        )
        
        if self.udp_service.start():
            self.logger.info(f"UDP服务已启动，端口: {self.config.udp_port}")
        else:
            self.logger.error("UDP服务启动失败")
    
    def _on_wifi_config(self, ssid: str, password: str):
        """WiFi配置回调"""
        self.logger.info(f"收到WiFi配置: SSID={ssid}")
    
    def _load_state(self):
        """加载状态"""
        state = self.state_manager.state
        if state:
            self.device_id = state.device.get('device_id')
            self.mac_address = state.device.get('mac_address')
            self.device_name = state.device.get('device_name')
            self.plant_id = state.plant.get('plant_id')
            self.token = state.auth.get('token')
            
            if state.config.get('scenario'):
                self.scenario_controller.switch_scenario(state.config['scenario'], smooth=False)
                self.data_generator.set_scenario(state.config['scenario'])
            
            if state.state.get('current_metrics'):
                self.data_generator.set_current_values(state.state['current_metrics'])
            
            self.report_count = state.state.get('report_count', 0)
    
    def _save_state(self):
        """保存状态"""
        state = self.state_manager.create_empty_state(self.config.server_url)
        
        if self.device_id:
            self.state_manager.update_device(
                self.device_id,
                self.mac_address or '',
                self.device_name or '',
                'online' if self.running else 'offline'
            )
        
        if self.plant_id:
            self.state_manager.update_plant(self.plant_id, '虚拟设备测试植物')
        
        if self.token:
            expires_at = datetime.fromtimestamp(time.time() + 7 * 24 * 3600).isoformat()
            self.state_manager.update_auth(self.token, '', expires_at)
        
        self.state_manager.update_config(
            self.scenario_controller.get_current_scenario(),
            self.config.interval,
            self.config.udp_port
        )
        
        self.state_manager.update_state(
            self.data_generator.get_current_values(),
            self.report_count,
            self.last_report_at or ''
        )
        
        self.state_manager.save(self.state_manager.state or state)


def main():
    """CLI入口"""
    parser = argparse.ArgumentParser(
        description='虚拟设备模拟器 - 模拟IoT设备上报环境数据',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    server_group = parser.add_argument_group('服务器配置')
    server_group.add_argument('--env', default='local', choices=list(ENV_CONFIG.keys()),
                              help='选择服务器环境 (默认: local)')
    server_group.add_argument('--server-url', default=None,
                              help='后端服务器URL (默认: 根据环境自动选择)')
    
    device_group = parser.add_argument_group('设备配置')
    device_group.add_argument('--mac', dest='mac_address', help='设备MAC地址 (默认: 自动生成)')
    device_group.add_argument('--name', dest='device_name', help='设备名称')
    
    runtime_group = parser.add_argument_group('运行配置')
    runtime_group.add_argument('--udp-port', type=int, default=DEFAULT_UDP_PORT, help='UDP监听端口')
    runtime_group.add_argument('--interval', type=int, default=60, help='数据上报间隔(秒)')
    runtime_group.add_argument('--scenario', default='normal', choices=list(SCENARIO_NAMES.keys()), help='场景模式')
    runtime_group.add_argument('--no-auto-pair', action='store_true', help='禁用自动配对')
    runtime_group.add_argument('--reset', action='store_true', help='重置状态文件')
    runtime_group.add_argument('-v', '--verbose', action='store_true', help='详细日志模式')
    runtime_group.add_argument('--web', action='store_true', help='启动Web界面')
    
    args = parser.parse_args()
    
    print_env_info()
    
    config = create_config(
        env=args.env,
        server_url=args.server_url,
        udp_port=args.udp_port,
        interval=args.interval,
        scenario=args.scenario,
        auto_pair=not args.no_auto_pair,
        verbose=args.verbose,
    )
    
    device = VirtualDevice(config)
    
    if args.reset:
        device.state_manager.clear()
        print("状态文件已重置")
    
    try:
        if args.web:
            from web_app import run_web_mode
            run_web_mode(device, config)
        else:
            if device.start():
                print("\n按 Ctrl+C 停止...")
                while True:
                    time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        device.stop()


if __name__ == '__main__':
    main()
