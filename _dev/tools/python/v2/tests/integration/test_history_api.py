"""历史数据API集成测试"""
import pytest
import asyncio
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport

from src.main import app
from src.services.device_manager import DeviceManager


@pytest.fixture
async def client():
    """创建测试客户端"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture(autouse=True)
async def cleanup():
    """清理设备管理器"""
    yield
    # 清理所有设备
    manager = DeviceManager.get_instance()
    devices = await manager.list_devices()
    for device in devices:
        await manager.remove_device(device.device_id)


class TestHistoryAPI:
    """历史数据API集成测试"""

    async def test_get_history_no_data(self, client):
        """测试获取无历史数据的设备"""
        # 创建设备（不启动）
        response = await client.post("/api/v1/devices", json={"name": "测试设备"})
        device_id = response.json()["data"]["device_id"]

        # 获取历史数据
        response = await client.get(f"/api/v1/devices/{device_id}/history")
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert data["data"] == []

    async def test_get_history_with_data(self, client):
        """测试获取有历史数据的设备"""
        # 创建设备并启动
        response = await client.post("/api/v1/devices", json={"name": "测试设备"})
        device_id = response.json()["data"]["device_id"]
        await client.post(f"/api/v1/devices/{device_id}/start")

        # 等待生成一些数据
        await asyncio.sleep(2)

        # 获取历史数据
        response = await client.get(f"/api/v1/devices/{device_id}/history")
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert len(data["data"]) > 0

        # 验证数据点结构
        point = data["data"][0]
        assert "timestamp" in point
        assert "temperature" in point
        assert "humidity" in point
        assert "light" in point
        assert "soil_moisture" in point

        # 清理
        await client.post(f"/api/v1/devices/{device_id}/stop")

    async def test_get_history_with_count(self, client):
        """测试获取指定数量的历史数据"""
        # 创建设备并启动
        response = await client.post("/api/v1/devices", json={"name": "测试设备"})
        device_id = response.json()["data"]["device_id"]
        await client.post(f"/api/v1/devices/{device_id}/start")

        # 等待生成一些数据
        await asyncio.sleep(3)

        # 获取指定数量的数据
        response = await client.get(f"/api/v1/devices/{device_id}/history?count=5")
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert len(data["data"]) <= 5

        # 清理
        await client.post(f"/api/v1/devices/{device_id}/stop")

    async def test_get_history_stats(self, client):
        """测试获取历史数据统计"""
        # 创建设备并启动
        response = await client.post("/api/v1/devices", json={"name": "测试设备"})
        device_id = response.json()["data"]["device_id"]
        await client.post(f"/api/v1/devices/{device_id}/start")

        # 等待生成一些数据
        await asyncio.sleep(2)

        # 获取统计数据
        response = await client.get(f"/api/v1/devices/{device_id}/history/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0

        # 验证统计结构
        stats = data["data"]
        assert "temperature" in stats
        assert "humidity" in stats
        assert "light" in stats
        assert "soil_moisture" in stats

        # 验证统计字段
        temp_stats = stats["temperature"]
        assert "min" in temp_stats
        assert "max" in temp_stats
        assert "avg" in temp_stats
        assert "count" in temp_stats

        # 清理
        await client.post(f"/api/v1/devices/{device_id}/stop")

    async def test_clear_history(self, client):
        """测试清空历史数据"""
        # 创建设备并启动
        response = await client.post("/api/v1/devices", json={"name": "测试设备"})
        device_id = response.json()["data"]["device_id"]
        await client.post(f"/api/v1/devices/{device_id}/start")

        # 等待生成一些数据
        await asyncio.sleep(2)

        # 清空历史数据
        response = await client.post(f"/api/v1/devices/{device_id}/history/clear")
        assert response.status_code == 200
        assert response.json()["code"] == 0

        # 验证数据已清空
        response = await client.get(f"/api/v1/devices/{device_id}/history")
        assert response.json()["data"] == []

        # 清理
        await client.post(f"/api/v1/devices/{device_id}/stop")

    async def test_export_history(self, client):
        """测试导出历史数据"""
        # 创建设备并启动
        response = await client.post("/api/v1/devices", json={"name": "测试设备"})
        device_id = response.json()["data"]["device_id"]
        await client.post(f"/api/v1/devices/{device_id}/start")

        # 等待生成一些数据
        await asyncio.sleep(2)

        # 导出数据
        import tempfile
        import os

        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "test_export.json")
            response = await client.post(
                f"/api/v1/devices/{device_id}/history/export",
                json={"filepath": filepath}
            )
            assert response.status_code == 200
            assert response.json()["code"] == 0

            # 验证文件已创建
            assert os.path.exists(filepath)

        # 清理
        await client.post(f"/api/v1/devices/{device_id}/stop")

    async def test_get_history_with_time_range(self, client):
        """测试按时间范围获取历史数据"""
        # 创建设备并启动
        response = await client.post("/api/v1/devices", json={"name": "测试设备"})
        device_id = response.json()["data"]["device_id"]
        await client.post(f"/api/v1/devices/{device_id}/start")

        # 等待生成一些数据
        await asyncio.sleep(2)

        # 获取最近1分钟的数据
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(minutes=1)

        response = await client.get(
            f"/api/v1/devices/{device_id}/history",
            params={
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert len(data["data"]) > 0

        # 清理
        await client.post(f"/api/v1/devices/{device_id}/stop")

    async def test_history_deleted_with_device(self, client):
        """测试删除设备时历史数据也被清理"""
        # 创建设备并启动
        response = await client.post("/api/v1/devices", json={"name": "测试设备"})
        device_id = response.json()["data"]["device_id"]
        await client.post(f"/api/v1/devices/{device_id}/start")

        # 等待生成一些数据
        await asyncio.sleep(2)

        # 停止设备
        await client.post(f"/api/v1/devices/{device_id}/stop")

        # 删除设备
        await client.delete(f"/api/v1/devices/{device_id}")

        # 验证历史数据也被删除
        response = await client.get(f"/api/v1/devices/{device_id}/history")
        assert response.json()["data"] == []
