# REST API 设计

## 1. 概述

REST API 提供虚拟设备系统的 HTTP 接口，支持设备管理、场景控制、事件时间线操作等功能。采用标准的 RESTful 设计风格，使用 JSON 作为数据交换格式。

## 2. API 基础规范

### 2.1 基础信息

| 项目 | 规范 |
|------|------|
| 基础路径 | `/api/v1` |
| 数据格式 | JSON |
| 字符编码 | UTF-8 |
| 认证方式 | API Key (Header: `X-API-Key`) |

### 2.2 响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "timestamp": "2026-04-08T10:30:00Z",
  "request_id": "req_abc123"
}
```

**状态码定义:**

| Code | 含义 | HTTP Status |
|------|------|-------------|
| 0 | 成功 | 200 |
| 4001 | 参数错误 | 400 |
| 4002 | 资源不存在 | 404 |
| 4003 | 资源冲突 | 409 |
| 5001 | 内部错误 | 500 |
| 5002 | 服务不可用 | 503 |

## 3. 设备管理 API

### 3.1 设备列表

```
GET /api/v1/devices
```

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 过滤状态: running/stopped/error |
| mode | string | 否 | 过滤模式: manual/scenario/script |
| page | int | 否 | 页码，默认1 |
| page_size | int | 否 | 每页数量，默认20，最大100 |

**响应示例:**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "device_id": "vd_001",
        "device_name": "虚拟设备-001",
        "status": "running",
        "mode": "scenario",
        "active_scenario": "normal",
        "network": {
          "ip": "192.168.1.100",
          "port": 8080
        },
        "created_at": "2026-04-08T08:00:00Z",
        "updated_at": "2026-04-08T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 5,
      "total_pages": 1
    }
  }
}
```

### 3.2 创建设备

```
POST /api/v1/devices
```

**请求体:**

```json
{
  "device_name": "我的虚拟设备",
  "mode": "manual",
  "network": {
    "port": 8080
  },
  "sampling": {
    "interval_ms": 5000
  }
}
```

**响应示例:**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "device_id": "vd_abc123",
    "device_name": "我的虚拟设备",
    "status": "stopped",
    "created_at": "2026-04-08T10:30:00Z"
  }
}
```

### 3.3 获取设备详情

```
GET /api/v1/devices/{device_id}
```

**响应示例:**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "device_id": "vd_001",
    "device_name": "虚拟设备-001",
    "device_type": "plant_sensor",
    "firmware_version": "1.0.0",
    "status": "running",
    "mode": "scenario",
    "network": {
      "ssid": "MyWiFi",
      "ip": "192.168.1.100",
      "port": 8080,
      "mac_address": "AA:BB:CC:DD:EE:01"
    },
    "sampling": {
      "interval_ms": 5000,
      "batch_size": 10,
      "jitter_ms": 100
    },
    "calibration": {
      "temperature_offset": 0,
      "humidity_offset": 0,
      "light_offset": 0,
      "soil_offset": 0
    },
    "active_scenario": "normal",
    "active_script": null,
    "time_scale": 1.0,
    "virtual_time_enabled": false,
    "current_metrics": {
      "temperature": 23.5,
      "humidity": 58.2,
      "light": 32500,
      "soil_moisture": 62.1
    },
    "stats": {
      "runtime_seconds": 3600,
      "sample_count": 720,
      "report_count": 72,
      "error_count": 0
    },
    "created_at": "2026-04-08T08:00:00Z",
    "updated_at": "2026-04-08T10:30:00Z"
  }
}
```

### 3.4 更新设备

```
PUT /api/v1/devices/{device_id}
```

**请求体:**

```json
{
  "device_name": "新名称",
  "sampling": {
    "interval_ms": 10000
  }
}
```

### 3.5 删除设备

```
DELETE /api/v1/devices/{device_id}
```

### 3.6 设备控制

```
POST /api/v1/devices/{device_id}/control
```

**请求体:**

```json
{
  "action": "start"
}
```

**Action 类型:**

| Action | 说明 |
|--------|------|
| start | 启动设备 |
| stop | 停止设备 |
| restart | 重启设备 |
| reset | 重置设备状态 |

### 3.7 批量操作

```
POST /api/v1/devices/batch
```

**请求体:**

```json
{
  "action": "start",
  "device_ids": ["vd_001", "vd_002", "vd_003"]
}
```

## 4. 场景管理 API

### 4.1 场景列表

```
GET /api/v1/scenarios
```

**响应示例:**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "scenario_id": "normal",
        "name": "正常环境",
        "description": "植物生长的理想环境条件",
        "category": "normal",
        "icon": "🌱",
        "color": "#4CAF50",
        "constraints": {
          "temperature": { "min": 18, "max": 28, "target": 23 },
          "humidity": { "min": 40, "max": 70, "target": 55 },
          "light": { "min": 5000, "max": 50000 },
          "soil_moisture": { "min": 40, "max": 70, "target": 55 }
        },
        "is_builtin": true
      }
    ]
  }
}
```

### 4.2 切换场景

```
POST /api/v1/devices/{device_id}/scenario
```

**请求体:**

```json
{
  "scenario_id": "high_temperature",
  "transition_time_ms": 5000,
  "easing": "ease_in_out"
}
```

### 4.3 创建自定义场景

```
POST /api/v1/scenarios
```

**请求体:**

```json
{
  "name": "我的场景",
  "description": "自定义场景描述",
  "category": "custom",
  "constraints": {
    "temperature": { "min": 20, "max": 25, "target": 22, "variance": 1 },
    "humidity": { "min": 50, "max": 60, "target": 55, "variance": 2 }
  },
  "icon": "🌿",
  "color": "#8BC34A"
}
```

## 5. 事件时间线 API

### 5.1 获取时间线

```
GET /api/v1/devices/{device_id}/timeline
```

**响应示例:**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "virtual_time": {
      "current": "2026-04-08T10:30:00Z",
      "scale": 1.0,
      "is_paused": false
    },
    "events": [
      {
        "event_id": "evt_001",
        "event_type": "temperature_change",
        "trigger_time": "2026-04-08T11:00:00Z",
        "status": "pending",
        "priority": 2,
        "params": {
          "target_value": 35,
          "duration_ms": 300000
        }
      }
    ],
    "stats": {
      "total_events": 10,
      "pending": 5,
      "completed": 3,
      "failed": 0
    }
  }
}
```

### 5.2 添加事件

```
POST /api/v1/devices/{device_id}/timeline/events
```

**请求体:**

```json
{
  "event_type": "temperature_change",
  "trigger_time": "2026-04-08T11:00:00Z",
  "priority": 2,
  "params": {
    "target_value": 35,
    "duration_ms": 300000,
    "easing": "ease_in_out"
  }
}
```

### 5.3 更新时间控制

```
POST /api/v1/devices/{device_id}/timeline/time
```

**请求体:**

```json
{
  "action": "set_scale",
  "scale": 10.0
}
```

**Action 类型:**

| Action | 参数 | 说明 |
|--------|------|------|
| pause | - | 暂停时间 |
| resume | - | 恢复时间 |
| set_scale | scale | 设置时间加速倍数 |
| jump | timestamp | 跳转到指定时间 |
| reset | - | 重置时间 |

## 6. 脚本管理 API

### 6.1 脚本列表

```
GET /api/v1/scripts
```

### 6.2 执行脚本

```
POST /api/v1/devices/{device_id}/scripts/{script_id}/execute
```

**请求体:**

```json
{
  "loop": false,
  "time_scale": 1.0
}
```

### 6.3 停止脚本

```
POST /api/v1/devices/{device_id}/scripts/stop
```

## 7. 数据查询 API

### 7.1 获取实时数据

```
GET /api/v1/devices/{device_id}/data/current
```

**响应示例:**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "timestamp": "2026-04-08T10:30:00Z",
    "virtual_timestamp": "2026-04-08T10:30:00Z",
    "metrics": {
      "temperature": { "value": 23.5, "unit": "°C", "status": "normal" },
      "humidity": { "value": 58.2, "unit": "%", "status": "normal" },
      "light": { "value": 32500, "unit": "lux", "status": "normal" },
      "soil_moisture": { "value": 62.1, "unit": "%", "status": "normal" }
    },
    "device_status": {
      "battery_level": 85,
      "signal_strength": -65
    }
  }
}
```

### 7.2 查询历史数据

```
GET /api/v1/devices/{device_id}/data/history
```

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| start_time | string | 是 | 开始时间 (ISO 8601) |
| end_time | string | 是 | 结束时间 (ISO 8601) |
| metrics | string | 否 | 指标列表，逗号分隔 |
| interval | string | 否 | 聚合间隔: 1m/5m/1h/1d |

### 7.3 获取统计数据

```
GET /api/v1/devices/{device_id}/statistics
```

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| period | string | 否 | 统计周期: 1h/24h/7d/30d |

## 8. 系统管理 API

### 8.1 系统状态

```
GET /api/v1/system/status
```

**响应示例:**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "version": "2.0.0",
    "uptime_seconds": 86400,
    "devices": {
      "total": 5,
      "running": 3,
      "stopped": 2
    },
    "resources": {
      "cpu_percent": 15.2,
      "memory_mb": 256,
      "disk_mb": 1024
    },
    "timestamp": "2026-04-08T10:30:00Z"
  }
}
```

### 8.2 获取日志

```
GET /api/v1/system/logs
```

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| level | string | 否 | 日志级别: debug/info/warning/error |
| limit | int | 否 | 返回条数，默认100 |
| since | string | 否 | 起始时间 |

### 8.3 备份与恢复

```
POST /api/v1/system/backup
```

```
POST /api/v1/system/restore
```

**请求体:**

```json
{
  "backup_file": "/path/to/backup.zip"
}
```

## 9. API 错误处理

### 9.1 错误响应格式

```json
{
  "code": 4001,
  "message": "Invalid parameter: device_name is required",
  "data": {
    "field": "device_name",
    "error": "required"
  },
  "timestamp": "2026-04-08T10:30:00Z",
  "request_id": "req_abc123"
}
```

### 9.2 常见错误

| HTTP Status | Code | 场景 |
|-------------|------|------|
| 400 | 4001 | 参数验证失败 |
| 400 | 4002 | JSON解析错误 |
| 401 | 4003 | API Key无效 |
| 403 | 4004 | 权限不足 |
| 404 | 4005 | 设备不存在 |
| 409 | 4006 | 设备已在运行 |
| 422 | 4007 | 业务逻辑错误 |
| 429 | 4008 | 请求过于频繁 |
| 500 | 5001 | 内部服务器错误 |
| 503 | 5002 | 服务暂时不可用 |

## 10. 设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| API 版本 | URL路径 (/api/v1) | 清晰、易于管理 |
| 认证方式 | API Key | 简单、适合内部工具 |
| 数据格式 | JSON | 通用、易于解析 |
| 分页方式 | 页码+页大小 | 简单直观 |
| 批量操作 | 专用端点 | 避免URL过长 |
| 时间格式 | ISO 8601 | 标准、无时区歧义 |

---

**文档状态**: 初稿  
**最后更新**: 2026-04-08  
**作者**: AI Assistant
