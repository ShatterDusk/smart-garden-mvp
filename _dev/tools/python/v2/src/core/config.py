"""配置管理模块"""
from pydantic import BaseModel, Field
from typing import Optional
import os
import yaml


class ServerConfig(BaseModel):
    host: str = Field("0.0.0.0")
    port: int = Field(8080, ge=1024, le=65535)
    debug: bool = False


class LoggingConfig(BaseModel):
    level: str = Field("INFO", pattern=r"^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$")
    format: str = Field("json")


class DatabaseConfig(BaseModel):
    url: str = Field("sqlite+aiosqlite:///./data/vd.db")
    echo: bool = False


class DeviceDefaultsConfig(BaseModel):
    sampling_interval_ms: int = Field(5000, ge=1000, le=60000)
    default_scenario: str = "normal"
    time_scale: float = Field(1.0, ge=0.1, le=600.0)


class AppConfig(BaseModel):
    server: ServerConfig = Field(default_factory=ServerConfig)
    logging: LoggingConfig = Field(default_factory=LoggingConfig)
    database: DatabaseConfig = Field(default_factory=DatabaseConfig)
    device_defaults: DeviceDefaultsConfig = Field(default_factory=DeviceDefaultsConfig)

    @classmethod
    def load(cls, config_path: Optional[str] = None) -> "AppConfig":
        if config_path and os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f) or {}
            return cls(**data)
        return cls()

    class Config:
        env_prefix = "VD_"
        env_nested_delimiter = "__"
