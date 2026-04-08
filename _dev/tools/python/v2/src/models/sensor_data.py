"""传感器数据模型"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class TemperatureReading(BaseModel):
    value: float = Field(..., ge=-50.0, le=100.0, description="温度(°C)")
    unit: str = Field("°C")
    status: str = Field("normal", pattern=r"^(normal|warning|error|offline)$")


class HumidityReading(BaseModel):
    value: float = Field(..., ge=0.0, le=100.0, description="湿度(%)")
    unit: str = Field("%")
    status: str = Field("normal")


class LightReading(BaseModel):
    value: float = Field(..., ge=0.0, le=100000.0, description="光照(lux)")
    unit: str = Field("lux")
    status: str = Field("normal")


class SoilMoistureReading(BaseModel):
    value: float = Field(..., ge=0.0, le=100.0, description="土壤湿度(%)")
    unit: str = Field("%")
    status: str = Field("normal")


class SensorData(BaseModel):
    data_id: str
    device_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    temperature: TemperatureReading
    humidity: HumidityReading
    light: LightReading
    soil_moisture: SoilMoistureReading
    battery_level: Optional[float] = Field(None, ge=0.0, le=100.0)
    signal_strength: Optional[int] = Field(None, ge=-100, le=0)

    def to_api_format(self) -> dict:
        return {
            "deviceId": self.device_id,
            "timestamp": self.timestamp.isoformat(),
            "metrics": {
                "temperature": self.temperature.value,
                "humidity": self.humidity.value,
                "light": self.light.value,
                "soilMoisture": self.soil_moisture.value,
            },
            "status": {
                "battery": self.battery_level,
                "signal": self.signal_strength,
            },
        }
