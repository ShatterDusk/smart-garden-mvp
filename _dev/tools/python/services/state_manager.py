#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
状态管理服务
负责持久化存储设备状态
"""

import os
import json
from datetime import datetime
from typing import Optional, Dict, Any

from models import PersistedState
from constants import STATE_FILE_NAME, STATE_VERSION


class StateManager:
    """状态管理器"""
    
    def __init__(self, state_file: Optional[str] = None):
        self.state_file = state_file or self._get_default_state_file()
        self.state: Optional[PersistedState] = None
    
    def _get_default_state_file(self) -> str:
        """获取默认状态文件路径"""
        home = os.path.expanduser('~')
        config_dir = os.path.join(home, '.proj-alpha')
        return os.path.join(config_dir, STATE_FILE_NAME)
    
    def load(self) -> Optional[PersistedState]:
        """加载持久化状态"""
        if not os.path.exists(self.state_file):
            return None
        
        try:
            with open(self.state_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self.state = PersistedState.from_dict(data)
            return self.state
        except Exception as e:
            print(f"加载状态文件失败: {e}")
            return None
    
    def save(self, state: PersistedState) -> bool:
        """保存状态到文件"""
        try:
            os.makedirs(os.path.dirname(self.state_file), exist_ok=True)
            with open(self.state_file, 'w', encoding='utf-8') as f:
                json.dump(state.to_dict(), f, indent=2, ensure_ascii=False)
            self.state = state
            return True
        except Exception as e:
            print(f"保存状态文件失败: {e}")
            return False
    
    def is_valid(self) -> bool:
        """检查状态是否有效"""
        if not self.state:
            return False
        
        if self.state.version != STATE_VERSION:
            return False
        
        auth = self.state.auth
        if not auth:
            return False
        
        expires_at = auth.get('expires_at')
        if expires_at:
            try:
                expire_time = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                if expire_time < datetime.now(expire_time.tzinfo):
                    return False
            except:
                return False
        
        device = self.state.device
        if not device or not device.get('device_id'):
            return False
        
        return True
    
    def create_empty_state(self, server_url: str) -> PersistedState:
        """创建空状态"""
        return PersistedState(
            version=STATE_VERSION,
            server_url=server_url,
            device={},
            plant={},
            auth={},
            config={},
            state={},
        )
    
    def update_device(self, device_id: str, mac_address: str, device_name: str, status: str = 'online'):
        """更新设备信息"""
        if not self.state:
            return
        
        self.state.device = {
            'device_id': device_id,
            'mac_address': mac_address,
            'device_name': device_name,
            'status': status,
        }
    
    def update_plant(self, plant_id: str, nickname: str, species: str = ''):
        """更新植物信息"""
        if not self.state:
            return
        
        self.state.plant = {
            'plant_id': plant_id,
            'nickname': nickname,
            'species': species,
        }
    
    def update_auth(self, token: str, user_id: str, expires_at: str):
        """更新认证信息"""
        if not self.state:
            return
        
        self.state.auth = {
            'token': token,
            'user_id': user_id,
            'expires_at': expires_at,
        }
    
    def update_config(self, scenario: str, interval: int, udp_port: int):
        """更新配置信息"""
        if not self.state:
            return
        
        self.state.config = {
            'scenario': scenario,
            'interval': interval,
            'udp_port': udp_port,
        }
    
    def update_state(self, current_metrics: Dict[str, float], report_count: int, last_report_at: str):
        """更新运行状态"""
        if not self.state:
            return
        
        self.state.state = {
            'current_metrics': current_metrics,
            'report_count': report_count,
            'last_report_at': last_report_at,
        }
    
    def get_device_id(self) -> Optional[str]:
        """获取设备ID"""
        if self.state and self.state.device:
            return self.state.device.get('device_id')
        return None
    
    def get_plant_id(self) -> Optional[str]:
        """获取植物ID"""
        if self.state and self.state.plant:
            return self.state.plant.get('plant_id')
        return None
    
    def get_token(self) -> Optional[str]:
        """获取Token"""
        if self.state and self.state.auth:
            return self.state.auth.get('token')
        return None
    
    def clear(self):
        """清除状态"""
        self.state = None
        if os.path.exists(self.state_file):
            os.remove(self.state_file)
