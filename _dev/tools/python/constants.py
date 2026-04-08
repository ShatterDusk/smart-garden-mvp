#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
虚拟设备模拟器常量定义
包含传感器指标、场景数据范围、UDP协议等常量
"""

# 传感器指标定义（与数据库 environment_metrics 表一致）
SENSOR_METRICS = {
    'temperature': {
        'name': '空气温度',
        'unit': '°C',
        'min': -40.0,
        'max': 85.0,
        'icon': '🌡️',
        'description': '空气温度，传感器测量微环境数据'
    },
    'humidity': {
        'name': '空气湿度',
        'unit': '%',
        'min': 0.0,
        'max': 100.0,
        'icon': '💧',
        'description': '空气湿度，传感器测量微环境数据'
    },
    'pressure': {
        'name': '大气压强',
        'unit': 'hPa',
        'min': 800.0,
        'max': 1100.0,
        'icon': '🌐',
        'description': '大气压强，部分传感器支持采集'
    },
    'light_intensity': {
        'name': '光照强度',
        'unit': 'lux',
        'min': 0.0,
        'max': 200000.0,
        'icon': '☀️',
        'description': '光照强度，人眼感知的光照强度'
    },
    'soil_moisture': {
        'name': '土壤湿度',
        'unit': '%',
        'min': 0.0,
        'max': 100.0,
        'icon': '🌱',
        'description': '土壤湿度，智能灌溉决策核心指标'
    },
    'soil_temperature': {
        'name': '土壤温度',
        'unit': '°C',
        'min': -20.0,
        'max': 60.0,
        'icon': '🌡️',
        'description': '土壤温度，根系生长环境监测'
    },
    'soil_ph': {
        'name': '土壤酸碱度',
        'unit': 'pH',
        'min': 3.0,
        'max': 9.0,
        'icon': '🔬',
        'description': '土壤pH值，土壤改良指导'
    },
    'battery_level': {
        'name': '电池电量',
        'unit': '%',
        'min': 0.0,
        'max': 100.0,
        'icon': '🔋',
        'description': '传感器设备剩余电量'
    }
}

# 场景数据范围定义
SCENARIO_RANGES = {
    'normal': {
        'temperature': (18, 32),
        'humidity': (30, 80),
        'pressure': (990, 1030),
        'light_intensity': (1000, 50000),
        'soil_moisture': (20, 70),
        'soil_temperature': (15, 28),
        'soil_ph': (5.5, 7.5)
    },
    'drought': {
        'temperature': (25, 38),
        'humidity': (10, 30),
        'pressure': (990, 1030),
        'light_intensity': (5000, 60000),
        'soil_moisture': (5, 15),
        'soil_temperature': (20, 35),
        'soil_ph': (5.0, 8.0)
    },
    'high_temp': {
        'temperature': (35, 45),
        'humidity': (20, 50),
        'pressure': (980, 1020),
        'light_intensity': (20000, 80000),
        'soil_moisture': (10, 30),
        'soil_temperature': (28, 40),
        'soil_ph': (5.5, 7.5)
    },
    'low_temp': {
        'temperature': (5, 15),
        'humidity': (40, 90),
        'pressure': (1000, 1050),
        'light_intensity': (1000, 30000),
        'soil_moisture': (30, 60),
        'soil_temperature': (8, 18),
        'soil_ph': (5.5, 7.5)
    },
    'high_hum': {
        'temperature': (20, 30),
        'humidity': (80, 98),
        'pressure': (990, 1030),
        'light_intensity': (2000, 40000),
        'soil_moisture': (50, 80),
        'soil_temperature': (18, 26),
        'soil_ph': (5.5, 7.5)
    },
    'low_light': {
        'temperature': (18, 25),
        'humidity': (40, 70),
        'pressure': (990, 1030),
        'light_intensity': (100, 2000),
        'soil_moisture': (25, 55),
        'soil_temperature': (16, 24),
        'soil_ph': (5.5, 7.5)
    },
    'watering': {
        'temperature': (20, 28),
        'humidity': (50, 85),
        'pressure': (990, 1030),
        'light_intensity': (3000, 50000),
        'soil_moisture': (60, 90),
        'soil_temperature': (17, 25),
        'soil_ph': (5.5, 7.5)
    },
    'night': {
        'temperature': (15, 22),
        'humidity': (50, 90),
        'pressure': (1000, 1040),
        'light_intensity': (0, 50),
        'soil_moisture': (25, 60),
        'soil_temperature': (14, 20),
        'soil_ph': (5.5, 7.5)
    }
}

# 场景名称映射
SCENARIO_NAMES = {
    'normal': '正常环境',
    'drought': '干旱模式',
    'high_temp': '高温模式',
    'low_temp': '低温模式',
    'high_hum': '高湿模式',
    'low_light': '光照不足',
    'watering': '浇水模式',
    'night': '夜间模式'
}

# UDP协议常量
DEFAULT_UDP_PORT = 8266
UDP_BROADCAST_ADDRESSES = ['255.255.255.255', '192.168.4.255', '192.168.1.255']

# Web服务常量
DEFAULT_WEB_PORT = 8080
DEFAULT_WEB_HOST = '0.0.0.0'

# 环境配置
ENV_CONFIG = {
    'local': {
        'name': '本地开发环境',
        'server_url': 'http://localhost:3000',
        'api_base': '/api',
    },
    'production': {
        'name': '云托管生产环境',
        'server_url': 'https://plant-backend-240450-4-1401681523.sh.run.tcloudbase.com',
        'api_base': '/api',
    },
}

# 当前环境
CURRENT_ENV = 'production'

# 后端API常量
DEFAULT_SERVER_URL = ENV_CONFIG[CURRENT_ENV]['server_url']
API_TIMEOUT = 10
API_RETRY_ATTEMPTS = 3
API_RETRY_BACKOFF = 1


def get_server_url(env: str = None) -> str:
    """获取指定环境的服务器 URL"""
    if env is None:
        env = CURRENT_ENV
    return ENV_CONFIG.get(env, ENV_CONFIG['local'])['server_url']


def get_full_api_url(endpoint: str, env: str = None) -> str:
    """获取完整的 API URL"""
    base_url = get_server_url(env)
    config = ENV_CONFIG.get(env or CURRENT_ENV, ENV_CONFIG['local'])
    return f"{base_url}{config['api_base']}{endpoint}"

# 数据上报常量
DEFAULT_INTERVAL = 60
MIN_INTERVAL = 5
MAX_INTERVAL = 3600

# 状态文件常量
STATE_FILE_NAME = 'virtual_device.json'
STATE_VERSION = '2.0'

# 场景过渡步数（减少步数加快过渡速度）
SCENARIO_TRANSITION_STEPS = 3

# 电池消耗率（每次上报消耗）
BATTERY_DRAIN_RATE = 0.1
