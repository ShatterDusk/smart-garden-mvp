# 问题报告：后端未存储 battery_level 字段

## 问题概述

虚拟传感器上报的 `battery_level`（设备电量）字段被后端接收但未存入数据库。

## 复现步骤

1. 启动虚拟传感器模拟器
2. 观察日志确认上报数据包含 `battery_level`
3. 查询数据库 `environment_reading_values` 表
4. 发现 `battery_level` 字段缺失

## 证据

### 1. 虚拟传感器上报日志

```
[HTTP] 上报指标: ['temperature', 'humidity', 'soil_moisture', 'light_intensity', 'pressure', 'soil_temperature', 'soil_ph', 'battery_level']
[HTTP] 上报成功: 2026-04-10T02:00:00
```

**结论**：虚拟传感器确实发送了8个指标，包括 `battery_level`。

### 2. 数据库存储结果

```sql
SELECT v.metric_code, v.value 
FROM environment_readings r 
JOIN environment_reading_values v ON r.reading_id = v.reading_id 
WHERE r.plant_id = 'PLANT_46abed3703ed404d' 
ORDER BY r.recorded_at DESC;
```

**结果**：
- humidity: 58.140
- light_intensity: 500.070
- pressure: 1012.610
- soil_moisture: 49.030
- soil_ph: 6.520
- soil_temperature: 21.860
- temperature: 24.930

**缺失**：`battery_level`

### 3. 数据库配置检查

```sql
SELECT metric_code, applicable_sources 
FROM environment_metrics 
WHERE metric_code = 'battery_level';
```

**结果**：`battery_level` 存在，且 `applicable_sources = ["sensor"]`，应该允许传感器上传。

## 问题分析

### 可能原因

1. **后端代码拦截**：`DeviceService.reportDeviceData` 或 `compensationService.createSensorReading` 中可能有过滤逻辑
2. **数据验证失败**：`validateMetrics` 可能因某种原因拒绝了 `battery_level`
3. **特殊处理逻辑**：后端可能将 `battery_level` 特殊处理（如存入设备表而非环境表），但设备表也未更新

### 代码检查点

需要检查以下文件：
- `backend/server/src/services/DeviceService.js` - `reportDeviceData` 方法
- `backend/server/src/services/compensationService.js` - `createSensorReading` 和 `validateMetrics` 方法
- `backend/server/src/services/EnvironmentService.js` - `processDeviceEnvironmentData` 方法

## 影响

- 无法追踪设备电量状态
- 前端无法显示设备电量
- 设备低电量预警功能失效

## 建议修复方案

### 方案1：修复后端存储逻辑（推荐）

在 `compensationService.createSensorReading` 中确保 `battery_level` 被正确存储到 `environment_reading_values` 表。

### 方案2：分离存储（如设计意图）

如果设计意图是将 `battery_level` 存入设备表：
1. 在 `DeviceService.reportDeviceData` 中更新 `devices` 表的 `battery_level` 字段
2. 确保不重复存储到环境表

## 相关代码

### 虚拟传感器发送的数据格式

```json
{
  "deviceId": "DEVICE_PLANT_001",
  "plantId": "PLANT_46abed3703ed404d",
  "timestamp": "2026-04-10T02:00:00",
  "metrics": {
    "temperature": 25.03,
    "humidity": 61.62,
    "soil_moisture": 50.25,
    "light_intensity": 501.47,
    "pressure": 1012.12,
    "soil_temperature": 21.84,
    "soil_ph": 6.5,
    "battery_level": 85.05
  }
}
```

### 后端接收端点

```
POST /api/devices/data
Headers: Authorization: Bearer <token>
Body: <上述JSON>
```

## 环境信息

- **虚拟传感器版本**: HTTPHelperV2 (入队触发模式)
- **后端服务**: https://plant-backend-240450-4-1401681523.sh.run.tcloudbase.com
- **测试时间**: 2026-04-15
- **设备ID**: DEVICE_PLANT_001
- **植物ID**: PLANT_46abed3703ed404d

## 附件

- 虚拟传感器日志: `logs/virtual_device_2026-04-15.log`
- 数据库查询结果: 见上文

---

**报告人**: AI Assistant  
**报告时间**: 2026-04-15 11:35  
**优先级**: 高  
**状态**: 待修复
