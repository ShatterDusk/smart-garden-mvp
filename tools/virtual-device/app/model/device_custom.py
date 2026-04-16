"""
自定义 Device 扩展 - 添加合并上报功能
通过继承原 Device，不修改原文件

设计：Device 统一调度，维护 S/R/k，定时器触发后收集所有传感器数据
"""
from model.device import Device
from utils.simulator import Simulator
import os
import datetime
import logging
import threading

logger = logging.getLogger(__name__)

# 固定常量
MAX_TIME_ACCELERATION = 3600
SENSOR_INTERVAL_MS = 7200000  # 2小时


class DeviceCustom(Device):
    """
    带时间追赶逻辑的虚拟设备
    Device 统一维护 S/R/k，定时触发所有传感器采集
    """
    
    def start_simulation_custom(self, http_helper, container_callback):
        """
        启动自定义模拟（Device 统一调度）
        
        Args:
            http_helper: HTTPHelper 实例
            container_callback: 容器回调（用于UI更新）
        """
        self._http_helper = http_helper
        self._ui_callback = container_callback
        self._running = True
        self._timer = None
        
        # 为每个传感器创建 Simulator
        self._simulators = {}
        for sensor in self.sensors:
            self._simulators[sensor.name] = Simulator(sensor=sensor)
        
        # 初始化 S/R/k
        self._init_time_model()
        
        logger.info(f"DeviceCustom {self.name} 启动: sensors={len(self.sensors)}, accel={self._accel}, start={self._sim_time.isoformat()}")
        
        # 启动定时器
        self._schedule_next()
    
    def _init_time_model(self):
        """初始化时间模型 S/R/k"""
        # 真实时间 R
        self._real_time = datetime.datetime.now()
        
        # 模拟时间 S
        initial_time = os.getenv('SIMULATED_TIME_INITIAL')
        if initial_time:
            if isinstance(initial_time, str):
                self._sim_time = datetime.datetime.fromisoformat(initial_time.replace('Z', '+00:00'))
            else:
                self._sim_time = initial_time
        else:
            self._sim_time = datetime.datetime.now()
        
        # 加速倍数 k
        self._accel = min(int(os.getenv('TIME_ACCELERATION', '1')), MAX_TIME_ACCELERATION)
        
        # 追赶标志
        self._has_caught_up = False
    
    def _schedule_next(self):
        """计算下一次触发时间"""
        if not self._running:
            return
        
        # 根据当前加速倍数计算实际等待时间
        wait_ms = SENSOR_INTERVAL_MS / self._accel
        wait_sec = max(wait_ms / 1000, 0.1)
        
        self._timer = threading.Timer(wait_sec, self._on_trigger)
        self._timer.daemon = True
        self._timer.start()
    
    def _on_trigger(self):
        """定时触发：推进时间，采集所有传感器数据"""
        if not self._running:
            return
        
        try:
            # 更新真实时间
            self._real_time = datetime.datetime.now()
            
            # 推进模拟时间（正确模型：dS = k × dR = k × (Δs/k) = Δs）
            self._sim_time += datetime.timedelta(milliseconds=SENSOR_INTERVAL_MS)
            
            # 检查是否追上
            if not self._has_caught_up and self._sim_time > self._real_time:
                logger.info(f"[Device] 追上真实时间，S={self._sim_time.isoformat()}, R={self._real_time.isoformat()}, 恢复常速")
                self._sim_time = self._real_time
                self._accel = 1
                self._has_caught_up = True
            
            # 采集所有传感器数据
            sensor_data = {}
            for sensor in self.sensors:
                data = self._simulators[sensor.name].generate_data(timestamp=self._sim_time)
                sensor_name = data.get('sensorName')
                value = data.get('value')
                if sensor_name and value is not None:
                    sensor_data[sensor_name] = value
                
                # UI 回调
                self._ui_callback(sensor, data)
            
            # 上报合并数据
            if sensor_data:
                self._send_combined(sensor_data, self._sim_time)
            
        except Exception as e:
            logger.error(f"[Device] 触发失败: {e}", exc_info=True)
        finally:
            self._schedule_next()
    
    def _send_combined(self, sensor_data, timestamp):
        """合并上报所有指标"""
        device_name = os.getenv('VIRTUAL_DEVICE_ID', f'DEVICE_{self.id}')
        plant_id = os.getenv('VIRTUAL_DEVICE_PLANT_ID', 'PLANT_001')
        
        try:
            self._http_helper.send_multi_sensor_data(
                device_name=device_name,
                plant_id=plant_id,
                timestamp=timestamp,
                sensor_data_dict=sensor_data
            )
            logger.debug(f"合并上报成功: {device_name}, {len(sensor_data)} 个指标")
        except Exception as e:
            logger.error(f"合并上报失败: {e}")
    
    def stop_simulation_custom(self):
        """停止模拟"""
        self._running = False
        if self._timer:
            self._timer.cancel()
            self._timer = None
        logger.info(f"DeviceCustom {self.name} 已停止")
