#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自然现象模拟引擎
模拟真实植物养护环境中的各种自然现象
"""

import math
import random
from datetime import datetime, timedelta
from typing import Dict, Tuple, Optional
from dataclasses import dataclass


@dataclass
class SimulationState:
    """模拟状态"""
    temperature: float = 25.0
    humidity: float = 60.0
    light_intensity: float = 10000.0
    soil_moisture: float = 50.0
    soil_temperature: float = 22.0
    pressure: float = 1013.0
    soil_ph: float = 6.5
    battery_level: float = 100.0
    
    # 内部状态
    last_water_time: Optional[datetime] = None
    cloud_cover: float = 0.0  # 0-1，云层遮挡程度
    wind_speed: float = 2.0  # m/s


class NaturalSimulationEngine:
    """自然现象模拟引擎"""
    
    def __init__(self, base_temperature: float = 25.0, base_humidity: float = 60.0):
        self.state = SimulationState()
        self.base_temperature = base_temperature
        self.base_humidity = base_humidity
        self.start_time = datetime.now()
        
        # 模拟参数
        self.day_length = 24 * 3600  # 一天秒数
        self.sunrise_hour = 6
        self.sunset_hour = 18
        
    def get_time_of_day(self) -> float:
        """获取当前时间（小时，0-24）"""
        now = datetime.now()
        return now.hour + now.minute / 60 + now.second / 3600
    
    def get_day_progress(self) -> float:
        """获取一天中的进度（0-1）"""
        return self.get_time_of_day() / 24
    
    def simulate_temperature(self) -> float:
        """
        模拟温度变化
        - 昼夜节律：白天高、夜间低
        - 随机波动：±2°C
        - 趋势项：长期缓慢变化
        """
        time_of_day = self.get_time_of_day()
        
        # 昼夜节律（正弦波）
        # 峰值在14:00，谷值在02:00
        hour_angle = 2 * math.pi * (time_of_day - 8) / 24
        diurnal_variation = 8 * math.sin(hour_angle)  # ±8°C变化
        
        # 随机波动（布朗运动）
        random_walk = random.gauss(0, 0.3)
        
        # 趋势项（缓慢漂移）
        elapsed_hours = (datetime.now() - self.start_time).total_seconds() / 3600
        trend = 2 * math.sin(2 * math.pi * elapsed_hours / 168)  # 周周期
        
        new_temp = self.base_temperature + diurnal_variation + random_walk + trend
        
        # 平滑过渡
        self.state.temperature = 0.9 * self.state.temperature + 0.1 * new_temp
        
        return self.state.temperature
    
    def simulate_humidity(self) -> float:
        """
        模拟湿度变化
        - 与温度负相关
        - 晨露效应：清晨湿度高
        - 随机波动
        """
        time_of_day = self.get_time_of_day()
        
        # 基础湿度（与温度负相关）
        temp_factor = -0.5 * (self.state.temperature - self.base_temperature)
        
        # 晨露效应（清晨5-8点湿度高）
        if 5 <= time_of_day <= 8:
            dew_effect = 15 * math.exp(-((time_of_day - 6.5) ** 2) / 2)
        else:
            dew_effect = 0
        
        # 随机波动
        random_walk = random.gauss(0, 1)
        
        new_humidity = self.base_humidity + temp_factor + dew_effect + random_walk
        new_humidity = max(10, min(100, new_humidity))  # 限制在10-100%
        
        # 平滑过渡
        self.state.humidity = 0.95 * self.state.humidity + 0.05 * new_humidity
        
        return self.state.humidity
    
    def simulate_light(self) -> float:
        """
        模拟光照变化
        - 日出日落抛物线
        - 云层随机遮挡
        - 季节变化
        """
        time_of_day = self.get_time_of_day()
        
        # 日出日落（抛物线）
        if self.sunrise_hour <= time_of_day <= self.sunset_hour:
            # 归一化到 -1 到 1
            t = 2 * (time_of_day - self.sunrise_hour) / (self.sunset_hour - self.sunrise_hour) - 1
            base_light = 50000 * (1 - t ** 2)  # 抛物线
        else:
            base_light = 0
        
        # 云层遮挡（随机脉冲）
        if random.random() < 0.05:  # 5%概率触发云层
            self.state.cloud_cover = random.uniform(0.3, 0.9)
        elif random.random() < 0.1:  # 10%概率云层消散
            self.state.cloud_cover *= 0.9
        
        cloud_effect = 1 - self.state.cloud_cover
        
        # 随机波动
        noise = random.gauss(1, 0.05)
        
        new_light = base_light * cloud_effect * noise
        new_light = max(0, new_light)
        
        # 平滑过渡
        self.state.light_intensity = 0.8 * self.state.light_intensity + 0.2 * new_light
        
        return self.state.light_intensity
    
    def simulate_soil_moisture(self, watering: bool = False) -> float:
        """
        模拟土壤湿度
        - 浇水后快速上升
        - 自然蒸发（与温度、光照相关）
        - 植物吸水
        """
        if watering:
            # 浇水：快速上升到80-95%
            self.state.soil_moisture = random.uniform(80, 95)
            self.state.last_water_time = datetime.now()
            return self.state.soil_moisture
        
        # 蒸发速率（与温度、光照、湿度相关）
        evaporation_rate = (
            0.02 * (self.state.temperature - 20) +  # 温度影响
            0.0001 * self.state.light_intensity +    # 光照影响
            -0.01 * (self.state.humidity - 50)       # 湿度影响（负相关）
        )
        evaporation_rate = max(0, evaporation_rate)
        
        # 植物吸水（与温度相关，温度高时吸水多）
        plant_uptake = 0.01 * max(0, self.state.temperature - 15)
        
        # 总减少量
        decrease = evaporation_rate + plant_uptake
        
        new_moisture = self.state.soil_moisture - decrease
        new_moisture = max(5, min(100, new_moisture))
        
        self.state.soil_moisture = new_moisture
        
        return self.state.soil_moisture
    
    def simulate_soil_temperature(self) -> float:
        """
        模拟土壤温度
        - 滞后于气温（延迟2-3小时）
        - 变化幅度小于气温
        """
        # 土壤温度滞后于气温
        target_temp = self.state.temperature - 2  # 略低于气温
        
        # 缓慢趋近目标温度
        self.state.soil_temperature = (
            0.98 * self.state.soil_temperature + 
            0.02 * target_temp
        )
        
        return self.state.soil_temperature
    
    def simulate_pressure(self) -> float:
        """
        模拟气压
        - 缓慢变化
        - 与天气系统相关（随机游走）
        """
        # 随机游走
        random_walk = random.gauss(0, 0.5)
        
        # 回归均值
        mean_reversion = 0.001 * (1013 - self.state.pressure)
        
        new_pressure = self.state.pressure + random_walk + mean_reversion
        new_pressure = max(980, min(1040, new_pressure))
        
        self.state.pressure = new_pressure
        
        return self.state.pressure
    
    def simulate_soil_ph(self) -> float:
        """
        模拟土壤pH
        - 变化非常缓慢
        - 浇水可能略微改变pH
        """
        # 极缓慢的随机游走
        random_walk = random.gauss(0, 0.01)
        
        # 回归均值
        mean_reversion = 0.0001 * (6.5 - self.state.soil_ph)
        
        new_ph = self.state.soil_ph + random_walk + mean_reversion
        new_ph = max(4.0, min(9.0, new_ph))
        
        self.state.soil_ph = new_ph
        
        return self.state.soil_ph
    
    def simulate_battery(self, reporting: bool = False) -> float:
        """
        模拟电池消耗
        - 基础待机消耗
        - 上报时额外消耗
        - 温度影响容量
        """
        # 基础消耗（每小时0.01%）
        base_drain = 0.01 / 3600  # 每秒
        
        # 上报消耗
        if reporting:
            report_drain = 0.5
        else:
            report_drain = 0
        
        # 温度影响（低温时容量下降）
        temp_factor = 1.0
        if self.state.temperature < 10:
            temp_factor = 0.7 + 0.03 * self.state.temperature
        
        total_drain = (base_drain + report_drain) / temp_factor
        
        self.state.battery_level = max(0, self.state.battery_level - total_drain)
        
        return self.state.battery_level
    
    def simulate_all(self, watering: bool = False, reporting: bool = False) -> Dict[str, float]:
        """
        模拟所有指标
        
        Args:
            watering: 是否正在浇水
            reporting: 是否正在上报
            
        Returns:
            所有传感器数据的字典
        """
        return {
            'temperature': self.simulate_temperature(),
            'humidity': self.simulate_humidity(),
            'light_intensity': self.simulate_light(),
            'soil_moisture': self.simulate_soil_moisture(watering),
            'soil_temperature': self.simulate_soil_temperature(),
            'pressure': self.simulate_pressure(),
            'soil_ph': self.simulate_soil_ph(),
            'battery_level': self.simulate_battery(reporting),
        }
    
    def get_simulation_info(self) -> Dict:
        """获取当前模拟状态信息"""
        return {
            'time_of_day': self.get_time_of_day(),
            'day_progress': self.get_day_progress(),
            'cloud_cover': self.state.cloud_cover,
            'last_water_time': self.state.last_water_time.isoformat() if self.state.last_water_time else None,
        }


# 场景配置（基于自然模拟）
NATURAL_SCENARIOS = {
    'normal': {
        'description': '正常环境',
        'base_temp': 25,
        'base_humidity': 60,
        'temp_variation': 8,
    },
    'drought': {
        'description': '干旱模式',
        'base_temp': 35,
        'base_humidity': 20,
        'temp_variation': 12,
        'soil_dry_factor': 3.0,  # 蒸发加速
    },
    'high_temp': {
        'description': '高温模式',
        'base_temp': 40,
        'base_humidity': 30,
        'temp_variation': 5,
    },
    'low_temp': {
        'description': '低温模式',
        'base_temp': 5,
        'base_humidity': 40,
        'temp_variation': 3,
    },
    'rainy': {
        'description': '雨天模式',
        'base_temp': 20,
        'base_humidity': 90,
        'temp_variation': 4,
        'cloud_cover': 0.9,
    },
}


if __name__ == '__main__':
    # 测试模拟引擎
    engine = NaturalSimulationEngine()
    
    print("自然现象模拟引擎测试")
    print("=" * 60)
    
    # 模拟24小时
    for hour in range(0, 24, 2):
        # 手动设置时间（仅用于测试）
        engine.start_time = datetime.now() - timedelta(hours=hour)
        
        data = engine.simulate_all()
        info = engine.get_simulation_info()
        
        print(f"\n时间: {hour:02d}:00")
        print(f"  温度: {data['temperature']:.1f}°C")
        print(f"  湿度: {data['humidity']:.1f}%")
        print(f"  光照: {data['light_intensity']:.0f} lux")
        print(f"  土壤湿度: {data['soil_moisture']:.1f}%")
        print(f"  云层遮挡: {info['cloud_cover']:.1%}")
