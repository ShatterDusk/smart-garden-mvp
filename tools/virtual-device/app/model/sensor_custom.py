"""
自定义 Sensor 扩展 - 添加时间追赶逻辑
通过继承原 Sensor，不修改原文件

设计原则：
- 模拟时间从整点开始 (SIMULATED_TIME_INITIAL=2026-04-13T08:00:00)
- 采集间隔为2小时倍数 (SENSOR_INTERVAL=7200000ms)
- 数据时间戳直接使用模拟时间，无需额外对齐
"""
from model.sensor import Sensor
from utils.simulator import Simulator
import threading
import datetime
import logging

logger = logging.getLogger(__name__)

# 固定常量
MAX_TIME_ACCELERATION = 3600  # 时间加速倍数上限
SENSOR_INTERVAL_MS = 7200000  # 采集间隔：2小时 = 7200000毫秒（固定）


class SensorCustom(Sensor):
    """
    带时间追赶逻辑的传感器
    继承原 Sensor，添加模拟时间功能
    """

    def start_simulation_custom(self, callback, initial_time=None, acceleration=1):
        """
        启动带追赶逻辑的模拟

        Args:
            callback: 数据回调函数
            initial_time: 模拟起始时间（datetime 或 ISO字符串），建议设为整点
            acceleration: 时间加速倍数
        """
        self._custom_callback = callback
        self._simulator = Simulator(sensor=self)
        self._running = True
        self._timer = None

        # 真实时间 R
        self._real_time = datetime.datetime.now()

        # 模拟时间 S
        if initial_time:
            if isinstance(initial_time, str):
                self._sim_time = datetime.datetime.fromisoformat(initial_time.replace('Z', '+00:00'))
            else:
                self._sim_time = initial_time
        else:
            self._sim_time = datetime.datetime.now()

        # 加速倍数 k
        self._accel = min(int(acceleration), MAX_TIME_ACCELERATION)

        # 采集间隔（固定 2 小时）
        self._interval_ms = SENSOR_INTERVAL_MS

        self._has_caught_up = False

        logger.info(f"SensorCustom {self.name} 启动: accel={self._accel}, interval={self._interval_ms}ms, start={self._sim_time.isoformat()}")

        # 检查起始时间是否为整点（警告但不强制）
        if self._sim_time.minute != 0 or self._sim_time.second != 0:
            logger.warning(f"[{self.name}] 起始时间不是整点 ({self._sim_time.isoformat()})，建议设置 SIMULATED_TIME_INITIAL 为整点")

        self._schedule_next()

    def _schedule_next(self):
        """计算下一次触发时间"""
        if not self._running:
            return

        # 根据当前加速倍数计算实际等待时间
        wait_ms = self._interval_ms / self._accel
        wait_sec = max(wait_ms / 1000, 0.1)

        self._timer = threading.Timer(wait_sec, self._on_trigger)
        self._timer.daemon = True
        self._timer.start()

    def _on_trigger(self):
        """触发数据生成"""
        if not self._running:
            return

        try:
            # 更新真实时间
            self._real_time = datetime.datetime.now()

            # 推进模拟时间
            self._sim_time += datetime.timedelta(milliseconds=self._interval_ms * self._accel)

            # 检查是否追上（规格：S > R 时，S = R, k = 1）
            if not self._has_caught_up and self._sim_time > self._real_time:
                logger.info(f"[{self.name}] 追上真实时间，重置 S={self._real_time.isoformat()}, 恢复常速")
                self._sim_time = self._real_time  # 重置到当前真实时间
                self._accel = 1
                self._has_caught_up = True

            # 直接使用模拟时间作为数据时间戳（无需对齐，因为起始是整点且间隔是2小时倍数）
            data = self._simulator.generate_data(timestamp=self._sim_time)

            # 回调
            self._custom_callback(self, data)

        except Exception as e:
            logger.error(f"[{self.name}] 触发失败: {e}", exc_info=True)
        finally:
            self._schedule_next()

    def stop_simulation_custom(self):
        """停止模拟"""
        self._running = False
        if self._timer:
            self._timer.cancel()
            self._timer = None
        logger.info(f"SensorCustom {self.name} 已停止")
