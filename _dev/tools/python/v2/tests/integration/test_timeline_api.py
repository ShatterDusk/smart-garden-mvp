"""时间线API集成测试"""
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


class TestTimelineAPI:
    """时间线API集成测试"""

    async def test_get_timeline_status_not_running(self, client):
        """测试获取未启动设备的时间线状态"""
        # 创建设备
        response = await client.post("/api/v1/devices", json={"name": "测试设备"})
        device_id = response.json()["data"]["device_id"]

        # 获取时间线状态（未启动）
        response = await client.get(f"/api/v1/devices/{device_id}/timeline")
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert data["data"] is None  # 时间线未初始化

    async def test_get_timeline_status_running(self, client):
        """测试获取运行中设备的时间线状态"""
        # 创建设备并启动
        response = await client.post("/api/v1/devices", json={"name": "测试设备"})
        device_id = response.json()["data"]["device_id"]
        await client.post(f"/api/v1/devices/{device_id}/start")

        # 获取时间线状态
        response = await client.get(f"/api/v1/devices/{device_id}/timeline")
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert data["data"] is not None
        assert "virtual_time" in data["data"]
        assert "event_queue" in data["data"]

        # 清理
        await client.post(f"/api/v1/devices/{device_id}/stop")

    async def test_list_event_templates(self, client):
        """测试获取事件模板列表"""
        response = await client.get("/api/v1/timeline/templates")
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert len(data["data"]) == 7  # 7个内置模板

        # 验证模板结构
        template = data["data"][0]
        assert "template_id" in template
        assert "name" in template
        assert "event_type" in template
        assert "icon" in template

    async def test_add_event_from_template(self, client):
        """测试从模板添加事件"""
        # 创建设备并启动
        response = await client.post("/api/v1/devices", json={"name": "测试设备"})
        device_id = response.json()["data"]["device_id"]
        await client.post(f"/api/v1/devices/{device_id}/start")

        # 从模板添加事件
        response = await client.post(
            f"/api/v1/devices/{device_id}/timeline/events/from-template",
            json={
                "template_id": "scenario_hot",
                "delay_seconds": 10,
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert data["data"]["event_type"] == "scenario_change"
        assert data["data"]["parameters"]["scenario_id"] == "high_temperature"

        # 清理
        await client.post(f"/api/v1/devices/{device_id}/stop")

    async def test_add_custom_event(self, client):
        """测试添加自定义事件"""
        # 创建设备并启动
        response = await client.post("/api/v1/devices", json={"name": "测试设备"})
        device_id = response.json()["data"]["device_id"]
        await client.post(f"/api/v1/devices/{device_id}/start")

        # 添加自定义事件
        scheduled_time = (datetime.utcnow() + timedelta(seconds=30)).isoformat()
        response = await client.post(
            f"/api/v1/devices/{device_id}/timeline/events",
            json={
                "event_type": "custom",
                "scheduled_time": scheduled_time,
                "parameters": {"key": "value"},
                "description": "测试事件",
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert data["data"]["description"] == "测试事件"
        assert data["data"]["parameters"]["key"] == "value"

        # 清理
        await client.post(f"/api/v1/devices/{device_id}/stop")

    async def test_list_pending_events(self, client):
        """测试获取待执行事件列表"""
        # 创建设备并启动
        response = await client.post("/api/v1/devices", json={"name": "测试设备"})
        device_id = response.json()["data"]["device_id"]
        await client.post(f"/api/v1/devices/{device_id}/start")

        # 添加多个事件
        for i in range(3):
            await client.post(
                f"/api/v1/devices/{device_id}/timeline/events/from-template",
                json={
                    "template_id": "scenario_hot",
                    "delay_seconds": 10 + i * 5,
                }
            )

        # 获取待执行事件
        response = await client.get(
            f"/api/v1/devices/{device_id}/timeline/events?status=pending"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert len(data["data"]) == 3

        # 清理
        await client.post(f"/api/v1/devices/{device_id}/stop")

    async def test_cancel_event(self, client):
        """测试取消事件"""
        # 创建设备并启动
        response = await client.post("/api/v1/devices", json={"name": "测试设备"})
        device_id = response.json()["data"]["device_id"]
        await client.post(f"/api/v1/devices/{device_id}/start")

        # 添加事件
        response = await client.post(
            f"/api/v1/devices/{device_id}/timeline/events/from-template",
            json={"template_id": "scenario_hot", "delay_seconds": 60}
        )
        event_id = response.json()["data"]["event_id"]

        # 取消事件
        response = await client.delete(
            f"/api/v1/devices/{device_id}/timeline/events/{event_id}"
        )
        assert response.status_code == 200
        assert response.json()["code"] == 0

        # 验证事件已取消
        response = await client.get(
            f"/api/v1/devices/{device_id}/timeline/events?status=pending"
        )
        events = response.json()["data"]
        assert len(events) == 0

        # 清理
        await client.post(f"/api/v1/devices/{device_id}/stop")

    async def test_time_scale_control(self, client):
        """测试时间缩放控制"""
        # 创建设备并启动
        response = await client.post("/api/v1/devices", json={"name": "测试设备"})
        device_id = response.json()["data"]["device_id"]
        await client.post(f"/api/v1/devices/{device_id}/start")

        # 设置时间缩放
        response = await client.post(
            f"/api/v1/devices/{device_id}/timeline/time/scale",
            json={"scale": 10.0}
        )
        assert response.status_code == 200
        assert response.json()["code"] == 0

        # 暂停时间
        response = await client.post(
            f"/api/v1/devices/{device_id}/timeline/time/pause"
        )
        assert response.status_code == 200
        assert response.json()["code"] == 0

        # 恢复时间
        response = await client.post(
            f"/api/v1/devices/{device_id}/timeline/time/resume"
        )
        assert response.status_code == 200
        assert response.json()["code"] == 0

        # 清理
        await client.post(f"/api/v1/devices/{device_id}/stop")

    async def test_invalid_template(self, client):
        """测试无效的模板ID"""
        # 创建设备并启动
        response = await client.post("/api/v1/devices", json={"name": "测试设备"})
        device_id = response.json()["data"]["device_id"]
        await client.post(f"/api/v1/devices/{device_id}/start")

        # 使用无效模板
        response = await client.post(
            f"/api/v1/devices/{device_id}/timeline/events/from-template",
            json={"template_id": "invalid_template"}
        )
        assert response.status_code == 400

        # 清理
        await client.post(f"/api/v1/devices/{device_id}/stop")

    async def test_timeline_not_initialized(self, client):
        """测试时间线未初始化时的错误处理"""
        # 创建设备（不启动）
        response = await client.post("/api/v1/devices", json={"name": "测试设备"})
        device_id = response.json()["data"]["device_id"]

        # 尝试添加事件
        response = await client.post(
            f"/api/v1/devices/{device_id}/timeline/events/from-template",
            json={"template_id": "scenario_hot"}
        )
        assert response.status_code == 400
        assert "时间线未初始化" in response.json()["detail"]
