"""设备管理器"""
import asyncio
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from ..core.errors import DeviceNotFoundError, DeviceAlreadyRunningError, DeviceNotRunningError
from ..models.device import Device, DeviceStatus, DeviceMode


class DeviceManager:
    """设备管理器 - 单例模式"""

    _instance: Optional["DeviceManager"] = None

    def __init__(self):
        self._devices: Dict[str, Device] = {}
        self._lock = asyncio.Lock()

    @classmethod
    def get_instance(cls) -> "DeviceManager":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def create_device(self, name: str = "Virtual Device", mode: DeviceMode = DeviceMode.MANUAL) -> Device:
        async with self._lock:
            device_id = f"vd_{uuid.uuid4().hex[:8]}"
            device = Device(
                device_id=device_id,
                name=name,
                mode=mode,
            )
            self._devices[device_id] = device
            return device

    async def get_device(self, device_id: str) -> Optional[Device]:
        return self._devices.get(device_id)

    async def list_devices(self) -> List[Device]:
        return list(self._devices.values())

    async def start_device(self, device_id: str) -> Device:
        async with self._lock:
            device = self._devices.get(device_id)
            if not device:
                raise DeviceNotFoundError(f"设备 {device_id} 不存在")
            if device.status == DeviceStatus.RUNNING:
                raise DeviceAlreadyRunningError(f"设备 {device_id} 已在运行")
            
            device.status = DeviceStatus.RUNNING
            device.updated_at = datetime.utcnow()
            return device

    async def stop_device(self, device_id: str) -> Device:
        async with self._lock:
            device = self._devices.get(device_id)
            if not device:
                raise DeviceNotFoundError(f"设备 {device_id} 不存在")
            if device.status != DeviceStatus.RUNNING:
                raise DeviceNotRunningError(f"设备 {device_id} 未在运行")
            
            device.status = DeviceStatus.STOPPED
            device.updated_at = datetime.utcnow()
            return device

    async def remove_device(self, device_id: str) -> bool:
        async with self._lock:
            if device_id in self._devices:
                del self._devices[device_id]
                return True
            return False

    async def get_stats(self) -> dict:
        total = len(self._devices)
        running = sum(1 for d in self._devices.values() if d.status == DeviceStatus.RUNNING)
        stopped = total - running
        
        return {
            "total": total,
            "running": running,
            "stopped": stopped,
        }
