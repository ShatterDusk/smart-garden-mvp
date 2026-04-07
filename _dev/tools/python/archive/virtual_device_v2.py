#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
虚拟设备模拟器 V2
增强版 - 支持交互式命令行、场景模拟、批量设备管理
"""

import argparse
import random
import time
import threading
import requests
import json
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum


class DeviceScenario(Enum):
    """设备场景模式"""
    NORMAL = "normal"           # 正常模式
    DROUGHT = "drought"         # 干旱模式（土壤湿度低）
    HIGH_TEMP = "high_temp"     # 高温模式
    LOW_TEMP = "low_temp"       # 低温模式
    HIGH_HUMIDITY = "high_hum"  # 高湿模式
    LOW_LIGHT = "low_light"     # 光照不足
    WATERING = "watering"       # 浇水模式（土壤湿度快速上升）
    NIGHT = "night"             # 夜间模式（光照低，温度略降）


class VirtualDeviceV2:
    """虚拟设备模拟器 V2"""
    
    def __init__(
        self,
        device_id: str,
        server_url: str = "http://localhost:3000",
        plant_id: Optional[str] = None,
        interval: int = 60,
        auto_pair: bool = True,
        scenario: DeviceScenario = DeviceScenario.NORMAL
    ):
        self.device_id = device_id
        self.server_url = server_url.rstrip('/')
        self.plant_id = plant_id
        self.interval = interval
        self.auto_pair = auto_pair
        self.scenario = scenario
        self.running = False
        self.token = None
        self.report_thread = None
        self.command_thread = None
        
        # 场景配置
        self.scenario_configs = {
            DeviceScenario.NORMAL: {
                "temperature": (18, 32),
                "humidity": (30, 80),
                "light_intensity": (1000, 50000),
                "soil_moisture": (20, 70),
                "soil_temperature": (15, 28),
            },
            DeviceScenario.DROUGHT: {
                "temperature": (25, 38),
                "humidity": (10, 30),
                "light_intensity": (5000, 60000),
                "soil_moisture": (5, 15),  # 土壤湿度极低
                "soil_temperature": (20, 35),
            },
            DeviceScenario.HIGH_TEMP: {
                "temperature": (35, 45),  # 高温
                "humidity": (20, 50),
                "light_intensity": (20000, 80000),
                "soil_moisture": (10, 30),
                "soil_temperature": (28, 40),
            },
            DeviceScenario.LOW_TEMP: {
                "temperature": (5, 15),  # 低温
                "humidity": (40, 90),
                "light_intensity": (1000, 30000),
                "soil_moisture": (30, 60),
                "soil_temperature": (8, 18),
            },
            DeviceScenario.HIGH_HUMIDITY: {
                "temperature": (20, 30),
                "humidity": (80, 98),  # 高湿
                "light_intensity": (2000, 40000),
                "soil_moisture": (50, 80),
                "soil_temperature": (18, 26),
            },
            DeviceScenario.LOW_LIGHT: {
                "temperature": (18, 25),
                "humidity": (40, 70),
                "light_intensity": (100, 2000),  # 光照不足
                "soil_moisture": (25, 55),
                "soil_temperature": (16, 24),
            },
            DeviceScenario.WATERING: {
                "temperature": (20, 28),
                "humidity": (50, 85),
                "light_intensity": (3000, 50000),
                "soil_moisture": (60, 90),  # 浇水后湿度高
                "soil_temperature": (17, 25),
            },
            DeviceScenario.NIGHT: {
                "temperature": (15, 22),  # 夜间温度略低
                "humidity": (50, 90),
                "light_intensity": (0, 50),  # 夜间无光照
                "soil_moisture": (25, 60),
                "soil_temperature": (14, 20),
            },
        }
        
        # 当前场景的数据范围
        self.metric_ranges = self.scenario_configs[scenario].copy()
        
        # 当前值（用于平滑变化）
        self.current_values = {}
        self.reset_values()
        
        # 统计信息
        self.stats = {
            "total_reports": 0,
            "success_reports": 0,
            "failed_reports": 0,
            "start_time": None,
        }
    
    def reset_values(self):
        """重置当前值为场景初始值"""
        self.current_values = {
            metric: random.uniform(*ranges)
            for metric, ranges in self.metric_ranges.items()
        }
        self.current_values["battery_level"] = 100
    
    def set_scenario(self, scenario: DeviceScenario):
        """切换场景"""
        old_scenario = self.scenario
        self.scenario = scenario
        self.metric_ranges = self.scenario_configs[scenario].copy()
        
        # 平滑过渡到新场景
        print(f"\n🔄 场景切换: {old_scenario.value} -> {scenario.value}")
        print(f"   新场景数据范围:")
        for metric, (min_v, max_v) in self.metric_ranges.items():
            print(f"     {metric}: {min_v} ~ {max_v}")
        
        # 逐渐调整当前值到新范围
        for metric, (min_val, max_val) in self.metric_ranges.items():
            current = self.current_values.get(metric, (min_val + max_val) / 2)
            # 向新范围的中值靠拢
            target = (min_val + max_val) / 2
            self.current_values[metric] = (current + target) / 2
    
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
    
    def unbind_device(self) -> Dict[str, Any]:
        """解绑设备"""
        if not self.token:
            return {"success": False, "error": "未登录"}
        
        try:
            response = requests.post(
                f"{self.server_url}/api/devices/unbind",
                json={"deviceId": self.device_id},
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10
            )
            if response.status_code == 200:
                return {"success": True}
            return {"success": False, "error": f"解绑失败: {response.status_code}"}
        except requests.exceptions.RequestException as e:
            return {"success": False, "error": str(e)}
    
    def get_device_list(self) -> Dict[str, Any]:
        """获取设备列表"""
        if not self.token:
            return {"success": False, "error": "未登录"}
        
        try:
            response = requests.get(
                f"{self.server_url}/api/devices",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                return {"success": True, "devices": data.get("data", [])}
            return {"success": False, "error": f"获取失败: {response.status_code}"}
        except requests.exceptions.RequestException as e:
            return {"success": False, "error": str(e)}
    
    def auto_pair_device(self) -> bool:
        """自动配对设备（登录 -> 创建植物 -> 绑定设备）"""
        print("\n" + "="*50)
        print("🚀 开始自动配对")
        print("="*50)
        
        # 1. 游客登录
        print("\n📱 步骤 1/3: 游客登录...")
        result = self.guest_login()
        if not result["success"]:
            print(f"   ❌ 登录失败: {result.get('error')}")
            return False
        print(f"   ✅ 登录成功")
        
        # 2. 创建植物（如果没有指定）
        if not self.plant_id:
            print("\n🌱 步骤 2/3: 创建植物...")
            result = self.create_plant()
            if not result["success"]:
                print(f"   ❌ 创建植物失败: {result.get('error')}")
                return False
            self.plant_id = result["plantId"]
            print(f"   ✅ 植物ID: {self.plant_id}")
        else:
            print(f"\n🌱 步骤 2/3: 使用指定植物: {self.plant_id}")
        
        # 3. 绑定设备
        print("\n🔗 步骤 3/3: 绑定设备...")
        result = self.bind_device(self.plant_id)
        if not result["success"]:
            print(f"   ❌ 绑定失败: {result.get('error')}")
            return False
        self.device_id = result["deviceId"]
        print(f"   ✅ 设备ID: {self.device_id}")
        
        print("\n" + "="*50)
        print("🎉 配对完成！")
        print("="*50)
        return True
    
    def generate_metrics(self) -> Dict[str, float]:
        """生成模拟传感器数据（带平滑变化）"""
        metrics = {}
        
        for metric, (min_val, max_val) in self.metric_ranges.items():
            # 平滑变化：当前值 + 小幅随机变化
            current = self.current_values.get(metric, random.uniform(min_val, max_val))
            
            # 根据场景调整变化幅度
            if self.scenario == DeviceScenario.WATERING and metric == "soil_moisture":
                # 浇水模式：土壤湿度快速上升
                change_percent = random.uniform(0.02, 0.08)
            elif self.scenario == DeviceScenario.DROUGHT and metric == "soil_moisture":
                # 干旱模式：土壤湿度缓慢下降
                change_percent = random.uniform(-0.05, -0.01)
            else:
                # 正常模式：随机变化
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
    
    def print_status(self):
        """打印当前状态"""
        print("\n" + "="*60)
        print("📊 设备状态")
        print("="*60)
        print(f"设备ID: {self.device_id}")
        print(f"植物ID: {self.plant_id}")
        print(f"当前场景: {self.scenario.value}")
        print(f"上报间隔: {self.interval} 秒")
        print(f"运行状态: {'🟢 运行中' if self.running else '🔴 已停止'}")
        print("-"*60)
        print("当前传感器数据:")
        for metric, value in self.current_values.items():
            unit = {
                "temperature": "°C",
                "humidity": "%",
                "light_intensity": "lux",
                "soil_moisture": "%",
                "soil_temperature": "°C",
                "battery_level": "%"
            }.get(metric, "")
            print(f"  {metric:20s}: {value:8.2f} {unit}")
        print("-"*60)
        print("统计信息:")
        print(f"  总上报次数: {self.stats['total_reports']}")
        print(f"  成功: {self.stats['success_reports']} ✅")
        print(f"  失败: {self.stats['failed_reports']} ❌")
        if self.stats['start_time']:
            elapsed = (datetime.now() - self.stats['start_time']).total_seconds()
            print(f"  运行时长: {elapsed:.0f} 秒")
        print("="*60)
    
    def print_help(self):
        """打印帮助信息"""
        print("\n" + "="*60)
        print("📖 可用命令")
        print("="*60)
        print("  status    - 显示设备状态")
        print("  scenario  - 切换场景模式")
        print("  interval  - 修改上报间隔")
        print("  report    - 立即上报一次数据")
        print("  unbind    - 解绑设备")
        print("  devices   - 查看设备列表")
        print("  help      - 显示帮助")
        print("  quit/exit - 退出模拟器")
        print("="*60)
        print("\n场景模式:")
        for scenario in DeviceScenario:
            print(f"  {scenario.value:12s} - {self._get_scenario_desc(scenario)}")
        print("="*60)
    
    def _get_scenario_desc(self, scenario: DeviceScenario) -> str:
        """获取场景描述"""
        descriptions = {
            DeviceScenario.NORMAL: "正常环境",
            DeviceScenario.DROUGHT: "干旱（土壤湿度低）",
            DeviceScenario.HIGH_TEMP: "高温",
            DeviceScenario.LOW_TEMP: "低温",
            DeviceScenario.HIGH_HUMIDITY: "高湿",
            DeviceScenario.LOW_LIGHT: "光照不足",
            DeviceScenario.WATERING: "浇水（湿度上升）",
            DeviceScenario.NIGHT: "夜间模式",
        }
        return descriptions.get(scenario, "未知场景")
    
    def handle_command(self, command: str) -> bool:
        """处理交互命令"""
        command = command.strip().lower()
        
        if command == "status":
            self.print_status()
        
        elif command == "scenario":
            print("\n可用场景:")
            for i, scenario in enumerate(DeviceScenario, 1):
                marker = "👉" if scenario == self.scenario else "  "
                print(f"  {marker} {i}. {scenario.value:12s} - {self._get_scenario_desc(scenario)}")
            
            choice = input("\n选择场景 (1-8 或名称): ").strip()
            
            # 尝试数字选择
            try:
                idx = int(choice) - 1
                if 0 <= idx < len(DeviceScenario):
                    self.set_scenario(list(DeviceScenario)[idx])
                else:
                    print("❌ 无效选择")
            except ValueError:
                # 尝试名称匹配
                try:
                    scenario = DeviceScenario(choice)
                    self.set_scenario(scenario)
                except ValueError:
                    print(f"❌ 未知场景: {choice}")
        
        elif command == "interval":
            try:
                new_interval = int(input("输入新的上报间隔（秒）: ").strip())
                if new_interval >= 5:
                    self.interval = new_interval
                    print(f"✅ 上报间隔已设置为 {new_interval} 秒")
                else:
                    print("❌ 间隔不能小于 5 秒")
            except ValueError:
                print("❌ 请输入有效的数字")
        
        elif command == "report":
            print("\n📤 手动上报数据...")
            result = self.report_data()
            if result["success"]:
                print("✅ 上报成功")
                metrics = result.get("data", {}).get("data", {}).get("metrics", {})
                print(f"   读数ID: {result.get('data', {}).get('data', {}).get('readingId', 'N/A')}")
            else:
                print(f"❌ 上报失败: {result.get('error', '未知错误')}")
        
        elif command == "unbind":
            confirm = input("确定要解绑设备吗？这将停止数据上报 (y/n): ").strip().lower()
            if confirm == 'y':
                result = self.unbind_device()
                if result["success"]:
                    print("✅ 设备已解绑")
                    self.running = False
                else:
                    print(f"❌ 解绑失败: {result.get('error')}")
        
        elif command == "devices":
            result = self.get_device_list()
            if result["success"]:
                devices = result.get("devices", [])
                print(f"\n📱 设备列表 ({len(devices)} 个):")
                for device in devices:
                    print(f"  - {device.get('deviceId')}: {device.get('deviceName')} ({device.get('status')})")
            else:
                print(f"❌ 获取失败: {result.get('error')}")
        
        elif command == "help":
            self.print_help()
        
        elif command in ["quit", "exit", "q"]:
            print("\n👋 再见！")
            self.stop()
            return False
        
        else:
            print(f"❓ 未知命令: {command}")
            print("输入 'help' 查看可用命令")
        
        return True
    
    def _report_loop(self):
        """数据上报循环（在后台线程运行）"""
        while self.running:
            result = self.report_data()
            self.stats["total_reports"] += 1
            
            timestamp = datetime.now().strftime('%H:%M:%S')
            
            if result["success"]:
                self.stats["success_reports"] += 1
                data = result.get("data", {}).get("data", {})
                reading_id = data.get('readingId', 'N/A')
                metrics = data.get('metrics', {})
                print(f"\n[{timestamp}] ✅ 上报成功 #{self.stats['total_reports']}")
                print(f"   读数ID: {reading_id[:20]}...")
                print(f"   数据: 温度{metrics.get('temperature', 0):.1f}°C | "
                      f"湿度{metrics.get('humidity', 0):.1f}% | "
                      f"光照{metrics.get('light_intensity', 0):.0f}lux | "
                      f"土壤{metrics.get('soil_moisture', 0):.1f}%")
            else:
                self.stats["failed_reports"] += 1
                error = result.get("error", result.get("data", "未知错误"))
                print(f"\n[{timestamp}] ❌ 上报失败: {error}")
            
            # 等待下一次上报
            for _ in range(self.interval):
                if not self.running:
                    break
                time.sleep(1)
    
    def _command_loop(self):
        """命令行交互循环（在主线程运行）"""
        time.sleep(1)  # 等待上报线程启动
        
        print("\n" + "="*60)
        print("💡 提示: 输入 'help' 查看可用命令")
        print("="*60 + "\n")
        
        while self.running:
            try:
                command = input("> ").strip()
                if command:
                    if not self.handle_command(command):
                        break
            except EOFError:
                break
            except KeyboardInterrupt:
                print("\n")
                self.stop()
                break
    
    def run(self):
        """运行模拟器（交互模式）"""
        # 自动配对
        if self.auto_pair:
            if not self.auto_pair_device():
                print("❌ 自动配对失败，退出")
                return
        
        print("\n" + "="*60)
        print("🚀 虚拟设备模拟器 V2 启动")
        print("="*60)
        print(f"设备ID: {self.device_id}")
        print(f"服务器: {self.server_url}")
        print(f"植物ID: {self.plant_id}")
        print(f"初始场景: {self.scenario.value} ({self._get_scenario_desc(self.scenario)})")
        print(f"上报间隔: {self.interval} 秒")
        print("="*60)
        
        self.running = True
        self.stats["start_time"] = datetime.now()
        
        # 启动数据上报线程
        self.report_thread = threading.Thread(target=self._report_loop, daemon=True)
        self.report_thread.start()
        
        # 运行命令行交互（主线程）
        self._command_loop()
    
    def stop(self):
        """停止模拟器"""
        self.running = False
        print("\n🛑 模拟器已停止")
        self.print_status()


def main():
    parser = argparse.ArgumentParser(
        description="虚拟设备模拟器 V2 - 支持交互式命令行和场景模拟",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 自动配对并启动交互模式
  python virtual_device_v2.py
  
  # 指定场景模式
  python virtual_device_v2.py --scenario drought
  
  # 手动模式（不自动配对）
  python virtual_device_v2.py --no-auto-pair --device-id DEV_001 --plant-id PLANT_001
  
  # 修改上报间隔
  python virtual_device_v2.py --interval 30
        """
    )
    parser.add_argument("--device-id", help="设备ID（可选，自动绑定时会生成）")
    parser.add_argument("--server-url", default="http://localhost:3000", help="服务器URL")
    parser.add_argument("--plant-id", help="植物ID（可选，不指定则自动创建）")
    parser.add_argument("--interval", type=int, default=60, help="上报间隔（秒）")
    parser.add_argument("--scenario", default="normal", 
                        choices=[s.value for s in DeviceScenario],
                        help="场景模式")
    parser.add_argument("--no-auto-pair", action="store_true", 
                        help="禁用自动配对（需手动指定设备ID和植物ID）")
    
    args = parser.parse_args()
    
    # 自动配对模式：设备ID可选
    if not args.no_auto_pair and not args.device_id:
        args.device_id = f"VIRTUAL_{random.randint(10000000, 99999999)}"
    
    if not args.device_id:
        parser.error("请指定 --device-id 或移除 --no-auto-pair")
    
    # 解析场景
    scenario = DeviceScenario(args.scenario)
    
    device = VirtualDeviceV2(
        device_id=args.device_id,
        server_url=args.server_url,
        plant_id=args.plant_id,
        interval=args.interval,
        auto_pair=not args.no_auto_pair,
        scenario=scenario
    )
    
    try:
        device.run()
    except KeyboardInterrupt:
        device.stop()


if __name__ == "__main__":
    main()
