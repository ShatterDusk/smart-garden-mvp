"""
HTTP Helper - 集成 LocalTaskQueue
用于替代 MQTT，直接推送到 proj-alpha 后端

架构：
- send_data(): 接收 Sensor 数据，加入队列（不直接发送）
- _upload_loop(): 定时从队列取数据上报到后端
- 成功后移除队列数据，失败保留下次重试
"""

from nicegui import ui
from utils.response import Response
import requests
import json
import os
import datetime
import threading
import logging

logger = logging.getLogger(__name__)


class HTTPHelper():
    '''Helper class to send data to a HTTP REST API with local queue'''

    def __init__(self, api_url, container_id=None):
        '''Initializes the HTTP helper with queue integration'''
        self.api_url = api_url or os.getenv("HTTP_API_URL", "http://localhost:3000/api/devices/data")
        self.container_id = container_id
        self.headers = {
            'Content-Type': 'application/json'
        }

        auth_token = os.getenv("HTTP_API_TOKEN")
        if auth_token:
            self.headers['Authorization'] = f'Bearer {auth_token}'

        from core.local_task_queue import LocalTaskQueue
        self.queue = LocalTaskQueue(
            max_size=int(os.getenv('LOCAL_QUEUE_SIZE', '50')),
            persist_path=os.getenv('QUEUE_PERSIST_PATH', './data/queue.json')
        )
        self.queue.restore()

        self.running = True
        self._upload_timer = None
        self._start_upload_loop()

        logger.info(f"HTTPHelper 初始化完成: 队列容量={self.queue.max_size}, 恢复数据={self.queue.size()}")

    def send_data(self, data):
        '''
        接收 Sensor 数据，加入本地队列

        数据不再直接 POST 到后端，而是先入队，
        由 _upload_loop 定时批量上报
        '''

        from model.option import Option
        is_demo_mode = Option.get_boolean('demo_mode')
        if is_demo_mode:
            return Response(False, "演示模式已启用，数据不会发送")

        try:
            api_data = self._transform_data(data)

            queue_item = {
                'recorded_at': api_data['timestamp'],
                'api_data': api_data,
                'raw_data': data,
                'retry_count': 0
            }

            self.queue.add(queue_item['recorded_at'], queue_item)
            self.queue.persist()

            logger.debug(f"数据入队: {api_data['deviceId']} - {api_data['timestamp']}, 队列大小: {self.queue.size()}")
            return Response(True, "数据已入队")

        except Exception as e:
            error_msg = f"入队错误: {str(e)}"
            logger.error(f"[HTTP] {error_msg}")
            return Response(False, error_msg)

    def send_multi_sensor_data(self, device_name, plant_id, timestamp, sensor_data_dict):
        '''
        发送多传感器合并数据
        
        Args:
            device_name: 设备名称
            plant_id: 植物ID
            timestamp: 记录时间戳
            sensor_data_dict: 传感器数据字典 {sensor_name: value}
        '''
        from model.option import Option
        is_demo_mode = Option.get_boolean('demo_mode')
        if is_demo_mode:
            return Response(False, "演示模式已启用，数据不会发送")

        try:
            api_data = {
                "deviceId": device_name,
                "plantId": plant_id,
                "timestamp": timestamp.isoformat() if hasattr(timestamp, 'isoformat') else str(timestamp),
                "metrics": sensor_data_dict
            }

            queue_item = {
                'recorded_at': api_data['timestamp'],
                'api_data': api_data,
                'raw_data': {'device_name': device_name, 'sensor_data': sensor_data_dict},
                'retry_count': 0
            }

            self.queue.add(queue_item['recorded_at'], queue_item)
            self.queue.persist()

            logger.debug(f"多传感器数据入队: {device_name} - {api_data['timestamp']}, 指标数: {len(sensor_data_dict)}, 队列大小: {self.queue.size()}")
            return Response(True, "数据已入队")

        except Exception as e:
            error_msg = f"入队错误: {str(e)}"
            logger.error(f"[HTTP] {error_msg}")
            return Response(False, error_msg)

    def _transform_data(self, data):
        """
        Transform simulator data format to API format

        模拟器格式: {"timestamp", "sensorId", "sensorName", "value", "unit", "deviceId", "deviceName"}
        API 格式: {"deviceId", "plantId", "timestamp", "metrics": {...}}

        注意: timestamp 已由 Sensor 的 align_to_interval() 对齐，无需再处理
        """

        timestamp = data.get("timestamp")
        if hasattr(timestamp, 'isoformat'):
            timestamp_str = timestamp.isoformat()
        elif isinstance(timestamp, str):
            timestamp_str = timestamp
        else:
            from datetime import datetime
            timestamp_str = datetime.now().isoformat()

        return {
            "deviceId": data.get("deviceName", "UNKNOWN_DEVICE"),
            "plantId": self._get_plant_id(data.get("deviceName")),
            "timestamp": timestamp_str,
            "metrics": {
                data.get("sensorName", "unknown"): data.get("value")
            }
        }

    def _get_plant_id(self, device_name):
        '''Get plant ID from device name or environment'''
        return os.getenv(f"PLANT_ID_FOR_{device_name}", "PLANT_001")

    def _start_upload_loop(self):
        """启动定时上报循环"""
        # 最小间隔 1 秒，防止误配置为 0 导致无限递归
        upload_interval = max(int(os.getenv('DATA_SYNC_INTERVAL', '7200000')) / 1000, 1)
        
        try:
            self._upload_timer = threading.Timer(interval=upload_interval, function=self._upload_loop)
            self._upload_timer.daemon = True
            self._upload_timer.start()
            logger.info(f"上传循环已启动，间隔: {upload_interval}s")
        except Exception as e:
            logger.error(f"启动上传循环失败: {e}")

    def _upload_loop(self):
        """定时上报循环入口"""
        if not self.running:
            return
        
        try:
            self._upload_pending()
        except Exception as e:
            logger.error(f"上传循环执行失败: {e}", exc_info=True)
        
        self._start_upload_loop()

    def _upload_pending(self):
        """
        逐条上报队列中的待发送数据
        
        策略：
        - 逐条 POST 到后端
        - 成功 → 移除队列数据 + 持久化
        - 失败 → break 停止后续，保留在队列下次重试
        """
        pending = self.queue.get_all_pending()
        
        if not pending:
            return
        
        logger.info(f"开始上报队列数据，共 {len(pending)} 条")

        for item in pending:
            try:
                response = requests.post(
                    self.api_url,
                    headers=self.headers,
                    json=item['api_data'],
                    timeout=10
                )

                if response.status_code == 200:
                    result = response.json()
                    if result.get('code') == 0:
                        self.queue.remove(item['recorded_at'])
                        self.queue.persist()
                        logger.debug(f"上报成功并移除: {item['recorded_at']}")
                    else:
                        error_msg = f"服务器错误: {result.get('message', '未知错误')}"
                        logger.warning(f"[HTTP] {error_msg}, 停止后续上报")
                        break
                else:
                    error_msg = f"HTTP 错误 {response.status_code}: {response.text}"
                    logger.warning(f"[HTTP] {error_msg}, 停止后续上报")
                    break

            except requests.exceptions.ConnectionError:
                error_msg = "连接服务器失败"
                logger.warning(f"[HTTP] {error_msg}, 停止后续上报")
                break
            except requests.exceptions.Timeout:
                error_msg = "请求超时"
                logger.warning(f"[HTTP] {error_msg}, 停止后续上报")
                break
            except Exception as e:
                error_msg = f"发送失败: {str(e)}"
                logger.error(f"[HTTP] {error_msg}, 停止后续上报")
                break

    def stop(self):
        """停止 HTTPHelper（停止上传循环）"""
        self.running = False
        if self._upload_timer:
            self._upload_timer.cancel()
            self._upload_timer = None
        logger.info("HTTPHelper 已停止")

    def get_queue_status(self):
        """获取队列状态信息"""
        return {
            'size': self.queue.size(),
            'is_empty': self.queue.is_empty(),
            'max_size': self.queue.max_size,
            'persist_path': self.queue.persist_path
        }

    @staticmethod
    def is_configured():
        '''Returns True if the HTTP API is configured'''
        return os.getenv("HTTP_API_URL") is not None
    
    @staticmethod
    def get_api_url():
        '''Returns the HTTP API URL'''
        return os.getenv("HTTP_API_URL", "http://localhost:3000/api/devices/data")
