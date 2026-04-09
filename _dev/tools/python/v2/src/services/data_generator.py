"""数据生成器服务"""
import uuid
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any

from ..models.sensor_data import (
    SensorData, TemperatureReading, HumidityReading,
    LightReading, SoilMoistureReading
)
from .natural_simulation import NaturalSimulationEngine
from .scenario_engine import ScenarioEngine


class DataGenerator:
    """数据生成器 - 协调自然模拟和场景约束"""

    def __init__(self, device_id: str, config: Optional[dict] = None):
        self.device_id = device_id
        self.config = config or {}

        # 初始化自然模拟引擎
        self._simulation = NaturalSimulationEngine(config)

        # 初始化场景引擎
        self._scenario_engine = ScenarioEngine()

        # 采样配置
        self._interval_ms = self.config.get('interval_ms', 5000)
        self._jitter_ms = self.config.get('jitter_ms', 100)

        # 运行状态
        self._running = False
        self._task: Optional[asyncio.Task] = None

        # 回调函数
        self._on_data_generated: Optional[callable] = None

        # 场景过渡任务
        self._transition_task: Optional[asyncio.Task] = None

    def set_callback(self, callback: callable):
        """设置数据生成回调"""
        self._on_data_generated = callback

    async def start(self):
        """启动数据生成"""
        if self._running:
            return

        self._running = True
        self._task = asyncio.create_task(self._generate_loop())

    async def stop(self):
        """停止数据生成"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

        if self._transition_task:
            self._transition_task.cancel()
            try:
                await self._transition_task
            except asyncio.CancelledError:
                pass
            self._transition_task = None

    async def _generate_loop(self):
        """数据生成循环"""
        import random

        while self._running:
            try:
                # 生成数据
                data = self.generate()

                # 调用回调
                if self._on_data_generated:
                    await self._on_data_generated(data)

                # 等待下一次采样
                jitter = self._jitter_ms if self._jitter_ms > 0 else 0
                wait_time = (self._interval_ms + random.randint(-jitter, jitter)) / 1000.0
                await asyncio.sleep(wait_time)

            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Data generation error: {e}")
                await asyncio.sleep(1)

    def generate(self) -> SensorData:
        """生成一次传感器数据"""
        # 执行自然模拟
        simulated = self._simulation.simulate()

        # 应用场景约束
        constrained = self._scenario_engine.apply_constraints(simulated)

        # 构建传感器数据
        return SensorData(
            data_id=f"data_{uuid.uuid4().hex[:8]}",
            device_id=self.device_id,
            timestamp=datetime.utcnow(),
            temperature=TemperatureReading(value=constrained['temperature']),
            humidity=HumidityReading(value=constrained['humidity']),
            light=LightReading(value=constrained['light']),
            soil_moisture=SoilMoistureReading(value=constrained['soil_moisture']),
            battery_level=85.0,
            signal_strength=-65,
        )

    def get_current_metrics(self) -> Dict[str, float]:
        """获取当前指标值"""
        simulated = self._simulation.simulate()
        return self._scenario_engine.apply_constraints(simulated)

    async def switch_scenario(self, scenario_id: str, transition_time_ms: int = 5000):
        """切换场景"""
        success = await self._scenario_engine.switch_scenario(scenario_id, transition_time_ms)

        if success and transition_time_ms > 0:
            # 启动过渡动画任务
            if self._transition_task:
                self._transition_task.cancel()

            self._transition_task = asyncio.create_task(
                self._run_transition(transition_time_ms)
            )

        return success

    async def _run_transition(self, duration_ms: int):
        """运行场景过渡"""
        import time

        start_time = time.time() * 1000

        while self._scenario_engine.is_transitioning():
            elapsed = time.time() * 1000 - start_time
            self._scenario_engine._transition_manager.update_progress(elapsed)

            if elapsed >= duration_ms:
                break

            await asyncio.sleep(0.1)  # 100ms 更新一次

    def get_current_scenario(self) -> Optional[Any]:
        """获取当前场景"""
        return self._scenario_engine.get_current_scenario()

    def is_transitioning(self) -> bool:
        """是否正在场景过渡"""
        return self._scenario_engine.is_transitioning()

    def get_transition_progress(self) -> float:
        """获取过渡进度"""
        return self._scenario_engine.get_transition_progress()

    def list_scenarios(self) -> list:
        """列出所有场景"""
        return self._scenario_engine.list_scenarios()

    def update_config(self, **kwargs):
        """更新配置"""
        for key, value in kwargs.items():
            if hasattr(self, f'_{key}'):
                setattr(self, f'_{key}', value)

    def reset(self):
        """重置生成器"""
        self._simulation.reset()
