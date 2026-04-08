"""设备管理器单元测试"""
import pytest
from src.services.device_manager import DeviceManager
from src.models.device import DeviceStatus, DeviceMode


class TestDeviceManager:
    
    @pytest.mark.asyncio
    async def test_create_device(self):
        manager = DeviceManager.get_instance()
        device = await manager.create_device(name="Test Device")
        
        assert device is not None
        assert device.name == "Test Device"
        assert device.status == DeviceStatus.IDLE
        
        await manager.remove_device(device.device_id)
    
    @pytest.mark.asyncio
    async def test_start_stop_device(self):
        manager = DeviceManager.get_instance()
        device = await manager.create_device()
        
        started = await manager.start_device(device.device_id)
        assert started.status == DeviceStatus.RUNNING
        
        stopped = await manager.stop_device(device.device_id)
        assert stopped.status == DeviceStatus.STOPPED
        
        await manager.remove_device(device.device_id)
    
    @pytest.mark.asyncio
    async def test_list_devices(self):
        manager = DeviceManager.get_instance()
        
        d1 = await manager.create_device(name="Device 1")
        d2 = await manager.create_device(name="Device 2")
        
        devices = await manager.list_devices()
        assert len(devices) >= 2
        
        await manager.remove_device(d1.device_id)
        await manager.remove_device(d2.device_id)
    
    @pytest.mark.asyncio
    async def test_get_stats(self):
        manager = DeviceManager.get_instance()
        
        d1 = await manager.create_device()
        await manager.start_device(d1.device_id)
        
        stats = await manager.get_stats()
        assert stats["running"] >= 1
        assert stats["total"] >= 1
        
        await manager.stop_device(d1.device_id)
        await manager.remove_device(d1.device_id)
