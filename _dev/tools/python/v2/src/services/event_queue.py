"""事件队列系统 - 支持未来事件计划和历史记录"""
import uuid
import asyncio
from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, Any, List, Callable
from datetime import datetime, timedelta
from enum import Enum

from .virtual_time import VirtualTime


class EventType(Enum):
    """事件类型"""
    SCENARIO_CHANGE = "scenario_change"  # 场景切换
    METRIC_SPIKE = "metric_spike"  # 指标突变
    SENSOR_FAULT = "sensor_fault"  # 传感器故障
    RECOVERY = "recovery"  # 恢复正常
    CUSTOM = "custom"  # 自定义事件


class EventStatus(Enum):
    """事件状态"""
    PENDING = "pending"  # 待执行
    EXECUTING = "executing"  # 执行中
    COMPLETED = "completed"  # 已完成
    CANCELLED = "cancelled"  # 已取消
    FAILED = "failed"  # 执行失败


@dataclass
class TimelineEvent:
    """时间线事件"""
    event_id: str
    event_type: EventType
    scheduled_time: datetime  # 计划执行时间（虚拟时间）
    parameters: Dict[str, Any] = field(default_factory=dict)
    description: str = ""
    status: EventStatus = EventStatus.PENDING
    created_at: datetime = field(default_factory=datetime.utcnow)
    executed_at: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "event_id": self.event_id,
            "event_type": self.event_type.value,
            "scheduled_time": self.scheduled_time.isoformat(),
            "parameters": self.parameters,
            "description": self.description,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "executed_at": self.executed_at.isoformat() if self.executed_at else None,
            "result": self.result,
            "error_message": self.error_message,
        }


@dataclass
class EventTemplate:
    """事件模板"""
    template_id: str
    name: str
    event_type: EventType
    default_parameters: Dict[str, Any] = field(default_factory=dict)
    description: str = ""
    icon: str = "📌"


# 预定义事件模板
BUILTIN_TEMPLATES = {
    "scenario_normal": EventTemplate(
        template_id="scenario_normal",
        name="切换到正常场景",
        event_type=EventType.SCENARIO_CHANGE,
        default_parameters={"scenario_id": "normal", "transition_time_ms": 3000},
        description="切换到正常环境场景",
        icon="🌿",
    ),
    "scenario_hot": EventTemplate(
        template_id="scenario_hot",
        name="切换到高温场景",
        event_type=EventType.SCENARIO_CHANGE,
        default_parameters={"scenario_id": "high_temperature", "transition_time_ms": 5000},
        description="模拟高温天气",
        icon="🔥",
    ),
    "scenario_cold": EventTemplate(
        template_id="scenario_cold",
        name="切换到低温场景",
        event_type=EventType.SCENARIO_CHANGE,
        default_parameters={"scenario_id": "low_temperature", "transition_time_ms": 5000},
        description="模拟寒冷天气",
        icon="❄️",
    ),
    "scenario_dry": EventTemplate(
        template_id="scenario_dry",
        name="切换到干燥场景",
        event_type=EventType.SCENARIO_CHANGE,
        default_parameters={"scenario_id": "dry", "transition_time_ms": 5000},
        description="模拟干旱环境",
        icon="🏜️",
    ),
    "temperature_spike": EventTemplate(
        template_id="temperature_spike",
        name="温度突变",
        event_type=EventType.METRIC_SPIKE,
        default_parameters={"metric": "temperature", "delta": 10.0, "duration_ms": 30000},
        description="温度突然升高或降低",
        icon="🌡️",
    ),
    "sensor_disconnect": EventTemplate(
        template_id="sensor_disconnect",
        name="传感器断开",
        event_type=EventType.SENSOR_FAULT,
        default_parameters={"sensor": "all", "duration_ms": 60000},
        description="模拟传感器连接中断",
        icon="⚠️",
    ),
    "recovery": EventTemplate(
        template_id="recovery",
        name="恢复正常",
        event_type=EventType.RECOVERY,
        default_parameters={"target_scenario": "normal"},
        description="从异常状态恢复正常",
        icon="✅",
    ),
}


class EventQueue:
    """事件队列管理器

    管理未来事件的计划、执行和历史记录。
    """

    def __init__(self, virtual_time: VirtualTime):
        self._vt = virtual_time
        self._events: Dict[str, TimelineEvent] = {}
        self._history: List[TimelineEvent] = []  # 已完成的事件历史
        self._max_history_size = 100

        # 执行器回调
        self._executors: Dict[EventType, Callable] = {}

        # 监听器
        self._on_event_added: List[Callable[[TimelineEvent], None]] = []
        self._on_event_executed: List[Callable[[TimelineEvent], None]] = []
        self._on_event_cancelled: List[Callable[[TimelineEvent], None]] = []

        # 运行状态
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._check_interval = 0.5  # 检查间隔（秒）

    def register_executor(self, event_type: EventType, executor: Callable):
        """注册事件执行器"""
        self._executors[event_type] = executor

    def add_event(
        self,
        event_type: EventType,
        scheduled_time: datetime,
        parameters: Optional[Dict[str, Any]] = None,
        description: str = "",
    ) -> TimelineEvent:
        """添加事件到队列"""
        event = TimelineEvent(
            event_id=f"evt_{uuid.uuid4().hex[:8]}",
            event_type=event_type,
            scheduled_time=scheduled_time,
            parameters=parameters or {},
            description=description,
            status=EventStatus.PENDING,
        )

        self._events[event.event_id] = event

        # 触发监听器
        for callback in self._on_event_added:
            try:
                callback(event)
            except Exception as e:
                print(f"Event added callback error: {e}")

        return event

    def add_event_from_template(
        self,
        template_id: str,
        delay_seconds: float = 0,
        parameters_override: Optional[Dict[str, Any]] = None,
    ) -> Optional[TimelineEvent]:
        """从模板添加事件"""
        template = BUILTIN_TEMPLATES.get(template_id)
        if not template:
            return None

        # 合并参数
        params = dict(template.default_parameters)
        if parameters_override:
            params.update(parameters_override)

        # 计算计划时间
        scheduled_time = self._vt.now() + timedelta(seconds=delay_seconds)

        return self.add_event(
            event_type=template.event_type,
            scheduled_time=scheduled_time,
            parameters=params,
            description=template.description,
        )

    def cancel_event(self, event_id: str) -> bool:
        """取消待执行的事件"""
        event = self._events.get(event_id)
        if not event or event.status != EventStatus.PENDING:
            return False

        event.status = EventStatus.CANCELLED

        # 触发监听器
        for callback in self._on_event_cancelled:
            try:
                callback(event)
            except Exception as e:
                print(f"Event cancelled callback error: {e}")

        return True

    def remove_event(self, event_id: str) -> bool:
        """删除事件（从历史或队列中）"""
        if event_id in self._events:
            del self._events[event_id]
            return True

        # 从历史中删除
        for i, event in enumerate(self._history):
            if event.event_id == event_id:
                self._history.pop(i)
                return True

        return False

    def get_event(self, event_id: str) -> Optional[TimelineEvent]:
        """获取事件详情"""
        return self._events.get(event_id)

    def list_pending_events(self) -> List[TimelineEvent]:
        """获取所有待执行的事件（按时间排序）"""
        pending = [
            e for e in self._events.values()
            if e.status == EventStatus.PENDING
        ]
        return sorted(pending, key=lambda e: e.scheduled_time)

    def list_history(self, limit: int = 50) -> List[TimelineEvent]:
        """获取历史记录"""
        return sorted(
            self._history,
            key=lambda e: e.executed_at or datetime.min,
            reverse=True
        )[:limit]

    def clear_pending(self):
        """清除所有待执行事件"""
        for event in self._events.values():
            if event.status == EventStatus.PENDING:
                event.status = EventStatus.CANCELLED
        self._events.clear()

    def clear_history(self):
        """清除历史记录"""
        self._history.clear()

    async def start(self):
        """启动事件队列"""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._event_loop())

    async def stop(self):
        """停止事件队列"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def _event_loop(self):
        """事件循环"""
        while self._running:
            try:
                now = self._vt.now()

                # 查找到期的事件
                for event in list(self._events.values()):
                    if event.status == EventStatus.PENDING and event.scheduled_time <= now:
                        await self._execute_event(event)

                # 等待下一次检查
                await asyncio.sleep(self._check_interval)

            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Event loop error: {e}")
                await asyncio.sleep(1)

    async def _execute_event(self, event: TimelineEvent):
        """执行事件"""
        event.status = EventStatus.EXECUTING
        event.executed_at = datetime.utcnow()

        # 获取执行器
        executor = self._executors.get(event.event_type)

        if not executor:
            event.status = EventStatus.FAILED
            event.error_message = f"No executor registered for {event.event_type}"
        else:
            try:
                # 执行事件
                result = executor(event.parameters)

                # 如果是协程，等待完成
                if asyncio.iscoroutine(result):
                    result = await result

                event.status = EventStatus.COMPLETED
                event.result = {"success": True, "data": result}

            except Exception as e:
                event.status = EventStatus.FAILED
                event.error_message = str(e)
                event.result = {"success": False, "error": str(e)}

        # 移动到历史
        self._history.insert(0, event)
        if len(self._history) > self._max_history_size:
            self._history = self._history[:self._max_history_size]

        # 从活跃事件列表中移除
        if event.event_id in self._events:
            del self._events[event.event_id]

        # 触发监听器
        for callback in self._on_event_executed:
            try:
                callback(event)
            except Exception as e:
                print(f"Event executed callback error: {e}")

    def on_event_added(self, callback: Callable[[TimelineEvent], None]):
        """注册事件添加监听器"""
        self._on_event_added.append(callback)

    def on_event_executed(self, callback: Callable[[TimelineEvent], None]):
        """注册事件执行监听器"""
        self._on_event_executed.append(callback)

    def on_event_cancelled(self, callback: Callable[[TimelineEvent], None]):
        """注册事件取消监听器"""
        self._on_event_cancelled.append(callback)

    def get_status(self) -> dict:
        """获取队列状态"""
        return {
            "pending_count": len([e for e in self._events.values() if e.status == EventStatus.PENDING]),
            "history_count": len(self._history),
            "running": self._running,
        }


class Timeline:
    """时间线管理器

    整合虚拟时间和事件队列，提供统一的时间线管理接口。
    """

    def __init__(self, virtual_time: Optional[VirtualTime] = None):
        self._vt = virtual_time or VirtualTime()
        self._queue = EventQueue(self._vt)

    @property
    def virtual_time(self) -> VirtualTime:
        return self._vt

    @property
    def event_queue(self) -> EventQueue:
        return self._queue

    async def start(self):
        """启动时间线"""
        self._vt.start()
        await self._queue.start()

    async def stop(self):
        """停止时间线"""
        await self._queue.stop()

    def get_status(self) -> dict:
        """获取时间线状态"""
        return {
            "virtual_time": self._vt.get_status(),
            "event_queue": self._queue.get_status(),
        }
