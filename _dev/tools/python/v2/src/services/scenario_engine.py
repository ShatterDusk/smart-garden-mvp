"""场景引擎 - 场景约束和数据过渡"""
from dataclasses import dataclass, field
from typing import Dict, Optional, List, Callable
from datetime import datetime
from enum import Enum
import asyncio


class ScenarioCategory(str, Enum):
    """场景分类"""
    NORMAL = "normal"
    EXTREME = "extreme"
    FAULT = "fault"
    CUSTOM = "custom"


@dataclass
class MetricConstraint:
    """指标约束"""
    min_value: float
    max_value: float
    target_value: Optional[float] = None
    variance: float = 0.0
    change_rate: float = float('inf')


@dataclass
class Scenario:
    """场景定义"""
    scenario_id: str
    name: str
    description: str = ""
    category: ScenarioCategory = ScenarioCategory.NORMAL
    constraints: Dict[str, MetricConstraint] = field(default_factory=dict)
    transition_time_ms: int = 5000
    icon: str = "🌱"
    color: str = "#4CAF50"
    is_builtin: bool = True


# 内置场景定义
BUILTIN_SCENARIOS = {
    "normal": Scenario(
        scenario_id="normal",
        name="正常环境",
        description="植物生长的理想环境条件",
        category=ScenarioCategory.NORMAL,
        constraints={
            "temperature": MetricConstraint(18.0, 28.0, target_value=23.0, variance=2.0),
            "humidity": MetricConstraint(40.0, 70.0, target_value=55.0, variance=5.0),
            "light": MetricConstraint(5000.0, 50000.0, variance=5000.0),
            "soil_moisture": MetricConstraint(40.0, 70.0, target_value=55.0, variance=5.0),
        },
        icon="🌱",
        color="#4CAF50",
    ),
    
    "high_temperature": Scenario(
        scenario_id="high_temperature",
        name="高温环境",
        description="夏季高温或温室过热场景",
        category=ScenarioCategory.EXTREME,
        constraints={
            "temperature": MetricConstraint(35.0, 45.0, target_value=40.0, variance=3.0),
            "humidity": MetricConstraint(30.0, 50.0, target_value=40.0, variance=5.0),
            "light": MetricConstraint(30000.0, 80000.0, variance=10000.0),
            "soil_moisture": MetricConstraint(20.0, 50.0, target_value=35.0, variance=8.0),
        },
        icon="🔥",
        color="#FF5722",
    ),
    
    "low_temperature": Scenario(
        scenario_id="low_temperature",
        name="低温环境",
        description="冬季低温或冷藏环境",
        category=ScenarioCategory.EXTREME,
        constraints={
            "temperature": MetricConstraint(5.0, 15.0, target_value=10.0, variance=3.0),
            "humidity": MetricConstraint(50.0, 80.0, target_value=65.0, variance=5.0),
            "light": MetricConstraint(1000.0, 20000.0, variance=3000.0),
            "soil_moisture": MetricConstraint(50.0, 80.0, target_value=65.0, variance=5.0),
        },
        icon="❄️",
        color="#2196F3",
    ),
    
    "high_humidity": Scenario(
        scenario_id="high_humidity",
        name="高湿环境",
        description="雨季或浇水过多场景",
        category=ScenarioCategory.EXTREME,
        constraints={
            "temperature": MetricConstraint(20.0, 30.0, target_value=25.0, variance=2.0),
            "humidity": MetricConstraint(80.0, 100.0, target_value=90.0, variance=5.0),
            "light": MetricConstraint(2000.0, 30000.0, variance=5000.0),
            "soil_moisture": MetricConstraint(70.0, 100.0, target_value=85.0, variance=5.0),
        },
        icon="💧",
        color="#00BCD4",
    ),
    
    "dry": Scenario(
        scenario_id="dry",
        name="干燥环境",
        description="干旱或长期未浇水场景",
        category=ScenarioCategory.EXTREME,
        constraints={
            "temperature": MetricConstraint(22.0, 35.0, target_value=28.0, variance=3.0),
            "humidity": MetricConstraint(10.0, 30.0, target_value=20.0, variance=5.0),
            "light": MetricConstraint(10000.0, 60000.0, variance=8000.0),
            "soil_moisture": MetricConstraint(5.0, 25.0, target_value=15.0, variance=5.0),
        },
        icon="🏜️",
        color="#FF9800",
    ),
    
    "strong_light": Scenario(
        scenario_id="strong_light",
        name="强光环境",
        description="直射阳光或补光灯过强",
        category=ScenarioCategory.EXTREME,
        constraints={
            "temperature": MetricConstraint(25.0, 40.0, target_value=32.0, variance=4.0),
            "humidity": MetricConstraint(30.0, 60.0, target_value=45.0, variance=8.0),
            "light": MetricConstraint(60000.0, 100000.0, target_value=80000.0, variance=10000.0),
            "soil_moisture": MetricConstraint(30.0, 60.0, target_value=45.0, variance=8.0),
        },
        icon="☀️",
        color="#FFC107",
    ),
    
    "weak_light": Scenario(
        scenario_id="weak_light",
        name="弱光环境",
        description="阴暗环境或遮光过度",
        category=ScenarioCategory.EXTREME,
        constraints={
            "temperature": MetricConstraint(15.0, 25.0, target_value=20.0, variance=2.0),
            "humidity": MetricConstraint(50.0, 80.0, target_value=65.0, variance=8.0),
            "light": MetricConstraint(0.0, 5000.0, target_value=2000.0, variance=1000.0),
            "soil_moisture": MetricConstraint(50.0, 80.0, target_value=65.0, variance=5.0),
        },
        icon="🌑",
        color="#9E9E9E",
    ),
}


class EasingFunction:
    """缓动函数"""
    
    @staticmethod
    def linear(t: float) -> float:
        return t
    
    @staticmethod
    def ease_in_out(t: float) -> float:
        return t * t * (3 - 2 * t)
    
    @staticmethod
    def ease_out(t: float) -> float:
        import math
        return 1 - math.pow(1 - t, 3)


class ConstraintApplier:
    """约束应用器"""
    
    def __init__(self):
        self._constraints: Dict[str, MetricConstraint] = {}
    
    def set_constraints(self, constraints: Dict[str, MetricConstraint]):
        self._constraints = constraints
    
    def apply(self, metric_name: str, natural_value: float) -> float:
        constraint = self._constraints.get(metric_name)
        if not constraint:
            return natural_value
        
        value = natural_value
        
        # 应用目标值牵引
        if constraint.target_value is not None:
            target = constraint.target_value
            pull_strength = 0.3
            value = value * (1 - pull_strength) + target * pull_strength
        
        # 应用范围限制
        value = max(constraint.min_value, min(constraint.max_value, value))
        
        return value


class TransitionManager:
    """过渡管理器"""
    
    EASING_FUNCTIONS = {
        "linear": EasingFunction.linear,
        "ease_in_out": EasingFunction.ease_in_out,
        "ease_out": EasingFunction.ease_out,
    }
    
    def __init__(self):
        self._transitioning = False
        self._progress = 0.0
        self._from_constraints: Dict[str, MetricConstraint] = {}
        self._to_constraints: Dict[str, MetricConstraint] = {}
        self._duration_ms = 5000
        self._easing = "ease_in_out"
    
    async def start_transition(
        self,
        from_scenario: Optional[Scenario],
        to_scenario: Scenario,
        duration_ms: int = 5000,
        easing: str = "ease_in_out"
    ):
        """开始场景过渡"""
        self._transitioning = True
        self._progress = 0.0
        self._from_constraints = from_scenario.constraints if from_scenario else {}
        self._to_constraints = to_scenario.constraints
        self._duration_ms = duration_ms
        self._easing = easing
    
    def update_progress(self, elapsed_ms: float) -> Optional[float]:
        """更新过渡进度"""
        if not self._transitioning:
            return None
        
        self._progress = min(1.0, elapsed_ms / self._duration_ms)
        
        if self._progress >= 1.0:
            self._transitioning = False
            return None
        
        # 应用缓动函数
        easing_func = self.EASING_FUNCTIONS.get(self._easing, EasingFunction.ease_in_out)
        return easing_func(self._progress)
    
    def interpolate_constraints(self, metric_name: str, progress: float) -> Optional[MetricConstraint]:
        """插值计算过渡中的约束"""
        from_c = self._from_constraints.get(metric_name)
        to_c = self._to_constraints.get(metric_name)
        
        if not to_c:
            return from_c
        if not from_c:
            return to_c
        
        return MetricConstraint(
            min_value=self._lerp(from_c.min_value, to_c.min_value, progress),
            max_value=self._lerp(from_c.max_value, to_c.max_value, progress),
            target_value=self._lerp_optional(from_c.target_value, to_c.target_value, progress),
            variance=self._lerp(from_c.variance, to_c.variance, progress),
        )
    
    @staticmethod
    def _lerp(a: float, b: float, t: float) -> float:
        return a + (b - a) * t
    
    @staticmethod
    def _lerp_optional(a: Optional[float], b: Optional[float], t: float) -> Optional[float]:
        if a is None and b is None:
            return None
        if a is None:
            return b
        if b is None:
            return a
        return a + (b - a) * t
    
    def is_transitioning(self) -> bool:
        return self._transitioning
    
    def get_progress(self) -> float:
        return self._progress


class ScenarioEngine:
    """场景引擎"""

    def __init__(self):
        self._scenarios: Dict[str, Scenario] = dict(BUILTIN_SCENARIOS)
        # 默认使用 normal 场景
        self._current_scenario: Optional[Scenario] = self._scenarios.get("normal")
        self._constraint_applier = ConstraintApplier()
        self._transition_manager = TransitionManager()
        self._on_scenario_change: Optional[Callable] = None
    
    def get_scenario(self, scenario_id: str) -> Optional[Scenario]:
        return self._scenarios.get(scenario_id)
    
    def list_scenarios(self) -> List[Scenario]:
        return list(self._scenarios.values())
    
    async def switch_scenario(
        self,
        scenario_id: str,
        transition_time_ms: int = 5000,
        easing: str = "ease_in_out"
    ) -> bool:
        """切换场景"""
        new_scenario = self._scenarios.get(scenario_id)
        if not new_scenario:
            return False
        
        # 开始过渡
        await self._transition_manager.start_transition(
            self._current_scenario,
            new_scenario,
            transition_time_ms,
            easing
        )
        
        old_scenario = self._current_scenario
        self._current_scenario = new_scenario
        
        # 触发回调
        if self._on_scenario_change:
            await self._on_scenario_change(
                old_scenario.scenario_id if old_scenario else None,
                scenario_id
            )
        
        return True
    
    def apply_constraints(self, metrics: Dict[str, float]) -> Dict[str, float]:
        """应用场景约束到指标"""
        # 获取当前约束
        if self._transition_manager.is_transitioning():
            # 过渡中 - 使用插值约束
            progress = self._transition_manager.get_progress()
            constraints = {}
            for metric in metrics.keys():
                constraint = self._transition_manager.interpolate_constraints(metric, progress)
                if constraint:
                    constraints[metric] = constraint
        else:
            # 稳定状态
            if self._current_scenario:
                constraints = self._current_scenario.constraints
            else:
                return metrics
        
        # 应用约束
        self._constraint_applier.set_constraints(constraints)
        result = {}
        for metric_name, value in metrics.items():
            result[metric_name] = self._constraint_applier.apply(metric_name, value)
        
        return result
    
    def get_current_scenario(self) -> Optional[Scenario]:
        return self._current_scenario
    
    def is_transitioning(self) -> bool:
        return self._transition_manager.is_transitioning()
    
    def get_transition_progress(self) -> float:
        return self._transition_manager.get_progress()
    
    def on_scenario_change(self, callback: Callable):
        self._on_scenario_change = callback
