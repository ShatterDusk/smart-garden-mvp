#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据生成器
生成符合场景的传感器数据
"""

import random
from typing import Dict, Tuple, Optional
from datetime import datetime

from constants import SENSOR_METRICS, SCENARIO_RANGES, BATTERY_DRAIN_RATE


class DataGenerator:
    """传感器数据生成器"""
    
    def __init__(self, scenario: str = 'normal'):
        self.scenario = scenario
        self.current_values: Dict[str, float] = {}
        self._initialize_values()
    
    def _initialize_values(self):
        """初始化所有指标的当前值"""
        ranges = SCENARIO_RANGES.get(self.scenario, SCENARIO_RANGES['normal'])
        
        for metric_code in SENSOR_METRICS.keys():
            if metric_code == 'battery_level':
                self.current_values[metric_code] = 100.0
            elif metric_code in ranges:
                min_val, max_val = ranges[metric_code]
                self.current_values[metric_code] = random.uniform(min_val, max_val)
            else:
                metric_info = SENSOR_METRICS.get(metric_code, {})
                min_val = metric_info.get('min', 0)
                max_val = metric_info.get('max', 100)
                self.current_values[metric_code] = random.uniform(min_val, max_val)
    
    def generate(self, scenario: Optional[str] = None) -> Dict[str, float]:
        """生成传感器数据"""
        current_scenario = scenario or self.scenario
        ranges = SCENARIO_RANGES.get(current_scenario, SCENARIO_RANGES['normal'])
        
        metrics = {}
        
        for metric_code in SENSOR_METRICS.keys():
            if metric_code == 'battery_level':
                metrics[metric_code] = self._generate_battery()
            else:
                metrics[metric_code] = self._generate_metric(
                    metric_code,
                    current_scenario,
                    ranges
                )
        
        return metrics
    
    def _generate_metric(
        self,
        metric_code: str,
        scenario: str,
        ranges: Dict[str, Tuple[float, float]]
    ) -> float:
        """生成单个指标值"""
        current = self.current_values.get(metric_code, 0)
        
        if metric_code not in ranges:
            return current
        
        min_val, max_val = ranges[metric_code]
        
        if metric_code == 'pressure':
            change = random.uniform(-1, 1)
            new_value = current + change
        elif metric_code == 'soil_ph':
            change = random.uniform(-0.01, 0.01)
            new_value = current + change
        elif metric_code == 'light_intensity' and scenario == 'night':
            new_value = random.uniform(0, 50)
        elif metric_code == 'soil_moisture':
            if scenario == 'watering':
                change_percent = random.uniform(0.02, 0.08)
                new_value = current * (1 + change_percent)
            elif scenario == 'drought':
                change_percent = random.uniform(-0.05, -0.01)
                new_value = current * (1 + change_percent)
            else:
                change_percent = random.uniform(-0.03, 0.03)
                new_value = current * (1 + change_percent)
        else:
            change_percent = random.uniform(-0.03, 0.03)
            new_value = current * (1 + change_percent)
        
        new_value = max(min_val, min(max_val, new_value))
        self.current_values[metric_code] = new_value
        
        return round(new_value, 2)
    
    def _generate_battery(self) -> int:
        """生成电池电量"""
        current = self.current_values.get('battery_level', 100.0)
        new_value = max(0, current - random.uniform(0, BATTERY_DRAIN_RATE))
        self.current_values['battery_level'] = new_value
        return int(new_value)
    
    def set_scenario(self, scenario: str):
        """设置场景"""
        self.scenario = scenario
    
    def smooth_transition(self, target_ranges: Dict[str, Tuple[float, float]], progress: float):
        """平滑过渡到新范围"""
        for metric_code, (target_min, target_max) in target_ranges.items():
            if metric_code not in self.current_values:
                continue
            
            current = self.current_values[metric_code]
            current_min = current
            current_max = current
            
            blended_min = current_min + (target_min - current_min) * progress
            blended_max = current_max + (target_max - current_max) * progress
            
            if current < blended_min:
                self.current_values[metric_code] = blended_min
            elif current > blended_max:
                self.current_values[metric_code] = blended_max
    
    def get_current_values(self) -> Dict[str, float]:
        """获取当前值"""
        return self.current_values.copy()
    
    def set_current_values(self, values: Dict[str, float]):
        """设置当前值"""
        self.current_values.update(values)
    
    def reset_battery(self):
        """重置电池电量"""
        self.current_values['battery_level'] = 100.0
    
    def smooth_transition(self, target_ranges: Dict[str, Tuple[float, float]], progress: float):
        """平滑过渡到新范围"""
        for metric_code, (target_min, target_max) in target_ranges.items():
            if metric_code not in self.current_values:
                continue
            
            current = self.current_values[metric_code]
            current_min = current
            current_max = current
            
            blended_min = current_min + (target_min - current_min) * progress
            blended_max = current_max + (target_max - current_max) * progress
            
            if current < blended_min:
                self.current_values[metric_code] = blended_min
            elif current > blended_max:
                self.current_values[metric_code] = blended_max
    
    def get_current_values(self) -> Dict[str, float]:
        """获取当前值"""
        return self.current_values.copy()
    
    def set_current_values(self, values: Dict[str, float]):
        """设置当前值"""
        self.current_values.update(values)
    
    def reset_battery(self):
        """重置电池电量"""
        self.current_values['battery_level'] = 100.0
