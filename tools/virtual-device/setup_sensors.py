#!/usr/bin/env python
"""
快速设置8个传感器指标脚本
用于适配 proj-alpha 后端的环境指标
"""

import sqlite3
import os

# 固定常量：采集间隔 2小时 = 7200000毫秒 = 7200秒
DEFAULT_INTERVAL_MS = 7200000
DEFAULT_INTERVAL_SEC = 7200  # 数据库 interval 单位是秒

# 8个传感器指标配置（与数据库 environment_metrics 对应）
# 格式: (name, unit, base_value, variation_range, change_rate)
SENSOR_CONFIGS = [
    ("temperature", "°C", 25.0, 5.0, 0.5),
    ("humidity", "%", 60.0, 15.0, 2.0),
    ("pressure", "hPa", 1013.0, 20.0, 1.0),
    ("light_intensity", "lux", 5000.0, 3000.0, 500.0),
    ("soil_moisture", "%", 50.0, 15.0, 1.0),
    ("soil_temperature", "°C", 22.0, 3.0, 0.3),
    ("soil_ph", "pH", 6.5, 0.5, 0.05),
    ("battery_level", "%", 85.0, 5.0, -0.1),
]


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(script_dir, 'telemetry_simulator.db')
    
    print("=" * 50)
    print("Proj-Alpha 虚拟传感器初始化")
    print("=" * 50)
    print(f"\n数据库路径: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 检查表是否存在
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sensor'")
    if not cursor.fetchone():
        print("\n错误: sensor 表不存在，请先启动一次虚拟传感器创建表结构")
        return
    
    print("\n" + "=" * 50)
    print("创建8个传感器指标")
    print("=" * 50)
    
    created_count = 0
    
    for name, unit, base_value, variation, change_rate in SENSOR_CONFIGS:
        # 检查是否已存在
        cursor.execute("SELECT id FROM sensor WHERE name = ?", (name,))
        existing = cursor.fetchone()
        
        if existing:
            print(f"✓ {name} 已存在，跳过")
            continue
        
        # 插入传感器（interval 从环境变量 SENSOR_INTERVAL 转换）
        cursor.execute("""
            INSERT INTO sensor (name, base_value, unit, variation_range, change_rate, interval, error_definition, device_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (name, base_value, unit, variation, change_rate, DEFAULT_INTERVAL_SEC, None, None))
        
        print(f"✓ 创建: {name} ({base_value}{unit})")
        created_count += 1
    
    conn.commit()
    
    # 创建设备
    device_name = os.getenv('VIRTUAL_DEVICE_NAME', 'VIRTUAL_DEVICE_001')
    
    cursor.execute("SELECT id FROM device WHERE name = ?", (device_name,))
    device = cursor.fetchone()
    
    if device:
        device_id = device[0]
        print(f"\n✓ 设备 {device_name} 已存在 (ID: {device_id})")
    else:
        cursor.execute("""
            INSERT INTO device (name, generation_id, etag, status, connection_string, container_id)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (device_name, 1, "etag_001", "active", None, None))
        device_id = cursor.lastrowid
        print(f"\n✓ 创建设备: {device_name} (ID: {device_id})")
    
    # 关联传感器到设备
    cursor.execute("SELECT id FROM sensor WHERE name IN (?, ?, ?, ?, ?, ?, ?, ?)", 
                   tuple(s[0] for s in SENSOR_CONFIGS))
    sensor_ids = [row[0] for row in cursor.fetchall()]
    
    for sensor_id in sensor_ids:
        cursor.execute("UPDATE sensor SET device_id = ? WHERE id = ?", (device_id, sensor_id))
    
    conn.commit()
    print(f"✓ 关联传感器: {len(sensor_ids)} 个")
    
    conn.close()
    
    print("\n" + "=" * 50)
    print("初始化完成！")
    print("=" * 50)
    print(f"\n设备名称: {device_name}")
    print(f"传感器数量: {len(sensor_ids)}")
    print(f"默认间隔: {DEFAULT_INTERVAL_SEC}秒 ({DEFAULT_INTERVAL_MS}毫秒)")
    print("\n传感器列表:")
    for name, unit, base_value, _, _ in SENSOR_CONFIGS:
        print(f"  - {name}: {base_value}{unit}")
    
    print("\n下一步:")
    print("1. 启动虚拟传感器: python app/main.py")
    print("2. 访问 http://localhost:8080")
    print("3. 在'设备'页面查看已创建的设备")
    print("4. 创建容器并启动模拟")


if __name__ == "__main__":
    main()
