#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
场景控制器
管理场景切换和过渡动画
"""

from typing import Dict, Tuple, Optional
from constants import SCENARIO_RANGES, SCENARIO_NAMES, SCENARIO_TRANSITION_STEPS


class ScenarioController:
    """场景控制器"""
    
    def __init__(self, initial_scenario: str = 'normal'):
        self.current_scenario = initial_scenario
        self.target_scenario: Optional[str] = None
        self.transition_progress = 0
        self.transition_steps = SCENARIO_TRANSITION_STEPS
        self.current_step = 0
        self._in_transition = False
    
    def get_current_scenario(self) -> str:
        """获取当前场景"""
        return self.current_scenario
    
    def get_scenario_name(self, scenario: Optional[str] = None) -> str:
        """获取场景名称"""
        key = scenario or self.current_scenario
        return SCENARIO_NAMES.get(key, key)
    
    def get_ranges(self, scenario: Optional[str] = None) -> Dict[str, Tuple[float, float]]:
        """获取场景数据范围"""
        key = scenario or self.current_scenario
        return SCENARIO_RANGES.get(key, SCENARIO_RANGES['normal']).copy()
    
    def switch_scenario(self, new_scenario: str, smooth: bool = True) -> bool:
        """切换场景"""
        if new_scenario not in SCENARIO_RANGES:
            return False
        
        if new_scenario == self.current_scenario:
            return True
        
        if smooth:
            self.target_scenario = new_scenario
            self.transition_progress = 0
            self.current_step = 0
            self._in_transition = True
        else:
            self.current_scenario = new_scenario
            self.target_scenario = None
            self._in_transition = False
        
        return True
    
    def update_transition(self) -> Optional[Dict[str, Tuple[float, float]]]:
        """更新过渡进度，返回当前混合范围"""
        if not self._in_transition or not self.target_scenario:
            return None
        
        self.current_step += 1
        self.transition_progress = self.current_step / self.transition_steps
        
        if self.current_step >= self.transition_steps:
            self.current_scenario = self.target_scenario
            self.target_scenario = None
            self._in_transition = False
            return None
        
        current_ranges = SCENARIO_RANGES[self.current_scenario]
        target_ranges = SCENARIO_RANGES[self.target_scenario]
        
        blended_ranges = {}
        for metric_code in current_ranges.keys():
            if metric_code in target_ranges:
                current_min, current_max = current_ranges[metric_code]
                target_min, target_max = target_ranges[metric_code]
                
                blended_min = current_min + (target_min - current_min) * self.transition_progress
                blended_max = current_max + (target_max - current_max) * self.transition_progress
                
                blended_ranges[metric_code] = (blended_min, blended_max)
        
        return blended_ranges
    
    def is_transitioning(self) -> bool:
        """是否正在过渡"""
        return self._in_transition
    
    def get_transition_progress(self) -> float:
        """获取过渡进度"""
        return self.transition_progress
    
    def get_target_scenario(self) -> Optional[str]:
        """获取目标场景"""
        return self.target_scenario
    
    def cancel_transition(self):
        """取消过渡"""
        self.target_scenario = None
        self._in_transition = False
        self.transition_progress = 0
        self.current_step = 0
    
    @staticmethod
    def list_scenarios() -> Dict[str, str]:
        """列出所有场景"""
        return SCENARIO_NAMES.copy()
    
    @staticmethod
    def is_valid_scenario(scenario: str) -> bool:
        """检查场景是否有效"""
        return scenario in SCENARIO_RANGES
