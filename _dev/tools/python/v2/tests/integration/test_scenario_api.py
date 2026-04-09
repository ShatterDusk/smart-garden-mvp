"""场景系统集成测试"""
import pytest
import asyncio
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


class TestScenarioAPI:
    """场景API集成测试"""

    async def test_list_scenarios(self, client):
        """测试获取场景列表"""
        response = await client.get("/api/v1/scenarios")
        assert response.status_code == 200

        data = response.json()
        assert data["code"] == 0
        assert len(data["data"]) == 7  # 7个内置场景

        # 验证场景结构
        scenario = data["data"][0]
        assert "scenario_id" in scenario
        assert "name" in scenario
        assert "description" in scenario
        assert "constraints" in scenario

    async def test_get_device_scenario_before_start(self, client):
        """测试获取设备场景（启动前）"""
        # 创建设备
        response = await client.post("/api/v1/devices", json={"name": "测试设备"})
        device_id = response.json()["data"]["device_id"]

        # 获取场景
        response = await client.get(f"/api/v1/devices/{device_id}/scenario")
        assert response.status_code == 400  # 数据生成器未初始化

    async def test_switch_scenario_before_start(self, client):
        """测试切换场景（启动前）"""
        # 创建设备
        response = await client.post("/api/v1/devices", json={"name": "测试设备"})
        device_id = response.json()["data"]["device_id"]

        # 切换场景
        response = await client.post(
            f"/api/v1/devices/{device_id}/scenario",
            json={"scenario_id": "high_temperature", "transition_time_ms": 1000}
        )
        assert response.status_code == 400  # 数据生成器未初始化

    async def test_scenario_workflow(self, client):
        """测试完整场景工作流程"""
        # 1. 创建设备
        response = await client.post("/api/v1/devices", json={"name": "场景测试设备"})
        assert response.status_code == 201
        device_id = response.json()["data"]["device_id"]

        # 2. 启动设备
        response = await client.post(f"/api/v1/devices/{device_id}/start")
        assert response.status_code == 200

        # 3. 获取初始场景（应该是 normal）
        response = await client.get(f"/api/v1/devices/{device_id}/scenario")
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert data["data"]["scenario_id"] == "normal"

        # 4. 切换到高温场景
        response = await client.post(
            f"/api/v1/devices/{device_id}/scenario",
            json={"scenario_id": "high_temperature", "transition_time_ms": 500}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert data["data"]["scenario_id"] == "high_temperature"

        # 5. 等待过渡完成
        await asyncio.sleep(0.6)

        # 6. 验证场景已切换
        response = await client.get(f"/api/v1/devices/{device_id}/scenario")
        data = response.json()
        assert data["data"]["scenario_id"] == "high_temperature"
        assert data["data"]["is_transitioning"] == False

        # 7. 切换到另一个场景
        response = await client.post(
            f"/api/v1/devices/{device_id}/scenario",
            json={"scenario_id": "dry", "transition_time_ms": 500}
        )
        assert response.status_code == 200

        # 8. 停止设备
        response = await client.post(f"/api/v1/devices/{device_id}/stop")
        assert response.status_code == 200

    async def test_switch_to_invalid_scenario(self, client):
        """测试切换到无效场景"""
        # 创建设备并启动
        response = await client.post("/api/v1/devices", json={"name": "测试设备"})
        device_id = response.json()["data"]["device_id"]
        await client.post(f"/api/v1/devices/{device_id}/start")

        # 切换到无效场景
        response = await client.post(
            f"/api/v1/devices/{device_id}/scenario",
            json={"scenario_id": "invalid_scenario"}
        )
        assert response.status_code == 400

        # 清理
        await client.post(f"/api/v1/devices/{device_id}/stop")

    async def test_scenario_constraints(self, client):
        """测试场景约束生效"""
        # 创建设备并启动
        response = await client.post("/api/v1/devices", json={"name": "约束测试设备"})
        device_id = response.json()["data"]["device_id"]
        await client.post(f"/api/v1/devices/{device_id}/start")

        # 切换到高温场景
        await client.post(
            f"/api/v1/devices/{device_id}/scenario",
            json={"scenario_id": "high_temperature", "transition_time_ms": 100}
        )
        await asyncio.sleep(0.2)

        # 获取设备详情（包含场景信息）
        response = await client.get(f"/api/v1/devices/{device_id}")
        data = response.json()

        # 验证场景信息存在
        assert "scenario" in data["data"]
        assert data["data"]["scenario"]["scenario_id"] == "high_temperature"

        # 清理
        await client.post(f"/api/v1/devices/{device_id}/stop")

    async def test_get_nonexistent_device_scenario(self, client):
        """测试获取不存在的设备场景"""
        response = await client.get("/api/v1/devices/nonexistent/scenario")
        assert response.status_code == 404

    async def test_switch_nonexistent_device_scenario(self, client):
        """测试切换不存在的设备场景"""
        response = await client.post(
            "/api/v1/devices/nonexistent/scenario",
            json={"scenario_id": "normal"}
        )
        assert response.status_code == 404
