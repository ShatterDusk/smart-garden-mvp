"""虚拟时间系统 - 支持时间加速和虚拟时间轴"""
import time
import asyncio
from dataclasses import dataclass, field
from typing import Optional, Callable, List
from datetime import datetime, timedelta
from enum import Enum


class TimeScale(Enum):
    """时间缩放级别"""
    PAUSED = 0.0
    REALTIME = 1.0
    FAST = 10.0
    VERY_FAST = 60.0  # 1分钟 = 1秒
    ULTRA_FAST = 600.0  # 10分钟 = 1秒


@dataclass
class VirtualTimeConfig:
    """虚拟时间配置"""
    scale: float = 1.0  # 时间缩放倍数
    start_time: Optional[datetime] = None  # 虚拟起始时间（None表示使用当前时间）
    max_acceleration: float = 600.0  # 最大加速倍数


@dataclass
class TimeMarker:
    """时间标记点"""
    label: str
    virtual_time: datetime
    real_time: datetime
    description: str = ""


class VirtualTime:
    """虚拟时间管理器

    管理虚拟时间轴，支持时间加速、暂停、跳转等操作。
    虚拟时间与真实时间的转换关系：
    virtual_elapsed = real_elapsed * scale
    """

    def __init__(self, config: Optional[VirtualTimeConfig] = None):
        self.config = config or VirtualTimeConfig()

        # 时间基准点
        self._real_start_time: Optional[float] = None
        self._virtual_start_time: datetime = self.config.start_time or datetime.utcnow()

        # 当前状态
        self._scale: float = self.config.scale
        self._paused: bool = False
        self._paused_at: Optional[float] = None  # 暂停时的真实时间
        self._paused_duration: float = 0.0  # 累计暂停时间

        # 偏移量（用于时间跳转）
        self._virtual_offset: float = 0.0  # 虚拟时间偏移（秒）

        # 监听器
        self._on_scale_change: List[Callable[[float], None]] = []
        self._on_pause: List[Callable[[], None]] = []
        self._on_resume: List[Callable[[], None]] = []

        # 时间标记
        self._markers: List[TimeMarker] = []

    def start(self):
        """启动虚拟时间"""
        if self._real_start_time is None:
            self._real_start_time = time.time()

    def now(self) -> datetime:
        """获取当前虚拟时间"""
        if self._real_start_time is None:
            return self._virtual_start_time

        if self._paused:
            # 暂停时返回暂停时刻的虚拟时间
            real_elapsed = self._paused_at - self._real_start_time - self._paused_duration
        else:
            real_elapsed = time.time() - self._real_start_time - self._paused_duration

        virtual_elapsed = real_elapsed * self._scale
        return self._virtual_start_time + timedelta(seconds=virtual_elapsed + self._virtual_offset)

    def get_scale(self) -> float:
        """获取当前时间缩放倍数"""
        return self._scale

    def set_scale(self, scale: float):
        """设置时间缩放倍数"""
        old_scale = self._scale
        self._scale = max(0.0, min(scale, self.config.max_acceleration))

        # 触发监听器
        if old_scale != self._scale:
            for callback in self._on_scale_change:
                callback(self._scale)

    def pause(self):
        """暂停虚拟时间"""
        if not self._paused:
            self._paused = True
            self._paused_at = time.time()
            for callback in self._on_pause:
                callback()

    def resume(self):
        """恢复虚拟时间"""
        if self._paused:
            pause_duration = time.time() - self._paused_at
            self._paused_duration += pause_duration
            self._paused = False
            self._paused_at = None
            for callback in self._on_resume:
                callback()

    def is_paused(self) -> bool:
        """检查是否暂停"""
        return self._paused

    def jump_to(self, target_time: datetime):
        """跳转到指定虚拟时间"""
        current = self.now()
        diff = (target_time - current).total_seconds()
        self._virtual_offset += diff

    def jump_forward(self, seconds: float):
        """向前跳转指定秒数"""
        self._virtual_offset += seconds

    def jump_backward(self, seconds: float):
        """向后跳转指定秒数"""
        self._virtual_offset -= seconds

    def reset(self):
        """重置虚拟时间"""
        self._real_start_time = time.time()
        self._virtual_start_time = datetime.utcnow()
        self._virtual_offset = 0.0
        self._paused_duration = 0.0
        self._paused = False
        self._paused_at = None

    def get_elapsed(self) -> float:
        """获取已流逝的虚拟时间（秒）"""
        if self._real_start_time is None:
            return 0.0
        return (self.now() - self._virtual_start_time).total_seconds()

    def get_real_elapsed(self) -> float:
        """获取已流逝的真实时间（秒）"""
        if self._real_start_time is None:
            return 0.0
        if self._paused:
            return self._paused_at - self._real_start_time - self._paused_duration
        return time.time() - self._real_start_time - self._paused_duration

    def to_virtual_time(self, real_time: datetime) -> datetime:
        """将真实时间转换为虚拟时间"""
        if self._real_start_time is None:
            return self._virtual_start_time

        real_elapsed = (real_time - datetime.utcfromtimestamp(self._real_start_time)).total_seconds()
        virtual_elapsed = real_elapsed * self._scale
        return self._virtual_start_time + timedelta(seconds=virtual_elapsed + self._virtual_offset)

    def to_real_time(self, virtual_time: datetime) -> datetime:
        """将虚拟时间转换为真实时间"""
        if self._real_start_time is None or self._scale == 0:
            return datetime.utcnow()

        virtual_elapsed = (virtual_time - self._virtual_start_time).total_seconds() - self._virtual_offset
        real_elapsed = virtual_elapsed / self._scale
        return datetime.utcfromtimestamp(self._real_start_time + real_elapsed)

    def add_marker(self, label: str, description: str = "") -> TimeMarker:
        """添加时间标记"""
        marker = TimeMarker(
            label=label,
            virtual_time=self.now(),
            real_time=datetime.utcnow(),
            description=description
        )
        self._markers.append(marker)
        return marker

    def get_markers(self) -> List[TimeMarker]:
        """获取所有时间标记"""
        return self._markers.copy()

    def clear_markers(self):
        """清除所有时间标记"""
        self._markers.clear()

    def on_scale_change(self, callback: Callable[[float], None]):
        """注册缩放变化监听器"""
        self._on_scale_change.append(callback)

    def on_pause(self, callback: Callable[[], None]):
        """注册暂停监听器"""
        self._on_pause.append(callback)

    def on_resume(self, callback: Callable[[], None]):
        """注册恢复监听器"""
        self._on_resume.append(callback)

    def get_status(self) -> dict:
        """获取状态信息"""
        return {
            "virtual_time": self.now().isoformat(),
            "scale": self._scale,
            "paused": self._paused,
            "elapsed_virtual": self.get_elapsed(),
            "elapsed_real": self.get_real_elapsed(),
            "marker_count": len(self._markers),
        }


class VirtualTimeScheduler:
    """虚拟时间调度器

    基于虚拟时间的任务调度，支持在指定虚拟时间执行任务。
    """

    def __init__(self, virtual_time: VirtualTime):
        self._vt = virtual_time
        self._tasks: List[dict] = []  # {time: datetime, callback: callable, args: tuple, kwargs: dict}
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def start(self):
        """启动调度器"""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._scheduler_loop())

    async def stop(self):
        """停止调度器"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    def schedule_at(self, virtual_time: datetime, callback: Callable, *args, **kwargs) -> str:
        """在指定虚拟时间调度任务"""
        task_id = f"task_{len(self._tasks)}"
        self._tasks.append({
            "id": task_id,
            "time": virtual_time,
            "callback": callback,
            "args": args,
            "kwargs": kwargs,
            "executed": False,
        })
        # 按时间排序
        self._tasks.sort(key=lambda t: t["time"])
        return task_id

    def schedule_after(self, seconds: float, callback: Callable, *args, **kwargs) -> str:
        """在指定秒数后调度任务（虚拟时间）"""
        target_time = self._vt.now() + timedelta(seconds=seconds)
        return self.schedule_at(target_time, callback, *args, **kwargs)

    def cancel(self, task_id: str) -> bool:
        """取消调度任务"""
        for task in self._tasks:
            if task["id"] == task_id and not task["executed"]:
                task["executed"] = True  # 标记为已执行（取消）
                return True
        return False

    def clear(self):
        """清除所有待执行任务"""
        self._tasks.clear()

    def get_pending_tasks(self) -> List[dict]:
        """获取待执行的任务列表"""
        return [
            {
                "id": t["id"],
                "scheduled_time": t["time"].isoformat(),
                "remaining_seconds": (t["time"] - self._vt.now()).total_seconds(),
            }
            for t in self._tasks
            if not t["executed"] and t["time"] > self._vt.now()
        ]

    async def _scheduler_loop(self):
        """调度器主循环"""
        while self._running:
            try:
                now = self._vt.now()

                # 执行到期的任务
                for task in self._tasks:
                    if not task["executed"] and task["time"] <= now:
                        task["executed"] = True
                        try:
                            result = task["callback"](*task["args"], **task["kwargs"])
                            if asyncio.iscoroutine(result):
                                asyncio.create_task(result)
                        except Exception as e:
                            print(f"Scheduled task error: {e}")

                # 清理已执行的任务
                self._tasks = [t for t in self._tasks if not t["executed"]]

                # 等待下一次检查
                await asyncio.sleep(0.1)  # 100ms检查一次

            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Scheduler loop error: {e}")
                await asyncio.sleep(1)
