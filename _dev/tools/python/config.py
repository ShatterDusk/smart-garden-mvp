#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
虚拟设备模拟器配置管理
"""

import os
import yaml
from typing import Optional
from dataclasses import asdict
from models import DeviceConfig
from constants import ENV_CONFIG, get_server_url, CURRENT_ENV


def get_default_state_file() -> str:
    """获取默认状态文件路径"""
    home = os.path.expanduser('~')
    config_dir = os.path.join(home, '.proj-alpha')
    return os.path.join(config_dir, 'virtual_device.json')


def load_config_from_file(config_file: str) -> Optional[dict]:
    """从YAML文件加载配置"""
    if not os.path.exists(config_file):
        return None
    
    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    except Exception as e:
        print(f"加载配置文件失败: {e}")
        return None


def create_config(
    env: str = "local",
    server_url: str = None,
    udp_port: int = 8266,
    web_port: int = 8080,
    interval: int = 60,
    scenario: str = "normal",
    auto_pair: bool = True,
    verbose: bool = False,
    aligned: bool = False,
    state_file: Optional[str] = None,
    config_file: Optional[str] = None,
) -> DeviceConfig:
    """创建设备配置
    
    Args:
        env: 环境名称 ('local' 或 'production')
        server_url: 服务器 URL（如果指定，优先使用此值）
        udp_port: UDP 端口
        web_port: Web 服务端口
        interval: 数据上报间隔（秒）
        scenario: 默认场景模式
        auto_pair: 是否自动配对
        verbose: 详细日志输出
        aligned: 是否时间对齐
        state_file: 状态文件路径
        config_file: 配置文件路径（YAML 格式）
    """
    if config_file:
        file_config = load_config_from_file(config_file)
        if file_config:
            env_config = file_config.get('server', {}).get('env', env)
            env = env_config if env_config in ENV_CONFIG else env
            server_url = file_config.get('server', {}).get('url', server_url)
            udp_port = file_config.get('device', {}).get('udp_port', udp_port)
            interval = file_config.get('device', {}).get('default_interval', interval)
            scenario = file_config.get('device', {}).get('default_scenario', scenario)
    
    if server_url is None:
        server_url = get_server_url(env)
    
    if state_file is None:
        state_file = get_default_state_file()
    
    return DeviceConfig(
        server_url=server_url,
        udp_port=udp_port,
        web_port=web_port,
        interval=interval,
        scenario=scenario,
        auto_pair=auto_pair,
        verbose=verbose,
        aligned=aligned,
        state_file=state_file,
        env=env,
    )


def save_config_to_file(config: DeviceConfig, config_file: str) -> bool:
    """保存配置到YAML文件"""
    try:
        config_dict = {
            'server': {
                'env': config.env,
                'url': config.server_url,
            },
            'device': {
                'udp_port': config.udp_port,
                'web_port': config.web_port,
                'default_interval': config.interval,
                'default_scenario': config.scenario,
                'auto_pair': config.auto_pair,
            },
        }
        
        os.makedirs(os.path.dirname(config_file), exist_ok=True)
        with open(config_file, 'w', encoding='utf-8') as f:
            yaml.dump(config_dict, f, default_flow_style=False, allow_unicode=True)
        
        return True
    except Exception as e:
        print(f"保存配置文件失败: {e}")
        return False


DEFAULT_CONFIG_TEMPLATE = """# proj-alpha 虚拟设备配置文件
# 环境: local (本地) 或 production (生产)

server:
  env: local
  url: ""

device:
  udp_port: 8266
  web_port: 8080
  default_interval: 60
  default_scenario: normal
  auto_pair: true
"""


def create_default_config_file(config_file: str = "config.yaml") -> bool:
    """创建默认配置文件"""
    try:
        with open(config_file, 'w', encoding='utf-8') as f:
            f.write(DEFAULT_CONFIG_TEMPLATE)
        print(f"默认配置文件已创建: {config_file}")
        return True
    except Exception as e:
        print(f"创建配置文件失败: {e}")
        return False


def print_env_info():
    """打印当前环境配置信息"""
    print("\\n===== 可用环境配置 =====")
    for env_name, env_config in ENV_CONFIG.items():
        marker = " (当前)" if env_name == CURRENT_ENV else ""
        print(f"  {env_name}: {env_config['name']}")
        print(f"         URL: {env_config['server_url']}{env_config['api_base']}{marker}")
    print()
