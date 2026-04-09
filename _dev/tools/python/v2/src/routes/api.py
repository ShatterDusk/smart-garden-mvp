"""REST API 路由"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime

from ..services.device_manager import DeviceManager
from ..models.device import (
    Device,
    DeviceCreateRequest,
    DeviceMode,
)

router = APIRouter(prefix="/api/v1", tags=["设备管理"])


@router.get("/devices", response_model=List[dict])
async def list_devices():
    manager = DeviceManager.get_instance()
    devices = await manager.list_devices()
    return [d.to_summary() for d in devices]


@router.post("/devices", response_model=dict, status_code=201)
async def create_device(request: DeviceCreateRequest):
    manager = DeviceManager.get_instance()
    device = await manager.create_device(name=request.name, mode=request.mode)
    return {
        "code": 0,
        "message": "success",
        "data": device.to_summary(),
    }


@router.get("/devices/{device_id}")
async def get_device(device_id: str):
    manager = DeviceManager.get_instance()
    device = await manager.get_device(device_id)

    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")

    # 获取场景信息
    instance = await manager.get_device_instance(device_id)
    scenario_info = None
    if instance and instance.data_generator:
        scenario = instance.data_generator.get_current_scenario()
        if scenario:
            scenario_info = {
                "scenario_id": scenario.scenario_id,
                "name": scenario.name,
                "icon": scenario.icon,
                "color": scenario.color,
            }

    stats = await manager.get_stats()
    return {
        "code": 0,
        "message": "success",
        "data": {
            **device.to_summary(),
            "stats": stats,
            "scenario": scenario_info,
            "is_transitioning": instance.data_generator.is_transitioning() if instance and instance.data_generator else False,
            "transition_progress": instance.data_generator.get_transition_progress() if instance and instance.data_generator else 0,
        },
    }


@router.post("/devices/{device_id}/start")
async def start_device(device_id: str):
    manager = DeviceManager.get_instance()
    try:
        device = await manager.start_device(device_id)
        return {"code": 0, "message": "设备已启动", "data": device.to_summary()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/devices/{device_id}/stop")
async def stop_device(device_id: str):
    manager = DeviceManager.get_instance()
    try:
        device = await manager.stop_device(device_id)
        return {"code": 0, "message": "设备已停止", "data": device.to_summary()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/devices/{device_id}")
async def delete_device(device_id: str):
    manager = DeviceManager.get_instance()
    success = await manager.remove_device(device_id)

    if not success:
        raise HTTPException(status_code=404, detail="设备不存在")

    return {"code": 0, "message": "设备已删除"}


# ============ 场景管理 API ============

@router.get("/scenarios")
async def list_scenarios():
    """获取所有可用场景"""
    from ..services.scenario_engine import BUILTIN_SCENARIOS

    scenarios = []
    for scenario in BUILTIN_SCENARIOS.values():
        scenarios.append({
            "scenario_id": scenario.scenario_id,
            "name": scenario.name,
            "description": scenario.description,
            "category": scenario.category.value,
            "icon": scenario.icon,
            "color": scenario.color,
            "constraints": {
                name: {
                    "min": c.min_value,
                    "max": c.max_value,
                    "target": c.target_value,
                }
                for name, c in scenario.constraints.items()
            },
        })

    return {
        "code": 0,
        "message": "success",
        "data": scenarios,
    }


@router.post("/devices/{device_id}/scenario")
async def switch_scenario(device_id: str, request: dict):
    """切换设备场景"""
    manager = DeviceManager.get_instance()

    # 获取设备实例
    instance = await manager.get_device_instance(device_id)
    if not instance:
        raise HTTPException(status_code=404, detail="设备不存在")

    if not instance.data_generator:
        raise HTTPException(status_code=400, detail="设备数据生成器未初始化")

    scenario_id = request.get("scenario_id")
    transition_time_ms = request.get("transition_time_ms", 5000)

    # 切换场景
    success = await instance.data_generator.switch_scenario(scenario_id, transition_time_ms)

    if not success:
        raise HTTPException(status_code=400, detail="场景切换失败")

    scenario = instance.data_generator.get_current_scenario()
    return {
        "code": 0,
        "message": "场景切换成功",
        "data": {
            "scenario_id": scenario.scenario_id,
            "name": scenario.name,
            "transition_time_ms": transition_time_ms,
        },
    }


@router.get("/devices/{device_id}/scenario")
async def get_current_scenario(device_id: str):
    """获取设备当前场景"""
    manager = DeviceManager.get_instance()

    instance = await manager.get_device_instance(device_id)
    if not instance:
        raise HTTPException(status_code=404, detail="设备不存在")

    if not instance.data_generator:
        raise HTTPException(status_code=400, detail="设备数据生成器未初始化")

    scenario = instance.data_generator.get_current_scenario()

    if not scenario:
        return {
            "code": 0,
            "message": "success",
            "data": None,
        }

    return {
        "code": 0,
        "message": "success",
        "data": {
            "scenario_id": scenario.scenario_id,
            "name": scenario.name,
            "description": scenario.description,
            "icon": scenario.icon,
            "color": scenario.color,
            "is_transitioning": instance.data_generator.is_transitioning(),
            "transition_progress": instance.data_generator.get_transition_progress(),
        },
    }


# ============ 时间线 API ============

@router.get("/devices/{device_id}/timeline")
async def get_timeline_status(device_id: str):
    """获取设备时间线状态"""
    manager = DeviceManager.get_instance()

    instance = await manager.get_device_instance(device_id)
    if not instance:
        raise HTTPException(status_code=404, detail="设备不存在")

    if not instance.timeline:
        return {
            "code": 0,
            "message": "success",
            "data": None,
        }

    return {
        "code": 0,
        "message": "success",
        "data": instance.timeline.get_status(),
    }


@router.get("/devices/{device_id}/timeline/events")
async def list_timeline_events(device_id: str, status: str = "pending"):
    """获取时间线事件列表

    status: pending, history, all
    """
    manager = DeviceManager.get_instance()

    instance = await manager.get_device_instance(device_id)
    if not instance:
        raise HTTPException(status_code=404, detail="设备不存在")

    if not instance.timeline:
        raise HTTPException(status_code=400, detail="时间线未初始化")

    queue = instance.timeline.event_queue

    if status == "pending":
        events = queue.list_pending_events()
    elif status == "history":
        events = queue.list_history()
    else:
        events = queue.list_pending_events() + queue.list_history()

    return {
        "code": 0,
        "message": "success",
        "data": [e.to_dict() for e in events],
    }


@router.post("/devices/{device_id}/timeline/events")
async def add_timeline_event(device_id: str, request: dict):
    """添加时间线事件"""
    manager = DeviceManager.get_instance()

    instance = await manager.get_device_instance(device_id)
    if not instance:
        raise HTTPException(status_code=404, detail="设备不存在")

    if not instance.timeline:
        raise HTTPException(status_code=400, detail="时间线未初始化")

    from ..services.event_queue import EventType

    event_type_str = request.get("event_type", "custom")
    event_type = EventType(event_type_str)

    # 解析计划时间
    from datetime import datetime
    scheduled_time_str = request.get("scheduled_time")
    if scheduled_time_str:
        scheduled_time = datetime.fromisoformat(scheduled_time_str)
    else:
        # 默认使用延迟
        delay_seconds = request.get("delay_seconds", 0)
        scheduled_time = instance.timeline.virtual_time.now() + __import__("datetime").timedelta(seconds=delay_seconds)

    event = instance.timeline.event_queue.add_event(
        event_type=event_type,
        scheduled_time=scheduled_time,
        parameters=request.get("parameters", {}),
        description=request.get("description", ""),
    )

    return {
        "code": 0,
        "message": "事件已添加",
        "data": event.to_dict(),
    }


@router.post("/devices/{device_id}/timeline/events/from-template")
async def add_event_from_template(device_id: str, request: dict):
    """从模板添加事件"""
    manager = DeviceManager.get_instance()

    instance = await manager.get_device_instance(device_id)
    if not instance:
        raise HTTPException(status_code=404, detail="设备不存在")

    if not instance.timeline:
        raise HTTPException(status_code=400, detail="时间线未初始化")

    template_id = request.get("template_id")
    delay_seconds = request.get("delay_seconds", 0)
    parameters_override = request.get("parameters_override")

    event = instance.timeline.event_queue.add_event_from_template(
        template_id=template_id,
        delay_seconds=delay_seconds,
        parameters_override=parameters_override,
    )

    if not event:
        raise HTTPException(status_code=400, detail="无效的模板ID")

    return {
        "code": 0,
        "message": "事件已添加",
        "data": event.to_dict(),
    }


@router.delete("/devices/{device_id}/timeline/events/{event_id}")
async def cancel_timeline_event(device_id: str, event_id: str):
    """取消时间线事件"""
    manager = DeviceManager.get_instance()

    instance = await manager.get_device_instance(device_id)
    if not instance:
        raise HTTPException(status_code=404, detail="设备不存在")

    if not instance.timeline:
        raise HTTPException(status_code=400, detail="时间线未初始化")

    success = instance.timeline.event_queue.cancel_event(event_id)

    if not success:
        raise HTTPException(status_code=400, detail="事件不存在或无法取消")

    return {"code": 0, "message": "事件已取消"}


@router.post("/devices/{device_id}/timeline/time/scale")
async def set_time_scale(device_id: str, request: dict):
    """设置时间缩放倍数"""
    manager = DeviceManager.get_instance()

    instance = await manager.get_device_instance(device_id)
    if not instance:
        raise HTTPException(status_code=404, detail="设备不存在")

    if not instance.timeline:
        raise HTTPException(status_code=400, detail="时间线未初始化")

    scale = request.get("scale", 1.0)
    instance.timeline.virtual_time.set_scale(scale)

    return {
        "code": 0,
        "message": "时间缩放已设置",
        "data": {"scale": scale},
    }


@router.post("/devices/{device_id}/timeline/time/pause")
async def pause_virtual_time(device_id: str):
    """暂停虚拟时间"""
    manager = DeviceManager.get_instance()

    instance = await manager.get_device_instance(device_id)
    if not instance:
        raise HTTPException(status_code=404, detail="设备不存在")

    if not instance.timeline:
        raise HTTPException(status_code=400, detail="时间线未初始化")

    instance.timeline.virtual_time.pause()

    return {"code": 0, "message": "虚拟时间已暂停"}


@router.post("/devices/{device_id}/timeline/time/resume")
async def resume_virtual_time(device_id: str):
    """恢复虚拟时间"""
    manager = DeviceManager.get_instance()

    instance = await manager.get_device_instance(device_id)
    if not instance:
        raise HTTPException(status_code=404, detail="设备不存在")

    if not instance.timeline:
        raise HTTPException(status_code=400, detail="时间线未初始化")

    instance.timeline.virtual_time.resume()

    return {"code": 0, "message": "虚拟时间已恢复"}


@router.get("/timeline/templates")
async def list_event_templates():
    """获取事件模板列表"""
    from ..services.event_queue import BUILTIN_TEMPLATES

    templates = []
    for template in BUILTIN_TEMPLATES.values():
        templates.append({
            "template_id": template.template_id,
            "name": template.name,
            "event_type": template.event_type.value,
            "default_parameters": template.default_parameters,
            "description": template.description,
            "icon": template.icon,
        })

    return {
        "code": 0,
        "message": "success",
        "data": templates,
    }


# ============ 历史数据 API ============

@router.get("/devices/{device_id}/history")
async def get_device_history(
    device_id: str,
    count: int = 100,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None
):
    """获取设备历史数据"""
    from ..services.data_history import DataHistoryManager

    history_manager = DataHistoryManager.get_instance()

    # 解析时间参数
    start = None
    end = None
    if start_time:
        start = datetime.fromisoformat(start_time)
    if end_time:
        end = datetime.fromisoformat(end_time)

    # 获取数据
    if start or end:
        data = await history_manager.get_data_range(device_id, start, end)
    else:
        data = await history_manager.get_recent_data(device_id, count)

    return {
        "code": 0,
        "message": "success",
        "data": [point.to_dict() for point in data],
    }


@router.get("/devices/{device_id}/history/stats")
async def get_device_history_stats(
    device_id: str,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None
):
    """获取设备历史数据统计"""
    from ..services.data_history import DataHistoryManager

    history_manager = DataHistoryManager.get_instance()

    # 解析时间参数
    start = None
    end = None
    if start_time:
        start = datetime.fromisoformat(start_time)
    if end_time:
        end = datetime.fromisoformat(end_time)

    stats = await history_manager.get_device_stats(device_id, start, end)

    return {
        "code": 0,
        "message": "success",
        "data": {
            metric: stat.to_dict() for metric, stat in stats.items()
        },
    }


@router.post("/devices/{device_id}/history/clear")
async def clear_device_history(device_id: str):
    """清空设备历史数据"""
    from ..services.data_history import DataHistoryManager

    history_manager = DataHistoryManager.get_instance()
    await history_manager.clear_device_history(device_id)

    return {"code": 0, "message": "历史数据已清空"}


@router.post("/devices/{device_id}/history/export")
async def export_device_history(device_id: str, request: dict):
    """导出设备历史数据"""
    from ..services.data_history import DataHistoryManager

    history_manager = DataHistoryManager.get_instance()

    filepath = request.get("filepath", f"device_{device_id}_history.json")
    await history_manager.export_device_data(device_id, filepath)

    return {
        "code": 0,
        "message": "数据导出成功",
        "data": {"filepath": filepath},
    }


# ============ 系统状态 API ============

@router.get("/system/status")
async def system_status():
    manager = DeviceManager.get_instance()
    stats = await manager.get_stats()

    # 获取历史数据统计
    from ..services.data_history import DataHistoryManager
    history_manager = DataHistoryManager.get_instance()
    devices_with_history = history_manager.get_device_list()

    return {
        "code": 0,
        "message": "success",
        "data": {
            "version": "2.0.0",
            "status": "running",
            "devices": stats,
            "history_devices": len(devices_with_history),
            "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
        },
    }
