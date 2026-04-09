"""自然模拟算法 - 模拟真实环境数据变化"""
import math
import random
from datetime import datetime
from typing import Dict, Optional
from dataclasses import dataclass


@dataclass
class EnvironmentContext:
    """环境上下文"""
    timestamp: datetime
    base_temp: float = 22.0
    season_offset: float = 0.0
    is_raining: bool = False


class TemperatureSimulator:
    """温度模拟器 - 基于日周期正弦曲线"""
    
    def __init__(
        self,
        base_temp: float = 22.0,
        daily_range: float = 8.0,
        lag_hours: float = 2.0,
        noise_factor: float = 0.3
    ):
        self.base_temp = base_temp
        self.daily_range = daily_range
        self.lag_hours = lag_hours
        self.noise_factor = noise_factor
        self._last_value: Optional[float] = None
    
    def calculate(self, dt: datetime, context: EnvironmentContext) -> float:
        """计算温度值"""
        hour = dt.hour + dt.minute / 60.0
        
        # 日周期变化 (正弦曲线)
        day_progress = (hour - 6 - self.lag_hours) / 24.0
        daily_variation = math.sin(2 * math.pi * day_progress) * (self.daily_range / 2)
        
        # 基础温度 + 日变化 + 季节偏移
        temp = self.base_temp + daily_variation + context.season_offset
        
        # 添加随机噪声
        noise = random.uniform(-1.0, 1.0) * self.noise_factor
        temp += noise
        
        # 变化率限制 (防止突变)
        if self._last_value is not None:
            max_change = 2.0  # 最大变化2度
            temp = max(
                self._last_value - max_change,
                min(self._last_value + max_change, temp)
            )
        
        self._last_value = temp
        return round(max(-40.0, min(60.0, temp)), 2)


class HumiditySimulator:
    """湿度模拟器 - 与温度负相关"""
    
    def __init__(
        self,
        base_humidity: float = 60.0,
        daily_range: float = 20.0,
        temp_correlation: float = -0.7,
        noise_factor: float = 2.0
    ):
        self.base_humidity = base_humidity
        self.daily_range = daily_range
        self.temp_correlation = temp_correlation
        self.noise_factor = noise_factor
    
    def calculate(
        self,
        dt: datetime,
        current_temp: float,
        context: EnvironmentContext
    ) -> float:
        """计算湿度值"""
        hour = dt.hour + dt.minute / 60.0
        
        # 基础湿度
        humidity = self.base_humidity
        
        # 日周期变化 (与温度反相)
        daily_variation = -math.sin(2 * math.pi * (hour - 6) / 24) * (self.daily_range / 2)
        humidity += daily_variation
        
        # 温度相关性调整
        temp_deviation = current_temp - context.base_temp
        humidity += temp_deviation * self.temp_correlation * 2
        
        # 降水影响
        if context.is_raining:
            humidity = min(95, humidity + 15)
        
        # 夜间湿度较高
        if hour < 6 or hour > 20:
            humidity += 5
        
        # 添加噪声
        noise = random.gauss(0, 1) * self.noise_factor
        humidity += noise
        
        return round(max(10.0, min(100.0, humidity)), 2)


class LightSimulator:
    """光照模拟器 - 基于太阳高度角"""
    
    def __init__(
        self,
        max_light: float = 50000.0,
        sunrise_hour: float = 6.0,
        sunset_hour: float = 18.0,
        twilight_duration: float = 0.5
    ):
        self.max_light = max_light
        self.sunrise_hour = sunrise_hour
        self.sunset_hour = sunset_hour
        self.twilight_duration = twilight_duration
    
    def calculate(self, dt: datetime, context: EnvironmentContext) -> float:
        """计算光照强度"""
        hour = dt.hour + dt.minute / 60.0
        
        # 夜间
        if hour < self.sunrise_hour - self.twilight_duration or \
           hour > self.sunset_hour + self.twilight_duration:
            return 0.0
        
        # 晨昏时段
        if hour < self.sunrise_hour:
            progress = (hour - (self.sunrise_hour - self.twilight_duration)) / self.twilight_duration
            return round(self.max_light * 0.1 * progress, 2)
        
        if hour > self.sunset_hour:
            progress = (self.sunset_hour + self.twilight_duration - hour) / self.twilight_duration
            return round(self.max_light * 0.1 * progress, 2)
        
        # 白天 - 正弦曲线
        day_progress = (hour - self.sunrise_hour) / (self.sunset_hour - self.sunrise_hour)
        light = self.max_light * math.sin(math.pi * day_progress)
        
        # 添加云层噪声
        noise = random.uniform(-1.0, 1.0) * self.max_light * 0.05
        light += noise
        
        return round(max(0.0, light), 2)


class SoilMoistureSimulator:
    """土壤湿度模拟器 - 水分平衡模型"""
    
    def __init__(
        self,
        initial_moisture: float = 50.0,
        evaporation_rate: float = 0.5,
        drainage_rate: float = 0.3
    ):
        self.current_moisture = initial_moisture
        self.evaporation_rate = evaporation_rate
        self.drainage_rate = drainage_rate
        self._last_update: Optional[datetime] = None
    
    def calculate(self, dt: datetime, context: EnvironmentContext) -> float:
        """计算土壤湿度"""
        if self._last_update is None:
            self._last_update = dt
            return round(self.current_moisture, 2)
        
        # 计算时间差(小时)
        hours_passed = (dt - self._last_update).total_seconds() / 3600.0
        
        # 蒸发损失
        evaporation = self.evaporation_rate * hours_passed
        self.current_moisture -= evaporation
        
        # 排水 (超过田间持水量时)
        if self.current_moisture > 60:
            excess = self.current_moisture - 60
            drainage = min(excess, self.drainage_rate * hours_passed)
            self.current_moisture -= drainage
        
        # 降水补充
        if context.is_raining:
            self.current_moisture = min(100, self.current_moisture + 2)
        
        self._last_update = dt
        
        # 添加微小噪声
        noise = random.gauss(0, 0.5)
        
        return round(max(0.0, min(100.0, self.current_moisture + noise)), 2)
    
    def irrigate(self, amount: float = 20.0):
        """模拟灌溉"""
        self.current_moisture = min(100.0, self.current_moisture + amount)


class NaturalSimulationEngine:
    """自然模拟引擎 - 协调所有模拟器"""
    
    def __init__(self, config: Optional[dict] = None):
        self.config = config or {}
        
        # 初始化各模拟器
        self.temp_simulator = TemperatureSimulator(**self.config.get('temperature', {}))
        self.humidity_simulator = HumiditySimulator(**self.config.get('humidity', {}))
        self.light_simulator = LightSimulator(**self.config.get('light', {}))
        self.soil_simulator = SoilMoistureSimulator(**self.config.get('soil', {}))
        
        self._context = EnvironmentContext(timestamp=datetime.utcnow())
    
    def simulate(self, dt: Optional[datetime] = None) -> Dict[str, float]:
        """执行自然模拟"""
        timestamp = dt or datetime.utcnow()
        
        # 更新上下文
        self._context.timestamp = timestamp
        
        # 计算各指标
        temperature = self.temp_simulator.calculate(timestamp, self._context)
        humidity = self.humidity_simulator.calculate(timestamp, temperature, self._context)
        light = self.light_simulator.calculate(timestamp, self._context)
        soil_moisture = self.soil_simulator.calculate(timestamp, self._context)
        
        return {
            'temperature': temperature,
            'humidity': humidity,
            'light': light,
            'soil_moisture': soil_moisture,
        }
    
    def set_context(self, **kwargs):
        """设置环境上下文"""
        for key, value in kwargs.items():
            if hasattr(self._context, key):
                setattr(self._context, key, value)
    
    def reset(self):
        """重置所有模拟器"""
        self.temp_simulator._last_value = None
        self.soil_simulator._last_update = None
        self._context = EnvironmentContext(timestamp=datetime.utcnow())
