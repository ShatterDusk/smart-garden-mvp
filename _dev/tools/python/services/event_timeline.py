#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
事件时间线系统
支持预设未来事件、编辑事件队列、时间旅行调试
"""

import json
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
import heapq


class EventType(Enum):
    """事件类型"""
    WATERING = "watering"           # 浇水
    SCENARIO_CHANGE = "scenario"    # 场景切换
    TEMPERATURE_SPIKE = "temp_spike" # 温度突变
    LIGHT_BLOCK = "light_block"     # 光照遮挡
    NETWORK_DISCONNECT = "net_disconnect"  # 断网
    NETWORK_RECONNECT = "net_reconnect"    # 恢复网络
    CUSTOM = "custom"               # 自定义事件


class EventPriority(Enum):
    """事件优先级"""
    CRITICAL = 0    # 关键事件（如断网）
    HIGH = 1        # 高优先级（如浇水）
    NORMAL = 2      # 普通事件
    LOW = 3         # 低优先级


@dataclass
class TimelineEvent:
    """时间线事件"""
    id: str                         # 事件唯一ID
    event_type: EventType           # 事件类型
    trigger_time: datetime          # 触发时间
    priority: EventPriority         # 优先级
    payload: Dict[str, Any]         # 事件数据
    description: str = ""           # 事件描述
    created_at: datetime = field(default_factory=datetime.now)
    executed: bool = False          # 是否已执行
    
    def __lt__(self, other):
        """用于堆排序：时间优先，其次优先级"""
        if self.trigger_time == other.trigger_time:
            return self.priority.value < other.priority.value
        return self.trigger_time < other.trigger_time
    
    def to_dict(self) -> Dict:
        """序列化为字典"""
        return {
            'id': self.id,
            'event_type': self.event_type.value,
            'trigger_time': self.trigger_time.isoformat(),
            'priority': self.priority.value,
            'payload': self.payload,
            'description': self.description,
            'created_at': self.created_at.isoformat(),
            'executed': self.executed,
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'TimelineEvent':
        """从字典反序列化"""
        return cls(
            id=data['id'],
            event_type=EventType(data['event_type']),
            trigger_time=datetime.fromisoformat(data['trigger_time']),
            priority=EventPriority(data['priority']),
            payload=data['payload'],
            description=data.get('description', ''),
            created_at=datetime.fromisoformat(data['created_at']),
            executed=data.get('executed', False),
        )


class EventTimeline:
    """事件时间线管理器"""
    
    def __init__(self, time_scale: float = 1.0):
        """
        Args:
            time_scale: 时间缩放比例（1.0=正常，2.0=2倍速，0.5=0.5倍速）
        """
        self.time_scale = time_scale
        self.events: List[TimelineEvent] = []  # 使用堆实现优先队列
        self.event_map: Dict[str, TimelineEvent] = {}  # ID到事件的映射
        self.lock = threading.RLock()
        self.running = False
        self._event_handlers: Dict[EventType, List[Callable]] = {}
        self._timeline_start: Optional[datetime] = None
        self._virtual_time: Optional[datetime] = None
        
    def set_time_scale(self, scale: float):
        """设置时间缩放"""
        self.time_scale = max(0.1, min(10.0, scale))
        
    def get_virtual_time(self) -> datetime:
        """获取虚拟当前时间"""
        if self._virtual_time is None:
            return datetime.now()
        
        if self._timeline_start is None:
            return self._virtual_time
        
        # 计算经过的虚拟时间
        real_elapsed = (datetime.now() - self._timeline_start).total_seconds()
        virtual_elapsed = real_elapsed * self.time_scale
        return self._virtual_time + timedelta(seconds=virtual_elapsed)
    
    def add_event(self, event: TimelineEvent) -> str:
        """
        添加事件到时间线
        
        Returns:
            事件ID
        """
        with self.lock:
            heapq.heappush(self.events, event)
            self.event_map[event.id] = event
            return event.id
    
    def add_event_relative(self, event_type: EventType, 
                          delay_seconds: float,
                          payload: Dict[str, Any],
                          priority: EventPriority = EventPriority.NORMAL,
                          description: str = "") -> str:
        """
        添加相对时间事件（相对于当前虚拟时间）
        
        Args:
            event_type: 事件类型
            delay_seconds: 延迟秒数
            payload: 事件数据
            priority: 优先级
            description: 描述
            
        Returns:
            事件ID
        """
        event_id = f"evt_{int(time.time() * 1000)}_{random.randint(1000, 9999)}"
        trigger_time = self.get_virtual_time() + timedelta(seconds=delay_seconds / self.time_scale)
        
        event = TimelineEvent(
            id=event_id,
            event_type=event_type,
            trigger_time=trigger_time,
            priority=priority,
            payload=payload,
            description=description,
        )
        
        return self.add_event(event)
    
    def remove_event(self, event_id: str) -> bool:
        """移除事件"""
        with self.lock:
            if event_id not in self.event_map:
                return False
            
            event = self.event_map[event_id]
            event.executed = True  # 标记为已执行，下次处理时会跳过
            del self.event_map[event_id]
            return True
    
    def update_event(self, event_id: str, **kwargs) -> bool:
        """更新事件属性"""
        with self.lock:
            if event_id not in self.event_map:
                return False
            
            event = self.event_map[event_id]
            
            # 移除旧事件
            event.executed = True
            
            # 创建新事件
            new_event = TimelineEvent(
                id=event.id,
                event_type=kwargs.get('event_type', event.event_type),
                trigger_time=kwargs.get('trigger_time', event.trigger_time),
                priority=kwargs.get('priority', event.priority),
                payload=kwargs.get('payload', event.payload),
                description=kwargs.get('description', event.description),
                created_at=event.created_at,
                executed=False,
            )
            
            # 添加新事件
            heapq.heappush(self.events, new_event)
            self.event_map[event_id] = new_event
            return True
    
    def get_upcoming_events(self, limit: int = 10) -> List[TimelineEvent]:
        """获取即将到来的事件"""
        with self.lock:
            current_time = self.get_virtual_time()
            upcoming = []
            
            for event in self.events:
                if not event.executed and event.trigger_time > current_time:
                    upcoming.append(event)
                    if len(upcoming) >= limit:
                        break
            
            return upcoming
    
    def get_all_events(self) -> List[TimelineEvent]:
        """获取所有事件（按时间排序）"""
        with self.lock:
            return sorted(self.events, key=lambda e: e.trigger_time)
    
    def register_handler(self, event_type: EventType, handler: Callable):
        """注册事件处理器"""
        if event_type not in self._event_handlers:
            self._event_handlers[event_type] = []
        self._event_handlers[event_type].append(handler)
    
    def process_events(self):
        """处理到期事件"""
        with self.lock:
            current_time = self.get_virtual_time()
            
            while self.events and self.events[0].trigger_time <= current_time:
                event = heapq.heappop(self.events)
                
                if event.executed:
                    continue
                
                # 标记为已执行
                event.executed = True
                if event.id in self.event_map:
                    del self.event_map[event.id]
                
                # 调用处理器
                self._execute_event(event)
    
    def _execute_event(self, event: TimelineEvent):
        """执行事件"""
        handlers = self._event_handlers.get(event.event_type, [])
        
        for handler in handlers:
            try:
                handler(event)
            except Exception as e:
                print(f"事件处理器错误: {e}")
    
    def start(self):
        """启动时间线"""
        self.running = True
        self._timeline_start = datetime.now()
        self._virtual_time = datetime.now()
        
    def stop(self):
        """停止时间线"""
        self.running = False
    
    def export_to_json(self) -> str:
        """导出为JSON"""
        events_data = [e.to_dict() for e in self.get_all_events() if not e.executed]
        return json.dumps({
            'time_scale': self.time_scale,
            'events': events_data,
        }, indent=2, ensure_ascii=False)
    
    def import_from_json(self, json_str: str):
        """从JSON导入"""
        data = json.loads(json_str)
        self.time_scale = data.get('time_scale', 1.0)
        
        with self.lock:
            self.events = []
            self.event_map = {}
            
            for event_data in data.get('events', []):
                event = TimelineEvent.from_dict(event_data)
                heapq.heappush(self.events, event)
                self.event_map[event.id] = event


# 预设事件模板
EVENT_TEMPLATES = {
    'watering': {
        'type': EventType.WATERING,
        'description': '浇水',
        'default_payload': {'amount': 500, 'method': 'manual'},
    },
    'scenario_normal': {
        'type': EventType.SCENARIO_CHANGE,
        'description': '切换到正常环境',
        'default_payload': {'scenario': 'normal'},
    },
    'scenario_drought': {
        'type': EventType.SCENARIO_CHANGE,
        'description': '切换到干旱模式',
        'default_payload': {'scenario': 'drought'},
    },
    'temp_spike_high': {
        'type': EventType.TEMPERATURE_SPIKE,
        'description': '温度突升',
        'default_payload': {'delta': 10, 'duration': 3600},
    },
    'temp_spike_low': {
        'type': EventType.TEMPERATURE_SPIKE,
        'description': '温度突降',
        'default_payload': {'delta': -10, 'duration': 3600},
    },
    'network_disconnect': {
        'type': EventType.NETWORK_DISCONNECT,
        'description': '网络断开',
        'default_payload': {'duration': 300},
    },
    'network_reconnect': {
        'type': EventType.NETWORK_RECONNECT,
        'description': '网络恢复',
        'default_payload': {},
    },
}


class TimelineEditor:
    """时间线编辑器（用于Web界面）"""
    
    def __init__(self, timeline: EventTimeline):
        self.timeline = timeline
    
    def create_watering_event(self, delay_minutes: int, amount: int = 500) -> str:
        """创建浇水事件"""
        return self.timeline.add_event_relative(
            EventType.WATERING,
            delay_seconds=delay_minutes * 60,
            payload={'amount': amount, 'method': 'scheduled'},
            priority=EventPriority.HIGH,
            description=f'{delay_minutes}分钟后浇水 {amount}ml',
        )
    
    def create_scenario_event(self, delay_minutes: int, scenario: str) -> str:
        """创建场景切换事件"""
        return self.timeline.add_event_relative(
            EventType.SCENARIO_CHANGE,
            delay_seconds=delay_minutes * 60,
            payload={'scenario': scenario},
            priority=EventPriority.NORMAL,
            description=f'{delay_minutes}分钟后切换到{scenario}场景',
        )
    
    def create_network_event(self, delay_minutes: int, disconnect: bool = True, duration: int = 300) -> str:
        """创建网络事件"""
        event_type = EventType.NETWORK_DISCONNECT if disconnect else EventType.NETWORK_RECONNECT
        return self.timeline.add_event_relative(
            event_type,
            delay_seconds=delay_minutes * 60,
            payload={'duration': duration},
            priority=EventPriority.CRITICAL,
            description=f'{delay_minutes}分钟后{"断网" if disconnect else "恢复网络"}',
        )
    
    def get_timeline_preview(self, hours: int = 24) -> List[Dict]:
        """获取时间线预览"""
        events = self.timeline.get_upcoming_events(limit=50)
        current_time = self.timeline.get_virtual_time()
        
        preview = []
        for event in events:
            time_diff = event.trigger_time - current_time
            if time_diff.total_seconds() > hours * 3600:
                break
                
            preview.append({
                'id': event.id,
                'time': event.trigger_time.strftime('%H:%M:%S'),
                'in_seconds': int(time_diff.total_seconds()),
                'type': event.event_type.value,
                'description': event.description,
                'priority': event.priority.name,
            })
        
        return preview


# 示例：测试场景脚本
EXAMPLE_TEST_SCRIPT = {
    'name': '浇水恢复测试',
    'description': '模拟浇水后土壤湿度的恢复过程',
    'time_scale': 60.0,  # 60倍速（1秒=1分钟）
    'events': [
        {'delay': 0, 'type': 'scenario_change', 'payload': {'scenario': 'drought'}},
        {'delay': 30, 'type': 'watering', 'payload': {'amount': 800}},
        {'delay': 120, 'type': 'scenario_change', 'payload': {'scenario': 'normal'}},
        {'delay': 300, 'type': 'network_disconnect', 'payload': {'duration': 60}},
        {'delay': 400, 'type': 'network_reconnect', 'payload': {}},
    ]
}


if __name__ == '__main__':
    import random
    
    print("事件时间线系统测试")
    print("=" * 60)
    
    # 创建时间线
    timeline = EventTimeline(time_scale=60.0)  # 60倍速
    editor = TimelineEditor(timeline)
    
    # 注册事件处理器
    def on_watering(event):
        print(f"[事件] 浇水 {event.payload.get('amount', 0)}ml")
    
    def on_scenario_change(event):
        print(f"[事件] 场景切换到 {event.payload.get('scenario', 'unknown')}")
    
    def on_network(event):
        if event.event_type == EventType.NETWORK_DISCONNECT:
            print(f"[事件] 网络断开 {event.payload.get('duration', 0)}秒")
        else:
            print("[事件] 网络恢复")
    
    timeline.register_handler(EventType.WATERING, on_watering)
    timeline.register_handler(EventType.SCENARIO_CHANGE, on_scenario_change)
    timeline.register_handler(EventType.NETWORK_DISCONNECT, on_network)
    timeline.register_handler(EventType.NETWORK_RECONNECT, on_network)
    
    # 启动时间线
    timeline.start()
    
    # 添加测试事件
    print("\n添加测试事件...")
    editor.create_scenario_event(0, 'drought')
    editor.create_watering_event(1, 800)
    editor.create_scenario_event(3, 'normal')
    editor.create_network_event(5, disconnect=True, duration=60)
    editor.create_network_event(7, disconnect=False)
    
    # 显示预览
    print("\n时间线预览:")
    preview = editor.get_timeline_preview(hours=1)
    for item in preview:
        print(f"  [{item['time']}] {item['description']}")
    
    # 模拟运行
    print("\n开始模拟（60倍速）...")
    for i in range(10):
        timeline.process_events()
        time.sleep(0.5)  # 实际等待0.5秒 = 虚拟时间30秒
    
    print("\n测试完成")
