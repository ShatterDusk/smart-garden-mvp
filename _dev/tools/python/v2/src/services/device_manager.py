"""设备管理器"""
import asyncio
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Callable

from ..core.errors import DeviceNotFoundError, DeviceAlreadyRunningError, DeviceNotRunningError
from ..models.device import Device, DeviceStatus, DeviceMode
from .data_generator import DataGenerator
from .event_queue import Timeline, EventType
from .data_history import DataHistoryManager


class DeviceInstance:
    """设备实例 - 包含状态、数据生成器和时间线"""

    def __init__(self, device: Device):
        self.device = device
        self.data_generator: Optional[DataGenerator] = None
        self.current_data: Optional[dict] = None
        self._data_callback: Optional[Callable] = None
        self.timeline: Optional[Timeline] = None
    
    def set_data_callback(self, callback: Callable):
        """设置数据回调"""
        self._data_callback = callback
    
    async def start_data_generation(self):
        """启动数据生成"""
        if self.data_generator is None:
            self.data_generator = DataGenerator(
                device_id=self.device.device_id,
                config={'interval_ms': 5000}
            )

            # 设置数据回调
            async def on_data(data):
                self.current_data = data.to_api_format()

                # 记录到历史数据
                history_manager = DataHistoryManager.get_instance()
                current_scenario = None
                if self.data_generator:
                    scenario = self.data_generator.get_current_scenario()
                    if scenario:
                        current_scenario = scenario.scenario_id

                await history_manager.record_data(
                    device_id=self.device.device_id,
                    timestamp=datetime.utcnow(),
                    metrics=self.data_generator.get_current_metrics() if self.data_generator else {},
                    scenario_id=current_scenario
                )

                if self._data_callback:
                    await self._data_callback(self.device.device_id, self.current_data)

            self.data_generator.set_callback(on_data)

        # 初始化时间线
        if self.timeline is None:
            self.timeline = Timeline()
            # 注册场景切换事件执行器
            self.timeline.event_queue.register_executor(
                EventType.SCENARIO_CHANGE,
                self._execute_scenario_change
            )
            await self.timeline.start()

        await self.data_generator.start()

    def _execute_scenario_change(self, parameters: dict):
        """执行场景切换事件"""
        scenario_id = parameters.get("scenario_id")
        transition_time_ms = parameters.get("transition_time_ms", 5000)
        if self.data_generator and scenario_id:
            # 创建异步任务来切换场景
            asyncio.create_task(
                self.data_generator.switch_scenario(scenario_id, transition_time_ms)
            )
        return {"scenario_id": scenario_id, "transition_time_ms": transition_time_ms}
    
    async def stop_data_generation(self):
        """停止数据生成"""
        if self.data_generator:
            await self.data_generator.stop()
        if self.timeline:
            await self.timeline.stop()
    
    def get_current_metrics(self) -> Optional[dict]:
        """获取当前指标"""
        if self.data_generator:
            return self.data_generator.get_current_metrics()
        return None


class DeviceManager:
    """设备管理器 - 单例模式"""

    _instance: Optional["DeviceManager"] = None

    def __init__(self):
        self._devices: Dict[str, DeviceInstance] = {}
        self._lock = asyncio.Lock()
        self._data_callbacks: List[Callable] = []

    @classmethod
    def get_instance(cls) -> "DeviceManager":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def on_data_generated(self, callback: Callable):
        """注册数据生成回调"""
        self._data_callbacks.append(callback)
    
    async def _notify_data(self, device_id: str, data: dict):
        """通知数据更新"""
        for callback in self._data_callbacks:
            try:
                await callback(device_id, data)
            except Exception as e:
                print(f"Data callback error: {e}")

    async def create_device(self, name: str = "Virtual Device", mode: DeviceMode = DeviceMode.MANUAL) -> Device:
        async with self._lock:
            device_id = f"vd_{uuid.uuid4().hex[:8]}"
            device = Device(
                device_id=device_id,
                name=name,
                mode=mode,
            )
            instance = DeviceInstance(device)
            instance.set_data_callback(self._notify_data)
            self._devices[device_id] = instance
            return device

    async def get_device(self, device_id: str) -> Optional[Device]:
        instance = self._devices.get(device_id)
        return instance.device if instance else None
    
    async def get_device_instance(self, device_id: str) -> Optional[DeviceInstance]:
        return self._devices.get(device_id)

    async def list_devices(self) -> List[Device]:
        return [instance.device for instance in self._devices.values()]

    async def start_device(self, device_id: str) -> Device:
        async with self._lock:
            instance = self._devices.get(device_id)
            if not instance:
                raise DeviceNotFoundError(f"设备 {device_id} 不存在")
            if instance.device.status == DeviceStatus.RUNNING:
                raise DeviceAlreadyRunningError(f"设备 {device_id} 已在运行")
            
            # 启动数据生成
            await instance.start_data_generation()
            
            instance.device.status = DeviceStatus.RUNNING
            instance.device.updated_at = datetime.utcnow()
            return instance.device

    async def stop_device(self, device_id: str) -> Device:
        async with self._lock:
            instance = self._devices.get(device_id)
            if not instance:
                raise DeviceNotFoundError(f"设备 {device_id} 不存在")
            if instance.device.status != DeviceStatus.RUNNING:
                raise DeviceNotRunningError(f"设备 {device_id} 未在运行")
            
            # 停止数据生成
            await instance.stop_data_generation()
            
            instance.device.status = DeviceStatus.STOPPED
            instance.device.updated_at = datetime.utcnow()
            return instance.device

    async def remove_device(self, device_id: str) -> bool:
        async with self._lock:
            instance = self._devices.get(device_id)
            if instance:
                # 如果运行中，先停止
                if instance.device.status == DeviceStatus.RUNNING:
                    await instance.stop_data_generation()
                del self._devices[device_id]

                # 清理历史数据
                history_manager = DataHistoryManager.get_instance()
                history_manager.remove_device(device_id)

                return True
            return False

    async def get_stats(self) -> dict:
        total = len(self._devices)
        running = sum(1 for i in self._devices.values() if i.device.status == DeviceStatus.RUNNING)
        stopped = total - running
        
        return {
            "total": total,
            "running": running,
            "stopped": stopped,
        }
    
    async def get_device_data(self, device_id: str) -> Optional[dict]:
        """获取设备当前数据"""
        instance = self._devices.get(device_id)
        if instance:
            return instance.current_data
        return None
