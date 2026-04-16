"""
LocalTaskQueue - 本地任务队列管理
用于传感器数据的本地存储、持久化和重试
"""

import json
import os
import threading
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class LocalTaskQueue:
    """本地任务队列：内存存储 + JSON 持久化"""

    def __init__(self, max_size=50, persist_path='./data/queue.json'):
        self.max_size = max_size
        self.persist_path = persist_path
        self.queue = []
        self._lock = threading.Lock()

        os.makedirs(os.path.dirname(persist_path), exist_ok=True)

    def add(self, timestamp, data):
        """
        入队：溢出时覆盖最老数据

        Args:
            timestamp: 对齐后的时间戳（datetime 或 ISO 字符串）
            data: 队列数据项

        Returns:
            bool: 是否成功入队
        """
        with self._lock:
            if len(self.queue) >= self.max_size:
                removed = self.queue.pop(0)
                logger.debug(f"队列溢出，移除最老数据: {removed.get('recorded_at')}")

            queue_item = {
                'recorded_at': timestamp.isoformat() if hasattr(timestamp, 'isoformat') else str(timestamp),
                'data': data,
                'created_at': datetime.now().isoformat()
            }
            self.queue.append(queue_item)
            self._sort()
            logger.debug(f"数据入队: {timestamp}, 队列大小: {len(self.queue)}")
            return True

    def get_next(self):
        """获取队首数据（最老的）"""
        with self._lock:
            if self.queue:
                return self.queue[0]
            return None

    def get_all_pending(self):
        """获取所有待发送数据（按时间排序）"""
        with self._lock:
            return list(self.queue)

    def remove(self, recorded_at):
        """
        移除指定时间戳的数据

        Args:
            recorded_at: 要移除的时间戳

        Returns:
            bool: 是否成功移除
        """
        with self._lock:
            target_str = recorded_at.isoformat() if hasattr(recorded_at, 'isoformat') else str(recorded_at)
            original_len = len(self.queue)
            self.queue = [item for item in self.queue if item['recorded_at'] != target_str]
            removed = original_len - len(self.queue)
            if removed > 0:
                logger.debug(f"移除数据: {recorded_at}")
            return removed > 0

    def align_time(self, timestamp):
        """
        对齐到2小时整点周期

        算法：
        - 如果小时是奇数，向下去一（01-11 → 00, 03 → 02, ..., 23 → 22）
        - 如果小时是偶数，保持不变（00, 02, 04, ..., 22）
        - 分钟、秒、微秒设为0

        示例：
        - 09:23 → 08:00  (奇数小时，向下去一)
        - 10:01 → 10:00  (偶数小时，保持)
        - 23:59 → 22:00  (奇数小时，向下去一)
        """
        if isinstance(timestamp, str):
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        elif isinstance(timestamp, datetime):
            dt = timestamp
        else:
            dt = datetime.now()

        hour = dt.hour
        aligned_hour = (hour // 2) * 2
        return dt.replace(hour=aligned_hour, minute=0, second=0, microsecond=0)

    def persist(self):
        """持久化到 JSON 文件"""
        with self._lock:
            try:
                with open(self.persist_path, 'w', encoding='utf-8') as f:
                    json.dump(self.queue, f, ensure_ascii=False, indent=2, default=str)
                logger.debug(f"队列已持久化到 {self.persist_path}, 数据量: {len(self.queue)}")
            except Exception as e:
                logger.error(f"队列持久化失败: {e}")

    def restore(self):
        """从 JSON 文件恢复队列"""
        with self._lock:
            try:
                if os.path.exists(self.persist_path):
                    with open(self.persist_path, 'r', encoding='utf-8') as f:
                        self.queue = json.load(f)
                    self._sort()
                    logger.info(f"队列从 {self.persist_path} 恢复, 数据量: {len(self.queue)}")
                else:
                    logger.info(f"持久化文件不存在: {self.persist_path}，使用空队列")
            except Exception as e:
                logger.error(f"队列恢复失败: {e}，使用空队列")
                self.queue = []

    def clear(self):
        """清空队列"""
        with self._lock:
            self.queue = []
            logger.info("队列已清空")

    def size(self):
        """返回当前队列大小"""
        return len(self.queue)

    def is_empty(self):
        """判断队列是否为空"""
        return len(self.queue) == 0

    def _sort(self):
        """按 recorded_at 升序排列"""
        self.queue.sort(key=lambda x: x.get('recorded_at', ''))
