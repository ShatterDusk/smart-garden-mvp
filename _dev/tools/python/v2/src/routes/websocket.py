"""WebSocket 路由 - 实时数据推送"""
import json
import asyncio
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..services.device_manager import DeviceManager

router = APIRouter()


class ConnectionManager:
    """WebSocket 连接管理器"""
    
    def __init__(self):
        # device_id -> 连接集合
        self._connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, device_id: str):
        """建立连接"""
        await websocket.accept()
        
        if device_id not in self._connections:
            self._connections[device_id] = set()
        
        self._connections[device_id].add(websocket)
    
    def disconnect(self, websocket: WebSocket, device_id: str):
        """断开连接"""
        if device_id in self._connections:
            self._connections[device_id].discard(websocket)
            
            # 清理空集合
            if not self._connections[device_id]:
                del self._connections[device_id]
    
    async def broadcast_to_device(self, device_id: str, message: dict):
        """广播消息到设备的所有客户端"""
        if device_id not in self._connections:
            return
        
        disconnected = []
        message_json = json.dumps(message)
        
        for connection in self._connections[device_id]:
            try:
                await connection.send_text(message_json)
            except Exception:
                disconnected.append(connection)
        
        # 清理断开的连接
        for conn in disconnected:
            self._connections[device_id].discard(conn)
    
    def get_connection_count(self, device_id: str) -> int:
        """获取设备的连接数"""
        return len(self._connections.get(device_id, set()))


# 全局连接管理器
manager = ConnectionManager()


@router.websocket("/ws/devices/{device_id}")
async def device_websocket(websocket: WebSocket, device_id: str):
    """设备 WebSocket 连接"""
    device_manager = DeviceManager.get_instance()
    
    # 检查设备是否存在
    device = await device_manager.get_device(device_id)
    if not device:
        await websocket.close(code=4004, reason="Device not found")
        return
    
    # 建立连接
    await manager.connect(websocket, device_id)
    
    try:
        # 发送初始数据
        current_data = await device_manager.get_device_data(device_id)
        if current_data:
            await websocket.send_json({
                "type": "data_update",
                "data": current_data
            })
        
        # 保持连接并处理消息
        while True:
            try:
                # 接收客户端消息
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # 处理 ping
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                
            except asyncio.TimeoutError:
                continue
            except Exception:
                break
                
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket, device_id)


async def broadcast_device_data(device_id: str, data: dict):
    """广播设备数据更新"""
    await manager.broadcast_to_device(device_id, {
        "type": "data_update",
        "data": data
    })
