#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UDP通信服务
处理设备发现和WiFi配置请求
"""

import socket
import json
import threading
import time
from typing import Optional, Callable, Dict, Any, Tuple

from models import UDPMessage
from constants import DEFAULT_UDP_PORT, UDP_BROADCAST_ADDRESSES


class UDPService:
    """UDP通信服务"""
    
    def __init__(
        self,
        port: int = DEFAULT_UDP_PORT,
        device_info: Optional[Dict[str, Any]] = None,
        on_config_received: Optional[Callable[[str, str], None]] = None,
    ):
        self.port = port
        self.device_info = device_info or {}
        self.on_config_received = on_config_received
        
        self.socket: Optional[socket.socket] = None
        self.running = False
        self.receive_thread: Optional[threading.Thread] = None
        
        self._configured_wifi: Optional[str] = None
    
    def start(self) -> bool:
        """启动UDP监听"""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.socket.bind(('0.0.0.0', self.port))
            self.socket.settimeout(1.0)
            
            self.running = True
            self.receive_thread = threading.Thread(target=self._receive_loop, daemon=True)
            self.receive_thread.start()
            
            return True
        except Exception as e:
            print(f"UDP服务启动失败: {e}")
            return False
    
    def stop(self):
        """停止UDP监听"""
        self.running = False
        if self.socket:
            try:
                self.socket.close()
            except:
                pass
            self.socket = None
        
        if self.receive_thread:
            self.receive_thread.join(timeout=2.0)
            self.receive_thread = None
    
    def _receive_loop(self):
        """接收消息循环"""
        while self.running:
            try:
                data, addr = self.socket.recvfrom(4096)
                message_str = data.decode('utf-8')
                message = json.loads(message_str)
                
                response = self._handle_message(message, addr)
                if response:
                    response_str = json.dumps(response)
                    self.socket.sendto(response_str.encode('utf-8'), addr)
                    
            except socket.timeout:
                continue
            except json.JSONDecodeError:
                continue
            except Exception as e:
                if self.running:
                    print(f"UDP接收错误: {e}")
    
    def _handle_message(self, message: Dict[str, Any], addr: Tuple[str, int]) -> Optional[Dict[str, Any]]:
        """处理接收到的消息"""
        cmd = message.get('cmd', '')
        
        if cmd == 'discover':
            return self._handle_discover(message, addr)
        elif cmd == 'config_wifi':
            return self._handle_config_wifi(message, addr)
        
        return None
    
    def _handle_discover(self, message: Dict[str, Any], addr: Tuple[str, int]) -> Dict[str, Any]:
        """处理设备发现请求"""
        return {
            'cmd': 'discover_ack',
            'macAddress': self.device_info.get('mac_address', 'VIRTUAL_UNKNOWN'),
            'deviceName': self.device_info.get('device_name', 'proj-alpha-虚拟设备'),
            'deviceType': 'virtual_sensor',
            'ip': self._get_local_ip(),
            'port': self.port,
            'rssi': -45,
            'firmwareVersion': '1.0.0',
            'status': self.device_info.get('status', 'unbound'),
            'timestamp': int(time.time()),
        }
    
    def _handle_config_wifi(self, message: Dict[str, Any], addr: Tuple[str, int]) -> Dict[str, Any]:
        """处理WiFi配置请求"""
        ssid = message.get('ssid', '')
        password = message.get('password', '')
        plant_id = message.get('plantId', '')  # 可选：前端传递的plant_id
        
        self._configured_wifi = ssid
        self._plant_id = plant_id
        
        if self.on_config_received:
            # 传递 ssid, password, plant_id
            self.on_config_received(ssid, password, plant_id)
        
        return {
            'cmd': 'config_wifi_ack',
            'status': 'ok',
            'message': '配置已接收，正在连接...',
            'timestamp': int(time.time()),
        }
    
    def _get_local_ip(self) -> str:
        """获取本机IP地址"""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(('8.8.8.8', 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except:
            return '127.0.0.1'
    
    def send_broadcast(self, message: Dict[str, Any], port: Optional[int] = None) -> int:
        """发送UDP广播"""
        if not self.socket:
            return 0
        
        message_str = json.dumps(message)
        data = message_str.encode('utf-8')
        target_port = port or self.port
        
        sent_count = 0
        for address in UDP_BROADCAST_ADDRESSES:
            try:
                self.socket.sendto(data, (address, target_port))
                sent_count += 1
            except:
                pass
        
        return sent_count
    
    def send_message(self, message: Dict[str, Any], address: str, port: Optional[int] = None) -> bool:
        """发送UDP消息到指定地址"""
        if not self.socket:
            return False
        
        try:
            message_str = json.dumps(message)
            data = message_str.encode('utf-8')
            target_port = port or self.port
            self.socket.sendto(data, (address, target_port))
            return True
        except Exception as e:
            print(f"UDP发送失败: {e}")
            return False
    
    def get_configured_wifi(self) -> Optional[str]:
        """获取已配置的WiFi名称"""
        return self._configured_wifi
    
    def update_device_info(self, device_info: Dict[str, Any]):
        """更新设备信息"""
        self.device_info.update(device_info)
