"""REST API 路由"""
from fastapi import APIRouter, HTTPException
from typing import List

from ..services.device_manager import DeviceManager
from ..models.device import (
    Device, 
    DeviceCreateRequest, 
    DeviceUpdateRequest,
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
    
    stats = await manager.get_stats()
    return {
        "code": 0,
        "message": "success",
        "data": {
            **device.to_summary(),
            "stats": stats,
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


@router.get("/system/status")
async def system_status():
    manager = DeviceManager.get_instance()
    stats = await manager.get_stats()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "version": "2.0.0",
            "status": "running",
            "devices": stats,
            "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
        },
    }
