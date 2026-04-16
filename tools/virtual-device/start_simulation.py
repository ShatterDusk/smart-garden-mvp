#!/usr/bin/env python
"""
直接启动虚拟传感器模拟（使用自定义扩展）
用于端到端测试
"""

import sys
import os
import time

# 添加项目路径
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)
sys.path.insert(0, os.path.join(script_dir, 'app'))

# 加载环境变量
from dotenv import load_dotenv
load_dotenv(override=True)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.model.models import Base, DeviceModel, SensorModel, ContainerModel
from app.model.device_custom import DeviceCustom
from app.utils.http_helper_v2 import HTTPHelperV2
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def init_database():
    """初始化数据库"""
    db_path = os.path.join(script_dir, 'telemetry_simulator.db')
    engine = create_engine(f'sqlite:///{db_path}')
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    DeviceModel.session = session
    SensorModel.session = session
    ContainerModel.session = session
    
    return session


def create_http_helper():
    """创建HTTP Helper V2"""
    api_url = os.getenv('HTTP_API_URL', 'http://localhost:3000/api/devices/data')
    return HTTPHelperV2(api_url)


def ui_callback(sensor, data):
    """UI 更新回调"""
    logger.info(f"[UI] {sensor.name}: {data.get('value')} {sensor.unit}")


def main():
    logger.info("=" * 60)
    logger.info("虚拟传感器端到端测试（自定义扩展版）")
    logger.info("=" * 60)
    
    # 初始化数据库
    session = init_database()
    logger.info("✓ 数据库已连接")
    
    # 获取设备（先查询 Device，然后包装为 DeviceCustom）
    from model.device import Device
    device_name = os.getenv('VIRTUAL_DEVICE_NAME', 'VIRTUAL_DEVICE_001')
    device_db = session.query(Device).filter_by(name=device_name).first()
    
    if not device_db:
        logger.error(f"✗ 设备 {device_name} 不存在，请先运行 setup_sensors.py")
        return
    
    # 将 Device 实例转换为 DeviceCustom（通过复制属性）
    device = session.query(DeviceCustom).filter_by(name=device_name).first()
    if not device:
        # 如果数据库中没有 DeviceCustom 记录，创建一个新的并复制属性
        device = DeviceCustom()
        device.id = device_db.id
        device.name = device_db.name
        device.generation_id = device_db.generation_id
        device.etag = device_db.etag
        device.status = device_db.status
        device.connection_string = device_db.connection_string
        device.container_id = device_db.container_id
        # 复制传感器关系
        device.sensors = device_db.sensors
    
    logger.info(f"✓ 找到设备: {device.name} (ID: {device.id})")
    logger.info(f"  传感器数量: {len(device.sensors)}")
    
    # 创建HTTP Helper
    http_helper = create_http_helper()
    logger.info(f"✓ HTTP Helper 已创建")
    logger.info(f"  API地址: {http_helper.api_url}")
    
    # 启动设备模拟（使用自定义方法）
    logger.info("\n" + "=" * 60)
    logger.info("启动模拟")
    logger.info("=" * 60)
    
    device.start_simulation_custom(
        http_helper=http_helper,
        container_callback=ui_callback
    )
    
    logger.info(f"✓ 设备模拟已启动")
    logger.info(f"  初始模拟时间: {os.getenv('SIMULATED_TIME_INITIAL', '当前时间')}")
    logger.info(f"  时间加速倍数: {os.getenv('TIME_ACCELERATION', '1')}")
    logger.info(f"  采集间隔: {os.getenv('SENSOR_INTERVAL', '7200000')}ms")
    
    # 持续运行，等待数据上报
    logger.info("\n" + "=" * 60)
    logger.info("模拟运行中... (按 Ctrl+C 停止)")
    logger.info("=" * 60)
    
    try:
        while True:
            time.sleep(5)
            
            # 显示队列状态
            queue_status = http_helper.get_queue_status()
            logger.info(f"[状态] 队列大小: {queue_status['size']}/{queue_status['max_size']}")
            
    except KeyboardInterrupt:
        logger.info("\n✓ 收到停止信号")
    finally:
        # 停止设备模拟
        device.stop_simulation_custom()
        http_helper.stop()
        logger.info("✓ 模拟已停止")
        
        # 显示最终队列状态
        final_status = http_helper.get_queue_status()
        logger.info(f"\n最终队列状态:")
        logger.info(f"  队列大小: {final_status['size']}")
        logger.info(f"  持久化路径: {final_status['persist_path']}")


if __name__ == "__main__":
    main()
