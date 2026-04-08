"""测试配置"""
import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))


@pytest.fixture
def app():
    from src.main import app
    return app


@pytest.fixture
def client(app):
    from httpx import AsyncClient, ASGITransport
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://testserver")


@pytest.fixture
def device_manager():
    from src.services.device_manager import DeviceManager
    manager = DeviceManager.get_instance()
    
    yield manager
    
    for device_id in list(manager._devices.keys()):
        del manager._devices[device_id]
