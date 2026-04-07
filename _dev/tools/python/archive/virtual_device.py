#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
虚拟设备模拟器
模拟 IoT 设备上报环境数据到后端服务器
支持自动配对功能
"""

import argparse
import random
import time
import requests
from datetime import datetime
from typing import Optional, Dict, Any


class VirtualDevice:
    """虚拟设备模拟器"""
    
    def __init__(
        self,
        device_id: str,
        server_url: str = "http://localhost:3000",
        plant_id: Optional[str] = None,
        interval: int = 60,
        auto_pair: bool = True
    ):
        self.device_id = device_id
        self.server_url = server_url.rstrip('/')
        self.plant_id = plant_id
        self.interval = interval
        self.auto_pair = auto_pair
        self.running = False
        self.token = None
        
        # 模拟数据范围配置
        self.metric_ranges = {
            "temperature": (18, 32),
            "humidity": (30, 80),
            "light_intensity": (1000, 50000),
            "soil_moisture": (20, 70),
            "soil_temperature": (15, 28),
        }
        
        # 当前值（用于平滑变化）
        self.current_values = {
            metric: random.uniform(*ranges)
            for metric, ranges in self.metric_ranges.items()
        }
    
    def guest_login(self) -> Dict[str, Any]:
        """游客登录获取 token"""
        try:
            response = requests.post(
                f"{self.server_url}/api/users/guest-login",
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("data", {}).get("token")
                return {"success": True, "token": self.token}
            return {"success": False, "error": f"登录失败: {response.status_code}"}
        except requests.exceptions.RequestException as e:
            return {"success": False, "error": str(e)}
    
    def create_plant(self, nickname: str = "虚拟设备测试植物") -> Dict[str, Any]:
        """创建植物"""
        if not self.token:
            return {"success": False, "error": "未登录"}
        
        try:
            response = requests.post(
                f"{self.server_url}/api/plants",
                json={
                    "nickname": nickname,
                    "species": "虎皮兰",
                    "plantCategory": "foliage"
                },
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10
            )
            if response.status_code in [200, 201]:
                data = response.json()
                plant_id = data.get("data", {}).get("plantId")
                return {"success": True, "plantId": plant_id}
            return {"success": False, "error": f"创建植物失败: {response.status_code}"}
        except requests.exceptions.RequestException as e:
            return {"success": False, "error": str(e)}
    
    def bind_device(self, plant_id: str) -> Dict[str, Any]:
        """绑定设备到植物"""
        if not self.token:
            return {"success": False, "error": "未登录"}
        
        try:
            response = requests.post(
                f"{self.server_url}/api/devices/bind",
                json={
                    "macAddress": f"VIRTUAL_{self.device_id}",
                    "deviceName": f"虚拟设备_{self.device_id[-8:]}",
                    "plantId": plant_id
                },
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                device_id = data.get("data", {}).get("deviceId")
                return {"success": True, "deviceId": device_id}
            return {"success": False, "error": f"绑定设备失败: {response.status_code}"}
        except requests.exceptions.RequestException as e:
            return {"success": False, "error": str(e)}
    
    def auto_pair_device(self) -> bool:
        """自动配对设备（登录 -> 创建植物 -> 绑定设备）"""
        print("\n=== 开始自动配对 ===")
        
        # 1. 游客登录
        print("1. 游客登录...")
        result = self.guest_login()
        if not result["success"]:
            print(f"   ❌ 登录失败: {result.get('error')}")
            return False
        print(f"   ✅ 登录成功")
        
        # 2. 创建植物（如果没有指定）
        if not self.plant_id:
            print("2. 创建植物...")
            result = self.create_plant()
            if not result["success"]:
                print(f"   ❌ 创建植物失败: {result.get('error')}")
                return False
            self.plant_id = result["plantId"]
            print(f"   ✅ 植物ID: {self.plant_id}")
        else:
            print(f"2. 使用指定植物: {self.plant_id}")
        
        # 3. 绑定设备
        print("3. 绑定设备...")
        result = self.bind_device(self.plant_id)
        if not result["success"]:
            print(f"   ❌ 绑定失败: {result.get('error')}")
            return False
        self.device_id = result["deviceId"]
        print(f"   ✅ 设备ID: {self.device_id}")
        
        print("\n=== 配对完成 ===\n")
        return True
    
    def generate_metrics(self) -> Dict[str, float]:
        """生成模拟传感器数据（带平滑变化）"""
        metrics = {}
        
        for metric, (min_val, max_val) in self.metric_ranges.items():
            # 平滑变化：当前值 + 小幅随机变化
            current = self.current_values.get(metric, random.uniform(min_val, max_val))
            
            # 随机变化幅度（-3% ~ +3%）
            change_percent = random.uniform(-0.03, 0.03)
            new_value = current * (1 + change_percent)
            
            # 确保在范围内
            new_value = max(min_val, min(max_val, new_value))
            
            self.current_values[metric] = new_value
            metrics[metric] = round(new_value, 2)
        
        # 添加电池电量（缓慢下降）
        if "battery_level" not in self.current_values:
            self.current_values["battery_level"] = 100
        self.current_values["battery_level"] = max(0, self.current_values["battery_level"] - random.uniform(0, 0.1))
        metrics["battery_level"] = int(self.current_values["battery_level"])
        
        return metrics
    
    def report_data(self) -> Dict[str, Any]:
        """上报数据到服务器"""
        payload = {
            "deviceId": self.device_id,
            "timestamp": datetime.now().isoformat(),
            "metrics": self.generate_metrics()
        }
        
        if self.plant_id:
            payload["plantId"] = self.plant_id
        
        try:
            response = requests.post(
                f"{self.server_url}/api/devices/data",
                json=payload,
                timeout=10
            )
            return {
                "success": response.status_code == 200,
                "status_code": response.status_code,
                "data": response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text
            }
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def run(self):
        """运行模拟器"""
        # 自动配对
        if self.auto_pair:
            if not self.auto_pair_device():
                print("❌ 自动配对失败，退出")
                return
        
        print(f"=== 虚拟设备模拟器启动 ===")
        print(f"设备ID: {self.device_id}")
        print(f"服务器: {self.server_url}")
        print(f"植物ID: {self.plant_id}")
        print(f"上报间隔: {self.interval} 秒")
        print(f"指标: {list(self.metric_ranges.keys())}")
        print("-" * 50)
        
        self.running = True
        report_count = 0
        
        while self.running:
            result = self.report_data()
            report_count += 1
            
            timestamp = datetime.now().strftime('%H:%M:%S')
            
            if result["success"]:
                data = result.get("data", {}).get("data", {})
                metrics = result.get("data", {}).get("data", {}).get("metrics", {})
                print(f"[{timestamp}] "
                      f"✅ 上报成功 #{report_count} - "
                      f"读数ID: {data.get('readingId', 'N/A')[:16]}..."
                )
            else:
                error = result.get("error", result.get("data", "未知错误"))
                print(f"[{timestamp}] ❌ 上报失败: {error}")
            
            time.sleep(self.interval)
    
    def stop(self):
        """停止模拟器"""
        self.running = False
        print("\n模拟器已停止")


def main():
    parser = argparse.ArgumentParser(
        description="虚拟设备模拟器 - 模拟 IoT 设备上报环境数据",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--device-id", help="设备ID（可选，自动绑定时会生成）")
    parser.add_argument("--server-url", default="http://localhost:3000", help="服务器URL")
    parser.add_argument("--plant-id", help="植物ID（可选，不指定则自动创建）")
    parser.add_argument("--interval", type=int, default=60, help="上报间隔（秒）")
    parser.add_argument("--no-auto-pair", action="store_true", help="禁用自动配对（需手动指定设备ID和植物ID）")
    
    args = parser.parse_args()
    
    # 自动配对模式：设备ID可选
    if not args.no_auto_pair and not args.device_id:
        args.device_id = f"AUTO_{random.randint(10000000, 99999999)}"
    
    if not args.device_id:
        parser.error("请指定 --device-id 或移除 --no-auto-pair")
    
    device = VirtualDevice(
        device_id=args.device_id,
        server_url=args.server_url,
        plant_id=args.plant_id,
        interval=args.interval,
        auto_pair=not args.no_auto_pair
    )
    
    try:
        device.run()
    except KeyboardInterrupt:
        device.stop()


if __name__ == "__main__":
    main()
