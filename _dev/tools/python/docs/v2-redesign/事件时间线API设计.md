# 事件时间线 API 设计

**版本**: V1.0
**日期**: 2026-04-08

---

## 1. API 概览

### 1.1 基础信息

- **Base URL**: `/api/timeline`
- **Content-Type**: `application/json`
- **认证**: 无需认证（开发环境）

### 1.2 响应格式

```json
{
  "success": true,
  "data": {},
  "message": "操作成功"
}
```

错误响应：
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "参数错误"
  }
}
```

---

## 2. 事件管理 API

### 2.1 获取时间线状态

**GET** `/api/timeline/status`

获取当前时间线状态，包括虚拟时间、运行状态、即将触发的事件。

**响应示例**:
```json
{
  "success": true,
  "data": {
    "running": true,
    "virtual_time": "2026-04-08T14:32:15",
    "real_time": "2026-04-08T14:30:00",
    "time_scale": 60.0,
    "event_count": 5,
    "next_event": {
      "id": "evt_001",
      "trigger_time": "2026-04-08T14:35:00",
      "in_seconds": 165,
      "type": "watering",
      "description": "浇水 500ml"
    }
  }
}
```

### 2.2 获取所有事件

**GET** `/api/timeline/events`

获取时间线上的所有事件。

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 筛选状态: pending/executed/all |
| limit | int | 否 | 返回数量限制，默认50 |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "evt_001",
        "type": "watering",
        "trigger_time": "2026-04-08T14:35:00",
        "relative_time": "+5分钟",
        "priority": "high",
        "payload": {
          "amount": 500,
          "method": "manual"
        },
        "description": "浇水 500ml",
        "executed": false
      }
    ]
  }
}
```

### 2.3 添加事件

**POST** `/api/timeline/events`

添加新事件到时间线。

**请求体**:
```json
{
  "type": "watering",
  "trigger": {
    "mode": "relative",
    "value": 10,
    "unit": "minutes"
  },
  "priority": "high",
  "payload": {
    "amount": 500,
    "method": "manual"
  },
  "description": "浇水 500ml"
}
```

**参数说明**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 事件类型: watering/scenario_change/temperature_spike/light_block/network_disconnect/network_reconnect/custom |
| trigger.mode | string | 是 | 触发模式: relative(相对)/absolute(绝对) |
| trigger.value | number | 是 | 时间值 |
| trigger.unit | string | 条件 | relative模式必填: seconds/minutes/hours |
| priority | string | 否 | 优先级: critical/high/normal/low，默认normal |
| payload | object | 是 | 事件参数，根据type不同 |
| description | string | 否 | 事件描述 |

**事件类型参数**:

**watering (浇水)**:
```json
{
  "payload": {
    "amount": 500,      // 水量(ml)
    "method": "manual"  // 方式: manual/auto/drip
  }
}
```

**scenario_change (场景切换)**:
```json
{
  "payload": {
    "scenario": "drought",  // 目标场景
    "transition": "immediate"  // 过渡方式: immediate/smooth
  }
}
```

**temperature_spike (温度突变)**:
```json
{
  "payload": {
    "delta": 10,        // 变化值(正数升温，负数降温)
    "duration": 3600    // 持续时间(秒)
  }
}
```

**light_block (光照遮挡)**:
```json
{
  "payload": {
    "block_ratio": 0.8,  // 遮挡比例 0-1
    "duration": 1800     // 持续时间(秒)
  }
}
```

**network_disconnect (断网)**:
```json
{
  "payload": {
    "duration": 300  // 断网持续时间(秒)
  }
}
```

**network_reconnect (恢复网络)**:
```json
{
  "payload": {}
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "event_id": "evt_1234567890",
    "trigger_time": "2026-04-08T14:42:15",
    "message": "事件已添加到时间线"
  }
}
```

### 2.4 更新事件

**PUT** `/api/timeline/events/{event_id}`

更新已有事件。

**请求体**:
```json
{
  "trigger": {
    "mode": "relative",
    "value": 15,
    "unit": "minutes"
  },
  "payload": {
    "amount": 800
  }
}
```

**说明**:
- 只更新提供的字段
- 已执行的事件不能更新

**响应示例**:
```json
{
  "success": true,
  "data": {
    "event_id": "evt_1234567890",
    "message": "事件已更新"
  }
}
```

### 2.5 删除事件

**DELETE** `/api/timeline/events/{event_id}`

删除指定事件。

**响应示例**:
```json
{
  "success": true,
  "data": {
    "message": "事件已删除"
  }
}
```

### 2.6 批量删除事件

**POST** `/api/timeline/events/batch-delete`

批量删除事件。

**请求体**:
```json
{
  "event_ids": ["evt_001", "evt_002", "evt_003"]
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "deleted_count": 3,
    "message": "已删除3个事件"
  }
}
```

---

## 3. 时间控制 API

### 3.1 获取虚拟时间

**GET** `/api/timeline/time`

获取当前虚拟时间和真实时间。

**响应示例**:
```json
{
  "success": true,
  "data": {
    "virtual_time": "2026-04-08T14:32:15",
    "real_time": "2026-04-08T14:30:00",
    "time_scale": 60.0,
    "running": true
  }
}
```

### 3.2 设置时间缩放

**POST** `/api/timeline/time-scale`

设置时间缩放比例。

**请求体**:
```json
{
  "scale": 120.0
}
```

**参数说明**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| scale | float | 是 | 时间缩放比例，范围0.1-600.0 |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "scale": 120.0,
    "message": "时间缩放已设置为120x"
  }
}
```

### 3.3 快进时间

**POST** `/api/timeline/seek-forward`

快进虚拟时间。

**请求体**:
```json
{
  "amount": 10,
  "unit": "minutes"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "virtual_time": "2026-04-08T14:42:15",
    "message": "时间已快进10分钟"
  }
}
```

### 3.4 倒退时间

**POST** `/api/timeline/seek-backward`

倒退虚拟时间（用于重新测试）。

**请求体**:
```json
{
  "amount": 5,
  "unit": "minutes"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "virtual_time": "2026-04-08T14:27:15",
    "message": "时间已倒退5分钟"
  }
}
```

### 3.5 暂停/继续

**POST** `/api/timeline/pause`

暂停时间线。

**响应示例**:
```json
{
  "success": true,
  "data": {
    "running": false,
    "message": "时间线已暂停"
  }
}
```

**POST** `/api/timeline/resume`

继续时间线。

**响应示例**:
```json
{
  "success": true,
  "data": {
    "running": true,
    "message": "时间线已继续"
  }
}
```

### 3.6 重置时间线

**POST** `/api/timeline/reset`

重置时间线到初始状态。

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clear_events | bool | 否 | 是否清空所有事件，默认false |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "virtual_time": "2026-04-08T14:30:00",
    "message": "时间线已重置"
  }
}
```

---

## 4. 预设脚本 API

### 4.1 获取预设脚本列表

**GET** `/api/timeline/presets`

获取所有预设脚本。

**响应示例**:
```json
{
  "success": true,
  "data": {
    "presets": [
      {
        "id": "watering_test",
        "name": "浇水恢复测试",
        "description": "模拟浇水后土壤湿度的恢复过程",
        "event_count": 5
      },
      {
        "id": "drought_warning",
        "name": "干旱预警测试",
        "description": "模拟干旱条件下触发预警",
        "event_count": 3
      }
    ]
  }
}
```

### 4.2 加载预设脚本

**POST** `/api/timeline/presets/{preset_id}/load`

加载预设脚本到时间线。

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| append | bool | 否 | 是否追加到现有事件，默认false |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "loaded_events": 5,
    "message": "预设脚本已加载"
  }
}
```

### 4.3 保存为预设脚本

**POST** `/api/timeline/presets`

将当前时间线保存为预设脚本。

**请求体**:
```json
{
  "id": "my_test",
  "name": "我的测试脚本",
  "description": "自定义测试场景"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "preset_id": "my_test",
    "message": "预设脚本已保存"
  }
}
```

---

## 5. 导入导出 API

### 5.1 导出时间线

**GET** `/api/timeline/export`

导出时间线为JSON。

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| format | string | 否 | 格式: json/yaml，默认json |

**响应**: 直接返回文件下载

### 5.2 导入时间线

**POST** `/api/timeline/import`

从文件导入时间线。

**Content-Type**: `multipart/form-data`

**请求体**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | file | 是 | JSON或YAML文件 |
| mode | string | 否 | 导入模式: replace(替换)/append(追加)，默认replace |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "imported_events": 10,
    "message": "时间线已导入"
  }
}
```

---

## 6. WebSocket 实时推送

### 6.1 连接

**WebSocket** `ws://localhost:8080/ws/timeline`

### 6.2 推送消息类型

**时间更新**:
```json
{
  "type": "time_update",
  "data": {
    "virtual_time": "2026-04-08T14:32:15",
    "real_time": "2026-04-08T14:30:05"
  }
}
```

**事件触发**:
```json
{
  "type": "event_triggered",
  "data": {
    "event_id": "evt_001",
    "type": "watering",
    "description": "浇水 500ml",
    "timestamp": "2026-04-08T14:35:00"
  }
}
```

**事件列表更新**:
```json
{
  "type": "events_updated",
  "data": {
    "event_count": 5,
    "next_event": {
      "id": "evt_002",
      "trigger_time": "2026-04-08T14:40:00"
    }
  }
}
```

---

## 7. 错误码

| 错误码 | 说明 | HTTP状态码 |
|--------|------|------------|
| INVALID_PARAMETER | 参数错误 | 400 |
| EVENT_NOT_FOUND | 事件不存在 | 404 |
| EVENT_ALREADY_EXECUTED | 事件已执行，无法修改 | 409 |
| INVALID_TIME_SCALE | 时间缩放比例无效 | 400 |
| PRESET_NOT_FOUND | 预设脚本不存在 | 404 |
| IMPORT_FAILED | 导入失败 | 400 |
| INTERNAL_ERROR | 内部错误 | 500 |

---

## 8. 使用示例

### 8.1 创建一个完整的测试场景

```bash
# 1. 清空时间线
curl -X POST http://localhost:8080/api/timeline/reset?clear_events=true

# 2. 添加浇水事件（10分钟后）
curl -X POST http://localhost:8080/api/timeline/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "watering",
    "trigger": {"mode": "relative", "value": 10, "unit": "minutes"},
    "payload": {"amount": 500, "method": "manual"},
    "description": "浇水 500ml"
  }'

# 3. 添加场景切换（30分钟后切换到干旱）
curl -X POST http://localhost:8080/api/timeline/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "scenario_change",
    "trigger": {"mode": "relative", "value": 30, "unit": "minutes"},
    "payload": {"scenario": "drought", "transition": "immediate"},
    "description": "切换到干旱模式"
  }'

# 4. 添加断网事件（1小时后）
curl -X POST http://localhost:8080/api/timeline/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "network_disconnect",
    "trigger": {"mode": "relative", "value": 1, "unit": "hours"},
    "payload": {"duration": 300},
    "priority": "critical",
    "description": "断网5分钟"
  }'

# 5. 设置时间加速为60倍
curl -X POST http://localhost:8080/api/timeline/time-scale \
  -H "Content-Type: application/json" \
  -d '{"scale": 60}'

# 6. 查看时间线状态
curl http://localhost:8080/api/timeline/status
```

### 8.2 使用预设脚本

```bash
# 加载浇水测试脚本
curl -X POST http://localhost:8080/api/timeline/presets/watering_test/load

# 开始测试（60倍速）
curl -X POST http://localhost:8080/api/timeline/time-scale \
  -d '{"scale": 60}'

# 等待测试完成...

# 导出测试结果
curl http://localhost:8080/api/timeline/export > test_result.json
```

---

**文档完成时间**: 2026-04-08
