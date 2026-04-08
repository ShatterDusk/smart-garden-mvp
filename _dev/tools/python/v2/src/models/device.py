"""设备模型"""
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
from typing import Optional


class DeviceStatus(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    STOPPED = "stopped"
    ERROR = "error"


class DeviceMode(str, Enum):
    MANUAL = "manual"
    SCENARIO = "scenario"
    SCRIPT = "script"
    EVENT_DRIVEN = "event_driven"


class Device(BaseModel):
    device_id: str
    name: str = Field("Virtual Device", max_length=64)
    status: DeviceStatus = DeviceStatus.IDLE
    mode: DeviceMode = DeviceMode.MANUAL
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True

    def to_summary(self) -> dict:
        return {
            "device_id": self.device_id,
            "name": self.name,
            "status": self.status.value,
            "mode": self.mode.value,
            "created_at": self.created_at.isoformat(),
        }


class DeviceCreateRequest(BaseModel):
    name: str = Field("Virtual Device", max_length=64)
    mode: DeviceMode = DeviceMode.MANUAL


class DeviceUpdateRequest(BaseModel):
    name: Optional[str] = None
    mode: Optional[DeviceMode] = None
