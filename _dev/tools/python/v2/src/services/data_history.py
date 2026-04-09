"""历史数据存储服务 - 存储和查询传感器历史数据"""
import asyncio
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from collections import deque
import json


@dataclass
class DataPoint:
    """数据点"""
    timestamp: datetime
    temperature: float
    humidity: float
    light: float
    soil_moisture: float
    scenario_id: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp.isoformat(),
            "temperature": round(self.temperature, 2),
            "humidity": round(self.humidity, 2),
            "light": round(self.light, 2),
            "soil_moisture": round(self.soil_moisture, 2),
            "scenario_id": self.scenario_id,
        }


@dataclass
class HistoryStats:
    """历史数据统计"""
    metric_name: str
    min_value: float
    max_value: float
    avg_value: float
    count: int
    
    def to_dict(self) -> dict:
        return {
            "metric_name": self.metric_name,
            "min": round(self.min_value, 2),
            "max": round(self.max_value, 2),
            "avg": round(self.avg_value, 2),
            "count": self.count,
        }


class DataHistoryStore:
    """历史数据存储器
    
    内存中存储最近的数据，支持按时间范围查询和统计。
    """
    
    def __init__(self, max_size: int = 10000):
        self._data: deque[DataPoint] = deque(maxlen=max_size)
        self._lock = asyncio.Lock()
        self._max_size = max_size
    
    async def add(self, data_point: DataPoint):
        """添加数据点"""
        async with self._lock:
            self._data.append(data_point)
    
    async def get_recent(self, count: int = 100) -> List[DataPoint]:
        """获取最近的数据点"""
        async with self._lock:
            return list(self._data)[-count:]
    
    async def get_range(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[DataPoint]:
        """获取时间范围内的数据点"""
        async with self._lock:
            result = []
            for point in self._data:
                if start_time and point.timestamp < start_time:
                    continue
                if end_time and point.timestamp > end_time:
                    continue
                result.append(point)
            return result
    
    async def get_stats(
        self,
        metric_name: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> Optional[HistoryStats]:
        """获取指定指标的统计信息"""
        data = await self.get_range(start_time, end_time)
        
        if not data:
            return None
        
        values = [getattr(point, metric_name) for point in data]
        
        return HistoryStats(
            metric_name=metric_name,
            min_value=min(values),
            max_value=max(values),
            avg_value=sum(values) / len(values),
            count=len(values),
        )
    
    async def get_all_stats(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> Dict[str, HistoryStats]:
        """获取所有指标的统计信息"""
        metrics = ["temperature", "humidity", "light", "soil_moisture"]
        result = {}
        
        for metric in metrics:
            stats = await self.get_stats(metric, start_time, end_time)
            if stats:
                result[metric] = stats
        
        return result
    
    async def clear(self):
        """清空历史数据"""
        async with self._lock:
            self._data.clear()
    
    async def export_to_json(self, filepath: str):
        """导出数据到JSON文件"""
        data = await self.get_recent(self._max_size)
        
        export_data = {
            "export_time": datetime.utcnow().isoformat(),
            "record_count": len(data),
            "data": [point.to_dict() for point in data],
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)
    
    def get_size(self) -> int:
        """获取当前存储的数据量"""
        return len(self._data)


class DataHistoryManager:
    """历史数据管理器
    
    为每个设备管理独立的历史数据存储。
    """
    
    _instance: Optional["DataHistoryManager"] = None
    
    def __init__(self, max_size_per_device: int = 5000):
        self._stores: Dict[str, DataHistoryStore] = {}
        self._max_size = max_size_per_device
        self._lock = asyncio.Lock()
    
    @classmethod
    def get_instance(cls) -> "DataHistoryManager":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def _get_or_create_store(self, device_id: str) -> DataHistoryStore:
        """获取或创建设备的数据存储"""
        if device_id not in self._stores:
            self._stores[device_id] = DataHistoryStore(max_size=self._max_size)
        return self._stores[device_id]
    
    async def record_data(
        self,
        device_id: str,
        timestamp: datetime,
        metrics: Dict[str, float],
        scenario_id: Optional[str] = None
    ):
        """记录数据点"""
        store = self._get_or_create_store(device_id)
        
        data_point = DataPoint(
            timestamp=timestamp,
            temperature=metrics.get("temperature", 0),
            humidity=metrics.get("humidity", 0),
            light=metrics.get("light", 0),
            soil_moisture=metrics.get("soil_moisture", 0),
            scenario_id=scenario_id,
        )
        
        await store.add(data_point)
    
    async def get_recent_data(
        self,
        device_id: str,
        count: int = 100
    ) -> List[DataPoint]:
        """获取设备的最近数据"""
        store = self._stores.get(device_id)
        if not store:
            return []
        return await store.get_recent(count)
    
    async def get_data_range(
        self,
        device_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[DataPoint]:
        """获取设备的时间范围数据"""
        store = self._stores.get(device_id)
        if not store:
            return []
        return await store.get_range(start_time, end_time)
    
    async def get_device_stats(
        self,
        device_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> Dict[str, HistoryStats]:
        """获取设备的统计数据"""
        store = self._stores.get(device_id)
        if not store:
            return {}
        return await store.get_all_stats(start_time, end_time)
    
    async def clear_device_history(self, device_id: str):
        """清空设备的历史数据"""
        store = self._stores.get(device_id)
        if store:
            await store.clear()
    
    async def export_device_data(self, device_id: str, filepath: str):
        """导出设备数据到文件"""
        store = self._stores.get(device_id)
        if store:
            await store.export_to_json(filepath)
    
    def remove_device(self, device_id: str):
        """移除设备及其历史数据"""
        if device_id in self._stores:
            del self._stores[device_id]
    
    def get_device_list(self) -> List[str]:
        """获取有历史数据的设备列表"""
        return list(self._stores.keys())
