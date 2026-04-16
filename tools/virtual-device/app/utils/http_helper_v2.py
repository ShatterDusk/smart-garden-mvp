"""
HTTP Helper V2 - 入队触发模式

架构变更：
- V1: 定时循环模式（每60秒检查一次队列）
- V2: 入队触发模式（新数据入队时触发上报）

时序：
1. 数据入队 -> 触发上报
2. 上报循环：逐条POST -> 成功移除 -> 检查队列 -> 有数据继续/无数据停止
3. 并发控制：正在上报时，新数据只入队不触发新循环
"""

from utils.response import Response
import requests
import json
import os
import threading
import logging
import time

logger = logging.getLogger(__name__)


class HTTPHelperV2:
    """
    HTTP Helper - 入队触发上报模式
    
    关键特性：
    - 新数据入队时触发上报流程
    - 逐条POST，成功移除，失败保留
    - 并发控制：避免重复触发上报循环
    """

    def __init__(self, api_url, container_id=None):
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

        # 并发控制：是否正在上报中
        self._is_uploading = False
        self._upload_lock = threading.Lock()
        
        # 用于停止上报循环
        self._stop_event = threading.Event()

        logger.info(f"HTTPHelperV2 初始化完成: 队列容量={self.queue.max_size}, 恢复数据={self.queue.size()}")

    def send_multi_sensor_data(self, device_name, plant_id, timestamp, sensor_data_dict):
        """
        发送多传感器合并数据
        
        流程：
        1. 构造API数据
        2. 入队
        3. 触发上报（如果不在上报中）
        """
        is_demo_mode = os.getenv('DEMO_MODE', 'false').lower() == 'true'
        if is_demo_mode:
            return Response(False, "演示模式已启用，数据不会发送")

        try:
            # 确保时间戳带有时区信息（北京时间 +08:00）
            if hasattr(timestamp, 'isoformat'):
                # 如果 timestamp 没有时区，添加 +08:00
                if timestamp.tzinfo is None:
                    timestamp_str = timestamp.isoformat() + '+08:00'
                else:
                    timestamp_str = timestamp.isoformat()
            else:
                timestamp_str = str(timestamp)
            
            api_data = {
                "deviceId": device_name,
                "plantId": plant_id,
                "timestamp": timestamp_str,
                "metrics": sensor_data_dict
            }

            queue_data = {
                'api_data': api_data,
                'raw_data': {'device_name': device_name, 'sensor_data': sensor_data_dict},
                'retry_count': 0
            }

            # 入队
            self.queue.add(api_data['timestamp'], queue_data)
            self.queue.persist()

            logger.info(f"[HTTP] 数据入队: {device_name} - {api_data['timestamp']}, 队列大小: {self.queue.size()}")

            # 触发上报（如果不在上报中）
            self._trigger_upload_if_needed()

            return Response(True, "数据已入队并触发上报")

        except Exception as e:
            error_msg = f"入队错误: {str(e)}"
            logger.error(f"[HTTP] {error_msg}")
            return Response(False, error_msg)

    def _trigger_upload_if_needed(self):
        """
        触发上报（如果不在上报中）
        
        并发控制：
        - 如果正在上报，跳过（新数据已在队列中，会被处理）
        - 如果未在上报，启动上报线程
        """
        with self._upload_lock:
            if self._is_uploading:
                logger.debug("[HTTP] 正在上报中，跳过触发")
                return
            
            if self.queue.is_empty():
                logger.debug("[HTTP] 队列为空，无需上报")
                return
            
            self._is_uploading = True
            logger.info("[HTTP] 启动上报流程")
        
        # 在独立线程中执行上报循环
        upload_thread = threading.Thread(target=self._upload_loop, daemon=True)
        upload_thread.start()

    def _upload_loop(self):
        """
        上报循环
        
        流程：
        1. 获取所有待发送数据
        2. 逐条POST
        3. 成功 -> 移除
        4. 失败 -> 停止循环，保留数据
        5. 检查队列，有数据继续，无数据停止
        """
        try:
            while not self._stop_event.is_set():
                # 获取待发送数据
                pending = self.queue.get_all_pending()
                
                if not pending:
                    logger.info("[HTTP] 队列已空，停止上报")
                    break
                
                logger.info(f"[HTTP] 开始上报，队列中有 {len(pending)} 条数据")
                
                # 逐条上报
                success = self._upload_batch(pending)
                
                if not success:
                    # 上报失败，停止循环，数据保留在队列
                    logger.warning("[HTTP] 上报失败，停止循环，数据保留")
                    break
                
                # 检查是否还有新数据入队
                if self.queue.is_empty():
                    logger.info("[HTTP] 所有数据上报完成")
                    break
                
                # 还有数据，继续循环
                logger.debug("[HTTP] 发现新数据，继续上报")
                
        except Exception as e:
            logger.error(f"[HTTP] 上报循环异常: {e}", exc_info=True)
        finally:
            with self._upload_lock:
                self._is_uploading = False
                logger.info("[HTTP] 上报循环结束")

    def _upload_batch(self, pending_items):
        """
        批量上报数据
        
        Args:
            pending_items: 待发送数据列表
            
        Returns:
            bool: 是否全部成功
        """
        for item in pending_items:
            try:
                queue_data = item['data']
                api_data = queue_data['api_data']
                
                logger.info(f"[HTTP] 上报数据: {api_data['deviceId']} - {api_data['timestamp']}")
                logger.info(f"[HTTP] 上报指标: {list(api_data['metrics'].keys())}")
                
                response = requests.post(
                    self.api_url,
                    headers=self.headers,
                    json=api_data,
                    timeout=10
                )

                if response.status_code == 200:
                    result = response.json()
                    if result.get('code') == 0:
                        # 成功，从队列移除
                        self.queue.remove(item['recorded_at'])
                        self.queue.persist()
                        logger.info(f"[HTTP] 上报成功: {item['recorded_at']}")
                    else:
                        logger.warning(f"[HTTP] 服务器错误: {result.get('message')}")
                        return False
                else:
                    logger.warning(f"[HTTP] HTTP错误 {response.status_code}: {response.text}")
                    return False

            except requests.exceptions.ConnectionError:
                logger.error("[HTTP] 连接服务器失败")
                return False
            except requests.exceptions.Timeout:
                logger.error("[HTTP] 请求超时")
                return False
            except Exception as e:
                logger.error(f"[HTTP] 发送失败: {e}")
                return False
        
        return True

    def stop(self):
        """停止 HTTPHelper"""
        self._stop_event.set()
        logger.info("[HTTP] HTTPHelperV2 已停止")

    def get_queue_status(self):
        """获取队列状态"""
        return {
            'size': self.queue.size(),
            'is_empty': self.queue.is_empty(),
            'max_size': self.queue.max_size,
            'is_uploading': self._is_uploading
        }
