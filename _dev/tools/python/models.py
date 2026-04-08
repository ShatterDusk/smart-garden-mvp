#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
虚拟设备模拟器数据模型定义
"""

from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from datetime import datetime


@dataclass
class DeviceConfig:
    """设备配置"""
    server_url: str = "http://localhost:3000"
    udp_port: int = 8266
    web_port: int = 8080
    interval: int = 60
    scenario: str = "normal"
    auto_pair: bool = True
    manual_mode: bool = False
    verbose: bool = False
    aligned: bool = False
    state_file: Optional[str] = None
    env: str = "local"
    
    def __post_init__(self):
        if self.interval < 5:
            raise ValueError("上报间隔不能小于5秒")
        if self.interval > 3600:
            raise ValueError("上报间隔不能大于3600秒")


@dataclass
class ReportResult:
    """数据上报结果"""
    success: bool
    reading_id: Optional[str] = None
    timestamp: Optional[str] = None
    is_supplement: bool = False
    is_stale: bool = False
    message: str = ""
    error: Optional[str] = None


@dataclass
class DeviceStatus:
    """设备状态"""
    device_id: Optional[str] = None
    plant_id: Optional[str] = None
    mac_address: Optional[str] = None
    device_name: Optional[str] = None
    status: str = "unbound"
    scenario: str = "normal"
    report_count: int = 0
    last_report_at: Optional[str] = None
    current_metrics: Dict[str, float] = field(default_factory=dict)
    udp_port: int = 8266
    running: bool = False
    uptime_seconds: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'device_id': self.device_id,
            'plant_id': self.plant_id,
            'mac_address': self.mac_address,
            'device_name': self.device_name,
            'status': self.status,
            'scenario': self.scenario,
            'report_count': self.report_count,
            'last_report_at': self.last_report_at,
            'current_metrics': self.current_metrics,
            'udp_port': self.udp_port,
            'running': self.running,
            'uptime_seconds': self.uptime_seconds,
        }


@dataclass
class PersistedState:
    """持久化状态"""
    version: str = "2.0"
    server_url: str = ""
    device: Dict[str, Any] = field(default_factory=dict)
    plant: Dict[str, Any] = field(default_factory=dict)
    auth: Dict[str, Any] = field(default_factory=dict)
    config: Dict[str, Any] = field(default_factory=dict)
    state: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'version': self.version,
            'server_url': self.server_url,
            'device': self.device,
            'plant': self.plant,
            'auth': self.auth,
            'config': self.config,
            'state': self.state,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PersistedState':
        return cls(
            version=data.get('version', '2.0'),
            server_url=data.get('server_url', ''),
            device=data.get('device', {}),
            plant=data.get('plant', {}),
            auth=data.get('auth', {}),
            config=data.get('config', {}),
            state=data.get('state', {}),
        )


@dataclass
class UDPMessage:
    """UDP消息"""
    cmd: str
    data: Dict[str, Any] = field(default_factory=dict)
    timestamp: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        result = {'cmd': self.cmd, 'timestamp': self.timestamp}
        result.update(self.data)
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'UDPMessage':
        cmd = data.get('cmd', '')
        timestamp = data.get('timestamp', 0)
        other_data = {k: v for k, v in data.items() if k not in ['cmd', 'timestamp']}
        return cls(cmd=cmd, data=other_data, timestamp=timestamp)


@dataclass
class MetricReading:
    """单个指标读数"""
    metric_code: str
    value: float
    unit: str
    timestamp: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'metric_code': self.metric_code,
            'value': self.value,
            'unit': self.unit,
            'timestamp': self.timestamp,
        }


@dataclass
class EnvironmentReading:
    """环境读数"""
    reading_id: Optional[str] = None
    plant_id: Optional[str] = None
    device_id: Optional[str] = None
    recorded_at: Optional[str] = None
    data_source: str = "sensor"
    is_stale: bool = False
    metrics: List[MetricReading] = field(default_factory=list)
    
    def to_report_payload(self) -> Dict[str, Any]:
        metrics_dict = {m.metric_code: m.value for m in self.metrics}
        return {
            'deviceId': self.device_id,
            'plantId': self.plant_id,
            'timestamp': self.recorded_at,
            'metrics': metrics_dict,
        }
